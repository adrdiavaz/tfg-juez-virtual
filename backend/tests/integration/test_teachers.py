from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient, Response

from app.main import app
from app.modules.user.models import AccountStatus, Role
from tests.conftest import PASSWORD, FakeEmailSender, MakeUser

NEW = {
    "first_name": "Ana",
    "last_name": "Pérez",
    "identifier": "ana.perez",
    "email": "ana@example.com",
}


@pytest.fixture
async def admin(client: AsyncClient, make_user: MakeUser) -> None:
    user = await make_user(role=Role.ADMIN)
    await client.post("/auth/login", json={"credential": user.username, "password": PASSWORD})


async def create(client: AsyncClient, **overrides: str) -> Response:
    return await client.post("/teachers", json={**NEW, **overrides})


async def listing(client: AsyncClient, **params: str | int) -> dict[str, Any]:
    response = await client.get("/teachers", params=params)
    assert response.status_code == 200
    return response.json()


def code(response: Response) -> str:
    return response.json()["detail"]["code"]


@pytest.mark.usefixtures("admin")
async def test_create_leaves_account_pending_and_sends_invitation(
    client: AsyncClient, mail: FakeEmailSender
) -> None:
    response = await create(client)

    assert response.status_code == 201
    body = response.json()
    assert body["invitation_sent"] is True
    assert body["teacher"]["status"] == "pending"
    assert mail.sent[-1][0] == NEW["email"]
    login = await client.post("/auth/login", json={"credential": "ana.perez", "password": "x"})
    assert code(login) == "account_pending"


@pytest.mark.usefixtures("admin")
async def test_create_keeps_account_when_email_fails(
    client: AsyncClient, mail: FakeEmailSender
) -> None:
    mail.fail = True

    response = await create(client)

    assert response.status_code == 201
    assert response.json()["invitation_sent"] is False
    listed = await listing(client, search="ana.perez")
    assert [t["identifier"] for t in listed["items"]] == ["ana.perez"]


@pytest.mark.usefixtures("admin")
@pytest.mark.parametrize("field", ["identifier", "username", "email"])
async def test_identifier_cannot_belong_to_another_account(
    client: AsyncClient, make_user: MakeUser, field: str
) -> None:
    other = await make_user()

    response = await create(client, identifier=getattr(other, field))

    assert response.status_code == 409
    assert code(response) == "identifier_taken"
    assert (await listing(client, search="ana@example.com"))["items"] == []


@pytest.mark.usefixtures("admin")
async def test_email_cannot_belong_to_another_account_whatever_its_case(
    client: AsyncClient, make_user: MakeUser
) -> None:
    other = await make_user()

    response = await create(client, email=other.email.upper())

    assert response.status_code == 409
    assert code(response) == "email_taken"


@pytest.mark.usefixtures("admin")
async def test_invalid_data_is_rejected(client: AsyncClient) -> None:
    assert (await create(client, email="not-an-email")).status_code == 422
    assert (await create(client, first_name="   ")).status_code == 422


@pytest.mark.usefixtures("admin")
async def test_list_only_returns_teachers(client: AsyncClient, make_user: MakeUser) -> None:
    teacher = await make_user(role=Role.TEACHER)
    student = await make_user(role=Role.STUDENT)

    assert [t["id"] for t in (await listing(client, search=teacher.email))["items"]] == [teacher.id]
    assert (await listing(client, search=student.email))["total"] == 0


@pytest.mark.usefixtures("admin")
async def test_update_changes_data_and_allows_keeping_own_identifier(
    client: AsyncClient, make_user: MakeUser
) -> None:
    teacher = await make_user(role=Role.TEACHER)

    response = await client.patch(
        f"/teachers/{teacher.id}", json={**NEW, "identifier": teacher.username}
    )

    assert response.status_code == 200
    assert response.json()["teacher"]["first_name"] == "Ana"
    assert response.json()["teacher"]["email"] == "ana@example.com"
    assert response.json()["invitation_sent"] is None


@pytest.mark.usefixtures("admin")
async def test_update_rejects_data_of_another_account(
    client: AsyncClient, make_user: MakeUser
) -> None:
    teacher = await make_user(role=Role.TEACHER)
    other = await make_user()

    taken_id = await client.patch(
        f"/teachers/{teacher.id}", json={**NEW, "identifier": other.username}
    )
    taken_email = await client.patch(f"/teachers/{teacher.id}", json={**NEW, "email": other.email})

    assert (taken_id.status_code, code(taken_id)) == (409, "identifier_taken")
    assert (taken_email.status_code, code(taken_email)) == (409, "email_taken")


