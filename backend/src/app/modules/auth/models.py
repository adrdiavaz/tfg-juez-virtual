from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base, str_enum


class AuthSession(Base):
    __tablename__ = "sessions"

    token_hash: Mapped[str] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class TokenType(StrEnum):
    ACTIVATION = "activation"
    PASSWORD_RESET = "password_reset"


class AccountToken(Base):
    __tablename__ = "account_tokens"

    token_hash: Mapped[str] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    type: Mapped[TokenType] = mapped_column(str_enum(TokenType, "type"))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    invalidated: Mapped[bool] = mapped_column(default=False, server_default="false")

    def is_valid(self, at: datetime) -> bool:
        return not self.invalidated and self.used_at is None and self.expires_at > at
