import { useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("shelfieUser");

    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

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
      setMessage(
        "Unable to connect to the Shelfie server."
      );
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
              and keep track of what you want to read
              next.
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
            Your personal digital library for
            discovering books and organizing your
            reading journey.
          </p>
        </section>

        <section className="login-card">
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
              <p className="error-message">
                {message}
              </p>
            )}

            <button
              className="login-button"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <p className="signup-text">
            New to Shelfie? Registration coming next.
          </p>
        </section>
      </div>
    </div>
  );
}

export default App;