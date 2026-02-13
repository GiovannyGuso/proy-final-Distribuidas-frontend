// src/components/ChatRow.tsx
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Avatar, Badge, List, Text } from "react-native-paper";

function formatTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

type Props = {
  chat: any;
  onPress: () => void;
  onLongPress?: () => void;
  delayLongPress?: number;
};

export default function ChatRow({ chat, onPress, onLongPress, delayLongPress = 380 }: Props) {
  const title = chat?.listing?.title ?? `Chat #${chat.id}`;
  const last = chat?.last_message ?? null;

  const subtitle = useMemo(() => {
    if (!last) return "Sin mensajes";
    if (last.type === "image") return "📷 Imagen";
    if (last.type === "mixed") return last.text?.trim() ? `📷 ${last.text}` : "📷 Imagen";
    return last.text?.trim() || "Sin mensajes";
  }, [last]);

  const unread = Number(chat?.unread_count || 0);
  const previewTime = formatTime(last?.created_at || chat?.last_message_at);

  // ✅ aquí asumimos que ya viene RESUELTO (http...)
  const photoUrl = chat?.listing?.images?.[0]?.url || null;

  const right = () => (
    <View style={styles.right}>
      {previewTime ? (
        <Text style={[styles.time, { marginBottom: unread > 0 ? 6 : 0 }]}>
          {previewTime}
        </Text>
      ) : null}

      {unread > 0 ? (
        <Badge style={styles.badge} size={20}>
          {unread}
        </Badge>
      ) : null}
    </View>
  );

  const left = () => {
    if (photoUrl) {
      return <Avatar.Image size={44} source={{ uri: photoUrl }} style={styles.avatarImg} />;
    }

    const initials = String(title)
      .split(" ")
      .slice(0, 2)
      .map((w) => (w[0] ? w[0].toUpperCase() : ""))
      .join("");

    return (
      <Avatar.Text
        size={44}
        label={initials || "C"}
        style={styles.avatarText}
        labelStyle={{ fontWeight: "900", color: "#06101F" }}
      />
    );
  };

  return (
    <View style={styles.wrap}>
      <List.Item
        title={title}
        description={subtitle}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={delayLongPress}
        left={left}
        right={right}
        titleNumberOfLines={1}
        descriptionNumberOfLines={1}
        titleStyle={styles.title}
        descriptionStyle={styles.subtitle}
        style={styles.item}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "rgba(10, 18, 34, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(140,165,210,0.18)",
    borderRadius: 16,
    overflow: "hidden",
  },
  item: { paddingVertical: 8, paddingHorizontal: 6 },
  title: { color: "#EAF2FF", fontWeight: "800" },
  subtitle: { color: "rgba(234,242,255,0.65)", marginTop: 2 },
  right: { alignItems: "flex-end", justifyContent: "center", paddingRight: 8 },
  time: { color: "rgba(234,242,255,0.60)", fontSize: 12, fontWeight: "700" },
  badge: { backgroundColor: "#2FA8FF", color: "#06101F", fontWeight: "900" },
  avatarImg: { backgroundColor: "rgba(140,165,210,0.12)" },
  avatarText: { backgroundColor: "#2FA8FF" },
});
