from typing import Annotated

from fastapi import APIRouter, Depends, Response, status

from app.core.config import settings
from app.modules.auth.dependencies import (
    SESSION_COOKIE,
    SessionToken,
    get_auth_service,
    get_current_user,
)
from app.modules.auth.schemas import LoginRequest
from app.modules.auth.service import AuthService
from app.modules.user.models import User
from app.modules.user.schemas import UserPublic

router = APIRouter(prefix="/auth", tags=["auth"])

Service = Annotated[AuthService, Depends(get_auth_service)]


@router.post("/login", response_model=UserPublic)
async def login(body: LoginRequest, response: Response, service: Service) -> User:
    user, token = await service.login(body.credential, body.password)
    response.set_cookie(
        SESSION_COOKIE,
        token,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        max_age=settings.session_ttl_hours * 3600,
    )
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response, service: Service, session_token: SessionToken = None) -> None:
    if session_token:
        await service.logout(session_token)
    response.delete_cookie(SESSION_COOKIE)


@router.get("/me", response_model=UserPublic)
async def me(user: Annotated[User, Depends(get_current_user)]) -> User:
    return user
