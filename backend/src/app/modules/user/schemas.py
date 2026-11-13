from pydantic import BaseModel, ConfigDict

from app.modules.user.models import Role


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    first_name: str
    last_name: str
    role: Role
