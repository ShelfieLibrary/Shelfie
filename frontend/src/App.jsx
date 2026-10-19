import { useState } from "react";

import { logout } from "./api/auth";
import Button from "./components/ui/Button";
import Dashboard from "./pages/Dashboard";
import LoginPage from "./pages/LoginPage";
import styles from "./App.module.css";


function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("shelfieUser");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  function handleAuthenticated(authenticatedUser) {
    setUser(authenticatedUser);
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
    }
  }

  if (!user) {
    return <LoginPage onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className={styles.app}>
      <header className={styles.navbar}>
        <div className={styles.brand}>Shelfie</div>
        <div className={styles.navUser}>
          <span>{user.display_name}</span>
          <Button variant="secondary" onClick={handleLogout}>
            Log Out
          </Button>
        </div>
      </header>
      <Dashboard user={user} />
    </div>
  );
}

export default App;
