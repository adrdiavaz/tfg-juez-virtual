"""Development accounts. Run with: uv run python -m app.db.seed"""

import asyncio

from sqlalchemy import select

from app.db.database import AsyncSessionLocal, engine
from app.modules.auth.security import hash_password
from app.modules.user.models import AccountStatus, Role, User

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
        await db.commit()
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
