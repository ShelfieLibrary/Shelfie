import { getActiveAccount, removeAccount, saveAccount } from "./accounts";

const API_URL = import.meta.env.VITE_API_URL || "https://shelfie-api-cwtf.onrender.com";


async function send(path, fetchOptions, token) {
  const headers = { ...(fetchOptions.headers || {}) };

  if (fetchOptions.body) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, { ...fetchOptions, headers });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}


async function refreshActiveAccount(account) {
  const { response, data } = await send(
    "/api/refresh",
    { method: "POST", body: JSON.stringify({ refresh_token: account.refresh_token }) },
    null,
  );

  if (!response.ok) {
    removeAccount(account.user.id);
    return null;
  }

  saveAccount(data);
  return data.access_token;
}


export async function apiRequest(path, options = {}) {
  const { authenticated = false, ...fetchOptions } = options;
  const account = getActiveAccount();

  if (authenticated && !account) {
    throw new Error("Please sign in to continue.");
  }

  let { response, data } = await send(path, fetchOptions, account?.access_token);

  if (response.status === 401 && account?.refresh_token) {
    const token = await refreshActiveAccount(account);
    if (token) {
      ({ response, data } = await send(path, fetchOptions, token));
    }
  }

  if (!response.ok || data.success === false) {
    const message = data.detail || data.message || "The request could not be completed.";
    throw new Error(message);
  }

  return data;
}
