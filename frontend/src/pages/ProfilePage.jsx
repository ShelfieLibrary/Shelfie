import styles from "./ProfilePage.module.css";


const ACCOUNT_FIELDS = {
  Email: "email",
  Role: "role",
  Status: "account_status",
};

function ProfilePage({ user }) {
  return (
    <main className={styles.profile}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>Your profile</p>
        <h1>{user.display_name || "Reader"}</h1>

        <div className={styles.details}>
          {Object.entries(ACCOUNT_FIELDS).map(([label, field]) => (
            <div key={field}>
              <span>{label}</span>
              <strong>{user[field]}</strong>
            </div>
          ))}
        </div>

        {user.role === "admin" && (
          <div className={styles.adminNotice}>
            <h2>Admin Access</h2>
            <p>You are signed in with administrator privileges.</p>
          </div>
        )}
      </section>
    </main>
  );
}

export default ProfilePage;
