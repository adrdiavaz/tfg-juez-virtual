from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.user.models import User


class UserRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_credential(self, credential: str) -> User | None:
        return await self.db.scalar(
            select(User).where(
                or_(
                    User.identifier == credential,
                    User.username == credential,
                    User.email == credential.lower(),
                )
            )
        )

    async def get(self, user_id: int) -> User | None:
        return await self.db.get(User, user_id)
