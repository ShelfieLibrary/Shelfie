import { useEffect, useRef, useState } from "react";

import { sendChatMessage } from "../api/ai";
import styles from "./ChatWidget.module.css";


const GREETING = {
  role: "assistant",
  content: "Hi! Ask me anything about using Shelfie or finding your next book.",
};
const HISTORY_LENGTH = 10;


function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesRef = useRef(null);

  useEffect(() => {
    messagesRef.current?.scrollTo(0, messagesRef.current.scrollHeight);
  }, [messages, open]);

  async function handleSubmit(event) {
    event.preventDefault();
    const message = input.trim();
    if (!message || sending) return;

    const history = messages.slice(1).slice(-HISTORY_LENGTH);
    setMessages((current) => [...current, { role: "user", content: message }]);
    setInput("");
    setSending(true);

    try {
      const data = await sendChatMessage(message, history);
      setMessages((current) => [...current, { role: "assistant", content: data.reply }]);
    } catch (error) {
      setMessages((current) => [...current, { role: "assistant", content: error.message }]);
    } finally {
      setSending(false);
    }
  }

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
          <div className={styles.messages} ref={messagesRef}>
            {messages.map((message, index) => (
              <p key={index} className={message.role === "user" ? styles.user : styles.bot}>
                {message.content}
              </p>
            ))}
            {sending && <p className={styles.bot}>Typing…</p>}
          </div>
          <form className={styles.form} onSubmit={handleSubmit}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask a question"
              maxLength={500}
            />
            <button type="submit" disabled={sending || !input.trim()}>
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
