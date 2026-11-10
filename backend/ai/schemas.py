from typing import Literal

from pydantic import BaseModel, Field, field_validator


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=2000)


class ChatRequest(BaseModel):
    message: str = Field(max_length=500)
    history: list[ChatMessage] = Field(default=[], max_length=10)

    @field_validator("message")
    @classmethod
    def message_not_blank(cls, value: str):
        value = value.strip()
        if not value:
            raise ValueError("Please enter a message.")
        return value
