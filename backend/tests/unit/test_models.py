from datetime import UTC, datetime, timedelta

import pytest

from app.modules.auth.models import AccountToken, TokenType
from app.modules.user.models import AccountStatus, Role, User

NOW = datetime.now(UTC)


def make_user(status: AccountStatus, password_hash: str | None = "hash") -> User:
    return User(
        identifier="id",
        username="u",
        email="  Ana@Example.COM ",
        first_name="U",
        last_name="U",
        password_hash=password_hash,
        role=Role.STUDENT,
        status=status,
    )


def test_email_is_normalized() -> None:
    assert make_user(AccountStatus.ACTIVE).email == "ana@example.com"


def test_activate_sets_password_and_status() -> None:
    user = make_user(AccountStatus.PENDING, password_hash=None)
    user.activate("new-hash")
    assert (user.status, user.password_hash) == (AccountStatus.ACTIVE, "new-hash")


def test_activate_rejects_non_pending() -> None:
    with pytest.raises(ValueError):
        make_user(AccountStatus.ACTIVE).activate("x")


@pytest.mark.parametrize("initial", [AccountStatus.PENDING, AccountStatus.ACTIVE])
def test_reactivate_restores_the_status_before_deactivation(initial: AccountStatus) -> None:
    user = make_user(initial)
    user.deactivate()
    assert (user.status, user.previous_status) == (AccountStatus.DISABLED, initial)
    user.reactivate()
    assert (user.status, user.previous_status) == (initial, None)


@pytest.mark.parametrize(
    ("password_hash", "expected"), [("hash", AccountStatus.ACTIVE), (None, AccountStatus.PENDING)]
)
def test_reactivate_without_previous_status_infers_it(
    password_hash: str | None, expected: AccountStatus
) -> None:
    user = make_user(AccountStatus.DISABLED, password_hash)
    user.reactivate()
    assert user.status is expected


def test_invalid_transitions_raise() -> None:
    with pytest.raises(ValueError):
        make_user(AccountStatus.DISABLED).deactivate()
    with pytest.raises(ValueError):
        make_user(AccountStatus.ACTIVE).reactivate()


def make_token(**overrides: object) -> AccountToken:
    fields: dict[str, object] = {
        "token_hash": "h",
        "user_id": 1,
        "type": TokenType.ACTIVATION,
        "expires_at": NOW + timedelta(hours=1),
        "used_at": None,
        "invalidated": False,
    }
    return AccountToken(**(fields | overrides))


@pytest.mark.parametrize(
    ("overrides", "valid"),
    [
        ({}, True),
        ({"expires_at": NOW - timedelta(seconds=1)}, False),
        ({"used_at": NOW}, False),
        ({"invalidated": True}, False),
    ],
)
def test_token_validity(overrides: dict[str, object], valid: bool) -> None:
    assert make_token(**overrides).is_valid(NOW) is valid
