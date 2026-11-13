from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import AuthSession
from app.modules.auth.repository import AuthRepository
from app.modules.user.models import AccountStatus
from tests.conftest import MakeUser

NOW = datetime.now(UTC)


async def test_returns_the_user_of_an_active_session(db: AsyncSession, make_user: MakeUser) -> None:
    user = await make_user()
    repository = AuthRepository(db)
    await repository.add(
        AuthSession(token_hash="h", user_id=user.id, expires_at=NOW + timedelta(hours=1))
    )
    await db.flush()

    assert await repository.get_active_user("h", NOW) is user


async def test_expired_session_returns_none(db: AsyncSession, make_user: MakeUser) -> None:
    user = await make_user()
    repository = AuthRepository(db)
    await repository.add(
        AuthSession(token_hash="h", user_id=user.id, expires_at=NOW - timedelta(hours=1))
    )
    await db.flush()

    assert await repository.get_active_user("h", NOW) is None


async def test_disabled_user_session_returns_none(db: AsyncSession, make_user: MakeUser) -> None:
    user = await make_user(status=AccountStatus.DISABLED)
    repository = AuthRepository(db)
    await repository.add(
        AuthSession(token_hash="h", user_id=user.id, expires_at=NOW + timedelta(hours=1))
    )
    await db.flush()

    assert await repository.get_active_user("h", NOW) is None
