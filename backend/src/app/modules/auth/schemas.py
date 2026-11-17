from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    credential: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=128)


class ActivationInfo(BaseModel):
    email: str


class NewPassword(BaseModel):
    token: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=8, max_length=128)


class PasswordResetRequest(BaseModel):
    credential: str = Field(min_length=1, max_length=255)