@pytest.mark.usefixtures("admin")
async def test_deactivated_teacher_cannot_log_in_and_reactivation_restores_state(
    client: AsyncClient, make_user: MakeUser
) -> None:
    teacher = await make_user(role=Role.TEACHER)
    credentials = {"credential": teacher.username, "password": PASSWORD}

    deactivated = await client.post(f"/teachers/{teacher.id}/deactivate")
    assert deactivated.json()["status"] == "disabled"
    assert code(await client.post("/auth/login", json=credentials)) == "account_disabled"
    assert (await client.post(f"/teachers/{teacher.id}/deactivate")).status_code == 409

    reactivated = await client.post(f"/teachers/{teacher.id}/reactivate")
    assert reactivated.json()["status"] == "active"
    assert (await client.post(f"/teachers/{teacher.id}/reactivate")).status_code == 409
    # último: iniciar sesión como el profesor sustituye la sesión del administrador
    assert (await client.post("/auth/login", json=credentials)).status_code == 200


@pytest.mark.usefixtures("admin")
async def test_resend_invalidates_previous_link(client: AsyncClient, mail: FakeEmailSender) -> None:
    created = await create(client)
    first = mail.last_token()

    response = await client.post(f"/teachers/{created.json()['teacher']['id']}/invitation")

    assert response.json() == {"invitation_sent": True}
    second = mail.last_token()
    assert second != first
    old = await client.post("/auth/activation", json={"token": first, "password": "new-password-1"})
    assert code(old) == "invalid_link"
    new = await client.post(
        "/auth/activation", json={"token": second, "password": "new-password-1"}
    )
    assert new.status_code == 204


@pytest.mark.usefixtures("admin")
async def test_resend_reports_failed_delivery_and_requires_pending_account(
    client: AsyncClient, make_user: MakeUser, mail: FakeEmailSender
) -> None:
    pending = await make_user(role=Role.TEACHER, status=AccountStatus.PENDING, password=None)
    active = await make_user(role=Role.TEACHER)
    mail.fail = True

    failed = await client.post(f"/teachers/{pending.id}/invitation")
    not_pending = await client.post(f"/teachers/{active.id}/invitation")

    assert failed.json() == {"invitation_sent": False}
    assert (not_pending.status_code, code(not_pending)) == (409, "invalid_status")


@pytest.mark.usefixtures("admin")
async def test_accounts_of_other_roles_are_not_found(
    client: AsyncClient, make_user: MakeUser
) -> None:
    student = await make_user(role=Role.STUDENT)

    for response in (
        await client.patch(f"/teachers/{student.id}", json=NEW),
        await client.post(f"/teachers/{student.id}/deactivate"),
        await client.post(f"/teachers/{student.id}/reactivate"),
        await client.post(f"/teachers/{student.id}/invitation"),
        await client.post("/teachers/0/deactivate"),
    ):
        assert (response.status_code, code(response)) == (404, "teacher_not_found")


@pytest.mark.parametrize("role", [Role.TEACHER, Role.STUDENT])
async def test_only_admins_can_manage_teachers(
    client: AsyncClient, make_user: MakeUser, role: Role
) -> None:
    user = await make_user(role=role)
    teacher = await make_user(role=Role.TEACHER)
    await client.post("/auth/login", json={"credential": user.username, "password": PASSWORD})

    responses = [
        await client.get("/teachers"),
        await create(client),
        await client.patch(f"/teachers/{teacher.id}", json=NEW),
        await client.post(f"/teachers/{teacher.id}/deactivate"),
        await client.post(f"/teachers/{teacher.id}/reactivate"),
        await client.post(f"/teachers/{teacher.id}/invitation"),
    ]

    assert [(r.status_code, code(r)) for r in responses] == [(403, "forbidden")] * len(responses)


async def test_teachers_require_a_session(client: AsyncClient) -> None:
    response = await client.get("/teachers")

    assert (response.status_code, code(response)) == (401, "not_authenticated")


@pytest.mark.usefixtures("admin")
async def test_listing_is_paginated_and_ordered(client: AsyncClient) -> None:
    for i in range(3):
        await create(
            client, identifier=f"zzpag-{i}", email=f"zzpag-{i}@example.com", last_name="Zzpag"
        )

    first = await listing(client, search="zzpag", page_size=2)
    second = await listing(client, search="zzpag", page_size=2, page=2)
    beyond = await listing(client, search="zzpag", page_size=2, page=3)

    assert (first["total"], first["page"], first["page_size"]) == (3, 1, 2)
    assert [t["identifier"] for t in first["items"] + second["items"]] == [
        "zzpag-0",
        "zzpag-1",
        "zzpag-2",
    ]
    assert len(second["items"]) == 1
    assert (beyond["items"], beyond["total"]) == ([], 3)


