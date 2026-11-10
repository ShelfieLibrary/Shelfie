import { useEffect, useState } from "react";

import { getRecommendations } from "../api/ai";
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


// A single row of covers. Covers that don't fit on one line are hidden, so the row is always full.
function BookRow({ books, onSelect }) {
  return (
    <div className={styles.bookRow}>
      {!books
        ? Array.from({ length: 10 }, (_, index) => (
            <div key={index} className={`skeleton ${styles.tileCover}`} />
          ))
        : books.map((book) => (
            <button key={book.id} type="button" className={styles.tile} onClick={() => onSelect(book)}>
              <Cover book={book} className={styles.tileCover} />
              <span className={styles.tileTitle}>{book.title}</span>
              <Rating book={book} />
            </button>
          ))}
    </div>
  );
}


function Dashboard({
  user,
  search,
  onClearSearch,
  onLoadMore,
  onOpenPage,
  onOpenProfile,
  onRequireLogin,
}) {
  const [feed, setFeed] = useState(null);
  const [recommended, setRecommended] = useState(null);
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
      })
      .then(() => user && getRecommendations())
      .then((data) => {
        if (!cancelled && data) setRecommended(data);
      })
      .catch((error) => {
        if (!cancelled) setRecommended({ books: [], message: error.message });
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
        {search.hasMore && (
          <div className={styles.loadMore}>
            <Button type="button" variant="secondary" onClick={onLoadMore} disabled={search.loadingMore}>
              {search.loadingMore ? "Loading…" : "Load more"}
            </Button>
          </div>
        )}
      </main>
    );
  }

  const featured = feed?.trending[0] || feed?.recent[0];

  return (
    <main className={styles.dashboard}>
      {!feed ? (
        <div className={`skeleton ${styles.featuredSkeleton}`} />
      ) : featured ? (
        <section className={styles.featured}>
          <button type="button" className={styles.featuredCover} onClick={() => setSelectedBook(featured)}>
            <Cover book={featured} className={styles.bigCover} />
          </button>
          <div className={styles.featuredText}>
            {!user && (
              <p className={styles.intro}>
                Shelfie is where readers track, rate, and review the books they love.
              </p>
            )}
            <p className={styles.featuredLabel}>
              {feed.trending[0] ? "Trending on Shelfie" : "New on Shelfie"}
            </p>
            <h1>{featured.title}</h1>
            <p className={styles.byline}>
              {featured.authors.join(", ")}
              {featured.average_rating && (
                <span className={styles.rating}>
                  {" "}★ {featured.average_rating} from {featured.rating_count}{" "}
                  {featured.rating_count === 1 ? "reader" : "readers"}
                </span>
              )}
            </p>
            {featured.description && (
              <p className={styles.description}>{featured.description}</p>
            )}
            <div className={styles.featuredActions}>
              <Button onClick={() => setSelectedBook(featured)}>View book</Button>
              {user ? (
                <Button variant="secondary" onClick={() => handleAddToShelf(featured)}>
                  Add to shelf
                </Button>
              ) : (
                <Button variant="secondary" onClick={onRequireLogin}>
                  Get started
                </Button>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {notice}

      {user && (
        <section className={styles.panel}>
          <div className={styles.sectionHeader}>
            <h2>Recommended for you</h2>
            <button type="button" className={styles.link} onClick={() => onOpenPage("recommendations")}>
              See all
            </button>
          </div>
          {recommended?.message && <p className={styles.muted}>{recommended.message}</p>}
          <BookRow books={recommended?.books} onSelect={setSelectedBook} />
        </section>
      )}

      <section className={styles.panel}>
        <h2>Recently added on Shelfie</h2>
        <BookRow books={feed?.recent} onSelect={setSelectedBook} />
      </section>

      <div className={styles.columns}>
        <section className={styles.panel}>
          <h2>Trending</h2>
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
            <p className={styles.muted}>Add books to your shelf or review them to see what's trending.</p>
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
                    {review.book && <Cover book={review.book} className={styles.listCover} />}
                    <span className={styles.listText}>
                      <strong>{review.book?.title || "A book"}</strong>
                      <span className={styles.rating}>
                        {"★".repeat(review.rating)}
                        {"☆".repeat(5 - review.rating)}
                        <span className={styles.reviewer}> {review.display_name}</span>
                      </span>
                      {review.review_text && (
                        <span className={styles.quote}>“{review.review_text}”</span>
                      )}
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
