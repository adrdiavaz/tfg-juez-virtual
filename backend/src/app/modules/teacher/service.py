from app.modules.auth.service import AuthService
from app.modules.teacher.exceptions import (
    EmailTaken,
    IdentifierTaken,
    InvalidStatus,
    TeacherNotFound,
)
from app.modules.teacher.schemas import TeacherIn, TeacherOut, TeacherPage
from app.modules.user.models import AccountStatus, Role, User
from app.modules.user.repository import UserRepository


class TeacherService:
    def __init__(self, users: UserRepository, auth: AuthService) -> None:
        self.users = users
        self.auth = auth

    async def _get(self, teacher_id: int) -> User:
        user = await self.users.get(teacher_id)
        if user is None or user.role is not Role.TEACHER:
            raise TeacherNotFound()
        return user

    async def _check_free(self, data: TeacherIn, exclude_id: int | None = None) -> None:
        if await self.users.credential_taken(data.identifier, exclude_id):
            raise IdentifierTaken()
        if await self.users.credential_taken(data.email, exclude_id):
            raise EmailTaken()

    async def list(
        self, *, page: int, page_size: int, search: str | None, status: AccountStatus | None
    ) -> TeacherPage:
        users, total = await self.users.search_by_role(
            Role.TEACHER,
            search=search.strip() if search else None,
            status=status,
            limit=page_size,
            offset=(page - 1) * page_size,
        )
        return TeacherPage(
            items=[TeacherOut.model_validate(user) for user in users],
            total=total,
            page=page,
            page_size=page_size,
        )

    async def create(self, data: TeacherIn, admin: User) -> tuple[User, bool]:
        await self._check_free(data)
        user = User(
            identifier=data.identifier,
            username=data.identifier,
            email=data.email,
            first_name=data.first_name,
            last_name=data.last_name,
            role=Role.TEACHER,
            status=AccountStatus.PENDING,
            registered_by_id=admin.id,
        )
        await self.users.add(user)
        return user, await self.auth.send_activation(user)

    async def update(self, teacher_id: int, data: TeacherIn) -> tuple[User, bool | None]:
        user = await self._get(teacher_id)
        await self._check_free(data, exclude_id=user.id)
        email_changed = user.email != data.email.lower()
        user.identifier = user.username = data.identifier
        user.email = data.email
        user.first_name = data.first_name
        user.last_name = data.last_name
        if email_changed and user.status is AccountStatus.PENDING:
            return user, await self.auth.send_activation(user)
        return user, None

    async def deactivate(self, teacher_id: int) -> User:
        user = await self._get(teacher_id)
        try:
            user.deactivate()
        except ValueError as error:
            raise InvalidStatus() from error
        await self.auth.sessions.delete_user_sessions(user.id)
        return user

    async def reactivate(self, teacher_id: int) -> User:
        user = await self._get(teacher_id)
        try:
            user.reactivate()
        except ValueError as error:
            raise InvalidStatus() from error
        return user

    async def resend_invitation(self, teacher_id: int) -> bool:
        user = await self._get(teacher_id)
        if user.status is not AccountStatus.PENDING:
            raise InvalidStatus()
        return await self.auth.send_activation(user)
