from fastapi import APIRouter, Depends, HTTPException

from core.auth import get_authenticated_user, get_optional_user
from core.errors import database_error
from reviews import service
from reviews.schemas import ReviewCreateRequest, ReviewUpdateRequest


router = APIRouter(prefix="/api", tags=["reviews"])


@router.get("/books/{book_id}/reviews")
def get_reviews(book_id: str, user=Depends(get_optional_user)):
    try:
        return service.list_reviews(book_id, str(user.id) if user else None)
    except Exception as error:
        database_error(error, "The reviews could not be loaded.")


@router.post("/reviews", status_code=201)
def create_review(data: ReviewCreateRequest, user=Depends(get_authenticated_user)):
    try:
        return service.create_review(
            str(user.id), data.book, data.rating, data.review_text
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        database_error(error, "You have already reviewed this book.")


@router.put("/reviews/{review_id}")
def update_review(
    review_id: int,
    data: ReviewUpdateRequest,
    user=Depends(get_authenticated_user),
):
    try:
        return service.update_review(
            str(user.id), review_id, data.rating, data.review_text
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except Exception as error:
        database_error(error, "The review could not be updated.")


@router.delete("/reviews/{review_id}")
def delete_review(review_id: int, user=Depends(get_authenticated_user)):
    try:
        return service.delete_review(str(user.id), review_id)
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except Exception as error:
        database_error(error, "The review could not be deleted.")