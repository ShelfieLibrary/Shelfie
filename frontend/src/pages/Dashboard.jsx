import { useEffect, useState } from "react";

import { getHomeFeed } from "../api/books";
import { addToShelf } from "../api/shelf";
import BookCard from "../components/BookCard";
import Button from "../components/ui/Button";
import BookPage from "./BookPage";
import styles from "./Dashboard.module.css";



function Cover({ book, className }) {
  return book.cover_url ? (
    <img className={className} src={book.cover_url} alt={`${book.title} cover`} />
  ) : (
    <div className={`${className} ${styles.noCover}`}>{book.title}</div>
  );
}


function Rating({ book }) {
  return book.average_rating ? (
    <span className={styles.rating}>★ {book.average_rating} ({book.rating_count})</span>
  ) : (
    <span className={styles.unrated}>Unrated</span>
  );
}


function SkeletonRows({ count, height }) {
  return Array.from({ length: count }, (_, index) => (
    <div key={index} className="skeleton" style={{ height, marginBottom: 8 }} />
  ));
}


function Dashboard({ user, search, onClearSearch, onOpenPage, onOpenProfile, onRequireLogin }) {
  const [feed, setFeed] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getHomeFeed()
      .then((data) => {
        if (!cancelled) setFeed(data);
      })
      .catch(() => {
        if (!cancelled) setFeed({ recent: [], trending: [], latest_reviews: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [user, selectedBook]);

  async function handleAddToShelf(book) {
    if (!user) {
      onRequireLogin();
      return;
    }
    try {
      await addToShelf(book);
      setMessage({ text: `“${book.title}” was added to your shelf.`, type: "success" });
    } catch (error) {
      setMessage({ text: error.message, type: "error" });
    }
  }

  if (selectedBook) {
    return (
      <BookPage
        book={selectedBook}
        user={user}
        onBack={() => setSelectedBook(null)}
        onRequireLogin={onRequireLogin}
        onOpenProfile={onOpenProfile}
      />
    );
  }

  const notice = message && (
    <p className={message.type === "success" ? styles.success : styles.error}>
      {message.text}
    </p>
  );

  if (search) {
    return (
      <main className={styles.dashboard}>
        <div className={styles.sectionHeader}>
          <h2>Search results</h2>
          <button type="button" className={styles.link} onClick={onClearSearch}>
            ← Back to home
          </button>
        </div>
        {notice}
        {search.loading && (
          <div className={styles.results}>
            <SkeletonRows count={4} height={176} />
          </div>
        )}
        {search.message && <p className={styles.error}>{search.message}</p>}
        <div className={styles.results}>
          {search.books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onAddToShelf={handleAddToShelf}
              onView={setSelectedBook}
            />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className={styles.dashboard}>
      <section className={styles.hero}>
        {user ? (
          <>
            <p className={styles.eyebrow}>Welcome back</p>
            <h1>{user.display_name || "Reader"}</h1>
            <p className={styles.muted}>
              Find your next book, see what other readers think, and keep your
              reading list up to date from your profile.
            </p>
          </>
        ) : (
          <>
            <p className={styles.eyebrow}>Your digital bookshelf</p>
            <h1>Track, review, and discover books</h1>
            <p className={styles.muted}>
              Search any book, read what others think, and build your own shelf.
            </p>
            <Button onClick={onRequireLogin}>Get started</Button>
          </>
        )}
      </section>

      {notice}

      {user && (
        <section className={styles.panel}>
          <div className={styles.sectionHeader}>
            <h2>Recommended for you</h2>
            <button type="button" className={styles.link} onClick={() => onOpenPage("recommendations")}>
              Get recommendations →
            </button>
          </div>
          <div className={styles.row}>
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className={styles.placeholderTile} />
            ))}
          </div>
          <p className={styles.muted}>
            AI recommendations based on your reading list are coming soon.
          </p>
        </section>
      )}

      <section className={styles.panel}>
        <div className={styles.sectionHeader}>
          <h2>Recently added on Shelfie</h2>
        </div>
        <div className={styles.row}>
          {!feed &&
            Array.from({ length: 6 }, (_, index) => (
              <div key={index} className={`skeleton ${styles.placeholderTile}`} />
            ))}
          {feed?.recent.map((book) => (
            <button
              key={book.id}
              type="button"
              className={styles.tile}
              onClick={() => setSelectedBook(book)}
            >
              <Cover book={book} className={styles.tileCover} />
              <span className={styles.tileTitle}>{book.title}</span>
              <Rating book={book} />
            </button>
          ))}
        </div>
      </section>

      <div className={styles.columns}>
        <section className={styles.panel}>
          <h2>Trending on Shelfie</h2>
          {!feed ? (
            <SkeletonRows count={4} height={62} />
          ) : feed.trending.length ? (
            <ol className={styles.list}>
              {feed.trending.map((book, index) => (
                <li key={book.id}>
                  <button type="button" onClick={() => setSelectedBook(book)}>
                    <span className={styles.rank}>{index + 1}</span>
                    <Cover book={book} className={styles.listCover} />
                    <span className={styles.listText}>
                      <strong>{book.title}</strong>
                      {book.authors.length > 0 && <span>{book.authors.join(", ")}</span>}
                    </span>
                    <Rating book={book} />
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className={styles.muted}>No rated books yet.</p>
          )}
        </section>

        <section className={styles.panel}>
          <h2>Latest reviews</h2>
          {!feed ? (
            <SkeletonRows count={4} height={62} />
          ) : feed.latest_reviews.length ? (
            <ul className={styles.list}>
              {feed.latest_reviews.map((review) => (
                <li key={review.id}>
                  <button
                    type="button"
                    onClick={() => review.book && setSelectedBook(review.book)}
                  >
                    <span className={styles.listText}>
                      <span className={styles.rating}>
                        {"★".repeat(review.rating)}
                        {"☆".repeat(5 - review.rating)}
                      </span>
                      {review.review_text && (
                        <span className={styles.quote}>“{review.review_text}”</span>
                      )}
                      <span>
                        on {review.book?.title || "a book"} · {review.display_name}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.muted}>No reviews yet.</p>
          )}
        </section>
      </div>
    </main>
  );
}

export default Dashboard;
