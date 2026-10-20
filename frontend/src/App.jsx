import { useState } from "react";

import { logout } from "./api/auth";
import Button from "./components/ui/Button";
import Dashboard from "./pages/Dashboard";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import styles from "./App.module.css";


function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("shelfieUser");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [showLogin, setShowLogin] = useState(false);
  const [page, setPage] = useState("dashboard");

  function handleAuthenticated(authenticatedUser) {
    setUser(authenticatedUser);
    setShowLogin(false);
  }

  async function handleLogout() {
    try {
      await logout();
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      localStorage.removeItem("shelfieToken");
      localStorage.removeItem("shelfieUser");
      setUser(null);
      setPage("dashboard");
    }
  }

  if (showLogin && !user) {
    return (
      <LoginPage
        onAuthenticated={handleAuthenticated}
        onCancel={() => setShowLogin(false)}
      />
    );
  }

  return (
    <div className={styles.app}>
      <header className={styles.navbar}>
        <button
          type="button"
          className={styles.brand}
          onClick={() => setPage("dashboard")}
        >
          Shelfie
        </button>
        <div className={styles.navUser}>
          {user ? (
            <>
              <Button variant="secondary" onClick={() => setPage("profile")}>
                {user.display_name || "Profile"}
              </Button>
              <Button variant="secondary" onClick={handleLogout}>
                Log Out
              </Button>
            </>
          ) : (
            <Button onClick={() => setShowLogin(true)}>Log In</Button>
          )}
        </div>
      </header>

      {page === "profile" && user ? (
        <ProfilePage user={user} />
      ) : (
        <Dashboard user={user} onRequireLogin={() => setShowLogin(true)} />
      )}
    </div>
  );
}

export default App;