from pydantic import BaseModel, Field


class FlagCreateRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=500)