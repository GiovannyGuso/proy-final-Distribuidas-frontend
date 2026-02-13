// frontend/src/api/client.ts
import * as SecureStore from "expo-secure-store";
import { API_URL } from "../config";

export const API_BASE = API_URL;

async function getToken() {
  return await SecureStore.getItemAsync("token");
}

function buildUrl(path: string) {
  const base = (API_BASE || "").replace(/\/+$/, ""); // quita / al final
  const p = path.startsWith("/") ? path : `/${path}`; // asegura /
  return `${base}${p}`;
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await getToken();
  console.log(
    "TOKEN_PREVIEW apiFetch:",
    token ? token.slice(0, 12) + "…" : "NO_TOKEN"
  );

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers as any),
  };

  const isForm = options.body instanceof FormData;

  // Si NO es FormData y aún no hay Content-Type, asumimos JSON
  if (!isForm && !headers["Content-Type"]) headers["Content-Type"] = "application/json";

  // Si el body es un objeto (y no FormData), conviértelo a JSON automáticamente
  let body = options.body as any;
  if (!isForm && body && typeof body === "object" && !(body instanceof String)) {
    body = JSON.stringify(body);
  }

  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    const url = buildUrl(path);
    console.log("FETCH =>", options.method ?? "GET", url);

    res = await fetch(url, {
      ...options,
      body,
      headers,
    });
  } catch (e: any) {
    console.log("FETCH ERROR =>", String(e));
    throw new Error(
      "No se pudo conectar al servidor (Network request failed). " +
        "Revisa API_URL y que el backend sea accesible desde tu celular/emulador."
    );
  }

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg = data?.message || `Error HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}
