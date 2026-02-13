// src/screens/ChatsScreen.tsx
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { Appbar, Button, Dialog, Portal, Text } from "react-native-paper";
import { connectSocket } from "../socket/socket";
import type { Socket } from "socket.io-client";

import { deleteChat, getChats } from "../api/chats";
import { API_BASE } from "../api/client";
import ChatRow from "../components/ChatRow";
import { useAuth } from "../context/AuthContext";
import { useChatPresence } from "../context/ChatPresenceContext";

export default function ChatsScreen() {
  //const { token } = useAuth();
  const nav = useNavigation<any>();

  const [chats, setChats] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const socketRef = useRef<any>(null);

  const { activeChatId } = useChatPresence();
  const activeChatIdRef = useRef<string | null>(null);

  const { user, token } = useAuth();
  const myId = user?.id ? String(user.id) : null;

  // Dialog eliminar
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [selectedChat, setSelectedChat] = useState<any>(null);

  useEffect(() => {
    activeChatIdRef.current = activeChatId ? String(activeChatId) : null;
  }, [activeChatId]);

  const resolveUrl = (url: string | null | undefined) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${API_BASE}${url}`;
  };

  const normalizeChat = (c: any) => {
    const copy = { ...c };

    const img0 = copy?.listing?.images?.[0]?.url ?? null;
    if (img0 && copy.listing?.images?.[0]) copy.listing.images[0].url = resolveUrl(img0);

    const lmImg = copy?.last_message?.image_url ?? null;
    if (lmImg && copy.last_message) copy.last_message.image_url = resolveUrl(lmImg);

    return copy;
  };

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      const data = await getChats();
      const arr = Array.isArray(data) ? data.map(normalizeChat) : [];
      setChats(arr);
    } catch {
      setChats([]);
    } finally {
      if (!opts?.silent) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load({ silent: true });
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load({ silent: true });
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
  }, [load]);

  // Socket UNA sola vez
useEffect(() => {
  const s: Socket = connectSocket(token);
  socketRef.current = s;

  const onNew = (msg: any) => {
    const cId = String(msg.chat_id);

    setChats((prev) => {
      const idx = prev.findIndex((c) => String(c.id) === cId);
      if (idx === -1) return prev;

      const old = prev[idx];
      const isChatOpenNow = activeChatIdRef.current === cId;

      const updated = normalizeChat({
        ...old,
        last_message: {
          type: msg.type,
          text: msg.text,
          image_url: msg.image_url,
          created_at: msg.created_at,
        },
        last_message_at: msg.created_at,
        unread_count: isChatOpenNow ? 0 : Number(old.unread_count || 0) + 1,
      });

      const copy = [...prev];
      copy[idx] = updated;

      copy.sort((a, b) => {
        const da = new Date(a.last_message_at || 0).getTime();
        const db = new Date(b.last_message_at || 0).getTime();
        return db - da;
      });

      return copy;
    });
  };

  const onRead = ({ chatId }: any) => {
    const cId = String(chatId);
    setChats((prev) =>
      prev.map((c) => (String(c.id) === cId ? { ...c, unread_count: 0 } : c))
    );
  };

  const onChatDeleted = ({ chatId }: any) => {
    const cId = String(chatId);
    setChats((prev) => prev.filter((c) => String(c.id) !== cId));
  };

  s.on("message:new", onNew);
  s.on("messages:read", onRead);
  s.on("chat:deleted", onChatDeleted);

  return () => {
    // ✅ solo quitas listeners, NO desconectas el socket global
    s.off("message:new", onNew);
    s.off("messages:read", onRead);
    s.off("chat:deleted", onChatDeleted);
  };
}, [token]);



  const getOtherName = (chat: any) => {
    if (!myId) return chat?.listing?.title ?? `Chat #${chat.id}`;
    const buyerId = String(chat?.buyer?.id ?? "");
    const sellerId = String(chat?.seller?.id ?? "");
    if (myId === buyerId) return chat?.seller?.full_name ?? "Usuario";
    if (myId === sellerId) return chat?.buyer?.full_name ?? "Usuario";
    return chat?.listing?.title ?? `Chat #${chat.id}`;
  };

  const getOtherUserId = (chat: any) => {
    if (!myId) return null;

    const buyerId = chat?.buyer?.id != null ? String(chat.buyer.id) : null;
    const sellerId = chat?.seller?.id != null ? String(chat.seller.id) : null;

    if (buyerId && myId === buyerId) return sellerId;
    if (sellerId && myId === sellerId) return buyerId;

    return sellerId || buyerId || null;
  };

  const openDelete = (chat: any) => {
    setSelectedChat(chat);
    setDeleteOpen(true);
  };

  const closeDelete = () => {
    if (deleteBusy) return;
    setDeleteOpen(false);
    setSelectedChat(null);
  };

  const confirmDelete = async () => {
    if (!selectedChat) return;
    const chatId = selectedChat.id;

    try {
      setDeleteBusy(true);
      await deleteChat(chatId);

      // quitar local
      setChats((prev) => prev.filter((c) => String(c.id) !== String(chatId)));

      closeDelete();
    } catch {
      closeDelete();
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.bgTopGlow} />
      <View style={styles.bgBottomGlow} />

      <Appbar.Header style={styles.appbar}>
        <Appbar.Content title="Chats" titleStyle={{ color: "#EAF2FF", fontWeight: "800" }} />
        <Appbar.Action icon="refresh" onPress={onRefresh} color="#2FA8FF" accessibilityLabel="Actualizar" />
      </Appbar.Header>

      <FlatList
        data={chats}
        keyExtractor={(it) => String(it.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No tienes chats aún</Text>
            <Text style={styles.emptySub}>
              Cuando alguien te escriba por una publicación, aparecerá aquí.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const otherName = getOtherName(item);
          const otherUserId = getOtherUserId(item);

          const listingTitle = item?.listing?.title ?? "";
          const listingImageUrl = item?.listing?.images?.[0]?.url ?? null; // ✅ ya normalizado

          return (
            <View style={styles.rowWrap}>
              <ChatRow
                chat={item}
                onPress={() =>
                  nav.navigate("ChatRoom", {
                    chatId: String(item.id),
                    otherName,
                    otherUserId,
                    listingTitle,
                    listingImageUrl,
                  })
                }
                onLongPress={() => openDelete(item)}
                delayLongPress={380}
              />
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />

      <Portal>
        <Dialog visible={deleteOpen} onDismiss={closeDelete}>
          <Dialog.Title>Eliminar chat</Dialog.Title>
          <Dialog.Content>
            <Text>¿Seguro que quieres eliminar este chat? Se borrarán también sus mensajes.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeDelete} disabled={deleteBusy}>
              Cancelar
            </Button>
            <Button onPress={confirmDelete} loading={deleteBusy} disabled={deleteBusy}>
              Eliminar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#070C16" },

  bgTopGlow: {
    position: "absolute",
    top: -120,
    left: -120,
    width: 320,
    height: 320,
    borderRadius: 180,
    backgroundColor: "rgba(47,168,255,0.18)",
  },
  bgBottomGlow: {
    position: "absolute",
    bottom: -140,
    right: -140,
    width: 360,
    height: 360,
    borderRadius: 220,
    backgroundColor: "rgba(90, 255, 181, 0.10)",
  },

  appbar: {
    backgroundColor: "rgba(10, 18, 34, 0.98)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(140,165,210,0.18)",
  },

  listContent: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 24 },

  rowWrap: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(10, 18, 34, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(140,165,210,0.18)",
  },

  sep: { height: 10 },

  empty: {
    marginTop: 28,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(10, 18, 34, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(140,165,210,0.18)",
  },
  emptyTitle: { color: "#EAF2FF", fontWeight: "800", fontSize: 16 },
  emptySub: { color: "rgba(234,242,255,0.65)", marginTop: 6, fontSize: 12 },
});
