import { useEffect, useState } from "react";

import {
  dismissFlags,
  getFlags,
  getStats,
  getUsers,
  resolveReview,
  sendAnnouncement,
  updateUser,
} from "../api/admin";
import Avatar from "../components/Avatar";
import Button from "../components/ui/Button";
import styles from "./AdminPage.module.css";


const STAT_LABELS = {
  users: "Users",
  books: "Saved books",
  reviews: "Reviews",
  pending_flags: "Pending flags",
};
const FLAG_STATUSES = ["pending", "resolved", "dismissed"];


function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "";
}


function AdminPage({ user, onOpenProfile }) {
  const [tab, setTab] = useState("moderation");
  const [stats, setStats] = useState(null);
  const [flagStatus, setFlagStatus] = useState("pending");
  const [queue, setQueue] = useState(null);
  const [users, setUsers] = useState(null);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState(null);
  const [announcement, setAnnouncement] = useState("");

  function report(text, type = "success") {
    setMessage({ text, type });
  }

  function loadStats() {
    getStats().then((data) => setStats(data.stats)).catch((error) => report(error.message, "error"));
  }

  function loadQueue() {
    setQueue(null);
    getFlags(flagStatus)
      .then((data) => setQueue(data.items))
      .catch((error) => report(error.message, "error"));
  }

  function loadUsers() {
    getUsers().then((data) => setUsers(data.users)).catch((error) => report(error.message, "error"));
  }

  useEffect(loadStats, []);
  useEffect(loadQueue, [flagStatus]);
  useEffect(loadUsers, []);

  async function act(action, successRefresh) {
    try {
      const data = await action();
      report(data.message);
    } catch (error) {
      report(error.message, "error");
    } finally {
      successRefresh();
      loadStats();
    }
  }

  function handleResolve(reviewId) {
    if (!window.confirm("Delete this review and resolve its flags?")) return;
    act(() => resolveReview(reviewId), loadQueue);
  }

  function handleUserChange(target, changes) {
    act(() => updateUser(target.id, changes), loadUsers);
  }

  async function handleAnnounce(event) {
    event.preventDefault();
    try {
      const data = await sendAnnouncement(announcement);
      report(data.message);
      setAnnouncement("");
    } catch (error) {
      report(error.message, "error");
    }
  }

  const filteredUsers = users?.filter((person) =>
    `${person.display_name} ${person.email}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <main className={styles.page}>
      <section className={styles.stats}>
        {Object.entries(STAT_LABELS).map(([key, label]) => (
          <div key={key} className={key === "pending_flags" && stats?.[key] ? styles.alert : ""}>
            <strong>{stats ? stats[key] : "–"}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>

      {message && (
        <p className={message.type === "success" ? styles.success : styles.error}>
          {message.text}
        </p>
      )}

      <section className={styles.panel}>
        <div className={styles.tabs}>
          <button
            type="button"
            className={tab === "moderation" ? styles.activeTab : ""}
            onClick={() => setTab("moderation")}
          >
            Moderation queue
          </button>
          <button
            type="button"
            className={tab === "users" ? styles.activeTab : ""}
            onClick={() => setTab("users")}
          >
            Users
          </button>
          <button
            type="button"
            className={tab === "announcements" ? styles.activeTab : ""}
            onClick={() => setTab("announcements")}
          >
            Announcements
          </button>
        </div>

        {tab === "announcements" ? (
          <form className={styles.announce} onSubmit={handleAnnounce}>
            <label>
              Message to all users
              <textarea
                value={announcement}
                onChange={(event) => setAnnouncement(event.target.value)}
                maxLength="500"
                placeholder="For example: Shelfie will be down for maintenance on Friday at 9 PM."
                required
              />
            </label>
            <small className={styles.muted}>{announcement.length}/500</small>
            <Button type="submit" disabled={!announcement.trim()}>
              Send announcement
            </Button>
          </form>
        ) : tab === "moderation" ? (
          <>
            <div className={styles.filters}>
              {FLAG_STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={flagStatus === status ? styles.activeFilter : styles.filter}
                  onClick={() => setFlagStatus(status)}
                >
                  {status[0].toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>

            {!queue ? (
              [0, 1].map((index) => (
                <div key={index} className="skeleton" style={{ height: 120, marginBottom: 10 }} />
              ))
            ) : queue.length ? (
              <div className={styles.queue}>
                {queue.map((item) => (
                  <article key={item.review_id ?? item.reports[0].created_at} className={styles.flagCard}>
                    <header>
                      <strong>{item.review?.book_title || "Deleted review"}</strong>
                      <span className={styles.count}>
                        {item.reports.length} flag{item.reports.length === 1 ? "" : "s"}
                      </span>
                    </header>

                    {item.review ? (
                      <blockquote>
                        <span className={styles.stars}>
                          {"★".repeat(item.review.rating)}
                          {"☆".repeat(5 - item.review.rating)}
                        </span>{" "}
                        by {item.review.author}
                        {item.review.review_text && <p>“{item.review.review_text}”</p>}
                      </blockquote>
                    ) : (
                      <p className={styles.muted}>The review has been removed.</p>
                    )}

                    <ul className={styles.reports}>
                      {item.reports.map((flagReport) => (
                        <li key={flagReport.created_at}>
                          <strong>{flagReport.reporter}</strong>
                          {flagReport.reason ? `: ${flagReport.reason}` : " (no reason given)"}
                          <span className={styles.muted}> · {formatDate(flagReport.created_at)}</span>
                        </li>
                      ))}
                    </ul>

                    {item.status === "pending" ? (
                      <div className={styles.actions}>
                        <Button variant="danger" onClick={() => handleResolve(item.review_id)}>
                          Delete review
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => act(() => dismissFlags(item.review_id), loadQueue)}
                        >
                          Dismiss
                        </Button>
                      </div>
                    ) : (
                      <p className={styles.muted}>
                        {item.status === "resolved" ? "Resolved" : "Dismissed"}
                        {item.reviewed_by ? ` by ${item.reviewed_by}` : ""}
                        {item.reviewed_at ? ` on ${formatDate(item.reviewed_at)}` : ""}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className={styles.muted}>No {flagStatus} flags.</p>
            )}
          </>
        ) : (
          <>
            <input
              className={styles.search}
              type="search"
              placeholder="Search users by name or email"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {!users ? (
              <div className="skeleton" style={{ height: 200 }} />
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((person) => {
                    const isSelf = person.id === user.id;
                    return (
                      <tr key={person.id}>
                        <td>
                          <button
                            type="button"
                            className={styles.userCell}
                            onClick={() => onOpenProfile(person.id)}
                          >
                            <Avatar avatar={person.avatar_url} size={30} />
                            <span>
                              <strong>{person.display_name}</strong>
                              <small>{person.email}</small>
                            </span>
                          </button>
                        </td>
                        <td>
                          <select
                            value={person.role}
                            disabled={isSelf}
                            onChange={(event) => handleUserChange(person, { role: event.target.value })}
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td>
                          <select
                            value={person.account_status}
                            disabled={isSelf}
                            onChange={(event) =>
                              handleUserChange(person, { account_status: event.target.value })
                            }
                          >
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                          </select>
                        </td>
                        <td className={styles.muted}>
                          {new Date(person.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        )}
      </section>
    </main>
  );
}

export default AdminPage;
