from pydantic import BaseModel, Field


class BookData(BaseModel):
    id: str
    title: str
    authors: list[str] = Field(default_factory=list)
    description: str | None = None
    isbn: str | None = None
    cover_url: str | None = None
    published_date: str | None = None
    page_count: int | None = None
    preview_link: str | None = None
