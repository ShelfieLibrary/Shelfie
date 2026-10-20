import styles from "./BookCard.module.css";
import Button from "./ui/Button";


function BookCard({ book, onAddToShelf, onView }) {
  return (
    <article className={styles.card}>
      <button type="button" className={styles.coverButton} onClick={() => onView(book)}>
        {book.cover_url ? (
          <img src={book.cover_url} alt={`${book.title} cover`} />
        ) : (
          <div className={styles.coverPlaceholder}>No cover</div>
        )}
      </button>
      <div className={styles.info}>
        <h3>{book.title}</h3>
        <p>{book.authors?.length ? book.authors.join(", ") : "Unknown author"}</p>
        <p className={styles.rating}>
          {book.average_rating
            ? `★ ${book.average_rating} (${book.rating_count})`
            : "Unrated"}
        </p>
        {book.published_date && <small>Published: {book.published_date}</small>}
        <div className={styles.actions}>
          <Button type="button" onClick={() => onView(book)}>
            View Book
          </Button>
          <Button type="button" variant="secondary" onClick={() => onAddToShelf(book)}>
            Add to Shelf
          </Button>
        </div>
      </div>
    </article>
  );
}

export default BookCard;