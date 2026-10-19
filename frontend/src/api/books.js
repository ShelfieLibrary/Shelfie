import { apiRequest } from "./client";


export function searchBooks(searchTerm) {
  return apiRequest(`/api/books/search?q=${encodeURIComponent(searchTerm)}`);
}
