from datetime import UTC, datetime, timedelta

from httpx import AsyncClient
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import AccountToken
from app.modules.auth.repository import AuthRepository
from app.modules.auth.service import AuthService
from app.modules.user.models import AccountStatus, User
from app.modules.user.repository import UserRepository
from tests.conftest import FakeEmailSender, MakeUser


async def invite(db: AsyncSession, mail: FakeEmailSender, make_user: MakeUser) -> tuple[User, str]:
    user = await make_user(status=AccountStatus.PENDING, password=None)
    assert await AuthService(UserRepository(db), AuthRepository(db), mail).send_activation(user)
    return user, mail.last_token()


def activate(client: AsyncClient, token: str, password: str = "new-password-1"):
    return client.post("/auth/activation", json={"token": token, "password": password})


async def test_activation_sets_password_and_allows_login(
    client: AsyncClient, db: AsyncSession, mail: FakeEmailSender, make_user: MakeUser
) -> None:
    user, token = await invite(db, mail, make_user)

    info = await client.get("/auth/activation", params={"token": token})
    assert info.json() == {"email": user.email}

    assert (await activate(client, token)).status_code == 204
    login = await client.post(
        "/auth/login", json={"credential": user.username, "password": "new-password-1"}
    )
    assert login.status_code == 200


async def test_activation_link_is_single_use(
    client: AsyncClient, db: AsyncSession, mail: FakeEmailSender, make_user: MakeUser
) -> None:
    _, token = await invite(db, mail, make_user)
    await activate(client, token)

    again = await activate(client, token)

    assert again.status_code == 400
    assert again.json()["detail"]["code"] == "invalid_link"
    assert (await client.get("/auth/activation", params={"token": token})).status_code == 400


async def test_expired_link_is_invalid(
    client: AsyncClient, db: AsyncSession, mail: FakeEmailSender, make_user: MakeUser
) -> None:
    _, token = await invite(db, mail, make_user)
    await db.execute(update(AccountToken).values(expires_at=datetime.now(UTC) - timedelta(1)))

    assert (await activate(client, token)).status_code == 400


async def test_resending_invalidates_previous_link(
    client: AsyncClient, db: AsyncSession, mail: FakeEmailSender, make_user: MakeUser
) -> None:
    user, old = await invite(db, mail, make_user)
    await AuthService(UserRepository(db), AuthRepository(db), mail).send_activation(user)

    assert (await activate(client, old)).status_code == 400
    assert (await activate(client, mail.last_token())).status_code == 204


async def test_unknown_token_and_short_password(
    client: AsyncClient, db: AsyncSession, mail: FakeEmailSender, make_user: MakeUser
) -> None:
    _, token = await invite(db, mail, make_user)

    assert (await activate(client, "nope")).status_code == 400
    short = await activate(client, token, "short")
    assert short.status_code == 422
    assert "password" in short.json()["detail"][0]["loc"]
    assert (await activate(client, token)).status_code == 204  # still usable


async def test_failed_send_keeps_the_account(
    db: AsyncSession, mail: FakeEmailSender, make_user: MakeUser
) -> None:
    user = await make_user(status=AccountStatus.PENDING, password=None)
    mail.fail = True

    sent = await AuthService(UserRepository(db), AuthRepository(db), mail).send_activation(user)

    assert sent is False
    assert user.status is AccountStatus.PENDING


async def test_active_account_link_is_invalid(
    client: AsyncClient, db: AsyncSession, mail: FakeEmailSender, make_user: MakeUser
) -> None:
    user, token = await invite(db, mail, make_user)
    user.activate("hash")
    await db.flush()

    assert (await client.get("/auth/activation", params={"token": token})).status_code == 400
