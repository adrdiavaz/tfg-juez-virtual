import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.create_admin import create_admin
from app.modules.auth.security import verify_password
from app.modules.user.models import AccountStatus, Role, User
from tests.conftest import MakeUser


async def test_creates_an_active_admin_once(db: AsyncSession) -> None:
    assert await create_admin(db, "root", "root@example.com", "long-enough-1") is True
    assert await create_admin(db, "root", "root@example.com", "other-password") is False

    admin = await db.scalar(select(User).where(User.username == "root"))
    assert admin is not None
    assert (admin.role, admin.status) == (Role.ADMIN, AccountStatus.ACTIVE)
    assert admin.password_hash and verify_password("long-enough-1", admin.password_hash)
    assert await db.scalar(select(func.count()).where(User.username == "root")) == 1


@pytest.mark.parametrize("field", ["username", "email"])
async def test_does_not_touch_an_existing_account(
    db: AsyncSession, make_user: MakeUser, field: str
) -> None:
    other = await make_user(role=Role.TEACHER)
    values = {"username": "root", "email": "root@example.com", field: getattr(other, field)}

    assert await create_admin(db, values["username"], values["email"], "long-enough-1") is False
    assert other.role is Role.TEACHER


async def test_rejects_short_passwords(db: AsyncSession) -> None:
    with pytest.raises(ValueError):
        await create_admin(db, "root", "root@example.com", "short")
