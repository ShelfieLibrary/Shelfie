import styles from "./Button.module.css";


function Button({ children, variant = "primary", className = "", ...props }) {
  return (
    <button
      className={`${styles.button} ${styles[variant]} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
