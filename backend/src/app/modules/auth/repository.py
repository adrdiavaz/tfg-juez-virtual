from datetime import datetime

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import AccountToken, AuthSession, TokenType
from app.modules.user.models import AccountStatus, User


class AuthRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def add(self, session: AuthSession) -> None:
        self.db.add(session)
        await self.db.flush()

    async def delete_by_token_hash(self, token_hash: str) -> None:
        await self.db.execute(delete(AuthSession).where(AuthSession.token_hash == token_hash))

    async def get_active_user(self, token_hash: str, now: datetime) -> User | None:
        return await self.db.scalar(
            select(User)
            .join(AuthSession, AuthSession.user_id == User.id)
            .where(
                AuthSession.token_hash == token_hash,
                AuthSession.expires_at > now,
                User.status == AccountStatus.ACTIVE,
            )
        )

    async def add_token(self, token: AccountToken) -> None:
        self.db.add(token)
        await self.db.flush()

    async def get_valid_token(
        self, token_hash: str, type: TokenType, now: datetime
    ) -> AccountToken | None:
        token = await self.db.scalar(
            select(AccountToken)
            .where(AccountToken.token_hash == token_hash, AccountToken.type == type)
            .with_for_update()
        )
        return token if token and token.is_valid(now) else None

    async def invalidate_tokens(self, user_id: int, type: TokenType) -> None:
        await self.db.execute(
            update(AccountToken)
            .where(AccountToken.user_id == user_id, AccountToken.type == type)
            .values(invalidated=True)
        )

    async def delete_user_sessions(self, user_id: int) -> None:
        await self.db.execute(delete(AuthSession).where(AuthSession.user_id == user_id))
