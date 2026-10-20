import { useEffect, useState } from "react";

import {
  createReview,
  deleteReview,
  flagReview,
  getReviews,
  updateReview,
} from "../api/reviews";
import { addToShelf } from "../api/shelf";
import ReviewCard from "../components/ReviewCard";
import Button from "../components/ui/Button";
import styles from "./BookPage.module.css";


function BookPage({ book, user, onBack, onRequireLogin }) {
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  function showMessage(text, type = "success") {
    setMessage(text);
    setMessageType(type);
  }

  async function loadReviews() {
    setReviewsLoading(true);
    try {
      const data = await getReviews(book.id);
      setReviews(data.reviews || []);
    } catch (error) {
      setReviews([]);
      showMessage(error.message, "error");
    } finally {
      setReviewsLoading(false);
    }
  }

  useEffect(() => {
    window.scrollTo(0, 0);
    loadReviews();
  }, [book.id]);

  async function handleAddToShelf() {
    if (!user) {
      onRequireLogin();
      return;
    }
    try {
      await addToShelf(book);
      showMessage(`“${book.title}” was added to your shelf.`);
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  async function handleCreateReview(event) {
    event.preventDefault();
    try {
      const data = await createReview(book, Number(rating), reviewText);
      setReviewText("");
      setRating(5);
      await loadReviews();
      showMessage(data.message);
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  async function handleUpdateReview(reviewId, nextRating, nextText) {
    try {
      const data = await updateReview(reviewId, nextRating, nextText);
      await loadReviews();
      showMessage(data.message);
    } catch (error) {
      showMessage(error.message, "error");
      throw error;
    }
  }

  async function handleDeleteReview(reviewId) {
    if (!window.confirm("Delete this review?")) {
      return;
    }
    try {
      const data = await deleteReview(reviewId);
      await loadReviews();
      showMessage(data.message);
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  async function handleFlagReview(reviewId, reason) {
    try {
      const data = await flagReview(reviewId, reason);
      showMessage(data.message);
    } catch (error) {
      showMessage(error.message, "error");
      throw error;
    }
  }

  return (
    <main className={styles.page}>
      <Button type="button" variant="text" onClick={onBack}>
        ← Back to results
      </Button>

      <section className={styles.bookCard}>
        {book.cover_url ? (
          <img className={styles.cover} src={book.cover_url} alt={`${book.title} cover`} />
        ) : (
          <div className={styles.coverPlaceholder}>No cover</div>
        )}

        <div className={styles.details}>
          <h1>{book.title}</h1>
          <p className={styles.authors}>
            {book.authors?.length ? book.authors.join(", ") : "Unknown author"}
          </p>

          <div className={styles.meta}>
            {book.published_date && <span>Published {book.published_date}</span>}
            {book.page_count && <span>{book.page_count} pages</span>}
            {book.isbn && <span>ISBN {book.isbn}</span>}
          </div>

          <p className={styles.description}>
            {book.description || "No description available."}
          </p>

          <div className={styles.actions}>
            <Button type="button" onClick={handleAddToShelf}>
              Add to Shelf
            </Button>
            {book.preview_link && (
              <a
                className={styles.previewLink}
                href={book.preview_link}
                target="_blank"
                rel="noreferrer"
              >
                Preview on Google Books ↗
              </a>
            )}
          </div>
        </div>
      </section>

      {message && (
        <p className={messageType === "success" ? styles.success : styles.error}>
          {message}
        </p>
      )}

      <section className={styles.section}>
        <h2>Reviews</h2>

        {user ? (
          <form className={styles.reviewForm} onSubmit={handleCreateReview}>
            <label>
              Rating
              <select value={rating} onChange={(event) => setRating(event.target.value)}>
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>{value} stars</option>
                ))}
              </select>
            </label>
            <label>
              Your Review
              <textarea
                value={reviewText}
                onChange={(event) => setReviewText(event.target.value)}
                maxLength="2000"
                placeholder="What did you think about this book?"
                required
              />
            </label>
            <Button type="submit">Submit Review</Button>
          </form>
        ) : (
          <Button type="button" onClick={onRequireLogin}>
            Log in to write a review
          </Button>
        )}

        <div className={styles.reviewList}>
          {reviewsLoading ? (
            <p>Loading reviews...</p>
          ) : reviews.length ? (
            reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onUpdate={handleUpdateReview}
                onDelete={handleDeleteReview}
                onFlag={handleFlagReview}
                onRequireLogin={user ? undefined : onRequireLogin}
              />
            ))
          ) : (
            <p>No reviews yet. Be the first to review this book.</p>
          )}
        </div>
      </section>
    </main>
  );
}

export default BookPage;