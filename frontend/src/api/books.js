import { apiRequest } from "./client";

export function getFeaturedBooks() {
  return apiRequest("/api/books/featured");
}

export function searchBooks(searchTerm) {
  return apiRequest(`/api/books/search?q=${encodeURIComponent(searchTerm)}`);
}
