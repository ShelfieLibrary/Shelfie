import { useEffect, useState } from "react";

import { getRecommendations } from "../api/ai";
import { addToShelf } from "../api/shelf";
import BookCard from "../components/BookCard";
import BookPage from "./BookPage";
import dashboard from "./Dashboard.module.css";
import styles from "./RecommendationsPage.module.css";


function RecommendationsPage({ user, onRequireLogin, onOpenProfile }) {
  const [result, setResult] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [message, setMessage] = useState(null);

  function load(refresh = false) {
    setResult(null);
    setMessage(null);
    getRecommendations(refresh)
      .then(setResult)
      .catch((error) => setResult({ books: [], error: error.message }));
  }

  useEffect(() => load(), []);

  async function handleAddToShelf(book) {
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

  return (
    <main className={dashboard.dashboard}>
      <div className={dashboard.sectionHeader}>
        <h2>Recommended for you</h2>
        <button type="button" className={dashboard.link} onClick={() => load(true)} disabled={!result}>
          ↻ New recommendations
        </button>
      </div>
      <p className={dashboard.muted}>
        Picked by AI from your reading list and the books you rated 4 or 5 stars.
      </p>

      {message && (
        <p className={message.type === "success" ? dashboard.success : dashboard.error}>
          {message.text}
        </p>
      )}
      {result?.error && <p className={dashboard.error}>{result.error}</p>}
      {result?.message && <p className={dashboard.muted}>{result.message}</p>}

      <div className={dashboard.results}>
        {!result &&
          Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="skeleton" style={{ height: 176 }} />
          ))}
        {result?.books.map((book) => (
          <div key={book.id} className={styles.item}>
            <BookCard book={book} onAddToShelf={handleAddToShelf} onView={setSelectedBook} />
            {book.reason && <p className={styles.reason}>{book.reason}</p>}
          </div>
        ))}
      </div>
    </main>
  );
}

export default RecommendationsPage;
