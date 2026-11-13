from collections.abc import AsyncGenerator

import pytest
from fastapi import Depends, FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_session
from app.modules.auth.dependencies import require_role
from app.modules.auth.router import router as auth_router
from app.modules.user.models import Role
from tests.conftest import PASSWORD, MakeUser

ROUTES = {Role.ADMIN: "/admin-only", Role.TEACHER: "/teacher-only", Role.STUDENT: "/student-only"}


@pytest.fixture
async def client(db: AsyncSession) -> AsyncGenerator[AsyncClient]:
    app = FastAPI()
    app.include_router(auth_router)

    for role, path in ROUTES.items():

        async def endpoint() -> dict[str, str]:
            return {"ok": "yes"}

        app.get(path, dependencies=[Depends(require_role(role))])(endpoint)

    async def override() -> AsyncGenerator[AsyncSession]:
        yield db

    app.dependency_overrides[get_session] = override
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest.mark.parametrize("role", list(Role))
@pytest.mark.parametrize("target", list(Role))
async def test_each_role_only_reaches_its_own_routes(
    client: AsyncClient, make_user: MakeUser, role: Role, target: Role
) -> None:
    user = await make_user(role=role)
    await client.post("/auth/login", json={"credential": user.username, "password": PASSWORD})

    response = await client.get(ROUTES[target])

    if role is target:
        assert response.status_code == 200
    else:
        assert response.status_code == 403
        assert response.json()["detail"]["code"] == "forbidden"


@pytest.mark.parametrize("path", ROUTES.values())
async def test_routes_require_a_session(client: AsyncClient, path: str) -> None:
    response = await client.get(path)

    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "not_authenticated"
