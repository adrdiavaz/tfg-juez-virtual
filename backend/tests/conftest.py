import uuid
from collections.abc import AsyncGenerator, Awaitable, Callable

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool

from app.db.database import DATABASE_URL, get_session
from app.main import app
from app.modules.auth.security import hash_password
from app.modules.user.models import AccountStatus, Role, User

PASSWORD = "correct-horse"

MakeUser = Callable[..., Awaitable[User]]


@pytest.fixture
async def db() -> AsyncGenerator[AsyncSession]:
    """Every test runs inside a transaction that is rolled back at the end."""
    engine = create_async_engine(DATABASE_URL, poolclass=NullPool)
    async with engine.connect() as conn:
        transaction = await conn.begin()
        session = AsyncSession(
            bind=conn, expire_on_commit=False, join_transaction_mode="create_savepoint"
        )
        yield session
        await session.close()
        await transaction.rollback()
    await engine.dispose()


@pytest.fixture
async def client(db: AsyncSession) -> AsyncGenerator[AsyncClient]:
    async def override() -> AsyncGenerator[AsyncSession]:
        yield db

    app.dependency_overrides[get_session] = override
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def make_user(db: AsyncSession) -> MakeUser:
    async def factory(
        role: Role = Role.STUDENT,
        status: AccountStatus = AccountStatus.ACTIVE,
        password: str | None = PASSWORD,
    ) -> User:
        suffix = uuid.uuid4().hex[:8]
        user = User(
            identifier=f"id-{suffix}",
            username=f"user-{suffix}",
            email=f"{suffix}@example.com",
            first_name="Test",
            last_name="User",
            password_hash=hash_password(password) if password else None,
            role=role,
            status=status,
        )
        db.add(user)
        await db.flush()
        return user

    return factory
