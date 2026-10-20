import LoginForm from "../components/LoginForm";
import Button from "../components/ui/Button";
import styles from "./LoginPage.module.css";


function LoginPage({ onAuthenticated, onCancel }) {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <section className={styles.intro}>
          <p className={styles.eyebrow}>Welcome to</p>
          <h1>Shelfie</h1>
          <p>
            Your personal digital library for discovering books, sharing reviews,
            and organizing your reading journey.
          </p>
          {onCancel && (
            <Button type="button" variant="text" onClick={onCancel}>
              ← Continue browsing as a guest
            </Button>
          )}
        </section>
        <LoginForm onAuthenticated={onAuthenticated} />
      </div>
    </main>
  );
}

export default LoginPage;