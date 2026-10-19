from books.schemas import BookData
from core.database import supabase
from shelf.service import save_book


def _display_names(user_ids: set[str]):
    if not user_ids:
        return {}

    response = (
        supabase.table("profiles")
        .select("id,display_name")
        .in_("id", list(user_ids))
        .execute()
    )
    return {row["id"]: row["display_name"] for row in response.data}


def list_reviews(book_id: str, current_user_id: str):
    response = (
        supabase.table("book_reviews")
        .select("id,user_id,book_id,rating,review_text,created_at,updated_at")
        .eq("book_id", book_id)
        .order("created_at", desc=True)
        .execute()
    )
    names = _display_names({row["user_id"] for row in response.data})

    reviews = []
    for row in response.data:
        reviews.append(
            {
                **row,
                "display_name": names.get(row["user_id"], "Shelfie Reader"),
                "is_owner": row["user_id"] == current_user_id,
            }
        )

    return {"success": True, "reviews": reviews}


def create_review(user_id: str, book: BookData, rating: int, review_text: str):
    text = review_text.strip()
    if not text:
        raise ValueError("Review text is required.")

    save_book(book)
    response = (
        supabase.table("book_reviews")
        .insert(
            {
                "user_id": user_id,
                "book_id": book.id,
                "rating": rating,
                "review_text": text,
            }
        )
        .execute()
    )

    return {
        "success": True,
        "message": "Review submitted successfully.",
        "review": response.data[0] if response.data else None,
    }


def update_review(user_id: str, review_id: int, rating: int, review_text: str):
    text = review_text.strip()
    if not text:
        raise ValueError("Review text is required.")

    response = (
        supabase.table("book_reviews")
        .update({"rating": rating, "review_text": text})
        .eq("id", review_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not response.data:
        raise LookupError("Review not found or you do not have permission to edit it.")

    return {"success": True, "message": "Review updated successfully."}


def delete_review(user_id: str, review_id: int):
    response = (
        supabase.table("book_reviews")
        .delete()
        .eq("id", review_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not response.data:
        raise LookupError("Review not found or you do not have permission to delete it.")

    return {"success": True, "message": "Review deleted successfully."}


def flag_review(user_id: str, review_id: int, reason: str | None):
    review_response = (
        supabase.table("book_reviews")
        .select("id,user_id")
        .eq("id", review_id)
        .limit(1)
        .execute()
    )
    if not review_response.data:
        raise LookupError("Review not found.")
    if review_response.data[0]["user_id"] == user_id:
        raise ValueError("You cannot flag your own review.")

    response = (
        supabase.table("content_flags")
        .insert(
            {
                "review_id": review_id,
                "user_id": user_id,
                "reason": reason.strip() if reason and reason.strip() else None,
                "status": "pending",
            }
        )
        .execute()
    )

    return {
        "success": True,
        "message": "Review flagged for administrator review.",
        "flag": response.data[0] if response.data else None,
    }
