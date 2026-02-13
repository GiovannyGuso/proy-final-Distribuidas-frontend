import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Appbar, Button, Surface, Text } from "react-native-paper";
import { apiFetch } from "../api/client";

function StatCard({
  value,
  label,
  onPress,
}: {
  value: number | string;
  label: string;
  onPress?: () => void;
}) {
  const CardBody = (
    <Surface style={styles.statCard} elevation={0}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {onPress ? <Text style={styles.statHint}>Toca para abrir</Text> : null}
    </Surface>
  );

  if (!onPress) return <View style={{ flex: 1 }}>{CardBody}</View>;

  return (
    <Pressable style={{ flex: 1 }} onPress={onPress}>
      {({ pressed }) => (
        <View style={{ flex: 1, opacity: pressed ? 0.9 : 1 }}>{CardBody}</View>
      )}
    </Pressable>
  );
}

export default function SellDashboardScreen({ navigation, route }: any) {
  const [stats, setStats] = useState({
    chats: 0,
    activeListings: 0,
    clicks7d: 0,
    sellerRating: 0,
  });

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // ✅ función central de carga
  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = !!opts?.silent;
    if (!silent) setLoading(true);

    try {
      const [mine, chats] = await Promise.all([
        apiFetch("/listings/mine?status=active"),
        apiFetch("/chats"),
      ]);

      setStats((s) => ({
        ...s,
        activeListings: Array.isArray(mine) ? mine.length : 0,
        chats: Array.isArray(chats) ? chats.length : 0,
      }));
    } catch {
      setStats((s) => ({ ...s, activeListings: 0, chats: 0 }));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // ✅ primera carga
  useEffect(() => {
    load();
  }, [load]);

  // ✅ cada vez que vuelves a esta pantalla (tabs/back) recarga
  useFocusEffect(
    useCallback(() => {
      load({ silent: true });
    }, [load])
  );

  // ✅ si CreateListing manda refresh param, recargar también
  useEffect(() => {
    const tick = route?.params?.refresh;
    if (!tick) return;

    load({ silent: true });

    // ✅ limpiar param para evitar re-disparos
    navigation.setParams({ refresh: undefined });
  }, [route?.params?.refresh, load, navigation]);

  // ✅ pull to refresh
  const onRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await load({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, load]);

  return (
    <View style={styles.container}>
      {/* Glows */}
      <View style={styles.bgTopGlow} />
      <View style={styles.bgBottomGlow} />

      {/* Header */}
      <Appbar.Header style={styles.appbar}>
        <Appbar.Content
          title="Panel de vendedor"
          titleStyle={{ color: "#EAF2FF", fontWeight: "800" }}
        />
        <Appbar.Action icon="refresh" onPress={onRefresh} color="#2FA8FF" />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Button
          mode="contained"
          icon="plus"
          onPress={() =>
            navigation.navigate("CreateListing", {
              mode: "create",
              // ✅ opcional: para que cuando regreses, sepas que vienes de create
              from: "SellDashboard",
            })
          }
          style={styles.primaryBtn}
          contentStyle={{ height: 48 }}
          labelStyle={styles.primaryBtnLabel}
        >
          Crear publicación
        </Button>

        <Surface style={styles.sectionCard} elevation={0}>
          <Text style={styles.sectionTitle}>Resumen</Text>
          <Text style={styles.sectionSub}>
            Métricas rápidas de tu actividad en Marketplace.
          </Text>

          <View style={styles.row}>
            <StatCard
              value={stats.chats}
              label="Chats"
              onPress={() => navigation.navigate("Chats")}
            />
            <StatCard
              value={stats.activeListings}
              label="Publicaciones activas"
              onPress={() => navigation.navigate("MyListings")}
            />
          </View>
        </Surface>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#070C16" },

  // Glows TerrePlus
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

  content: { padding: 14, gap: 12 },

  primaryBtn: { borderRadius: 14, backgroundColor: "#2FA8FF" },
  primaryBtnLabel: { fontWeight: "800", color: "#06101F" },

  sectionCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(10, 18, 34, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(140,165,210,0.18)",
  },

  sectionTitle: { color: "#EAF2FF", fontWeight: "800", fontSize: 16 },
  sectionSub: {
    color: "rgba(234,242,255,0.65)",
    marginTop: 6,
    fontSize: 12,
  },

  row: { flexDirection: "row", gap: 12, marginTop: 12 },

  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    backgroundColor: "rgba(8, 14, 28, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(140,165,210,0.18)",
  },
  statValue: { color: "#EAF2FF", fontSize: 26, fontWeight: "900" },
  statLabel: {
    color: "rgba(234,242,255,0.78)",
    marginTop: 6,
    fontWeight: "700",
  },
  statHint: {
    color: "rgba(234,242,255,0.45)",
    marginTop: 6,
    fontSize: 12,
  },
});
