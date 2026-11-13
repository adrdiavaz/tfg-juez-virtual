from unittest.mock import AsyncMock, MagicMock

import pytest

from app.modules.auth.exceptions import AccountDisabled, AccountPending, InvalidCredentials
from app.modules.auth.repository import AuthRepository
from app.modules.auth.security import hash_password
from app.modules.auth.service import AuthService
from app.modules.user.models import AccountStatus, Role, User
from app.modules.user.repository import UserRepository

PASSWORD = "correct-horse"


def make_service(user: User | None) -> AuthService:
    users = MagicMock(spec=UserRepository)
    users.get_by_credential = AsyncMock(return_value=user)
    sessions = MagicMock(spec=AuthRepository)
    return AuthService(users, sessions)


def make_user(status: AccountStatus) -> User:
    return User(
        id=1,
        identifier="id",
        username="u",
        email="u@example.com",
        first_name="U",
        last_name="U",
        password_hash=hash_password(PASSWORD),
        role=Role.STUDENT,
        status=status,
    )


async def test_active_account_with_valid_password_authenticates() -> None:
    user = make_user(AccountStatus.ACTIVE)

    assert await make_service(user).authenticate("u", PASSWORD) is user


async def test_unknown_account_is_invalid_credentials() -> None:
    with pytest.raises(InvalidCredentials):
        await make_service(None).authenticate("u", PASSWORD)


async def test_wrong_password_is_invalid_credentials() -> None:
    with pytest.raises(InvalidCredentials):
        await make_service(make_user(AccountStatus.ACTIVE)).authenticate("u", "wrong")


async def test_pending_account_is_rejected() -> None:
    with pytest.raises(AccountPending):
        await make_service(make_user(AccountStatus.PENDING)).authenticate("u", PASSWORD)


async def test_pending_account_is_rejected_with_any_password() -> None:
    with pytest.raises(AccountPending):
        await make_service(make_user(AccountStatus.PENDING)).authenticate("u", "wrong")


async def test_disabled_account_is_rejected() -> None:
    with pytest.raises(AccountDisabled):
        await make_service(make_user(AccountStatus.DISABLED)).authenticate("u", PASSWORD)


async def test_status_is_not_revealed_with_a_wrong_password() -> None:
    with pytest.raises(InvalidCredentials):
        await make_service(make_user(AccountStatus.DISABLED)).authenticate("u", "wrong")
