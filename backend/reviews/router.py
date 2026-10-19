from fastapi import APIRouter, Depends, HTTPException

from core.auth import get_authenticated_user
from reviews import service
from reviews.schemas import FlagCreateRequest, ReviewCreateRequest, ReviewUpdateRequest


router = APIRouter(prefix="/api", tags=["reviews and flags"])


def _database_error(error: Exception, duplicate_message: str):
    message = str(error)
    if "duplicate" in message.lower() or "unique" in message.lower():
        raise HTTPException(
            status_code=409,
            detail=duplicate_message,
        ) from error
    raise HTTPException(status_code=500, detail=message) from error


@router.get("/books/{book_id}/reviews")
def get_reviews(book_id: str, user=Depends(get_authenticated_user)):
    try:
        return service.list_reviews(book_id, str(user.id))
    except Exception as error:
        _database_error(error, "The reviews could not be loaded.")


@router.post("/reviews", status_code=201)
def create_review(data: ReviewCreateRequest, user=Depends(get_authenticated_user)):
    try:
        return service.create_review(
            str(user.id), data.book, data.rating, data.review_text
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        _database_error(error, "You have already reviewed this book.")


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
        _database_error(error, "The review could not be updated.")


@router.delete("/reviews/{review_id}")
def delete_review(review_id: int, user=Depends(get_authenticated_user)):
    try:
        return service.delete_review(str(user.id), review_id)
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except Exception as error:
        _database_error(error, "The review could not be deleted.")


@router.post("/reviews/{review_id}/flags", status_code=201)
def flag_review(
    review_id: int,
    data: FlagCreateRequest,
    user=Depends(get_authenticated_user),
):
    try:
        return service.flag_review(str(user.id), review_id, data.reason)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except Exception as error:
        _database_error(error, "You have already flagged this review.")
