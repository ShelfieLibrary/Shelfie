import LoginForm from "../components/LoginForm";
import styles from "./LoginPage.module.css";


function LoginPage({ onAuthenticated }) {
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
        </section>
        <LoginForm onAuthenticated={onAuthenticated} />
      </div>
    </main>
  );
}

export default LoginPage;
