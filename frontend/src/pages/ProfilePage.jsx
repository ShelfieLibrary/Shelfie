import { useEffect, useState } from "react";

import { getProfile, updateProfile } from "../api/profiles";
import Avatar, { AVATARS } from "../components/Avatar";
import Button from "../components/ui/Button";
import BookPage from "./BookPage";
import styles from "./ProfilePage.module.css";


const SHELVES = {
  reading: "Reading",
  want_to_read: "Want to Read",
  completed: "Completed",
};


function Cover({ book }) {
  return book.cover_url ? (
    <img className={styles.cover} src={book.cover_url} alt={`${book.title} cover`} />
  ) : (
    <div className={`${styles.cover} ${styles.noCover}`}>{book.title}</div>
  );
}


function ProfilePage({ userId, user, onRequireLogin, onOpenProfile, onProfileUpdated }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftAvatar, setDraftAvatar] = useState("book");
  const [formError, setFormError] = useState("");

  const isOwn = user?.id === userId;
  const [filter, setFilter] = useState("all");
  const [selectedBook, setSelectedBook] = useState(null);

  useEffect(() => {
    if (selectedBook) return;
    getProfile(userId)
      .then(setData)
      .catch((loadError) => setError(loadError.message));
  }, [userId, selectedBook]);

  function startEditing() {
    setDraftName(data.profile.display_name);
    setDraftAvatar(data.profile.avatar_url || "book");
    setFormError("");
    setEditing(true);
  }

  async function handleSave(event) {
    event.preventDefault();
    const changes = {};
    if (draftName.trim() !== data.profile.display_name) changes.display_name = draftName;
    if (draftAvatar !== (data.profile.avatar_url || "book")) changes.avatar = draftAvatar;

    if (!Object.keys(changes).length) {
      setEditing(false);
      return;
    }

    try {
      const result = await updateProfile(changes);
      setData({ ...data, profile: { ...data.profile, ...result.profile } });
      onProfileUpdated(result.profile);
      setEditing(false);
    } catch (saveError) {
      setFormError(saveError.message);
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

  if (error) {
    return (
      <main className={styles.profile}>
        <section className={styles.panel}>
          <h2>Profile not found</h2>
          <p className={styles.muted}>This reader's profile doesn't exist or couldn't be loaded.</p>
        </section>
      </main>
    );
  }

  const profile = data?.profile;
  const name = profile?.display_name || (isOwn ? user.display_name : "");
  const shelves = filter === "all" ? Object.keys(SHELVES) : [filter];
  const current = data?.shelf.reading[0];

  return (
    <main className={styles.profile}>
      <section className={styles.header}>
        <div className={styles.identity}>
          <Avatar avatar={profile?.avatar_url} size={76} />
          <div>
            <h1>{name || "Reader"}</h1>
            {isOwn && (
              <p className={styles.muted}>
                {user.email}
                {user.role === "admin" && <span className={styles.badge}>Admin</span>}
              </p>
            )}
            {isOwn && profile && !editing && (
              <button type="button" className={styles.editLink} onClick={startEditing}>
                Edit profile
              </button>
            )}
          </div>
        </div>

        {current && (
          <button type="button" className={styles.current} onClick={() => setSelectedBook(current)}>
            <Cover book={current} />
            <span>
              <span className={styles.currentLabel}>Currently reading</span>
              <strong>{current.title}</strong>
              {current.authors.length > 0 && (
                <span className={styles.muted}>{current.authors.join(", ")}</span>
              )}
            </span>
          </button>
        )}

        <dl className={styles.stats}>
          {Object.entries(SHELVES).map(([status, label]) => (
            <div key={status}>
              <dt>{label}</dt>
              <dd>{data ? data.counts[status] : "–"}</dd>
            </div>
          ))}
          <div>
            <dt>Reviews</dt>
            <dd>{data ? data.reviews.length : "–"}</dd>
          </div>
        </dl>
      </section>

      {editing && (
        <form className={styles.panel} onSubmit={handleSave}>
          <h2>Edit profile</h2>
          <label className={styles.field}>
            Display name
            <input
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              maxLength="100"
              required
            />
          </label>
          <p className={styles.fieldLabel}>Avatar</p>
          <div className={styles.avatarPicker}>
            {Object.keys(AVATARS).map((key) => (
              <button
                key={key}
                type="button"
                className={draftAvatar === key ? styles.avatarSelected : styles.avatarOption}
                onClick={() => setDraftAvatar(key)}
                aria-label={key}
              >
                <Avatar avatar={key} size={44} />
              </button>
            ))}
          </div>
          {formError && <p className={styles.error}>{formError}</p>}
          <div className={styles.formActions}>
            <Button type="submit">Save changes</Button>
            <Button type="button" variant="text" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Reading list</h2>
          <div className={styles.tabs}>
            {Object.entries({ all: "All", ...SHELVES }).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={filter === value ? styles.activeTab : ""}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {shelves.map((status) => (
          <div key={status} className={styles.shelf}>
            <h3>
              {SHELVES[status]} <span>{data?.counts[status] ?? 0}</span>
            </h3>
            <div className={styles.ledge}>
              {!data ? (
                Array.from({ length: 5 }, (_, index) => (
                  <div key={index} className={`skeleton ${styles.cover}`} />
                ))
              ) : data.shelf[status].length ? (
                data.shelf[status].map((book) => (
                  <button
                    key={book.id}
                    type="button"
                    className={styles.tile}
                    onClick={() => setSelectedBook(book)}
                    title={book.title}
                  >
                    <Cover book={book} />
                  </button>
                ))
              ) : (
                <p className={styles.empty}>
                  {isOwn ? "Nothing here yet. Search for a book to add it." : "Nothing here yet."}
                </p>
              )}
            </div>
          </div>
        ))}
      </section>

      <section className={styles.panel}>
        <h2>{isOwn ? "Your reviews" : `${name}'s reviews`}</h2>
        {!data ? (
          [0, 1, 2].map((index) => (
            <div key={index} className="skeleton" style={{ height: 56, marginBottom: 8 }} />
          ))
        ) : data.reviews.length ? (
          <ul className={styles.reviews}>
            {data.reviews.map((review) => (
              <li key={review.id}>
                <button type="button" onClick={() => review.books && setSelectedBook(review.books)}>
                  {review.books && <Cover book={review.books} />}
                  <span className={styles.reviewText}>
                    <strong>{review.books?.title || "A book"}</strong>
                    <span className={styles.stars} aria-label={`${review.rating} out of 5 stars`}>
                      {"★".repeat(review.rating)}
                      {"☆".repeat(5 - review.rating)}
                    </span>
                    {review.review_text && <span>{review.review_text}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.muted}>No reviews yet.</p>
        )}
      </section>
    </main>
  );
}

export default ProfilePage;
