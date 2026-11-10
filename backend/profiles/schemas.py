from pydantic import BaseModel, Field


class ProfileUpdateRequest(BaseModel):
    display_name: str | None = Field(default=None, max_length=100)
    avatar: str | None = None
