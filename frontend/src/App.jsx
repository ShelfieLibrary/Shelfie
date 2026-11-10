import { useEffect, useState } from "react";

import {
  getAccounts,
  getActiveAccount,
  removeAccount,
  setActiveAccount,
  updateActiveUser,
} from "./api/accounts";
import { getSession } from "./api/auth";
import { searchBooks } from "./api/books";
import { getUnreadCount } from "./api/notifications";
import AccountMenu from "./components/AccountMenu";
import ChatWidget from "./components/ChatWidget";
import ComingSoon from "./components/ComingSoon";
import BookSearch from "./components/BookSearch";
import Button from "./components/ui/Button";
import AdminPage from "./pages/AdminPage";
import Dashboard from "./pages/Dashboard";
import NotificationsPage from "./pages/NotificationsPage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import styles from "./App.module.css";


const PLACEHOLDER_PAGES = {
  recommendations: {
    icon: "✨",
    title: "Recommended for You",
    description: "Personalized picks based on your reading list and ratings.",
    features: [
      "AI-selected books matched to your reading history",
      "A short reason for each recommendation",
      "Add a recommendation straight to your reading list",
    ],
  },
};


function App() {
  const [user, setUser] = useState(() => getActiveAccount()?.user || null);
  const [accounts, setAccounts] = useState(getAccounts);
  const [showLogin, setShowLogin] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState(null);
  const [homeKey, setHomeKey] = useState(0);
  const [profileUserId, setProfileUserId] = useState(null);
  const [unread, setUnread] = useState(0);

  function syncAccounts() {
    setAccounts(getAccounts());
    setUser(getActiveAccount()?.user || null);
  }

  function refreshProfile() {
    if (!getActiveAccount()) return;

    getSession()
      .then((data) => updateActiveUser(data.user))
      .catch(() => {
        const active = getActiveAccount();
        if (active) removeAccount(active.user.id);
      })
      .finally(syncAccounts);
  }

  useEffect(refreshProfile, []);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return undefined;
    }

    function checkUnread() {
      getUnreadCount()
        .then((data) => setUnread(data.unread))
        .catch(() => {});
    }

    checkUnread();
    const timer = setInterval(checkUnread, 60000);
    return () => clearInterval(timer);
  }, [user?.id]);

  function goHome() {
    setHomeKey((key) => key + 1);
    setPage("dashboard");
    setSearch(null);
    setSearchTerm("");
  }

  async function handleSearch(event) {
    event.preventDefault();
    setHomeKey((key) => key + 1);
    setPage("dashboard");
    setSearch({ loading: true, books: [], message: "" });

    try {
      const data = await searchBooks(searchTerm.trim());
      const books = data.books || [];
      setSearch({
        loading: false,
        books,
        message: books.length ? "" : "No matching books were found.",
      });
    } catch (error) {
      setSearch({ loading: false, books: [], message: error.message });
    }
  }

  function handleAuthenticated() {
    syncAccounts();
    setShowLogin(false);
    goHome();
  }

  function handleSwitch(userId) {
    setActiveAccount(userId);
    syncAccounts();
    goHome();
    refreshProfile();
  }

  function openPage(nextPage) {
    setHomeKey((key) => key + 1);
    setProfileUserId(user?.id || null);
    setPage(nextPage);
  }

  function openProfile(userId) {
    setHomeKey((key) => key + 1);
    setProfileUserId(userId);
    setPage("profile");
  }

  function handleProfileUpdated(profile) {
    updateActiveUser({ ...user, ...profile });
    syncAccounts();
  }

  function handleLogout() {
    removeAccount(user.id);
    syncAccounts();
    goHome();
  }

  const navLinks = [
    ["dashboard", "Home"],
    ...(user ? [["profile", "My Shelf"], ["recommendations", "For You"]] : []),
    ...(user?.role === "admin" ? [["admin", "Admin"]] : []),
  ];

  if (showLogin) {
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
        <div className={styles.navLeft}>
          <button type="button" className={styles.brand} onClick={goHome}>
            Shelfie
          </button>
          <nav className={styles.navLinks}>
            {navLinks.map(([target, label]) => (
              <button
                key={target}
                type="button"
                className={
                  page === target && (target !== "profile" || profileUserId === user?.id)
                    ? styles.activeNavLink
                    : styles.navLink
                }
                onClick={() => (target === "dashboard" ? goHome() : openPage(target))}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
        <div className={styles.navSearch}>
          <BookSearch
            searchTerm={searchTerm}
            loading={search?.loading}
            onSearchTermChange={setSearchTerm}
            onSubmit={handleSearch}
          />
        </div>
        <div className={styles.navUser}>
          {user && (
            <button
              type="button"
              className={page === "notifications" ? styles.activeNavLink : styles.bell}
              onClick={() => openPage("notifications")}
              aria-label="Notifications"
            >
              🔔
              {unread > 0 && <span className={styles.badge}>{unread > 99 ? "99+" : unread}</span>}
            </button>
          )}
          {user ? (
            <AccountMenu
              user={user}
              accounts={accounts}
              onSwitch={handleSwitch}
              onAddAccount={() => setShowLogin(true)}
              onProfile={() => openPage("profile")}
              onLogout={handleLogout}
            />
          ) : (
            <Button onClick={() => setShowLogin(true)}>Log In</Button>
          )}
        </div>
      </header>

      {page === "profile" && profileUserId ? (
        <ProfilePage
          key={homeKey}
          userId={profileUserId}
          user={user}
          onRequireLogin={() => setShowLogin(true)}
          onOpenProfile={openProfile}
          onProfileUpdated={handleProfileUpdated}
        />
      ) : page === "admin" && user?.role === "admin" ? (
        <AdminPage key={homeKey} user={user} onOpenProfile={openProfile} />
      ) : page === "notifications" && user ? (
        <NotificationsPage
          key={homeKey}
          user={user}
          onRequireLogin={() => setShowLogin(true)}
          onOpenProfile={openProfile}
          onUnreadChange={setUnread}
        />
      ) : PLACEHOLDER_PAGES[page] && user ? (
        <ComingSoon {...PLACEHOLDER_PAGES[page]} />
      ) : (
        <Dashboard
          key={`${user?.id || "guest"}-${homeKey}`}
          user={user}
          search={search}
          onClearSearch={goHome}
          onOpenPage={openPage}
          onOpenProfile={openProfile}
          onRequireLogin={() => setShowLogin(true)}
        />
      )}

      <ChatWidget />
    </div>
  );
}

export default App;
