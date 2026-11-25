from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_session
from app.modules.auth.dependencies import get_auth_service, require_role
from app.modules.auth.service import AuthService
from app.modules.teacher.schemas import (
    InvitationResult,
    TeacherIn,
    TeacherOut,
    TeacherPage,
    TeacherSaved,
)
from app.modules.teacher.service import TeacherService
from app.modules.user.models import AccountStatus, Role, User
from app.modules.user.repository import UserRepository

require_admin = require_role(Role.ADMIN)

router = APIRouter(prefix="/teachers", tags=["teachers"], dependencies=[Depends(require_admin)])


def get_teacher_service(
    db: Annotated[AsyncSession, Depends(get_session)],
    auth: Annotated[AuthService, Depends(get_auth_service)],
) -> TeacherService:
    return TeacherService(UserRepository(db), auth)


Service = Annotated[TeacherService, Depends(get_teacher_service)]


@router.get("", response_model=TeacherPage)
async def list_teachers(
    service: Service,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 10,
    search: Annotated[str | None, Query(max_length=255)] = None,
    status: AccountStatus | None = None,
) -> TeacherPage:
    return await service.list(page=page, page_size=page_size, search=search, status=status)


@router.post("", response_model=TeacherSaved, status_code=status.HTTP_201_CREATED)
async def create_teacher(
    body: TeacherIn, service: Service, admin: Annotated[User, Depends(require_admin)]
) -> TeacherSaved:
    user, invitation_sent = await service.create(body, admin)
    return TeacherSaved(teacher=TeacherOut.model_validate(user), invitation_sent=invitation_sent)


@router.patch("/{teacher_id}", response_model=TeacherSaved)
async def update_teacher(teacher_id: int, body: TeacherIn, service: Service) -> TeacherSaved:
    user, invitation_sent = await service.update(teacher_id, body)
    return TeacherSaved(teacher=TeacherOut.model_validate(user), invitation_sent=invitation_sent)


@router.post("/{teacher_id}/deactivate", response_model=TeacherOut)
async def deactivate_teacher(teacher_id: int, service: Service) -> User:
    return await service.deactivate(teacher_id)


@router.post("/{teacher_id}/reactivate", response_model=TeacherOut)
async def reactivate_teacher(teacher_id: int, service: Service) -> User:
    return await service.reactivate(teacher_id)


@router.post("/{teacher_id}/invitation", response_model=InvitationResult)
async def resend_invitation(teacher_id: int, service: Service) -> InvitationResult:
    return InvitationResult(invitation_sent=await service.resend_invitation(teacher_id))
