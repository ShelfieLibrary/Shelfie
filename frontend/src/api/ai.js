import { apiRequest } from "./client";


export function sendChatMessage(message, history) {
  return apiRequest("/api/ai/chat", {
    method: "POST",
    body: JSON.stringify({ message, history }),
  });
}


export function getRecommendations(refresh = false) {
  const query = refresh ? "?refresh=true" : "";
  return apiRequest(`/api/ai/recommendations${query}`, { authenticated: true });
}
