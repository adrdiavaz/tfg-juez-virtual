import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.user.models import AccountStatus
from tests.conftest import PASSWORD, MakeUser


def login(client: AsyncClient, credential: str, password: str = PASSWORD):
    return client.post("/auth/login", json={"credential": credential, "password": password})


@pytest.mark.parametrize("field", ["identifier", "username", "email"])
async def test_login_with_identifier_username_or_email(
    client: AsyncClient, make_user: MakeUser, field: str
) -> None:
    user = await make_user()

    response = await login(client, getattr(user, field))

    assert response.status_code == 200
    assert "session" in response.cookies
    assert response.json()["username"] == user.username
    assert "password_hash" not in response.json()


async def test_wrong_password_and_unknown_user_return_the_same_response(
    client: AsyncClient, make_user: MakeUser
) -> None:
    user = await make_user()

    wrong_password = await login(client, user.username, "wrong")
    unknown_user = await login(client, "nobody")

    assert wrong_password.status_code == unknown_user.status_code == 401
    assert wrong_password.json() == unknown_user.json()


async def test_pending_account_cannot_log_in(client: AsyncClient, make_user: MakeUser) -> None:
    user = await make_user(status=AccountStatus.PENDING)

    response = await login(client, user.username)

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "account_pending"


async def test_pending_account_without_password_is_told_to_activate(
    client: AsyncClient, make_user: MakeUser
) -> None:
    user = await make_user(status=AccountStatus.PENDING, password=None)

    response = await login(client, user.username, "anything")

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "account_pending"


async def test_disabled_account_cannot_log_in(client: AsyncClient, make_user: MakeUser) -> None:
    user = await make_user(status=AccountStatus.DISABLED)

    response = await login(client, user.username)

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "account_disabled"


async def test_password_is_stored_hashed(make_user: MakeUser) -> None:
    user = await make_user()

    assert user.password_hash is not None
    assert user.password_hash.startswith("$argon2")
    assert PASSWORD not in user.password_hash


async def test_me_requires_a_session(client: AsyncClient) -> None:
    response = await client.get("/auth/me")

    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "not_authenticated"


async def test_logout_invalidates_the_session(client: AsyncClient, make_user: MakeUser) -> None:
    user = await make_user()
    token = (await login(client, user.username)).cookies["session"]
    assert (await client.get("/auth/me")).status_code == 200

    assert (await client.post("/auth/logout")).status_code == 204

    # The old cookie is no longer accepted by the server
    client.cookies.set("session", token)
    assert (await client.get("/auth/me")).status_code == 401


async def test_disabled_user_loses_the_active_session(
    client: AsyncClient, make_user: MakeUser, db: AsyncSession
) -> None:
    user = await make_user()
    await login(client, user.username)

    user.status = AccountStatus.DISABLED
    await db.flush()

    assert (await client.get("/auth/me")).status_code == 401
