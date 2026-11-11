from datetime import datetime

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import AuthSession
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
