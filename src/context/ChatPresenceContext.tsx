import React, { createContext, useContext, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";

type ChatPresenceState = {
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  myId: string | null;
};

const ChatPresenceContext = createContext<ChatPresenceState | null>(null);

export function ChatPresenceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // ✅ mi id (string) para comparar fácil
  const myId = user?.id != null ? String(user.id) : null;

  // ✅ chat actualmente abierto
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  const value = useMemo(
    () => ({
      activeChatId,
      setActiveChatId,
      myId,
    }),
    [activeChatId, myId]
  );

  return <ChatPresenceContext.Provider value={value}>{children}</ChatPresenceContext.Provider>;
}

export function useChatPresence() {
  const ctx = useContext(ChatPresenceContext);
  if (!ctx) throw new Error("useChatPresence debe usarse dentro de <ChatPresenceProvider>");
  return ctx;
}
