import pytest
from httpx import AsyncClient

from app.modules.user.models import AccountStatus
from tests.conftest import PASSWORD, FakeEmailSender, MakeUser


def request(client: AsyncClient, credential: str):
    return client.post("/auth/password-reset", json={"credential": credential})


def confirm(client: AsyncClient, token: str, password: str = "new-password-1"):
    return client.post("/auth/password-reset/confirm", json={"token": token, "password": password})


async def test_active_account_receives_link_and_resets_password(
    client: AsyncClient, mail: FakeEmailSender, make_user: MakeUser
) -> None:
    user = await make_user()

    response = await request(client, user.email)

    assert response.status_code == 202
    assert [m[0] for m in mail.sent] == [user.email]
    assert (await confirm(client, mail.last_token())).status_code == 204
    login = await client.post(
        "/auth/login", json={"credential": user.username, "password": "new-password-1"}
    )
    assert login.status_code == 200


@pytest.mark.parametrize("status", [AccountStatus.PENDING, AccountStatus.DISABLED])
async def test_same_response_and_no_email_when_not_active_or_unknown(
    client: AsyncClient, mail: FakeEmailSender, make_user: MakeUser, status: AccountStatus
) -> None:
    user = await make_user(status=status)
    active = await make_user()

    unknown = await request(client, "nobody")
    inactive = await request(client, user.username)
    known = await request(client, active.username)

    assert unknown.status_code == inactive.status_code == known.status_code == 202
    assert unknown.content == inactive.content == known.content
    assert len(mail.sent) == 1


async def test_link_is_single_use_and_new_request_invalidates_previous(
    client: AsyncClient, mail: FakeEmailSender, make_user: MakeUser
) -> None:
    user = await make_user()
    await request(client, user.username)
    first = mail.last_token()
    await request(client, user.username)

    assert (await confirm(client, first)).status_code == 400
    second = mail.last_token()
    assert (await confirm(client, second)).status_code == 204
    assert (await confirm(client, second)).status_code == 400


async def test_reset_closes_open_sessions(
    client: AsyncClient, mail: FakeEmailSender, make_user: MakeUser
) -> None:
    user = await make_user()
    await client.post("/auth/login", json={"credential": user.username, "password": PASSWORD})
    assert (await client.get("/auth/me")).status_code == 200
    await request(client, user.username)

    await confirm(client, mail.last_token())

    assert (await client.get("/auth/me")).status_code == 401


async def test_short_password_is_rejected_and_link_stays_usable(
    client: AsyncClient, mail: FakeEmailSender, make_user: MakeUser
) -> None:
    user = await make_user()
    await request(client, user.username)
    token = mail.last_token()

    assert (await confirm(client, token, "short")).status_code == 422
    assert (await confirm(client, token)).status_code == 204
