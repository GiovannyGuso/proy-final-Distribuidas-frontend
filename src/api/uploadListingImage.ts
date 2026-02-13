import * as SecureStore from "expo-secure-store";
import { API_URL } from "../config";

export async function uploadListingImage(listingId: string, uri: string) {
  const token = await SecureStore.getItemAsync("token"); // ajusta si tu key es otra

  const filename = uri.split("/").pop() || `image_${Date.now()}.jpg`;
  const match = /\.(\w+)$/.exec(filename);
  const ext = match?.[1]?.toLowerCase();
  const type =
    ext === "png" ? "image/png" :
    ext === "webp" ? "image/webp" :
    "image/jpeg";

  const form = new FormData();
  form.append("file", {
    uri,
    name: filename,
    type,
  } as any);

  const res = await fetch(`${API_URL}/listings/${listingId}/images`, {
    method: "POST",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      // ⚠️ NO pongas Content-Type manual con FormData en RN/Expo
    },
    body: form,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Error subiendo imagen");
  return data; // {id,url,sort_order,...}
}