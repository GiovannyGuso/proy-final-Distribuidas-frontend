// src/api/auth.ts
import { apiFetch } from "./client";

export async function login(email: string, password: string) {
  return await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export type RegisterPayload = {
  first_name: string;
  last_name: string;
  birth_day: number;   // 1-31
  birth_month: number; // 1-12
  birth_year: number;  // 1900..actual
  sex: "female" | "male" | "na";
  email: string;
  password: string;
};

export async function register(payload: RegisterPayload) {
  return await apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function loginWithAuth0(id_token: string) {
  return await apiFetch("/auth/auth0", {
    method: "POST",
    body: JSON.stringify({ id_token }),
  });
}
