from datetime import datetime
from enum import StrEnum

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, validates

from app.db.database import Base, str_enum


class Role(StrEnum):
    ADMIN = "admin"
    TEACHER = "teacher"
    STUDENT = "student"


class AccountStatus(StrEnum):
    PENDING = "pending"
    ACTIVE = "active"
    DISABLED = "disabled"


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("status <> 'active' OR password_hash IS NOT NULL", "active_has_password"),
        CheckConstraint(
            "status = 'disabled' OR previous_status IS NULL",
            "previous_only_if_disabled",
        ),
        CheckConstraint(
            "previous_status IS NULL OR previous_status <> 'disabled'",
            "previous_not_disabled",
        ),
        CheckConstraint("(uvus IS NULL) = (linked_at IS NULL)", "uvus_linked_together"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    identifier: Mapped[str] = mapped_column(unique=True)
    username: Mapped[str] = mapped_column(unique=True)
    email: Mapped[str] = mapped_column(unique=True)
    first_name: Mapped[str]
    last_name: Mapped[str]
    password_hash: Mapped[str | None]
    role: Mapped[Role] = mapped_column(str_enum(Role, "role"))
    status: Mapped[AccountStatus] = mapped_column(str_enum(AccountStatus, "status"))
    previous_status: Mapped[AccountStatus | None] = mapped_column(
        str_enum(AccountStatus, "previous_status")
    )
    registered_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    uvus: Mapped[str | None] = mapped_column(unique=True)
    linked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    @validates("email")
    def _normalize_email(self, _: str, value: str) -> str:
        return value.strip().lower()

    def activate(self, password_hash: str) -> None:
        if self.status is not AccountStatus.PENDING:
            raise ValueError("only pending accounts can be activated")
        self.password_hash = password_hash
        self.status = AccountStatus.ACTIVE

    def deactivate(self) -> None:
        if self.status is AccountStatus.DISABLED:
            raise ValueError("account is already disabled")
        self.previous_status = self.status
        self.status = AccountStatus.DISABLED

    def reactivate(self) -> None:
        if self.status is not AccountStatus.DISABLED:
            raise ValueError("only disabled accounts can be reactivated")
        fallback = AccountStatus.ACTIVE if self.password_hash else AccountStatus.PENDING
        self.status = self.previous_status or fallback
        self.previous_status = None
