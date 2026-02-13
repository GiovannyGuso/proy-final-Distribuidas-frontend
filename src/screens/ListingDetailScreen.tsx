import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { ActivityIndicator, Button, Text } from "react-native-paper";
import { API_BASE, apiFetch } from "../api/client";

export default function ListingDetailScreen({ route, navigation }: any) {
  const listingId = useMemo(
    () => String(route?.params?.listingId ?? ""),
    [route?.params?.listingId]
  );

  const { width } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [item, setItem] = useState<any>(null);

  const [activeIndex, setActiveIndex] = useState(0);

  // ✅ Tipado correcto del ref (evita error de overload)
  const carouselRef = useRef<FlatList<string> | null>(null);

  // ✅ Función central de carga
  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = !!opts?.silent;
      if (!listingId) return;

      try {
        if (!silent) setLoading(true);
        setErr(null);

        const data = await apiFetch(`/listings/${listingId}`);
        setItem(data);

        navigation.setOptions({
          title: data?.title ? String(data.title) : "Detalle",
        });

        // reset de índice al cargar
        setActiveIndex(0);
        // volver al inicio del carrusel sin error de TS
        carouselRef.current?.scrollToOffset?.({ offset: 0, animated: false });
      } catch (e: any) {
        setErr(e?.message || "Error cargando detalle");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [listingId, navigation]
  );

  // ✅ Primera carga
  React.useEffect(() => {
    load();
  }, [load]);

  // ✅ Recarga cuando vuelves a esta pantalla (tabs/back)
  useFocusEffect(
    useCallback(() => {
      load({ silent: true });
    }, [load])
  );

  // ✅ Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  // ✅ Construir TODAS las imágenes (no solo images[0])
  const images = useMemo((): string[] => {
    const arr = Array.isArray(item?.images) ? item.images : [];
    return arr
      .map((im: any) => im?.url)
      .filter(Boolean)
      .map((raw: string) => (raw.startsWith("http") ? raw : `${API_BASE}${raw}`));
  }, [item]);

  const onChat = useCallback(async () => {
    try {
      setErr(null);

      const chat = await apiFetch("/chats", {
        method: "POST",
        body: JSON.stringify({ listing_id: Number(listingId) }),
      });

      const chatId = chat?.id ?? chat?.chatId;
      if (!chatId) throw new Error("No se pudo crear el chat (no vino id)");

      navigation.navigate("ChatRoom", {
        chatId: String(chatId),
        otherName: item?.Seller?.full_name || item?.seller?.full_name || "Chat",
      });
    } catch (e: any) {
      setErr(e?.message || "No se pudo abrir el chat");
    }
  }, [listingId, navigation, item]);

  // ✅ listener para saber en qué foto está el carrusel
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index?: number | null }> }) => {
      const idx = viewableItems?.[0]?.index ?? 0;
      setActiveIndex(Number(idx) || 0);
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.bgTopGlow} />
        <View style={styles.bgBottomGlow} />

        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.centerText}>Cargando...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Glows */}
      <View style={styles.bgTopGlow} />
      <View style={styles.bgBottomGlow} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* ✅ Carrusel */}
        {images.length > 0 ? (
          <View style={styles.carouselWrap}>
            <FlatList<string>
              ref={(r) => {
                // ✅ no retorna nada → TS ok
                carouselRef.current = r;
              }}
              data={images}
              keyExtractor={(u, i) => `${u}-${i}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              renderItem={({ item: uri }) => (
                <Image
                  source={{ uri }}
                  style={[styles.image, { width: width - 32 }]} // 16 padding + 16 padding
                  resizeMode="cover"
                />
              )}
              onViewableItemsChanged={onViewableItemsChanged as any}
              viewabilityConfig={viewabilityConfig as any}
            />

            {/* Dots */}
            {images.length > 1 ? (
              <View style={styles.dotsRow}>
                {images.map((_, i: number) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      i === activeIndex ? styles.dotActive : null,
                    ]}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.noImage}>
            <Text style={styles.noImageText}>Sin imagen</Text>
          </View>
        )}

        <Text variant="headlineSmall" style={styles.title}>
          {item?.title ?? "Sin título"}
        </Text>

        <Text style={styles.price}>Precio: ${item?.price ?? "-"}</Text>

        <Text style={styles.meta}>Ciudad: {item?.city ?? "-"}</Text>

        <Text style={styles.meta}>
          Vendedor: {item?.Seller?.full_name ?? item?.seller?.full_name ?? "—"}
        </Text>

        {!!item?.description ? (
          <Text style={styles.desc}>{item.description}</Text>
        ) : (
          <Text style={styles.descMuted}>—</Text>
        )}

        {err ? <Text style={styles.err}>{err}</Text> : null}

        <Button
          mode="contained"
          onPress={onChat}
          style={styles.primaryBtn}
          contentStyle={{ height: 46 }}
          labelStyle={styles.primaryBtnLabel}
        >
          Chatear con el vendedor
        </Button>

        <View style={{ height: 18 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#070C16" },

  // Glows tipo TerrePlus
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

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    padding: 16,
  },
  centerText: { color: "rgba(234,242,255,0.70)" },

  content: { padding: 16, gap: 12 },

  carouselWrap: { width: "100%" },

  image: {
    height: 220,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(234,242,255,0.28)",
  },
  dotActive: {
    backgroundColor: "#2FA8FF",
    width: 18,
  },

  noImage: {
    width: "100%",
    height: 220,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  noImageText: { color: "rgba(234,242,255,0.7)" },

  title: { color: "#11479e", fontWeight: "800" },
  price: { color: "rgba(234,242,255,0.90)", fontSize: 16, fontWeight: "700" },
  meta: { color: "rgba(234,242,255,0.75)" },

  desc: { color: "rgba(234,242,255,0.85)", marginTop: 6, lineHeight: 20 },
  descMuted: { color: "rgba(234,242,255,0.55)", marginTop: 6 },

  err: { color: "tomato", marginTop: 4, fontWeight: "700" },

  primaryBtn: { borderRadius: 14, backgroundColor: "#2FA8FF", marginTop: 6 },
  primaryBtnLabel: { fontWeight: "800", color: "#06101F" },

  outlineBtn: {
    borderRadius: 14,
    borderColor: "rgba(140,165,210,0.35)",
  },
});