@pytest.mark.usefixtures("admin")
async def test_search_ignores_case_and_matches_name_identifier_and_email(
    client: AsyncClient,
) -> None:
    await create(client)

    for term in ("ANA P", "ANA.PEREZ", "ANA@EXAMPLE"):
        found = await listing(client, search=term)
        assert "ana.perez" in [t["identifier"] for t in found["items"]], term


@pytest.mark.usefixtures("admin")
@pytest.mark.parametrize("term", ["%", "_"])
async def test_search_wildcards_are_literal(client: AsyncClient, term: str) -> None:
    await create(client)

    assert (await listing(client, search=term))["total"] == 0


@pytest.mark.usefixtures("admin")
async def test_listing_filters_by_status(client: AsyncClient, make_user: MakeUser) -> None:
    disabled = await make_user(role=Role.TEACHER, status=AccountStatus.DISABLED)

    as_disabled = await listing(client, search=disabled.email, status="disabled")
    as_active = await listing(client, search=disabled.email, status="active")

    assert [t["id"] for t in as_disabled["items"]] == [disabled.id]
    assert as_active["items"] == []


@pytest.mark.usefixtures("admin")
@pytest.mark.parametrize(
    "params", [{"page": 0}, {"page_size": 0}, {"page_size": 101}, {"status": "bogus"}]
)
async def test_listing_rejects_invalid_parameters(
    client: AsyncClient, params: dict[str, int | str]
) -> None:
    assert (await client.get("/teachers", params=params)).status_code == 422


@pytest.mark.usefixtures("admin")
async def test_changing_email_of_pending_account_invalidates_old_link(
    client: AsyncClient, mail: FakeEmailSender
) -> None:
    created = await create(client, email="typo@example.com")
    old_token = mail.last_token()

    response = await client.patch(
        f"/teachers/{created.json()['teacher']['id']}", json={**NEW, "email": "right@example.com"}
    )

    assert response.json()["invitation_sent"] is True
    assert mail.sent[-1][0] == "right@example.com"
    old = await client.post(
        "/auth/activation", json={"token": old_token, "password": "new-password-1"}
    )
    assert code(old) == "invalid_link"
    new = await client.post(
        "/auth/activation", json={"token": mail.last_token(), "password": "new-password-1"}
    )
    assert new.status_code == 204


@pytest.mark.usefixtures("admin")
async def test_changing_email_reports_failed_invitation(
    client: AsyncClient, mail: FakeEmailSender
) -> None:
    created = await create(client, email="typo@example.com")
    mail.fail = True

    response = await client.patch(
        f"/teachers/{created.json()['teacher']['id']}", json={**NEW, "email": "right@example.com"}
    )

    assert (response.status_code, response.json()["invitation_sent"]) == (200, False)


@pytest.mark.usefixtures("admin")
async def test_editing_active_account_or_keeping_email_sends_nothing(
    client: AsyncClient, make_user: MakeUser, mail: FakeEmailSender
) -> None:
    active = await make_user(role=Role.TEACHER)
    pending = (await create(client)).json()["teacher"]
    sent = len(mail.sent)

    changed = await client.patch(
        f"/teachers/{active.id}", json={**NEW, "identifier": "otro", "email": active.email}
    )
    same_email = await client.patch(
        f"/teachers/{pending['id']}", json={**NEW, "email": NEW["email"].upper()}
    )

    assert changed.json()["invitation_sent"] is None
    assert same_email.json()["invitation_sent"] is None
    assert len(mail.sent) == sent


@pytest.mark.usefixtures("admin")
async def test_deactivation_closes_open_sessions_for_good(
    client: AsyncClient, make_user: MakeUser
) -> None:
    teacher = await make_user(role=Role.TEACHER)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as own:
        await own.post("/auth/login", json={"credential": teacher.username, "password": PASSWORD})
        assert (await own.get("/auth/me")).status_code == 200

        await client.post(f"/teachers/{teacher.id}/deactivate")
        await client.post(f"/teachers/{teacher.id}/reactivate")

        assert (await own.get("/auth/me")).status_code == 401
