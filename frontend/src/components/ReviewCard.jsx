import { useState } from "react";

import styles from "./ReviewCard.module.css";
import Button from "./ui/Button";


function ReviewCard({ review, onUpdate, onDelete, onFlag }) {
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(review.rating);
  const [reviewText, setReviewText] = useState(review.review_text);
  const [flagging, setFlagging] = useState(false);
  const [reason, setReason] = useState("");

  async function handleUpdate(event) {
    event.preventDefault();
    await onUpdate(review.id, Number(rating), reviewText);
    setEditing(false);
  }

  async function handleFlag(event) {
    event.preventDefault();
    await onFlag(review.id, reason);
    setReason("");
    setFlagging(false);
  }

  return (
    <article className={styles.card}>
      <div className={styles.heading}>
        <strong>{review.display_name}</strong>
        <span aria-label={`${review.rating} out of 5 stars`}>
          {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
        </span>
      </div>

      {editing ? (
        <form className={styles.form} onSubmit={handleUpdate}>
          <label>
            Rating
            <select value={rating} onChange={(event) => setRating(event.target.value)}>
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>{value} stars</option>
              ))}
            </select>
          </label>
          <textarea
            value={reviewText}
            onChange={(event) => setReviewText(event.target.value)}
            maxLength="2000"
            required
          />
          <div className={styles.actions}>
            <Button type="submit">Save</Button>
            <Button type="button" variant="text" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <p className={styles.reviewText}>{review.review_text}</p>
      )}

      {!editing && review.is_owner && (
        <div className={styles.actions}>
          <Button type="button" variant="text" onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button type="button" variant="danger" onClick={() => onDelete(review.id)}>
            Delete
          </Button>
        </div>
      )}

      {!review.is_owner && !flagging && (
        <Button type="button" variant="text" onClick={() => setFlagging(true)}>
          Flag Review
        </Button>
      )}

      {flagging && (
        <form className={styles.flagForm} onSubmit={handleFlag}>
          <label htmlFor={`flag-${review.id}`}>Reason (optional)</label>
          <input
            id={`flag-${review.id}`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength="500"
            placeholder="Why should an administrator review this?"
          />
          <div className={styles.actions}>
            <Button type="submit">Submit Flag</Button>
            <Button type="button" variant="text" onClick={() => setFlagging(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </article>
  );
}

export default ReviewCard;
