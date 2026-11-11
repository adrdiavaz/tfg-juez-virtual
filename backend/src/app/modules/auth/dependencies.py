from collections.abc import Awaitable, Callable
from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_session
from app.modules.auth.repository import AuthRepository
from app.modules.auth.service import AuthService
from app.modules.user.models import Role, User
from app.modules.user.repository import UserRepository

SESSION_COOKIE = "session"

SessionToken = Annotated[str | None, Cookie(alias=SESSION_COOKIE)]


def get_auth_service(db: Annotated[AsyncSession, Depends(get_session)]) -> AuthService:
    return AuthService(UserRepository(db), AuthRepository(db))


async def get_current_user(
    service: Annotated[AuthService, Depends(get_auth_service)],
    session_token: SessionToken = None,
) -> User:
    user = await service.get_user_by_token(session_token) if session_token else None
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED)
    return user


def require_role(*roles: Role) -> Callable[..., Awaitable[User]]:
    async def dependency(user: Annotated[User, Depends(get_current_user)]) -> User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN)
        return user

    return dependency
