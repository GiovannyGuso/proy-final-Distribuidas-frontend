// src/context/AuthContext.tsx
import * as SecureStore from "expo-secure-store";
import { jwtDecode } from "jwt-decode";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type JwtPayload = {
  id?: string | number;
  email?: string;
  role?: string;
  exp?: number;
};

type UserLite = {
  id: string;
  email?: string;
  role?: string;
};

type AuthState = {
  token: string | null;
  user: UserLite | null;
  meId: string | null;                // ✅ NUEVO
  setToken: (t: string | null) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
};

const AuthContext = createContext<AuthState | null>(null);

function decodeUser(token: string | null): UserLite | null {
  if (!token) return null;
  try {
    const d = jwtDecode<JwtPayload>(token);
    if (!d?.id) return null;
    return { id: String(d.id), email: d.email, role: d.role };
  } catch {
    return null;
  }
}

function decodeMeId(token: string | null): string | null {
  if (!token) return null;
  try {
    const d = jwtDecode<JwtPayload>(token);
    return d?.id ? String(d.id) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, _setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ NUEVO: estado dedicado para myId
  const [meId, setMeId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const t = await SecureStore.getItemAsync("token");
      _setToken(t);
      setMeId(decodeMeId(t)); // ✅ setea myId al cargar token
      setLoading(false);
    })();
  }, []);

  const setToken = async (t: string | null) => {
    if (t) await SecureStore.setItemAsync("token", t);
    else await SecureStore.deleteItemAsync("token");

    _setToken(t);
    setMeId(decodeMeId(t)); // ✅ setea myId cuando cambia token (login/logout)
  };

  const signOut = async () => setToken(null);

  const user = useMemo(() => decodeUser(token), [token]);

  const value = useMemo(
    () => ({ token, user, meId, setToken, signOut, loading }),
    [token, user, meId, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
