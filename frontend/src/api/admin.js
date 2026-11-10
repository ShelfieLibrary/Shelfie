import { apiRequest } from "./client";


const admin = (path, options = {}) =>
  apiRequest(`/api/admin${path}`, { authenticated: true, ...options });


export const getStats = () => admin("/stats");
export const getUsers = () => admin("/users");
export const getFlags = (status) => admin(`/flags?status=${status}`);

export const updateUser = (userId, changes) =>
  admin(`/users/${userId}`, { method: "PATCH", body: JSON.stringify(changes) });

export const resolveReview = (reviewId) =>
  admin(`/reviews/${reviewId}/resolve`, { method: "POST" });

export const dismissFlags = (reviewId) =>
  admin(`/reviews/${reviewId}/dismiss`, { method: "POST" });

export const sendAnnouncement = (message) =>
  admin("/announcements", { method: "POST", body: JSON.stringify({ message }) });
