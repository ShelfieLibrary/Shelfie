import { useEffect, useState } from "react";

import { getBookPreview } from "../api/books";
import {
  createReview,
  deleteReview,
  flagReview,
  getReviews,
  updateReview,
} from "../api/reviews";
import BookReader from "../components/BookReader";
import ReviewCard from "../components/ReviewCard";
import ShelfControl from "../components/ShelfControl";
import Button from "../components/ui/Button";
import styles from "./BookPage.module.css";


function averageRating(reviews) {
  if (!reviews.length) return null;
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return (total / reviews.length).toFixed(1);
}


function BookPage({ book, user, onBack, onRequireLogin, onOpenProfile }) {
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [message, setMessage] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [publicDomain, setPublicDomain] = useState(false);

  const [canEmbed, setCanEmbed] = useState(false);
  const ownReview = reviews.find((review) => review.is_owner);
  const average = averageRating(reviews);

  function showMessage(text, type = "success") {
    setMessage({ text, type });
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

  useEffect(() => {
    setCanEmbed(false);
    if (!book.id || book.id.startsWith("ol-")) return;

    let cancelled = false;
    getBookPreview(book.id)
      .then((data) => {
        if (!cancelled) setCanEmbed(data.embeddable);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [book.id]);

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
    if (!window.confirm("Delete this review?")) return;
    try {
      const data = await deleteReview(reviewId);
      await loadReviews();
      showMessage(data.message);
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  function handleFlagReview(reviewId, reason) {
    return flagReview(reviewId, reason);
  }

  return (
    <main className={styles.page}>
      <Button type="button" variant="text" onClick={onBack}>
        ← Back
      </Button>

      <section className={styles.header}>
        {book.cover_url ? (
          <img className={styles.cover} src={book.cover_url} alt={`${book.title} cover`} />
        ) : (
          <div className={styles.coverPlaceholder}>No cover</div>
        )}

        <div className={styles.details}>
          <h1>{book.title}</h1>
          {book.authors?.length > 0 && (
            <p className={styles.authors}>{book.authors.join(", ")}</p>
          )}

          <p className={styles.rating}>
            {average ? (
              <>
                <span className={styles.stars}>★ {average}</span>
                <span>
                  {reviews.length} review{reviews.length === 1 ? "" : "s"}
                </span>
              </>
            ) : (
              <span>No ratings yet</span>
            )}
          </p>

          <div className={styles.meta}>
            {book.published_date && <span>Published {book.published_date}</span>}
            {book.page_count > 0 && <span>{book.page_count} pages</span>}
            {book.isbn && <span>ISBN {book.isbn}</span>}
            {publicDomain && <span className={styles.freeTag}>Free to read · Public domain</span>}
          </div>

          <p className={expanded ? styles.description : styles.descriptionClamped}>
            {book.description || "No description available."}
          </p>
          {book.description?.length > 400 && (
            <button
              type="button"
              className={styles.more}
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          )}

          <div className={styles.actions}>
            <ShelfControl
              book={book}
              user={user}
              onRequireLogin={onRequireLogin}
              onMessage={showMessage}
            />
          </div>
        </div>
      </section>

      {message && (
        <p className={message.type === "success" ? styles.success : styles.error}>
          {message.text}
        </p>
      )}

      <div className={styles.columns}>
        <section className={styles.section}>
          <h2>Read and listen</h2>
          <BookReader book={book} onAvailable={setPublicDomain} />
        </section>

        <section className={styles.section}>
          <h2>Preview</h2>
          {canEmbed ? (
            <iframe
              className={styles.preview}
              title={`${book.title} preview`}
              src={`https://books.google.com/books?id=${encodeURIComponent(book.id)}&pg=PP1&output=embed`}
              loading="lazy"
            />
          ) : (
            <p className={styles.muted}>
              No preview is available for this book.{" "}
              {book.preview_link && (
                <a href={book.preview_link} target="_blank" rel="noreferrer">
                  View on Google Books ↗
                </a>
              )}
            </p>
          )}
        </section>
      </div>

      <section className={styles.section}>
        <h2>Reviews</h2>

        {!user ? (
          <Button type="button" onClick={onRequireLogin}>
            Log in to write a review
          </Button>
        ) : ownReview ? (
          <p className={styles.muted}>
            You have already reviewed this book. You can edit your review below.
          </p>
        ) : (
          <form className={styles.reviewForm} onSubmit={handleCreateReview}>
            <label>
              Rating
              <select value={rating} onChange={(event) => setRating(event.target.value)}>
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>
                    {"★".repeat(value)} ({value})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Your review (optional)
              <textarea
                value={reviewText}
                onChange={(event) => setReviewText(event.target.value)}
                maxLength="2000"
                placeholder="What did you think about this book?"
              />
            </label>
            <Button type="submit">Submit Review</Button>
          </form>
        )}

        <div className={styles.reviewList}>
          {reviewsLoading ? (
            [0, 1].map((index) => <div key={index} className="skeleton" style={{ height: 90 }} />)
          ) : reviews.length ? (
            reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onUpdate={handleUpdateReview}
                onDelete={handleDeleteReview}
                onFlag={handleFlagReview}
                onRequireLogin={user ? undefined : onRequireLogin}
                onOpenProfile={onOpenProfile}
              />
            ))
          ) : (
            <p className={styles.muted}>No reviews yet. Be the first to review this book.</p>
          )}
        </div>
      </section>
    </main>
  );
}

export default BookPage;
