import logging
from datetime import UTC, datetime, timedelta

from app.core.config import settings
from app.integrations.email.sender import EmailSender
from app.modules.auth.exceptions import (
    AccountDisabled,
    AccountPending,
    InvalidCredentials,
    InvalidLink,
)
from app.modules.auth.models import AccountToken, AuthSession, TokenType
from app.modules.auth.repository import AuthRepository
from app.modules.auth.security import (
    DUMMY_HASH,
    generate_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.modules.user.models import AccountStatus, User
from app.modules.user.repository import UserRepository

logger = logging.getLogger(__name__)


class AuthService:
    def __init__(self, users: UserRepository, sessions: AuthRepository, mail: EmailSender) -> None:
        self.users = users
        self.sessions = sessions
        self.mail = mail

    async def authenticate(self, credential: str, password: str) -> User:
        user = await self.users.get_by_credential(credential.strip())
        if user and user.status is AccountStatus.PENDING:
            raise AccountPending()
        stored_hash = user.password_hash if user and user.password_hash else None
        is_valid = verify_password(password, stored_hash or DUMMY_HASH)

        if user is None or stored_hash is None or not is_valid:
            raise InvalidCredentials()
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

    async def _issue_token(self, user: User, type: TokenType, ttl: timedelta) -> str:
        await self.sessions.invalidate_tokens(user.id, type)
        token = generate_token()
        await self.sessions.add_token(
            AccountToken(
                token_hash=hash_token(token),
                user_id=user.id,
                type=type,
                expires_at=datetime.now(UTC) + ttl,
            )
        )
        return token

    async def _consume_token(self, token: str, type: TokenType, status: AccountStatus) -> User:
        now = datetime.now(UTC)
        account_token = await self.sessions.get_valid_token(hash_token(token), type, now)
        user = await self.users.get(account_token.user_id) if account_token else None
        if account_token is None or user is None or user.status is not status:
            raise InvalidLink()
        account_token.used_at = now
        return user

    async def _send(self, to: str, subject: str, body: str) -> bool:
        try:
            await self.mail.send(to, subject, body)
        except Exception:
            logger.exception("Could not send email")
            return False
        return True

    async def send_activation(self, user: User) -> bool:
        token = await self._issue_token(
            user, TokenType.ACTIVATION, timedelta(hours=settings.activation_ttl_hours)
        )
        return await self._send(
            user.email,
            "Activa tu cuenta en Juez virtual",
            f"Hola {user.first_name},\n\nActiva tu cuenta y establece tu contraseña desde este "
            f"enlace (caduca en {settings.activation_ttl_hours} horas):\n"
            f"{settings.frontend_url}/activate?token={token}\n",
        )

    async def get_activation_email(self, token: str) -> str:
        account_token = await self.sessions.get_valid_token(
            hash_token(token), TokenType.ACTIVATION, datetime.now(UTC)
        )
        user = await self.users.get(account_token.user_id) if account_token else None
        if user is None or user.status is not AccountStatus.PENDING:
            raise InvalidLink()
        return user.email

    async def activate(self, token: str, password: str) -> None:
        user = await self._consume_token(token, TokenType.ACTIVATION, AccountStatus.PENDING)
        user.activate(hash_password(password))

    async def request_password_reset(self, credential: str) -> tuple[str, str] | None:
        user = await self.users.get_by_credential(credential.strip())
        if user is None or user.status is not AccountStatus.ACTIVE:
            return None
        token = await self._issue_token(
            user,
            TokenType.PASSWORD_RESET,
            timedelta(minutes=settings.password_reset_ttl_minutes),
        )
        return user.email, token

    async def send_password_reset(self, email: str, token: str) -> None:
        await self._send(
            email,
            "Restablece tu contraseña en Juez virtual",
            "Restablece tu contraseña desde este enlace "
            f"(caduca en {settings.password_reset_ttl_minutes} minutos):\n"
            f"{settings.frontend_url}/reset-password?token={token}\n\n"
            "Si no lo has solicitado, ignora este correo.\n",
        )

    async def reset_password(self, token: str, password: str) -> None:
        user = await self._consume_token(token, TokenType.PASSWORD_RESET, AccountStatus.ACTIVE)
        user.password_hash = hash_password(password)
        await self.sessions.delete_user_sessions(user.id)
