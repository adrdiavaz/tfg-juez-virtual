from collections.abc import Sequence

from sqlalchemy import ColumnElement, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.user.models import AccountStatus, Role, User


def _matches(credential: str) -> ColumnElement[bool]:
    return or_(
        User.identifier == credential,
        User.username == credential,
        User.email == credential.lower(),
    )


class UserRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_credential(self, credential: str) -> User | None:
        return await self.db.scalar(select(User).where(_matches(credential)))

    async def get(self, user_id: int) -> User | None:
        return await self.db.get(User, user_id)

    async def add(self, user: User) -> None:
        self.db.add(user)
        await self.db.flush()

    async def search_by_role(
        self,
        role: Role,
        *,
        search: str | None,
        status: AccountStatus | None,
        limit: int,
        offset: int,
    ) -> tuple[Sequence[User], int]:
        where = [User.role == role]
        if status:
            where.append(User.status == status)
        if search:
            full_name = func.concat(User.first_name, " ", User.last_name)
            where.append(
                or_(
                    full_name.icontains(search, autoescape=True),
                    User.identifier.icontains(search, autoescape=True),
                    User.email.icontains(search, autoescape=True),
                )
            )
        total = await self.db.scalar(select(func.count()).select_from(User).where(*where))
        page = await self.db.scalars(
            select(User).where(*where).order_by(User.username, User.id).limit(limit).offset(offset)
        )
        return page.all(), total or 0

    async def credential_taken(self, credential: str, exclude_id: int | None = None) -> bool:
        query = select(User.id).where(_matches(credential))
        if exclude_id is not None:
            query = query.where(User.id != exclude_id)
        return await self.db.scalar(query.limit(1)) is not None
