from typing import Literal

from pydantic import BaseModel, Field


class AnnouncementRequest(BaseModel):
    message: str = Field(min_length=1, max_length=500)


class UserUpdateRequest(BaseModel):
    role: Literal["user", "admin"] | None = None
    account_status: Literal["active", "suspended"] | None = None
