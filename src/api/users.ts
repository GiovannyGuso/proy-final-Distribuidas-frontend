// src/api/users.ts
import { apiFetch } from "./client";

export type Sex = "female" | "male" | "na";

export type MeProfile = {
  id: string | number;
  email: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  birth_day: number | null;
  birth_month: number | null;
  birth_year: number | null;
  sex: Sex | null;
  avatar_url: string | null;
  description: string | null; // ✅ nuevo
};

export type PublicUser = {
  id: string | number;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  description: string | null;
};

export async function getMe(): Promise<MeProfile> {
  return await apiFetch("/users/me");
}

export async function updateMe(payload: {
  first_name: string;
  last_name: string;
  birth_day: number;
  birth_month: number;
  birth_year: number;
  sex: Sex;
  description: string; // ✅ nuevo
}): Promise<MeProfile> {
  return await apiFetch("/users/me", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function uploadMyAvatar(uri: string): Promise<{ avatar_url: string }> {
  const form = new FormData();
  const filename = uri.split("/").pop() || "avatar.jpg";
  const ext = filename.split(".").pop()?.toLowerCase();
  const mime =
    ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

  form.append("file", { uri, name: filename, type: mime } as any);

  return await apiFetch("/users/me/avatar", {
    method: "POST",
    body: form as any,
  });
}

export async function getUserPublic(userId: string | number): Promise<PublicUser> {
  return await apiFetch(`/users/${userId}/public`);
}