// frontend/src/config.ts
import Constants from "expo-constants";

type Extra = {
  API_URL?: string;
  SOCKET_URL?: string;
  AUTH0_DOMAIN?: string;
  AUTH0_CLIENT_ID?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

// frontend/src/config.ts
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://p01--proy-final-distribuidas-backend--b8kcvpxxrg99.code.run";
export const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL ?? "https://p01--proy-final-distribuidas-backend--b8kcvpxxrg99.code.run";
export const AUTH0_DOMAIN = process.env.EXPO_PUBLIC_AUTH0_DOMAIN ?? "dev-fecjfv7r5xelrk55.us.auth0.com";
export const AUTH0_CLIENT_ID = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID ?? "YMQBTzzaxfUCerFOtl9VrKPy7vHcctHL";

console.log("API_URL =>", API_URL);
console.log("SOCKET_URL =>", SOCKET_URL);
