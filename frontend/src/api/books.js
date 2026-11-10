import { apiRequest } from "./client";

export function getFeaturedBooks() {
  return apiRequest("/api/books/featured");
}

export function getHomeFeed() {
  return apiRequest("/api/books/home");
}

export function searchBooks(searchTerm, page = 1) {
  const params = new URLSearchParams({ q: searchTerm, page });
  return apiRequest(`/api/books/search?${params}`);
}

export function getBookPreview(bookId) {
  return apiRequest(`/api/books/${encodeURIComponent(bookId)}/preview`);
}

export function getBookContent(book) {
  const params = new URLSearchParams({
    title: book.title,
    author: book.authors?.[0] || "",
  });
  return apiRequest(`/api/books/content?${params}`);
}
