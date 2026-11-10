import { useEffect, useState } from "react";

import { getNotifications, markAllRead, markRead } from "../api/notifications";
import Button from "../components/ui/Button";
import BookPage from "./BookPage";
import styles from "./NotificationsPage.module.css";


const ICONS = { new_review: "⭐", announcement: "📣" };


function timeAgo(value) {
  const minutes = Math.round((Date.now() - new Date(value)) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`;
  return new Date(value).toLocaleDateString();
}


function NotificationsPage({ user, onRequireLogin, onOpenProfile, onUnreadChange }) {
  const [notifications, setNotifications] = useState(null);
  const [error, setError] = useState("");
  const [selectedBook, setSelectedBook] = useState(null);

  function load() {
    getNotifications()
      .then((data) => {
        setNotifications(data.notifications);
        onUnreadChange(data.unread);
      })
      .catch((loadError) => setError(loadError.message));
  }

  useEffect(load, []);

  async function read(notification) {
    if (notification.is_read) return;
    try {
      await markRead(notification.id);
      load();
    } catch (readError) {
      setError(readError.message);
    }
  }

  async function open(notification) {
    await read(notification);
    if (notification.books) setSelectedBook(notification.books);
  }

  async function readAll() {
    try {
      await markAllRead();
      load();
    } catch (readError) {
      setError(readError.message);
    }
  }

  if (selectedBook) {
    return (
      <BookPage
        book={{ ...selectedBook, authors: selectedBook.authors || [] }}
        user={user}
        onBack={() => setSelectedBook(null)}
        onRequireLogin={onRequireLogin}
        onOpenProfile={onOpenProfile}
      />
    );
  }

  const hasUnread = notifications?.some((notification) => !notification.is_read);

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <div className={styles.header}>
          <h1>Notifications</h1>
          {hasUnread && (
            <Button variant="secondary" onClick={readAll}>
              Mark all as read
            </Button>
          )}
        </div>

        {error && <p className={styles.error}>{error}</p>}

        {!notifications ? (
          [0, 1, 2].map((index) => (
            <div key={index} className="skeleton" style={{ height: 64, marginBottom: 8 }} />
          ))
        ) : notifications.length ? (
          <ul className={styles.list}>
            {notifications.map((notification) => (
              <li key={notification.id} className={notification.is_read ? "" : styles.unread}>
                <button
                  type="button"
                  className={styles.item}
                  onClick={() => open(notification)}
                >
                  <span className={styles.icon}>{ICONS[notification.type]}</span>
                  <span className={styles.text}>
                    <span>{notification.message}</span>
                    <small>
                      {timeAgo(notification.created_at)}
                      {notification.type === "new_review" &&
                        !notification.review_id &&
                        " · This review has been removed"}
                    </small>
                  </span>
                </button>
                {!notification.is_read && (
                  <button
                    type="button"
                    className={styles.markRead}
                    onClick={() => read(notification)}
                    aria-label="Mark as read"
                    title="Mark as read"
                  >
                    ●
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.muted}>No notifications.</p>
        )}
      </section>
    </main>
  );
}

export default NotificationsPage;
