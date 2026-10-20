from core.database import supabase


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