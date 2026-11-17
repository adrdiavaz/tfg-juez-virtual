"""Development accounts. Run with: uv run python -m app.db.seed"""

import asyncio

from sqlalchemy import select

from app.db.database import AsyncSessionLocal, engine
from app.integrations.email.sender import get_email_sender
from app.modules.auth.repository import AuthRepository
from app.modules.auth.security import hash_password
from app.modules.auth.service import AuthService
from app.modules.user.models import AccountStatus, Role, User
from app.modules.user.repository import UserRepository

PASSWORD = "password123"

ACCOUNTS = [
    ("admin", Role.ADMIN, AccountStatus.ACTIVE),
    ("teacher", Role.TEACHER, AccountStatus.ACTIVE),
    ("student", Role.STUDENT, AccountStatus.ACTIVE),
    ("pending", Role.STUDENT, AccountStatus.PENDING),
    ("disabled", Role.STUDENT, AccountStatus.DISABLED),
]


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        for name, role, status in ACCOUNTS:
            if await db.scalar(select(User).where(User.username == name)):
                continue
            db.add(
                User(
                    identifier=f"id-{name}",
                    username=name,
                    email=f"{name}@example.com",
                    first_name=name.capitalize(),
                    last_name="Seed",
                    password_hash=(
                        None if status is AccountStatus.PENDING else hash_password(PASSWORD)
                    ),
                    role=role,
                    status=status,
                )
            )
        await db.flush()
        pending = await db.scalar(select(User).where(User.status == AccountStatus.PENDING))
        if pending:
            service = AuthService(UserRepository(db), AuthRepository(db), get_email_sender())
            if not await service.send_activation(pending):
                print("Could not send the activation email (is the SMTP server running?)")
        await db.commit()
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
