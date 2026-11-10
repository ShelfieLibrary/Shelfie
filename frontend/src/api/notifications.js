import { apiRequest } from "./client";


const request = (path, options = {}) =>
  apiRequest(`/api/notifications${path}`, { authenticated: true, ...options });


export const getNotifications = () => request("");
export const getUnreadCount = () => request("/unread");
export const markRead = (id) => request(`/${id}/read`, { method: "POST" });
export const markAllRead = () => request("/read-all", { method: "POST" });
