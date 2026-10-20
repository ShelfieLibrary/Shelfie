from pydantic import BaseModel, Field

from books.schemas import BookData


class ReviewCreateRequest(BaseModel):
    book: BookData
    rating: int = Field(ge=1, le=5)
    review_text: str = Field(min_length=1, max_length=2000)


class ReviewUpdateRequest(BaseModel):
    rating: int = Field(ge=1, le=5)
    review_text: str = Field(min_length=1, max_length=2000)

