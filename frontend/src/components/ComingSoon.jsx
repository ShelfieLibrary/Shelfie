import styles from "./ComingSoon.module.css";


function ComingSoon({ icon, title, description, features }) {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <span className={styles.icon} aria-hidden="true">{icon}</span>
        <h1>{title}</h1>
        <p>{description}</p>
        <ul>
          {features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
        <span className={styles.tag}>Coming soon</span>
      </section>
    </main>
  );
}

export default ComingSoon;
