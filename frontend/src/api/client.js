const API_URL = import.meta.env.VITE_API_URL || "https://shelfie-api-cwtf.onrender.com";


export async function apiRequest(path, options = {}) {
  const { authenticated = false, ...fetchOptions } = options;
  const headers = { ...(fetchOptions.headers || {}) };

  if (fetchOptions.body) {
    headers["Content-Type"] = "application/json";
  }

  const token = localStorage.getItem("shelfieToken");
  if (authenticated && !token) {
    throw new Error("Please sign in to continue.");
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers,
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    const message = data.detail || data.message || "The request could not be completed.";
    throw new Error(message);
  }

  return data;
}