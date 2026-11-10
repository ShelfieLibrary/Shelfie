import { useEffect, useState } from "react";

import { addToShelf, getShelfStatus, removeFromShelf } from "../api/shelf";
import styles from "./ShelfControl.module.css";


const STATUSES = {
  want_to_read: "Want to Read",
  reading: "Reading",
  completed: "Completed",
};


function ShelfControl({ book, user, onRequireLogin, onMessage }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!user) return;
    getShelfStatus(book.id)
      .then((data) => setStatus(data.status))
      .catch(() => setStatus(null));
  }, [book.id, user]);

  async function handleChange(event) {
    const next = event.target.value;
    if (!user) {
      onRequireLogin();
      return;
    }

    try {
      if (next === "remove") {
        if (!window.confirm(`Remove “${book.title}” from your reading list?`)) return;
        await removeFromShelf(book.id);
        setStatus(null);
        onMessage("Removed from your reading list.");
      } else {
        await addToShelf(book, next);
        setStatus(next);
        onMessage(`Marked as ${STATUSES[next]}.`);
      }
    } catch (error) {
      onMessage(error.message, "error");
    }
  }

  return (
    <select
      className={status ? styles.saved : styles.select}
      value={status || ""}
      onChange={handleChange}
      aria-label="Reading list status"
    >
      {!status && <option value="">+ Add to Reading List</option>}
      {Object.entries(STATUSES).map(([value, label]) => (
        <option key={value} value={value}>
          {status === value ? `✓ ${label}` : label}
        </option>
      ))}
      {status && <option value="remove">Remove from list</option>}
    </select>
  );
}

export default ShelfControl;
