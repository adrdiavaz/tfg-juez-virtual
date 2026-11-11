from datetime import UTC, datetime, timedelta

from app.core.config import settings
from app.modules.auth.exceptions import (
    AccountDisabled,
    AccountPending,
    InvalidCredentials,
)
from app.modules.auth.models import AuthSession
from app.modules.auth.repository import AuthRepository
from app.modules.auth.security import (
    DUMMY_HASH,
    generate_token,
    hash_token,
    verify_password,
)
from app.modules.user.models import AccountStatus, User
from app.modules.user.repository import UserRepository


class AuthService:
    def __init__(self, users: UserRepository, sessions: AuthRepository) -> None:
        self.users = users
        self.sessions = sessions

    async def authenticate(self, credential: str, password: str) -> User:
        user = await self.users.get_by_credential(credential.strip())
        stored_hash = user.password_hash if user and user.password_hash else None
        is_valid = verify_password(password, stored_hash or DUMMY_HASH)

        if user is None or stored_hash is None or not is_valid:
            raise InvalidCredentials()
        if user.status is AccountStatus.PENDING:
            raise AccountPending()
        if user.status is AccountStatus.DISABLED:
            raise AccountDisabled()
        return user

    async def login(self, credential: str, password: str) -> tuple[User, str]:
        user = await self.authenticate(credential, password)
        token = generate_token()
        await self.sessions.add(
            AuthSession(
                token_hash=hash_token(token),
                user_id=user.id,
                expires_at=datetime.now(UTC) + timedelta(hours=settings.session_ttl_hours),
            )
        )
        return user, token

    async def logout(self, token: str) -> None:
        await self.sessions.delete_by_token_hash(hash_token(token))

    async def get_user_by_token(self, token: str) -> User | None:
        return await self.sessions.get_active_user(hash_token(token), datetime.now(UTC))
