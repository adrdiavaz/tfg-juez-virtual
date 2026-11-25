from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, StringConstraints

from app.modules.user.models import AccountStatus

Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]


class TeacherIn(BaseModel):
    first_name: Text
    last_name: Text
    identifier: Text
    email: EmailStr


class TeacherOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    identifier: str
    email: str
    first_name: str
    last_name: str
    status: AccountStatus


class TeacherPage(BaseModel):
    items: list[TeacherOut]
    total: int
    page: int
    page_size: int


class TeacherSaved(BaseModel):
    teacher: TeacherOut
    invitation_sent: bool | None


class InvitationResult(BaseModel):
    invitation_sent: bool
