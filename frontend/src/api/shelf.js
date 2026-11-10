import { apiRequest } from "./client";


export function addToShelf(book, status = "want_to_read") {
  return apiRequest("/api/shelf", {
    method: "POST",
    authenticated: true,
    body: JSON.stringify({ book, status }),
  });
}


export function getShelfStatus(bookId) {
  return apiRequest(`/api/shelf/${encodeURIComponent(bookId)}`, { authenticated: true });
}


export function removeFromShelf(bookId) {
  return apiRequest(`/api/shelf/${encodeURIComponent(bookId)}`, {
    method: "DELETE",
    authenticated: true,
  });
}
