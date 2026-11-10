const ACCOUNTS_KEY = "shelfieAccounts";
const ACTIVE_KEY = "shelfieActiveAccount";


function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}


export function getAccounts() {
  return read(ACCOUNTS_KEY, []);
}


export function getActiveAccount() {
  const activeId = read(ACTIVE_KEY, null);
  return getAccounts().find((account) => account.user.id === activeId) || null;
}


function writeAccounts(accounts) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}


export function saveAccount({ user, access_token, refresh_token }) {
  const accounts = getAccounts().filter((account) => account.user.id !== user.id);
  writeAccounts([...accounts, { user, access_token, refresh_token }]);
  setActiveAccount(user.id);
}


export function setActiveAccount(userId) {
  localStorage.setItem(ACTIVE_KEY, JSON.stringify(userId));
}


export function removeAccount(userId) {
  const accounts = getAccounts().filter((account) => account.user.id !== userId);
  writeAccounts(accounts);
  localStorage.setItem(ACTIVE_KEY, JSON.stringify(accounts[0]?.user.id ?? null));
  return accounts[0] || null;
}


export function updateActiveUser(user) {
  const active = getActiveAccount();
  if (active) saveAccount({ ...active, user });
}
