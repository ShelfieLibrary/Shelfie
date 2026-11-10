import { apiRequest } from "./client";


export function getProfile(userId) {
  return apiRequest(`/api/profiles/${encodeURIComponent(userId)}`);
}


export function updateProfile(changes) {
  return apiRequest("/api/profiles/me", {
    method: "PUT",
    authenticated: true,
    body: JSON.stringify(changes),
  });
}
