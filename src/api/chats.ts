// src/api/chats.ts
import { apiFetch } from "./client";

export type ChatPreview = {
  id: string;
  unread_count: number;
  last_message: null | {
    type: "text" | "image" | "mixed";
    text: string | null;
    image_url: string | null;
    created_at: string;
  };
  listing: {
    id: string;
    title: string;
    price: string;
    city: string;
    images: { url: string }[];
  };
  buyer: { id: string; full_name: string };
  seller: { id: string; full_name: string };
  last_message_at: string | null;
};

export async function getChats(): Promise<ChatPreview[]> {
  return await apiFetch("/chats");
}

export async function createChatByListing(listingId: string | number) {
  return await apiFetch("/chats", {
    method: "POST",
    body: JSON.stringify({ listing_id: Number(listingId) }),
  });
  
}
export async function deleteChat(chatId: string | number) {
  return await apiFetch(`/chats/${chatId}`, { method: "DELETE" });
}
