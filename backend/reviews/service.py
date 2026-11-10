import logging

from admin.service import resolve_flags_for_deleted_review
from books.schemas import BookData
from core.database import supabase
from notifications.service import notify_new_review
from shelf.service import save_book


logger = logging.getLogger(__name__)


def _reviewer_profiles(user_ids: set[str]):
    if not user_ids:
        return {}

    response = (
        supabase.table("profiles")
        .select("id,display_name,avatar_url")
        .in_("id", list(user_ids))
        .execute()
    )
    return {row["id"]: row for row in response.data}


def list_reviews(book_id: str, current_user_id: str | None):
    response = (
        supabase.table("book_reviews")
        .select("id,user_id,book_id,rating,review_text,created_at,updated_at")
        .eq("book_id", book_id)
        .order("created_at", desc=True)
        .execute()
    )
    reviewers = _reviewer_profiles({row["user_id"] for row in response.data})

    reviews = []
    for row in response.data:
        reviewer = reviewers.get(row["user_id"], {})
        reviews.append(
            {
                **row,
                "display_name": reviewer.get("display_name", "Shelfie Reader"),
                "avatar_url": reviewer.get("avatar_url"),
                "is_owner": row["user_id"] == current_user_id,
            }
        )

    return {"success": True, "reviews": reviews}


def create_review(user_id: str, book: BookData, rating: int, review_text: str):
    save_book(book)
    response = (
        supabase.table("book_reviews")
        .insert(
            {
                "user_id": user_id,
                "book_id": book.id,
                "rating": rating,
                "review_text": review_text.strip() or None,
            }
        )
        .execute()
    )
    review = response.data[0] if response.data else None

    if review:
        author = _reviewer_profiles({user_id}).get(user_id, {})
        try:
            notify_new_review(
                user_id,
                author.get("display_name", "A reader"),
                {"id": book.id, "title": book.title},
                review["id"],
            )
        except Exception:
            logger.exception("Could not send new-review notifications.")

    return {
        "success": True,
        "message": "Review submitted successfully.",
        "review": review,
    }


def update_review(user_id: str, review_id: int, rating: int, review_text: str):
    response = (
        supabase.table("book_reviews")
        .update({"rating": rating, "review_text": review_text.strip() or None})
        .eq("id", review_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not response.data:
        raise LookupError("Review not found or you do not have permission to edit it.")

    return {"success": True, "message": "Review updated successfully."}


def delete_review(user_id: str, review_id: int):
    owned = (
        supabase.table("book_reviews")
        .select("id")
        .eq("id", review_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not owned.data:
        raise LookupError("Review not found or you do not have permission to delete it.")

    resolve_flags_for_deleted_review(review_id)
    supabase.table("book_reviews").delete().eq("id", review_id).eq("user_id", user_id).execute()

    return {"success": True, "message": "Review deleted successfully."}
