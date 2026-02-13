// src/screens/MyListingsScreen.tsx
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useRef, useState } from "react";
import { Alert } from "react-native";

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
  Button,
  Surface,
  Text,
} from "react-native-paper";
import { apiFetch } from "../api/client";

export default function MyListingsScreen({ navigation }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const didInitRef = useRef(false);


  // evita doble load simultáneo
  const loadingRef = useRef(false);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = !!opts?.silent;

    if (loadingRef.current) return;
    loadingRef.current = true;

    if (!silent) setLoading(true);
    setErr(null);

    try {
      const data = await apiFetch("/listings/mine?status=active");
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErr(e?.message || "No se pudieron cargar tus publicaciones");
      setItems([]);
    } finally {
      if (!silent) setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  // ✅ Se ejecuta SIEMPRE que vuelves a esta pantalla (tabs/back)
  useFocusEffect(
  useCallback(() => {
    // ✅ Primera vez: loader grande (para quitar loading=true)
    if (!didInitRef.current) {
      didInitRef.current = true;
      load({ silent: false });
      return;
    }

    // ✅ Siguientes veces: silent (no parpadea)
    load({ silent: true });
  }, [load])
);
(
    useCallback(() => {
      // silent para que no parpadee el loader grande cada vez
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
  
  const onDelete = useCallback(
    async (id: number | string) => {
      setErr(null);

      // ✅ Optimistic UI
      const prev = items;
      setItems((p) => p.filter((x) => String(x.id) !== String(id)));

      try {
        await apiFetch(`/listings/${id}`, { method: "DELETE" });
        await load({ silent: true }); // consistencia
      } catch (e: any) {
        setErr(e?.message || "No se pudo eliminar");
        setItems(prev); // rollback rápido
        await load({ silent: true });
      }
    },
    [items, load]
  );
  const confirmDelete = useCallback(
  (id: number | string) => {
    Alert.alert(
      "Eliminar publicación",
      "Esta acción no se puede deshacer. ¿Deseas eliminar la publicación?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: () => onDelete(id) },
      ]
    );
  },
  [onDelete]
);


  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.bgTopGlow} />
        <View style={styles.bgBottomGlow} />

        <Appbar.Header style={styles.appbar}>
          <Appbar.Content
            title="Mis publicaciones"
            titleStyle={{ color: "#EAF2FF", fontWeight: "800" }}
          />
        </Appbar.Header>

        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.centerText}>Cargando...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.bgTopGlow} />
      <View style={styles.bgBottomGlow} />

      <Appbar.Header style={styles.appbar}>
        <Appbar.Content
          title="Mis publicaciones"
          titleStyle={{ color: "#EAF2FF", fontWeight: "800" }}
        />
        <Appbar.Action icon="refresh" onPress={onRefresh} color="#2FA8FF" />
      </Appbar.Header>

      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Surface style={styles.empty} elevation={0}>
            <Text style={styles.emptyTitle}>Aún no tienes publicaciones</Text>
            <Text style={styles.emptySub}>
              Crea una publicación y aparecerá aquí.
            </Text>
            <Button
              mode="contained"
              style={styles.primaryBtn}
              contentStyle={{ height: 46 }}
              labelStyle={styles.primaryBtnLabel}
              icon="plus"
              onPress={() =>
                navigation.navigate("CreateListing")
              }
            >
              Crear publicación
            </Button>
          </Surface>
        }
        renderItem={({ item }) => {
          const img = item?.images?.[0]?.url;

          return (
            <Surface style={styles.card} elevation={0}>
              <Pressable
                onPress={() =>
                  navigation.navigate("ListingDetail", {
                    listingId: String(item.id),
                  })
                }
              >
                <View style={styles.imageWrap}>
                  {img ? (
                    <Image source={{ uri: img }} style={styles.image} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Text style={{ color: "rgba(234,242,255,0.65)" }}>
                        Sin imagen
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.cardBody}>
                  <Text
                    variant="titleMedium"
                    style={styles.title}
                    numberOfLines={1}
                  >
                    {item?.title ?? "Sin título"}
                  </Text>
                  <Text style={styles.price}>${item?.price ?? 0}</Text>
                </View>
              </Pressable>

              <View style={styles.actionsRow}>
                <Button
                  mode="outlined"
                  style={styles.btnOutline}
                  textColor="#EAF2FF"
                  icon="pencil"
                  onPress={() =>
                    navigation.navigate("EditListing", { listingId: String(item.id) })

                  }
                >
                  Editar
                </Button>

                <Button
                  mode="contained"
                  style={styles.btnDanger}
                  contentStyle={{ height: 44 }}
                  icon="trash-can"
                  onPress={() => confirmDelete(item.id)}
                >
                  Eliminar
                </Button>
              </View>
            </Surface>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />

      {err ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{err}</Text>
        </View>
      ) : null}
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

  listContent: { padding: 14, paddingBottom: 28 },

  card: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "rgba(10, 18, 34, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(140,165,210,0.18)",
  },

  imageWrap: { height: 200, backgroundColor: "rgba(140,165,210,0.08)" },
  image: { height: "100%", width: "100%" },
  imagePlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },

  cardBody: { padding: 12, gap: 6 },
  title: { color: "#EAF2FF", fontWeight: "800" },
  price: { color: "#2FA8FF", fontWeight: "900", fontSize: 16 },

  actionsRow: { flexDirection: "row", gap: 12, padding: 12 },

  btnOutline: {
    flex: 1,
    borderRadius: 14,
    borderColor: "rgba(140,165,210,0.35)",
  },
  btnDanger: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: "rgba(255, 90, 90, 0.90)",
  },

  primaryBtn: { borderRadius: 14, backgroundColor: "#2FA8FF", marginTop: 12 },
  primaryBtnLabel: { fontWeight: "800", color: "#06101F" },

  empty: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(10, 18, 34, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(140,165,210,0.18)",
  },
  emptyTitle: { color: "#EAF2FF", fontWeight: "800", fontSize: 16 },
  emptySub: { color: "rgba(234,242,255,0.65)", marginTop: 6, fontSize: 12 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  centerText: { color: "rgba(234,242,255,0.70)" },

  toast: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255, 90, 90, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(255, 90, 90, 0.35)",
  },
  toastText: { color: "#FFB4B4", fontWeight: "700" },
});