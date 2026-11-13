import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.user.repository import UserRepository
from tests.conftest import MakeUser


@pytest.mark.parametrize("field", ["identifier", "username", "email"])
async def test_finds_user_by_each_credential(
    db: AsyncSession, make_user: MakeUser, field: str
) -> None:
    user = await make_user()

    found = await UserRepository(db).get_by_credential(getattr(user, field))

    assert found is user


async def test_email_lookup_ignores_case(db: AsyncSession, make_user: MakeUser) -> None:
    user = await make_user()

    assert await UserRepository(db).get_by_credential(user.email.upper()) is user


async def test_unknown_credential_returns_none(db: AsyncSession) -> None:
    assert await UserRepository(db).get_by_credential("nobody") is None
