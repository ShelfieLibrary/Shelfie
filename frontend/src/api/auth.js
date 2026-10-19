import { apiRequest } from "./client";


export function login(email, password) {
  return apiRequest("/api/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}


export function register(displayName, email, password) {
  return apiRequest("/api/register", {
    method: "POST",
    body: JSON.stringify({ display_name: displayName, email, password }),
  });
}


export function logout() {
  return apiRequest("/api/logout", { method: "POST" });
}
