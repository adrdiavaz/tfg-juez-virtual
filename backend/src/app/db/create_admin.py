"""Crea la cuenta de administrador a partir de ADMIN_* (.env). Idempotente.

Uso: uv run python -m app.db.create_admin
"""

import asyncio

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.database import AsyncSessionLocal, engine
from app.modules.auth.security import hash_password
from app.modules.user.models import AccountStatus, Role, User
from app.modules.user.repository import UserRepository

MIN_PASSWORD_LENGTH = 8


async def create_admin(db: AsyncSession, username: str, email: str, password: str) -> bool:
    """Devuelve False, sin tocar nada, si el usuario o el correo ya pertenecen a una cuenta."""
    if len(password) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"ADMIN_PASSWORD must have at least {MIN_PASSWORD_LENGTH} characters")
    users = UserRepository(db)
    if await users.credential_taken(username) or await users.credential_taken(email):
        return False
    await users.add(
        User(
            identifier=username,
            username=username,
            email=email,
            first_name="Administrador",
            last_name="",
            password_hash=hash_password(password),
            role=Role.ADMIN,
            status=AccountStatus.ACTIVE,
        )
    )
    return True


async def main() -> None:
    username, email, password = (
        settings.admin_username,
        settings.admin_email,
        settings.admin_password,
    )
    if not (username and email and password):
        raise SystemExit("Define ADMIN_USERNAME, ADMIN_EMAIL y ADMIN_PASSWORD en el entorno.")
    try:
        async with AsyncSessionLocal() as db:
            created = await create_admin(db, username, email, password)
            await db.commit()
    except ValueError as error:
        raise SystemExit(str(error)) from error
    finally:
        await engine.dispose()
    print(
        f"Administrador «{username}» creado."
        if created
        else "Ya existe una cuenta con ese usuario o correo; no se ha creado nada."
    )


if __name__ == "__main__":
    asyncio.run(main())
