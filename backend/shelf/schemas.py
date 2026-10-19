from pydantic import BaseModel

from books.schemas import BookData


class ShelfRequest(BaseModel):
    book: BookData
    status: str
