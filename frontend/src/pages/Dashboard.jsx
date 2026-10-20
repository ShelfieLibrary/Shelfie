import { useEffect, useState } from "react";

import { getFeaturedBooks, searchBooks } from "../api/books";
import { addToShelf } from "../api/shelf";
import BookCard from "../components/BookCard";
import BookSearch from "../components/BookSearch";
import BookPage from "./BookPage";
import styles from "./Dashboard.module.css";


function Dashboard({ user, onRequireLogin }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [books, setBooks] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [featuredBooks, setFeaturedBooks] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  useEffect(() => {
    let cancelled = false;

    getFeaturedBooks()
      .then((data) => {
        if (!cancelled) setFeaturedBooks(data.books || []);
      })
      .catch(() => {
        if (!cancelled) setFeaturedBooks([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function showMessage(text, type = "success") {
    setMessage(text);
    setMessageType(type);
  }

  async function handleSearch(event) {
    event.preventDefault();
    setSearchLoading(true);
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

  function renderBooks(list) {
    return (
      <div className={styles.results}>
        {list.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            onAddToShelf={handleAddToShelf}
            onView={setSelectedBook}
          />
        ))}
      </div>
    );
  }

  if (selectedBook) {
    return (
      <BookPage
        book={selectedBook}
        user={user}
        onBack={() => setSelectedBook(null)}
        onRequireLogin={onRequireLogin}
      />
    );
  }

  return (
    <main className={styles.dashboard}>
      <section className={styles.welcomeCard}>
        <p className={styles.eyebrow}>Your digital bookshelf</p>
        {user ? (
          <>
            <h1>Welcome, {user.display_name || "Reader"}!</h1>
            <p>Search for a book, add it to your shelf, or share a review.</p>
          </>
        ) : (
          <>
            <h1>Welcome to Shelfie!</h1>
            <p>Search for any book and read reviews. Log in to save books and write reviews.</p>
          </>
        )}
      </section>

      {message && (
        <p className={messageType === "success" ? styles.success : styles.error}>
          {message}
        </p>
      )}

      <section className={styles.section}>
        <h2>Find a Book</h2>
        <p>Search by title or author, then open a book to see its details and reviews.</p>
        <BookSearch
          searchTerm={searchTerm}
          loading={searchLoading}
          onSearchTermChange={setSearchTerm}
          onSubmit={handleSearch}
        />

        {books.length > 0 && renderBooks(books)}

        {!books.length && featuredBooks.length > 0 && (
          <>
            <h3 className={styles.featuredHeading}>Recently added to shelves</h3>
            {renderBooks(featuredBooks)}
          </>
        )}
      </section>
    </main>
  );
}

export default Dashboard;