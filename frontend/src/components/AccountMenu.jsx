import { useEffect, useRef, useState } from "react";

import Avatar from "./Avatar";
import styles from "./AccountMenu.module.css";


function AccountMenu({ user, accounts, onSwitch, onAddAccount, onProfile, onLogout }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClick(event) {
      if (!menuRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function choose(action) {
    setOpen(false);
    action();
  }

  return (
    <div className={styles.menu} ref={menuRef}>
      <button type="button" className={styles.trigger} onClick={() => setOpen(!open)}>
        <Avatar avatar={user.avatar_url} size={30} />
        <span className={styles.name}>{user.display_name || "Profile"}</span>
        <span aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className={styles.dropdown}>
          {accounts.map(({ user: account }) => (
            <button
              key={account.id}
              type="button"
              className={account.id === user.id ? styles.active : ""}
              onClick={() => choose(() => onSwitch(account.id))}
            >
              <Avatar avatar={account.avatar_url} size={30} />
              <span className={styles.accountText}>
                <strong>{account.display_name}</strong>
                <small>{account.email}</small>
              </span>
              {account.role === "admin" && <span className={styles.badge}>Admin</span>}
            </button>
          ))}
          <hr />
          <button type="button" onClick={() => choose(onAddAccount)}>
            + Add another account
          </button>
          <button type="button" onClick={() => choose(onProfile)}>
            Profile
          </button>
          <button type="button" onClick={() => choose(onLogout)}>
            Log out of {user.display_name || "this account"}
          </button>
        </div>
      )}
    </div>
  );
}

export default AccountMenu;
