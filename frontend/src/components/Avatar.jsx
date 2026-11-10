import styles from "./Avatar.module.css";


export const AVATARS = {
  book: { emoji: "📚", color: "#5c3d2e" },
  fox: { emoji: "🦊", color: "#d9783b" },
  owl: { emoji: "🦉", color: "#7a5c3e" },
  cat: { emoji: "🐱", color: "#c7923e" },
  bear: { emoji: "🐻", color: "#8a5a3b" },
  panda: { emoji: "🐼", color: "#4a4a4a" },
  frog: { emoji: "🐸", color: "#4f8a4b" },
  penguin: { emoji: "🐧", color: "#2f4b6b" },
  rabbit: { emoji: "🐰", color: "#b07a8c" },
  koala: { emoji: "🐨", color: "#6f7d86" },
};


function Avatar({ avatar, size = 32 }) {
  const { emoji, color } = AVATARS[avatar] || AVATARS.book;

  return (
    <span
      className={styles.avatar}
      style={{ width: size, height: size, fontSize: size * 0.55, background: color }}
      aria-hidden="true"
    >
      {emoji}
    </span>
  );
}

export default Avatar;
