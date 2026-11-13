from collections.abc import AsyncGenerator
from enum import StrEnum

from sqlalchemy import Enum, MetaData
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

DATABASE_URL = settings.database_url


class Base(DeclarativeBase):
    metadata = MetaData(
        naming_convention={
            "ix": "ix_%(column_0_label)s",
            "uq": "uq_%(table_name)s_%(column_0_name)s",
            "ck": "ck_%(table_name)s_%(constraint_name)s",
            "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
            "pk": "pk_%(table_name)s",
        }
    )


def str_enum(enum: type[StrEnum], name: str) -> Enum:
    """VARCHAR + CHECK storing the enum's value ("admin"), not its name ("ADMIN")."""
    return Enum(
        enum,
        name=name,
        native_enum=False,
        create_constraint=True,
        values_callable=lambda _: [m.value for m in enum],  # pyright: ignore[reportUnknownLambdaType]
    )


engine = create_async_engine(DATABASE_URL)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncGenerator[AsyncSession]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
