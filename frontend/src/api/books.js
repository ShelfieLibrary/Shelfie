import { apiRequest } from "./client";

export function getFeaturedBooks() {
  return apiRequest("/api/books/featured");
}

export function getHomeFeed() {
  return apiRequest("/api/books/home");
}

export function searchBooks(searchTerm) {
  return apiRequest(`/api/books/search?q=${encodeURIComponent(searchTerm)}`);
}

export function getBookContent(book) {
  const params = new URLSearchParams({
    title: book.title,
    author: book.authors?.[0] || "",
  });
  return apiRequest(`/api/books/content?${params}`);
}
