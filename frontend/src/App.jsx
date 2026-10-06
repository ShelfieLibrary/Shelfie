import { useState } from "react";
import "./App.css";

const API_URL = "https://shelfie-api-cwtf.onrender.com";

function App() {
  const [authMode, setAuthMode] = useState("login");

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("shelfieUser");

    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");
  const [loading, setLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [books, setBooks] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [shelfMessage, setShelfMessage] = useState("");

  function switchMode(mode) {
    setAuthMode(mode);
    setDisplayName("");
    setEmail("");
    setPassword("");
    setMessage("");
  }

  async function handleLogin(event) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setMessageType("error");
        setMessage(data.message || "Login failed.");
        return;
      }

      localStorage.setItem("shelfieToken", data.access_token);
      localStorage.setItem(
        "shelfieUser",
        JSON.stringify(data.user)
      );

      setUser(data.user);
      setEmail("");
      setPassword("");
      setMessage("");
    } catch (error) {
      setMessageType("error");
      setMessage("Unable to connect to the Shelfie server.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/api/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          display_name: displayName,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setMessageType("error");
        setMessage(data.message || "Registration failed.");
        return;
      }

      setAuthMode("login");
      setDisplayName("");
      setPassword("");

      setMessageType("success");
      setMessage(
        "Account created! You can now sign in."
      );
    } catch (error) {
      setMessageType("error");
      setMessage("Unable to connect to the Shelfie server.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch(`${API_URL}/api/logout`, {
        method: "POST",
      });
    } catch (error) {
      console.error("Logout request failed:", error);
    }

    localStorage.removeItem("shelfieToken");
    localStorage.removeItem("shelfieUser");

    setUser(null);
    setEmail("");
    setPassword("");
    setMessage("");
    setAuthMode("login");
    setBooks([]);
    setSearchTerm("");
    setShelfMessage("");
  }

  async function handleBookSearch(event) {
    event.preventDefault();

    const query = searchTerm.trim();

    if (!query) {
      setBooks([]);
      return;
    }

    setSearchLoading(true);
    setShelfMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/books/search?q=${encodeURIComponent(query)}`
      );

      const data = await response.json();

      if (!data.success) {
        setShelfMessage(
          data.message || "Book search failed."
        );
        setBooks([]);
        return;
      }

      setBooks(data.books || []);
    } catch (error) {
      setShelfMessage(
        "Unable to connect to the Shelfie server."
      );
      setBooks([]);
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleAddToShelf(book) {
    const token = localStorage.getItem("shelfieToken");

    if (!token) {
      setShelfMessage(
        "Please sign in before adding a book to your shelf."
      );
      return;
    }

    setShelfMessage("");

    try {
      const response = await fetch(`${API_URL}/api/shelf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          book,
          status: "want_to_read",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setShelfMessage(
          data.detail ||
            data.message ||
            "Unable to add book to shelf."
        );
        return;
      }

      setShelfMessage(
        `"${book.title}" was added to your shelf.`
      );
    } catch (error) {
      setShelfMessage(
        "Unable to connect to the Shelfie server."
      );
    }
  }

  if (user) {
    return (
      <div className="app">
        <header className="navbar">
          <div className="brand">Shelfie</div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            Log Out
          </button>
        </header>

        <main className="dashboard">
          <section className="welcome-card">
            <p className="eyebrow">
              Your digital bookshelf
            </p>

            <h1>
              Welcome, {user.display_name || "Reader"}!
            </h1>

            <p className="welcome-text">
              Discover books, organize your reading,
              and keep track of what you want to read next.
            </p>

            <div className="account-details">
              <div>
                <span>Account</span>
                <strong>{user.email}</strong>
              </div>

              <div>
                <span>Role</span>
                <strong className="role">
                  {user.role}
                </strong>
              </div>

              <div>
                <span>Status</span>
                <strong>
                  {user.account_status}
                </strong>
              </div>
            </div>

            {user.role === "admin" && (
              <div className="admin-card">
                <h2>Admin Access</h2>

                <p>
                  You are signed in with administrator
                  privileges.
                </p>
              </div>
            )}
          </section>

          <section className="book-search-section">
            <h2>Find a Book</h2>

            <p>
              Search for a book and add it to your
              reading list.
            </p>

            <form
              className="book-search-form"
              onSubmit={handleBookSearch}
            >
              <input
                type="text"
                placeholder="Search by title or author"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
              />

              <button
                type="submit"
                disabled={searchLoading}
              >
                {searchLoading
                  ? "Searching..."
                  : "Search"}
              </button>
            </form>

            {shelfMessage && (
              <p className="success-message">
                {shelfMessage}
              </p>
            )}

            <div className="book-results">
              {books.map((book) => (
                <article
                  className="book-card"
                  key={book.id}
                >
                  {book.cover_url && (
                    <img
                      src={book.cover_url}
                      alt={`${book.title} cover`}
                    />
                  )}

                  <div className="book-info">
                    <h3>{book.title}</h3>

                    <p>
                      {book.authors?.length
                        ? book.authors.join(", ")
                        : "Unknown author"}
                    </p>

                    {book.published_date && (
                      <small>
                        Published: {book.published_date}
                      </small>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        handleAddToShelf(book)
                      }
                    >
                      Add to Shelf
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <section className="login-intro">
          <p className="eyebrow">Welcome to</p>

          <h1>Shelfie</h1>

          <p>
            Your personal digital library for discovering
            books and organizing your reading journey.
          </p>
        </section>

        <section className="login-card">
          <div className="auth-tabs">
            <button
              type="button"
              className={
                authMode === "login"
                  ? "auth-tab active"
                  : "auth-tab"
              }
              onClick={() => switchMode("login")}
            >
              Sign In
            </button>

            <button
              type="button"
              className={
                authMode === "register"
                  ? "auth-tab active"
                  : "auth-tab"
              }
              onClick={() => switchMode("register")}
            >
              Create Account
            </button>
          </div>

          {authMode === "login" ? (
            <>
              <h2>Sign In</h2>

              <p className="login-subtitle">
                Sign in to continue to your bookshelf.
              </p>

              <form onSubmit={handleLogin}>
                <label htmlFor="email">
                  Email
                </label>

                <input
                  id="email"
                  type="email"
                  placeholder="reader@example.com"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  required
                />

                <label htmlFor="password">
                  Password
                </label>

                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  required
                />

                {message && (
                  <p
                    className={
                      messageType === "success"
                        ? "success-message"
                        : "error-message"
                    }
                  >
                    {message}
                  </p>
                )}

                <button
                  className="login-button"
                  type="submit"
                  disabled={loading}
                >
                  {loading
                    ? "Signing In..."
                    : "Sign In"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2>Create Account</h2>

              <p className="login-subtitle">
                Create your Shelfie account to start
                building your digital library.
              </p>

              <form onSubmit={handleRegister}>
                <label htmlFor="displayName">
                  Display Name
                </label>

                <input
                  id="displayName"
                  type="text"
                  placeholder="Shelfie Reader"
                  value={displayName}
                  onChange={(event) =>
                    setDisplayName(event.target.value)
                  }
                  required
                />

                <label htmlFor="registerEmail">
                  Email
                </label>

                <input
                  id="registerEmail"
                  type="email"
                  placeholder="reader@example.com"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  required
                />

                <label htmlFor="registerPassword">
                  Password
                </label>

                <input
                  id="registerPassword"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  minLength="6"
                  required
                />

                {message && (
                  <p className="error-message">
                    {message}
                  </p>
                )}

                <button
                  className="login-button"
                  type="submit"
                  disabled={loading}
                >
                  {loading
                    ? "Creating Account..."
                    : "Create Account"}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;