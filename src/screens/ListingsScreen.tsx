// src/screens/ListingsScreen.tsx
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Chip,
  Searchbar,
  Surface,
  Text,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiFetch } from "../api/client";

type Listing = {
  id: string | number;
  title?: string;
  price?: number;
  city?: string;
  images?: Array<{ url?: string }>;
  category?: { id?: number; name?: string } | null;
  Seller?: { full_name?: string } | null;
};

export default function ListingsScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();

  const initialCategory = route?.params?.categoryName ?? null;

  const [all, setAll] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [q, setQ] = useState("");
  const [categoryName, setCategoryName] = useState<string | null>(initialCategory);

  const lastEndReachedAtRef = useRef<number>(0);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = !!opts?.silent;
    if (!silent) setLoading(true);

    try {
      const data = await apiFetch("/listings");
      setAll(Array.isArray(data) ? data : []);
    } catch {
      setAll([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load({ silent: true });
    }, [load])
  );

  useEffect(() => {
    const tick = route?.params?.refresh;
    if (!tick) return;

    load({ silent: true });
    navigation.setParams({ refresh: undefined });
  }, [route?.params?.refresh, load, navigation]);

  useEffect(() => {
    setCategoryName(initialCategory);
  }, [initialCategory]);

  const onRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await load({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, load]);

  const onLoadMore = useCallback(
    async (distanceFromEnd?: number) => {
      if (loadingMore || loading || refreshing) return;
      if (typeof distanceFromEnd === "number" && distanceFromEnd > 120) return;

      const now = Date.now();
      if (now - lastEndReachedAtRef.current < 1200) return;
      lastEndReachedAtRef.current = now;

      setLoadingMore(true);
      try {
        await load({ silent: true });
      } finally {
        setLoadingMore(false);
      }
    },
    [loadingMore, loading, refreshing, load]
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const l of all) {
      const name = l?.category?.name;
      if (name) set.add(name);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [all]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return all.filter((l) => {
      const okCat =
        !categoryName ||
        (l?.category?.name ?? "").toLowerCase() === categoryName.toLowerCase();
      if (!okCat) return false;

      if (!qq) return true;
      const text = `${l.title ?? ""} ${l.city ?? ""} ${l.category?.name ?? ""}`.toLowerCase();
      return text.includes(qq);
    });
  }, [all, q, categoryName]);

  const renderItem = ({ item }: { item: Listing }) => {
    const img = item?.images?.[0]?.url;

    return (
      <View style={styles.gridItem}>
        <Pressable
          onPress={() => navigation.navigate("ListingDetail", { listingId: String(item.id) })}
          style={styles.cardPressable}
        >
          <Surface style={styles.card} elevation={0}>
            <View style={styles.imageWrap}>
              {img ? (
                <Image source={{ uri: img }} style={styles.image} resizeMode="cover" />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={{ color: "rgba(234,242,255,0.65)" }}>Sin imagen</Text>
                </View>
              )}
            </View>

            <View style={styles.cardBody}>
              <Text style={styles.price}>${item.price ?? "-"}</Text>
              <Text numberOfLines={1} style={styles.title}>
                {item.title ?? "Sin título"}
              </Text>
              <Text numberOfLines={1} style={styles.city}>
                {item.city ?? ""}
              </Text>
            </View>
          </Surface>
        </Pressable>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.centerText}>Cargando publicaciones...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.bgTopGlow} />
      <View style={styles.bgBottomGlow} />

      <Appbar.Header style={styles.appbar}>
        <Appbar.Content
          title="Marketplace"
          titleStyle={{ color: "#EAF2FF", fontWeight: "800" }}
        />
        <Appbar.Action icon="refresh" onPress={onRefresh} color="#2FA8FF" />
      </Appbar.Header>

      {/* ✅ UN SOLO FlatList vertical (grid). Todo lo demás va en header */}
      <FlatList
        data={filtered}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReachedThreshold={0.35}
        onEndReached={({ distanceFromEnd }) => onLoadMore(distanceFromEnd)}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 14, alignItems: "center" }}>
              <ActivityIndicator />
            </View>
          ) : (
            // ✅ espacio real para que se vea la última fila siempre
            <View style={{ height: 18 }} />
          )
        }
        contentContainerStyle={[
          styles.gridContent,
          {
            // ✅ espacio inferior real (safe area + un extra)
            paddingBottom: insets.bottom + 24,
          },
        ]}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <Searchbar
              placeholder="Buscar en Marketplace"
              value={q}
              onChangeText={setQ}
              style={styles.search}
              inputStyle={{ color: "#EAF2FF" }}
              iconColor="#2FA8FF"
              placeholderTextColor="#93A4C7"
            />

            {/* ✅ Chips con padding para que no se “hundan” */}
            <FlatList
              data={[{ name: "Todas" }, ...categories.map((name) => ({ name }))]}
              keyExtractor={(it) => it.name}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
              renderItem={({ item }) => {
                const active =
                  (item.name === "Todas" && !categoryName) || item.name === categoryName;
                return (
                  <Chip
                    selected={active}
                    onPress={() => setCategoryName(item.name === "Todas" ? null : item.name)}
                    style={[styles.chip, active && styles.chipActive]}
                    textStyle={{
                      color: active ? "#06101F" : "#EAF2FF",
                      fontWeight: "700",
                    }}
                  >
                    {item.name}
                  </Chip>
                );
              }}
            />

            <Text style={styles.sectionTitle}>Sugerencias de hoy</Text>
          </View>
        }
      />
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
    backgroundColor: "rgba(90,255,180,0.10)",
  },

  appbar: {
    backgroundColor: "rgba(10, 18, 34, 0.98)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(140,165,210,0.18)",
  },

  headerWrap: { paddingHorizontal: 14, paddingTop: 12, gap: 12 },

  search: {
    backgroundColor: "rgba(10, 18, 34, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(140,165,210,0.18)",
  },

  // ✅ más padding vertical para que no se corten los chips
  chipsRow: { gap: 8, paddingVertical: 8, paddingHorizontal: 2 },

  chip: {
    backgroundColor: "rgba(10, 18, 34, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(140,165,210,0.18)",
  },
  chipActive: { backgroundColor: "#2FA8FF", borderColor: "#2FA8FF" },

  sectionTitle: {
    color: "#EAF2FF",
    fontWeight: "800",
    fontSize: 16,
    marginTop: 4,
  },

  // ✅ GRID
  gridContent: { paddingTop: 8, paddingHorizontal: 8 },
  gridRow: { justifyContent: "space-between" },
  gridItem: { flex: 1, maxWidth: "50%" },
  cardPressable: { padding: 6 },

  card: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "rgba(10, 18, 34, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(140,165,210,0.18)",
  },

  imageWrap: { height: 140, backgroundColor: "rgba(140,165,210,0.08)" },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },

  cardBody: { padding: 10, gap: 4 },
  price: { color: "#2FA8FF", fontWeight: "900" },
  title: { color: "#EAF2FF", fontWeight: "700" },
  city: { color: "rgba(234,242,255,0.65)", fontSize: 12 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  centerText: { color: "rgba(234,242,255,0.70)" },
});
