import { apiFetch } from "./client";

export async function getMessages(chatId: string) {
  return await apiFetch(`/chats/${chatId}/messages`);
}

/**
 * Enviar mensaje:
 * - solo texto
 * - solo imagen
 * - texto + imagen => type "mixed" (tu backend ya lo calcula)
 */
export async function sendMessage(chatId: string, params: { text?: string; image?: { uri: string; name: string; type: string } }) {
  const form = new FormData();

  if (params.text?.trim()) form.append("text", params.text.trim());

  if (params.image) {
    // @ts-ignore (RN FormData file)
    form.append("files", {
      uri: params.image.uri,
      name: params.image.name,
      type: params.image.type,
    });
  }

  return await apiFetch(`/chats/${chatId}/messages`, {
    method: "POST",
    body: form,
  });
}
