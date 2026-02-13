// frontend/src/screens/ChatRoomScreen.tsx
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Avatar,
  IconButton,
  Modal,
  Button as PaperButton,
  Portal,
  Surface,
  Text,
  TextInput,
} from "react-native-paper";
import { useAuth } from "../context/AuthContext";

import { useHeaderHeight } from "@react-navigation/elements";
import { useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Socket } from "socket.io-client";
import { API_BASE, apiFetch } from "../api/client";
import { getUserPublic } from "../api/users";
import { useChatPresence } from "../context/ChatPresenceContext";
import { connectSocket, joinChat, leaveChat } from "../socket/socket";

type Msg = {
  id: string | number;
  chat_id: string | number;
  sender_user_id: string | number;
  type: "text" | "image" | "mixed";
  text?: string | null;
  image_url?: string | null;
  created_at: string;
  delivered_at?: string | null;
  read_at?: string | null;
};

type PublicUser = {
  id: string | number;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  description?: string | null;
  email?: string | null;
};

const paperDarkInputTheme = {
  colors: {
    primary: "#2FA8FF",
    outline: "rgba(140, 165, 210, 0.35)",
    background: "rgba(10, 20, 40, 0.55)",
  },
};

function resolveUrl(url?: string | null) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API_BASE}${url}`;
}

function normalizeMessage(m: Msg): Msg {
  const fixed = { ...m };
  if (fixed.image_url) fixed.image_url = resolveUrl(fixed.image_url);
  return fixed;
}

export default function ChatRoomScreen({ route, navigation }: any) {
  const { token } = useAuth();

  const {
    chatId,
    otherName: otherNameFromRoute,
    otherUserId,
    listingTitle,
    listingImageUrl,
  } = route.params as {
    chatId: string;
    otherName?: string;
    otherUserId?: string | number;
    listingTitle?: string;
    listingImageUrl?: string | null;
  };

  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const keyboardOffset = Platform.OS === "ios" ? headerHeight : 80;

  const isFocused = useIsFocused();
  const { setActiveChatId, myId } = useChatPresence();

  const listRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [pickedImage, setPickedImage] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [sending, setSending] = useState(false);

  // Perfil modal
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [publicUser, setPublicUser] = useState<PublicUser | null>(null);

  const finalOtherName = otherNameFromRoute ?? "Chat";
  const finalListingTitle = (listingTitle ?? "").trim();
  const listingThumb = useMemo(() => resolveUrl(listingImageUrl || null), [listingImageUrl]);

  const openProfile = async () => {
    if (!otherUserId) {
      setProfileErr("No se encontró el ID del usuario del chat");
      setProfileOpen(true);
      return;
    }

    setProfileOpen(true);

    if (publicUser?.id && String(publicUser.id) === String(otherUserId)) return;

    try {
      setProfileErr(null);
      setProfileLoading(true);
      const u: any = await getUserPublic(otherUserId);
      setPublicUser(u as PublicUser);
    } catch (e: any) {
      setProfileErr(e?.message || "No se pudo cargar el perfil");
    } finally {
      setProfileLoading(false);
    }
  };

  const closeProfile = () => setProfileOpen(false);

  const markDelivered = async (messageId: string | number) => {
    try {
      await apiFetch(`/chats/${chatId}/messages/${messageId}/delivered`, { method: "PUT" });
    } catch {}
  };

  const markRead = async () => {
    try {
      await apiFetch(`/chats/${chatId}/read`, { method: "PUT" });
    } catch {}
  };

  const loadMessages = async () => {
    const data: Msg[] = await apiFetch(`/chats/${chatId}/messages`);

    const normalized = data.map(normalizeMessage);
    setMessages([...normalized].reverse()); // inverted => nuevo al inicio

    // ✅ al abrir chat: marco delivered para mensajes del otro SIN delivered
    if (myId) {
      const toDeliver = data.filter(
        (m) => String(m.sender_user_id) !== String(myId) && !m.delivered_at
      );
      await Promise.all(toDeliver.map((m) => markDelivered(m.id)));
    }

    // ✅ SOLO marco read si el chat está en pantalla (focused)
    if (isFocused) {
      await markRead();
    }

    setTimeout(() => listRef.current?.scrollToOffset({ offset: 0, animated: false }), 0);
  };

  // ✅ A) Función para borrar en API + actualizar UI (optimista)
  const deleteMessage = async (messageId: string | number) => {
    // optimista: lo quitas de una vez
    setMessages((prev) => prev.filter((m) => String(m.id) !== String(messageId)));

    try {
      await apiFetch(`/chats/${chatId}/messages/${messageId}`, { method: "DELETE" });
    } catch (e) {
      // si falla, recargas para no quedar desincronizado
      await loadMessages();
    }
  };

  // Presencia
  useEffect(() => {
    setActiveChatId(String(chatId));
    return () => setActiveChatId(null);
  }, [chatId, setActiveChatId]);

  // Load inicial + cuando el chat vuelve a estar enfocado
  useEffect(() => {
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, isFocused]);

  // Socket realtime
  useEffect(() => {
    const s: Socket = connectSocket(token);
    const doJoin = () => joinChat(chatId, token);

    doJoin();
    s.on("connect", doJoin);

    const onNew = async (msg: Msg) => {
      if (String(msg.chat_id) !== String(chatId)) return;

      const fixed = normalizeMessage(msg);

      setMessages((prev) => {
        const exists = prev.some((m) => String(m.id) === String(fixed.id));
        return exists ? prev : [fixed, ...prev];
      });

      const fromMe = myId ? String(fixed.sender_user_id) === String(myId) : false;

      if (!fromMe) {
        // ✅ al recibir, primero delivered
        await markDelivered(fixed.id);

        // ✅ SOLO blue/read si el chat está abierto y enfocado
        if (isFocused) {
          await markRead();
        }
      }

      setTimeout(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }), 80);
    };

    const onDelivered = ({ chatId: cId, messageId, delivered_at, bulk }: any) => {
      if (String(cId) !== String(chatId)) return;

      setMessages((prev) =>
        prev.map((m) => {
          if (bulk) {
            const mine = myId ? String(m.sender_user_id) === String(myId) : false;
            if (!mine) return m;
            return m.delivered_at ? m : { ...m, delivered_at };
          }
          if (messageId == null) return m;
          return String(m.id) === String(messageId) ? { ...m, delivered_at } : m;
        })
      );
    };

    const onRead = ({ chatId: cId, readerId }: any) => {
      if (String(cId) !== String(chatId)) return;
      if (!myId) return;
      if (String(readerId) === String(myId)) return;

      setMessages((prev) =>
        prev.map((m) => {
          const mine = String(m.sender_user_id) === String(myId);
          if (!mine) return m;
          return m.read_at ? m : { ...m, read_at: new Date().toISOString() };
        })
      );
    };

    // ✅ B) Escucha el evento socket para borrar en el otro teléfono también
    const onDeleted = ({ chatId: cId, messageId }: any) => {
      if (String(cId) !== String(chatId)) return;
      setMessages((prev) => prev.filter((m) => String(m.id) !== String(messageId)));
    };

    s.on("message:new", onNew);
    s.on("message:delivered", onDelivered);
    s.on("messages:read", onRead);
    s.on("message:deleted", onDeleted);

    return () => {
      s.off("connect", doJoin);
      s.off("message:new", onNew);
      s.off("message:delivered", onDelivered);
      s.off("messages:read", onRead);
      s.off("message:deleted", onDeleted);
      leaveChat(chatId, token);
    };
  }, [chatId, myId, token, isFocused]);

  // Header custom
  useEffect(() => {
    const avatarLabel = (finalOtherName?.[0] || "U").toUpperCase();

    navigation.setOptions({
      header: () => (
        <Appbar.Header style={styles.appbar}>
          <Appbar.BackAction onPress={() => navigation.goBack()} color="#EAF2FF" />

          {listingThumb ? (
            <Image source={{ uri: listingThumb }} style={styles.listingThumb} />
          ) : (
            <Avatar.Text
              size={36}
              label={avatarLabel}
              style={styles.avatar}
              color="#06101F"
            />
          )}

          <TouchableOpacity onPress={openProfile} activeOpacity={0.75} style={{ flex: 1 }}>
            <Text numberOfLines={1} style={styles.headerTitle}>
              {finalOtherName}
            </Text>
            <Text numberOfLines={1} style={styles.headerSub}>
              {finalListingTitle ? finalListingTitle : "Ver perfil"}
            </Text>
          </TouchableOpacity>

          <Appbar.Action icon="information" color="#2FA8FF" onPress={openProfile} />
        </Appbar.Header>
      ),
    });
  }, [navigation, finalOtherName, finalListingTitle, listingThumb, otherUserId]);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const uri = asset.uri;

    const filename = uri.split("/").pop() || `chat_${Date.now()}.jpg`;
    const ext = filename.split(".").pop()?.toLowerCase();
    const mime = ext === "png" ? "image/png" : "image/jpeg";

    setPickedImage({ uri, name: filename, type: mime });
  };

const send = async () => {
  if (sending) return;

  const cleanText = text.trim();
  const img = pickedImage;

  if (!cleanText && !img) return;

  // ✅ Limpia el input INMEDIATO (WhatsApp-like)
  setText("");
  setPickedImage(null);

  setSending(true);
  try {
    const fd = new FormData();
    if (cleanText) fd.append("text", cleanText);

    if (img) {
      fd.append("files", {
        uri: img.uri,
        name: img.name,
        type: img.type,
      } as any);
    }

    const created: Msg = await apiFetch(`/chats/${chatId}/messages`, {
      method: "POST",
      body: fd,
    });

    const fixed = normalizeMessage(created);

    setMessages((prev) => {
      const exists = prev.some((m) => String(m.id) === String(fixed.id));
      return exists ? prev : [fixed, ...prev];
    });

    setTimeout(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }), 80);
  } catch (e) {
    // opcional: si quieres, puedes volver a poner el texto si falló
    // setText(cleanText);
    // setPickedImage(img);
  } finally {
    setSending(false);
  }
};



  const renderChecks = (m: Msg, mine: boolean) => {
    if (!mine) return null;

    const delivered = !!m.delivered_at;
    const read = !!m.read_at;

    const icon = read ? "check-all" : delivered ? "check-all" : "check";
    const color = read ? "#2FA8FF" : "rgba(234,242,255,0.55)";

    return <IconButton icon={icon} size={16} iconColor={color} style={{ margin: 0, padding: 0 }} />;
  };

  // ✅ 3) Conectar “mantener presionado → Eliminar”
  const renderItem = ({ item }: { item: Msg }) => {
    const mine = myId ? String(item.sender_user_id) === String(myId) : false;

    return (
      <View style={[styles.msgRow, { alignItems: mine ? "flex-end" : "flex-start" }]}>
        <TouchableOpacity
          activeOpacity={0.9}
          onLongPress={() => {
            if (!mine) return; // WhatsApp simple: solo borras tus mensajes
            deleteMessage(item.id);
          }}
        >
          <Surface style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]} elevation={0}>
            {!!item.text && <Text style={[styles.msgText, mine && styles.msgTextMine]}>{item.text}</Text>}

            {!!item.image_url && (
              <Image source={{ uri: item.image_url }} style={[styles.msgImage, { marginTop: item.text ? 8 : 0 }]} />
            )}

            <View style={styles.metaRow}>
              <Text style={styles.time}>
                {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
              {renderChecks(item, mine)}
            </View>
          </Surface>
        </TouchableOpacity>
      </View>
    );
  };

  const inputBar = useMemo(() => {
    return (
      <Surface style={styles.inputWrap} elevation={0}>
        {pickedImage ? (
          <View style={styles.previewRow}>
            <Image source={{ uri: pickedImage.uri }} style={styles.previewImg} />
            <Text style={styles.previewName} numberOfLines={1}>
              {pickedImage.name}
            </Text>
            <IconButton icon="close" onPress={() => setPickedImage(null)} iconColor="#EAF2FF" />
          </View>
        ) : null}

        <View style={styles.composerRow}>
          <IconButton icon="image" onPress={pickImage} disabled={sending} iconColor="#2FA8FF" />
          <TextInput
            mode="outlined"
            placeholder="Mensaje.."
            value={text}
            onChangeText={setText}
            style={styles.textInput}
            outlineStyle={styles.textInputOutline}
            textColor="#EAF2FF"
            placeholderTextColor="#93A4C7"
            theme={paperDarkInputTheme}
          />
          <IconButton
            icon="send"
            onPress={send}
            disabled={sending || (!text.trim() && !pickedImage)}
            iconColor="#2FA8FF"
          />
        </View>
      </Surface>
    );
  }, [pickedImage, sending, text]);

  const modalAvatar = useMemo(() => resolveUrl(publicUser?.avatar_url || null), [publicUser?.avatar_url]);

  const modalName = useMemo(() => {
    const n = publicUser?.full_name?.trim();
    if (n) return n;
    const fn = publicUser?.first_name?.trim() || "";
    const ln = publicUser?.last_name?.trim() || "";
    const joined = `${fn} ${ln}`.trim();
    return joined || finalOtherName || "Usuario";
  }, [publicUser, finalOtherName]);

  const modalDesc = useMemo(() => publicUser?.description?.trim() || "Sin descripción", [publicUser]);

  return (
    <>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.container}>
          <View style={styles.bgTopGlow} />
          <View style={styles.bgBottomGlow} />

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "padding"}
            keyboardVerticalOffset={keyboardOffset}
          >
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(m) => String(m.id)}
              renderItem={renderItem}
              inverted
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[styles.listContent, { paddingTop: 12, paddingBottom: 80 }]}
            />

            <View style={{ backgroundColor: "transparent", paddingBottom: insets.bottom }}>
              {inputBar}
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>

      <Portal>
        <Modal visible={profileOpen} onDismiss={closeProfile} contentContainerStyle={styles.modalCard}>
          <View style={styles.modalHeader}>
            {modalAvatar ? (
              <Avatar.Image size={64} source={{ uri: modalAvatar }} />
            ) : (
              <Avatar.Text
                size={64}
                label={(modalName?.[0] || "U").toUpperCase()}
                style={{ backgroundColor: "#2FA8FF" }}
                color="#06101F"
              />
            )}

            <View style={{ flex: 1 }}>
              <Text style={styles.modalName}>{modalName}</Text>
              {finalListingTitle ? (
                <Text style={styles.modalSub} numberOfLines={1}>
                  Producto: {finalListingTitle}
                </Text>
              ) : null}
            </View>
          </View>

          {listingThumb ? <Image source={{ uri: listingThumb }} style={styles.modalListingImg} /> : null}

          {profileLoading ? (
            <View style={{ paddingVertical: 10 }}>
              <ActivityIndicator />
              <Text style={styles.modalHint}>Cargando perfil...</Text>
            </View>
          ) : null}

          {profileErr ? <Text style={styles.modalError}>{profileErr}</Text> : null}

          {!profileLoading ? (
            <>
              <Text style={styles.modalSection}>Descripción</Text>
              <Text style={styles.modalBody}>{modalDesc}</Text>

              {!!publicUser?.email ? (
                <>
                  <Text style={styles.modalSection}>Email</Text>
                  <Text style={styles.modalBody}>{publicUser.email}</Text>
                </>
              ) : null}
            </>
          ) : null}

          <View style={{ height: 12 }} />

          <PaperButton mode="contained" onPress={closeProfile} buttonColor="#2FA8FF" textColor="#06101F">
            Cerrar
          </PaperButton>
        </Modal>
      </Portal>
    </>
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
    backgroundColor: "rgba(90,255,180,0.10)",
  },

  appbar: {
    backgroundColor: "rgba(10, 18, 34, 0.98)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(140,165,210,0.18)",
  },
  avatar: { marginRight: 10, backgroundColor: "#2FA8FF" },

  listingThumb: {
    width: 36,
    height: 36,
    borderRadius: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "rgba(140,165,210,0.18)",
  },

  headerTitle: { color: "#EAF2FF", fontWeight: "900", fontSize: 15, lineHeight: 18 },
  headerSub: { color: "rgba(234,242,255,0.55)", fontSize: 11, marginTop: 2 },

  listContent: { paddingVertical: 10, paddingHorizontal: 12, paddingBottom: 12 },
  msgRow: { paddingVertical: 6 },

  bubble: { maxWidth: "82%", borderRadius: 16, padding: 10, borderWidth: 1 },
  bubbleMine: { backgroundColor: "rgba(47,168,255,0.18)", borderColor: "rgba(47,168,255,0.28)" },
  bubbleOther: { backgroundColor: "rgba(10, 18, 34, 0.92)", borderColor: "rgba(140,165,210,0.18)" },

  msgText: { color: "#EAF2FF", fontSize: 14, lineHeight: 19 },
  msgTextMine: { color: "#EAF2FF" },
  msgImage: { width: 230, height: 230, borderRadius: 14 },

  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 2, marginTop: 6 },
  time: { fontSize: 11, color: "rgba(234,242,255,0.60)" },

  inputWrap: {
    padding: 10,
    gap: 8,
    backgroundColor: "rgba(10, 18, 34, 0.98)",
    borderTopWidth: 1,
    borderTopColor: "rgba(140,165,210,0.18)",
  },
  previewRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 2 },
  previewImg: { width: 52, height: 52, borderRadius: 12 },
  previewName: { flex: 1, color: "#EAF2FF" },
  composerRow: { flexDirection: "row", alignItems: "center" },
  textInput: { flex: 1, marginRight: 6, backgroundColor: "transparent" },
  textInputOutline: { borderRadius: 14 },

  modalCard: {
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 16,
    backgroundColor: "rgba(10, 18, 34, 0.98)",
    borderWidth: 1,
    borderColor: "rgba(140,165,210,0.18)",
  },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  modalName: { color: "#EAF2FF", fontWeight: "900", fontSize: 16 },
  modalSub: { color: "rgba(234,242,255,0.65)", marginTop: 4, fontSize: 12 },
  modalListingImg: {
    width: "100%",
    height: 170,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(140,165,210,0.18)",
  },
  modalSection: { color: "rgba(234,242,255,0.65)", fontWeight: "800", marginTop: 6, marginBottom: 4 },
  modalBody: { color: "#EAF2FF", lineHeight: 18 },
  modalHint: { color: "rgba(234,242,255,0.65)", textAlign: "center", marginTop: 8 },
  modalError: { color: "rgba(255,120,120,0.95)", marginTop: 6, marginBottom: 6, fontWeight: "800" },
});
