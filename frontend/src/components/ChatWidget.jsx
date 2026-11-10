import { useState } from "react";

import styles from "./ChatWidget.module.css";


function ChatWidget() {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.widget}>
      {open && (
        <section className={styles.panel} aria-label="Shelfie help chat">
          <header>
            <strong>Shelfie Help</strong>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close chat">
              ✕
            </button>
          </header>
          <div className={styles.messages}>
            <p className={styles.bot}>
              Hi! I'll be able to answer questions about using Shelfie, like how to add
              a book to your reading list or flag a review.
            </p>
          </div>
          <form className={styles.form} onSubmit={(event) => event.preventDefault()}>
            <input placeholder="The assistant is coming soon" disabled />
            <button type="submit" disabled>
              Send
            </button>
          </form>
        </section>
      )}
      <button
        type="button"
        className={styles.bubble}
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close help chat" : "Open help chat"}
      >
        💬
      </button>
    </div>
  );
}

export default ChatWidget;
