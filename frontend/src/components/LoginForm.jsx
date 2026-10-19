import { useState } from "react";

import { login, register } from "../api/auth";
import styles from "./LoginForm.module.css";
import Button from "./ui/Button";
import Input from "./ui/Input";


function LoginForm({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");
  const [loading, setLoading] = useState(false);

  function switchMode(nextMode) {
    setMode(nextMode);
    setPassword("");
    setMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (mode === "register") {
        await register(displayName, email, password);
        setMode("login");
        setPassword("");
        setMessageType("success");
        setMessage("Account created! You can now sign in.");
        return;
      }

      const data = await login(email, password);
      localStorage.setItem("shelfieToken", data.access_token);
      localStorage.setItem("shelfieUser", JSON.stringify(data.user));
      onAuthenticated(data.user);
    } catch (error) {
      setMessageType("error");
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={styles.card}>
      <div className={styles.tabs}>
        <button
          type="button"
          className={mode === "login" ? styles.activeTab : ""}
          onClick={() => switchMode("login")}
        >
          Sign In
        </button>
        <button
          type="button"
          className={mode === "register" ? styles.activeTab : ""}
          onClick={() => switchMode("register")}
        >
          Create Account
        </button>
      </div>

      <h2>{mode === "login" ? "Sign In" : "Create Account"}</h2>
      <p className={styles.subtitle}>
        {mode === "login"
          ? "Sign in to continue to your bookshelf."
          : "Create an account to start building your digital library."}
      </p>

      <form className={styles.form} onSubmit={handleSubmit}>
        {mode === "register" && (
          <Input
            id="displayName"
            label="Display Name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            maxLength="100"
            required
          />
        )}
        <Input
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <Input
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={mode === "register" ? 8 : undefined}
          required
        />
        {mode === "register" && (
          <small>Password must contain at least eight characters.</small>
        )}
        {message && (
          <p className={messageType === "success" ? styles.success : styles.error}>
            {message}
          </p>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
        </Button>
      </form>
    </section>
  );
}

export default LoginForm;
