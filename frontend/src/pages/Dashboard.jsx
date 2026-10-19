import { useState } from "react";

import { searchBooks } from "../api/books";
import {
  createReview,
  deleteReview,
  flagReview,
  getReviews,
  updateReview,
} from "../api/reviews";
import { addToShelf } from "../api/shelf";
import BookCard from "../components/BookCard";
import BookSearch from "../components/BookSearch";
import ReviewCard from "../components/ReviewCard";
import Button from "../components/ui/Button";
import styles from "./Dashboard.module.css";


function Dashboard({ user }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [books, setBooks] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  function showMessage(text, type = "success") {
    setMessage(text);
    setMessageType(type);
  }

  async function handleSearch(event) {
    event.preventDefault();
    setSearchLoading(true);
    setSelectedBook(null);
    setMessage("");

    try {
      const data = await searchBooks(searchTerm.trim());
      setBooks(data.books || []);
      if (!data.books?.length) {
        showMessage("No matching books were found.", "error");
      }
    } catch (error) {
      setBooks([]);
      showMessage(error.message, "error");
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleAddToShelf(book) {
    try {
      await addToShelf(book);
      showMessage(`“${book.title}” was added to your shelf.`);
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  async function loadReviews(book) {
    setSelectedBook(book);
    setReviewsLoading(true);
    setMessage("");

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

  async function handleCreateReview(event) {
    event.preventDefault();
    try {
      const data = await createReview(selectedBook, Number(rating), reviewText);
      setReviewText("");
      setRating(5);
      await loadReviews(selectedBook);
      showMessage(data.message);
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  async function handleUpdateReview(reviewId, nextRating, nextText) {
    try {
      const data = await updateReview(reviewId, nextRating, nextText);
      await loadReviews(selectedBook);
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
      await loadReviews(selectedBook);
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
    <main className={styles.dashboard}>
      <section className={styles.welcomeCard}>
        <p className={styles.eyebrow}>Your digital bookshelf</p>
        <h1>Welcome, {user.display_name || "Reader"}!</h1>
        <p>Search for a book, add it to your shelf, or share a review.</p>
        <div className={styles.accountDetails}>
          <div><span>Account</span><strong>{user.email}</strong></div>
          <div><span>Role</span><strong>{user.role}</strong></div>
          <div><span>Status</span><strong>{user.account_status}</strong></div>
        </div>
      </section>

      {message && (
        <p className={messageType === "success" ? styles.success : styles.error}>
          {message}
        </p>
      )}

      <section className={styles.section}>
        <h2>Find a Book</h2>
        <p>Search by title or author, then open the review section for a book.</p>
        <BookSearch
          searchTerm={searchTerm}
          loading={searchLoading}
          onSearchTermChange={setSearchTerm}
          onSubmit={handleSearch}
        />
        <div className={styles.results}>
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onAddToShelf={handleAddToShelf}
              onViewReviews={loadReviews}
            />
          ))}
        </div>
      </section>

      {selectedBook && (
        <section className={styles.section}>
          <div className={styles.reviewHeading}>
            <div>
              <p className={styles.eyebrow}>Book Reviews</p>
              <h2>{selectedBook.title}</h2>
            </div>
            <Button type="button" variant="secondary" onClick={() => setSelectedBook(null)}>
              Close
            </Button>
          </div>

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
                />
              ))
            ) : (
              <p>No reviews yet. Be the first to review this book.</p>
            )}
          </div>
        </section>
      )}
    </main>
  );
}

export default Dashboard;
