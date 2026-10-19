import { apiRequest } from "./client";


export function getReviews(bookId) {
  return apiRequest(`/api/books/${encodeURIComponent(bookId)}/reviews`, {
    authenticated: true,
  });
}


export function createReview(book, rating, reviewText) {
  return apiRequest("/api/reviews", {
    method: "POST",
    authenticated: true,
    body: JSON.stringify({ book, rating, review_text: reviewText }),
  });
}


export function updateReview(reviewId, rating, reviewText) {
  return apiRequest(`/api/reviews/${reviewId}`, {
    method: "PUT",
    authenticated: true,
    body: JSON.stringify({ rating, review_text: reviewText }),
  });
}


export function deleteReview(reviewId) {
  return apiRequest(`/api/reviews/${reviewId}`, {
    method: "DELETE",
    authenticated: true,
  });
}


export function flagReview(reviewId, reason) {
  return apiRequest(`/api/reviews/${reviewId}/flags`, {
    method: "POST",
    authenticated: true,
    body: JSON.stringify({ reason: reason || null }),
  });
}
