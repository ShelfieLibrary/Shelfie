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
import BookSearch from "./components/BookSearch";
import Button from "./components/ui/Button";
import AdminPage from "./pages/AdminPage";
import Dashboard from "./pages/Dashboard";
import NotificationsPage from "./pages/NotificationsPage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import RecommendationsPage from "./pages/RecommendationsPage";
import styles from "./App.module.css";


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
    const term = searchTerm.trim();
    setSearch({ loading: true, books: [], message: "" });

    try {
      const data = await searchBooks(term);
      const books = data.books || [];
      setSearch({
        loading: false,
        books,
        message: books.length ? "" : "No matching books were found.",
        term,
        page: 1,
        hasMore: data.has_more,
      });
    } catch (error) {
      setSearch({ loading: false, books: [], message: error.message });
    }
  }

  async function loadMoreResults() {
    const page = search.page + 1;
    setSearch({ ...search, loadingMore: true });

    try {
      const data = await searchBooks(search.term, page);
      setSearch((current) => {
        const seen = new Set(current.books.map((book) => book.id));
        const books = (data.books || []).filter((book) => !seen.has(book.id));
        return {
          ...current,
          books: [...current.books, ...books],
          page,
          hasMore: data.has_more,
          loadingMore: false,
        };
      });
    } catch (error) {
      setSearch((current) => ({ ...current, loadingMore: false, message: error.message }));
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

  const accountMenu = user && (
    <AccountMenu
      user={user}
      accounts={accounts}
      onSwitch={handleSwitch}
      onAddAccount={() => setShowLogin(true)}
      onProfile={() => openPage("profile")}
      onLogout={handleLogout}
    />
  );

  if (user?.account_status === "suspended") {
    return (
      <div className={styles.app}>
        <header className={styles.navbar}>
          <span className={styles.brand}>Shelfie</span>
          <div className={styles.navUser}>{accountMenu}</div>
        </header>
        <main className={styles.suspended}>
          <h1>Your account is suspended</h1>
          <p>
            An administrator has suspended this account, so you can't use Shelfie right now.
            You can switch to another account or log out from the menu above.
          </p>
        </main>
      </div>
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
            accountMenu
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
      ) : page === "recommendations" && user ? (
        <RecommendationsPage
          key={homeKey}
          user={user}
          onRequireLogin={() => setShowLogin(true)}
          onOpenProfile={openProfile}
        />
      ) : (
        <Dashboard
          key={`${user?.id || "guest"}-${homeKey}`}
          user={user}
          search={search}
          onLoadMore={loadMoreResults}
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
