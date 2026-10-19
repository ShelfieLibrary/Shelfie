import { apiRequest } from "./client";


export function addToShelf(book, status = "want_to_read") {
  return apiRequest("/api/shelf", {
    method: "POST",
    authenticated: true,
    body: JSON.stringify({ book, status }),
  });
}
