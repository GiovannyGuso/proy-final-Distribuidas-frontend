// src/screens/EditListingScreen.tsx
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import {
  Appbar,
  Button,
  IconButton,
  Menu,
  Surface,
  Text,
  TextInput,
} from "react-native-paper";
import { apiFetch } from "../api/client";

type ListingImage = {
  id: number | string;
  listing_id: number | string;
  url: string;
  sort_order?: number;
};

type Coords = { latitude: number; longitude: number };
type Cat = { id: number | string; name: string };

const paperDarkInputTheme = {
  colors: {
    primary: "#2FA8FF",
    outline: "rgba(140, 165, 210, 0.35)",
    background: "rgba(10, 20, 40, 0.55)",
  },
};

export default function EditListingScreen({ route, navigation }: any) {
  const listingId = route?.params?.listingId
    ? String(route.params.listingId)
    : null;

  // ===== Form =====
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  // ===== Categoría =====
  const [cats, setCats] = useState<Cat[]>([]);
  const [catOpen, setCatOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<number | null>(null);

  // ===== Ubicación =====
  const [coords, setCoords] = useState<Coords | null>(null);
  const [cityLabel, setCityLabel] = useState<string>("");
  const [locErr, setLocErr] = useState<string | null>(null);

  const [mapOpen, setMapOpen] = useState(false);
  const [draftCoords, setDraftCoords] = useState<Coords | null>(null);

  // ===== Imágenes existentes =====
  const [serverImages, setServerImages] = useState<ListingImage[]>([]);

  // ===== UI =====
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSave = useMemo(
    () => title.trim().length > 0 && !loading,
    [title, loading]
  );

  // cargar categorías (una vez)
  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch("/categories");
        setCats(Array.isArray(data) ? data : []);
      } catch {
        setCats([]);
      }
    })();
  }, []);

  const fillCityFromCoords = async (c: Coords) => {
    try {
      const places = await Location.reverseGeocodeAsync(c);
      const p = places?.[0];
      if (!p) return;
      const label = [p.district, p.city, p.region].filter(Boolean).join(", ");
      setCityLabel(label);
    } catch { }
  };

  const ensureLocation = async () => {
    try {
      setLocErr(null);

      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) return setLocErr("Servicios de ubicación desactivados.");

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return setLocErr("Permiso de ubicación denegado.");

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const c = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };
      setCoords(c);
      await fillCityFromCoords(c);
    } catch (e: any) {
      setLocErr(e?.message || "No se pudo obtener ubicación.");
    }
  };

  const openMap = async () => {
    if (!coords) await ensureLocation();
    if (!coords) return;
    setDraftCoords(coords);
    setMapOpen(true);
  };

  const saveMap = async () => {
    if (!draftCoords) return setMapOpen(false);
    setCoords(draftCoords);
    await fillCityFromCoords(draftCoords);
    setMapOpen(false);
  };

  const load = useCallback(async () => {
    if (!listingId) {
      setErr("No vino listingId para editar.");
      return;
    }

    setErr(null);
    setLoading(true);

    try {
      // 1) cargar listing
      const item = await apiFetch(`/listings/${listingId}`);

      setTitle(item?.title ?? "");
      setPrice(String(item?.price ?? ""));
      setDescription(item?.description ?? "");

      // ✅ precargar categoría
      setCategoryId(
        item?.category_id
          ? Number(item.category_id)
          : item?.category?.id
            ? Number(item.category.id)
            : null
      );

      // ✅ precargar ubicación
      if (item?.city) setCityLabel(item.city);
      if (item?.lat_approx && item?.lon_approx) {
        setCoords({
          latitude: Number(item.lat_approx),
          longitude: Number(item.lon_approx),
        });
      } else {
        setCoords(null);
      }

      // 2) cargar imágenes existentes
      const imgs = await apiFetch(`/listings/${listingId}/images`);
      setServerImages(Array.isArray(imgs) ? imgs : []);
    } catch (e: any) {
      setErr(e?.message || "No se pudo cargar la publicación");
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useFocusEffect(
    useCallback(() => {
      console.log("📌 Entré a EditListingScreen, listingId:", listingId);
      load();
      return () => console.log("🚪 Salí de EditListingScreen");
    }, [listingId, load])
  );

  const save = async () => {
    if (!listingId) return;

    setErr(null);
    setLoading(true);

    try {
      await apiFetch(`/listings/${listingId}`, {
        method: "PUT",
        body: JSON.stringify({
          title: title.trim(),
          price: price ? Number(price) : 0,
          description: description.trim() || null,

          // ✅ ahora sí: categoría + ubicación
          category_id: categoryId,
          city: cityLabel || null,
          lat_approx: coords?.latitude ?? null,
          lon_approx: coords?.longitude ?? null,
        }),
      });

      navigation.goBack();
    } catch (e: any) {
      setErr(e?.message || "No se pudo guardar");
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteImage = (img: ListingImage) => {
    Alert.alert("Eliminar imagen", "¿Deseas eliminar esta imagen de la publicación?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => deleteImage(img) },
    ]);
  };

  const deleteImage = async (img: ListingImage) => {
    if (!listingId) return;

    setErr(null);
    setLoading(true);

    try {
      await apiFetch(`/listings/${listingId}/images/${img.id}`, {
        method: "DELETE",
      });

      setServerImages((prev) =>
        prev.filter((x) => String(x.id) !== String(img.id))
      );
    } catch (e: any) {
      setErr(e?.message || "No se pudo eliminar la imagen");
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteListing = () => {
    Alert.alert(
      "Eliminar publicación",
      "Esta acción no se puede deshacer. ¿Deseas eliminar la publicación?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: deleteListing },
      ]
    );
  };

  const deleteListing = async () => {
    if (!listingId) return;

    setErr(null);
    setLoading(true);

    try {
      await apiFetch(`/listings/${listingId}`, { method: "DELETE" });

      navigation.reset({
        index: 1,
        routes: [{ name: "Tabs", params: { screen: "Vender" } }, { name: "MyListings" }],
      });
    } catch (e: any) {
      setErr(e?.message || "No se pudo eliminar la publicación");
    } finally {
      setLoading(false);
    }
  };

  const selectedCatName = useMemo(() => {
    const c = cats.find((x) => Number(x.id) === Number(categoryId));
    return c?.name || "Seleccionar categoría";
  }, [cats, categoryId]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        <View style={styles.bgTopGlow} />
        <View style={styles.bgBottomGlow} />

        <Appbar.Header style={styles.appbar}>
          <Appbar.BackAction onPress={() => navigation.goBack()} color="#EAF2FF" />
          <Appbar.Content
            title="Editar publicación"
            titleStyle={{ color: "#EAF2FF", fontWeight: "800" }}
          />
        </Appbar.Header>

        <ScrollView contentContainerStyle={styles.content}>
          <Surface style={styles.card} elevation={0}>
            <Text style={styles.cardTitle}>Detalles</Text>
            <Text style={styles.cardSub}>Actualiza tu publicación.</Text>

            {/* Imágenes existentes */}
            <View style={{ marginTop: 14 }}>
              <Text style={{ color: "#EAF2FF", fontWeight: "800" }}>
                Imágenes subidas ({serverImages.length})
              </Text>

              {serverImages.length ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10, marginTop: 10 }}
                >
                  {serverImages.map((img) => (
                    <View key={String(img.id)} style={{ width: 110 }}>
                      <Image
                        source={{ uri: img.url }}
                        style={{
                          width: 110,
                          height: 110,
                          borderRadius: 12,
                          backgroundColor: "#222",
                        }}
                      />
                      <Button
                        compact
                        onPress={() => confirmDeleteImage(img)}
                        disabled={loading}
                        textColor="#FF8A8A"
                      >
                        Eliminar
                      </Button>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <Text style={{ color: "rgba(234,242,255,0.65)", marginTop: 6 }}>
                  No hay imágenes en esta publicación.
                </Text>
              )}
            </View>

            {/* Categoría */}
            <View style={{ marginTop: 14 }}>
              <Text style={{ color: "#EAF2FF", fontWeight: "800" }}>Categoría</Text>

              <Menu
                visible={catOpen}
                onDismiss={() => setCatOpen(false)}
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() => setCatOpen(true)}
                    disabled={loading}
                  >
                    {selectedCatName}
                  </Button>
                }
              >
                {cats.length ? (
                  cats.map((c) => (
                    <Menu.Item
                      key={String(c.id)}
                      title={c.name}
                      onPress={() => {
                        setCategoryId(Number(c.id));
                        setCatOpen(false);
                      }}
                    />
                  ))
                ) : (
                  <Menu.Item
                    title="No hay categorías"
                    onPress={() => setCatOpen(false)}
                  />
                )}
              </Menu>
            </View>

            {/* Ubicación */}
            <View style={{ marginTop: 14, gap: 8 }}>
              <Text style={{ color: "#EAF2FF", fontWeight: "800" }}>Ubicación</Text>

              <Text style={{ color: "rgba(234,242,255,0.70)" }}>
                {cityLabel ? cityLabel : "Sin ubicación"}
              </Text>

              {!coords ? (
                <Button mode="outlined" onPress={ensureLocation} disabled={loading}>
                  Activar ubicación
                </Button>
              ) : (
                <>
                  {coords?.latitude != null && coords?.longitude != null ? (
                    <View style={{ height: 150, borderRadius: 12, overflow: "hidden" }}>
                      <MapView
                        style={{ flex: 1 }}
                        pointerEvents="none"
                        region={{
                          latitude: coords.latitude,
                          longitude: coords.longitude,
                          latitudeDelta: 0.01,
                          longitudeDelta: 0.01,
                        }}
                      >
                        <Marker coordinate={coords} />
                      </MapView>
                    </View>
                  ) : null}
                  <Button mode="outlined" onPress={openMap} disabled={loading}>
                    Editar ubicación en el mapa
                  </Button>
                </>
              )}

              {locErr ? <Text style={{ color: "orange" }}>{locErr}</Text> : null}
            </View>

            {/* Form fields */}
            <TextInput
              label="Título *"
              value={title}
              onChangeText={setTitle}
              mode="outlined"
              theme={paperDarkInputTheme}
              textColor="#EAF2FF"
              placeholderTextColor="#93A4C7"
              style={styles.input}
              outlineStyle={styles.inputOutline}
              left={<TextInput.Icon icon="format-title" />}
            />

            <TextInput
              label="Precio"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              mode="outlined"
              theme={paperDarkInputTheme}
              textColor="#EAF2FF"
              placeholderTextColor="#93A4C7"
              style={styles.input}
              outlineStyle={styles.inputOutline}
              left={<TextInput.Icon icon="cash" />}
            />

            <TextInput
              label="Descripción"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={5}
              mode="outlined"
              theme={paperDarkInputTheme}
              textColor="#EAF2FF"
              placeholderTextColor="#93A4C7"
              style={styles.input}
              outlineStyle={styles.inputOutline}
              left={<TextInput.Icon icon="text" />}
            />

            {err ? <Text style={styles.err}>{err}</Text> : null}

            <Button
              mode="contained"
              onPress={save}
              loading={loading}
              disabled={!canSave}
              style={styles.primaryBtn}
              contentStyle={styles.primaryBtnContent}
              labelStyle={styles.primaryBtnLabel}
              icon="content-save"
            >
              Guardar cambios
            </Button>

            <Button
              mode="outlined"
              onPress={confirmDeleteListing}
              disabled={loading}
              style={styles.dangerBtn}
              labelStyle={styles.dangerLabel}
              icon="trash-can-outline"
            >
              Eliminar publicación
            </Button>

            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              disabled={loading}
              style={styles.secondaryBtn}
              labelStyle={styles.secondaryBtnLabel}
              icon="close"
            >
              Cancelar
            </Button>
          </Surface>

          <View style={{ height: 24 }} />
        </ScrollView>

        {/* Modal mapa grande */}
        <Modal
          visible={mapOpen}
          animationType="slide"
          onRequestClose={() => setMapOpen(false)}
        >
          <View style={{ flex: 1, backgroundColor: "#fff" }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 10,
                gap: 8,
              }}
            >
              <IconButton icon="close" onPress={() => setMapOpen(false)} />
              <Text style={{ flex: 1, fontWeight: "800" }}>Elegir ubicación</Text>
              <Button mode="contained" onPress={saveMap}>
                Guardar
              </Button>
            </View>

            <View style={{ flex: 1 }}>
              {draftCoords ? (
                <MapView
                  style={{ flex: 1 }}
                  initialRegion={{
                    latitude: draftCoords.latitude,
                    longitude: draftCoords.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  onPress={(e) => {
                    const { latitude, longitude } = e.nativeEvent.coordinate;
                    setDraftCoords({ latitude, longitude });
                  }}
                >
                  <Marker
                    coordinate={draftCoords}
                    draggable
                    onDragEnd={(e) => {
                      const { latitude, longitude } = e.nativeEvent.coordinate;
                      setDraftCoords({ latitude, longitude });
                    }}
                  />
                </MapView>
              ) : (
                <View style={{ padding: 16 }}>
                  <Text>No hay coordenadas aún.</Text>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
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

  content: { padding: 14, gap: 12, paddingBottom: 28 },

  card: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(10, 18, 34, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(140,165,210,0.18)",
  },
  cardTitle: { color: "#EAF2FF", fontWeight: "800", fontSize: 16 },
  cardSub: { color: "rgba(234,242,255,0.65)", fontSize: 12, marginTop: 6 },

  input: { backgroundColor: "transparent", marginTop: 12 },
  inputOutline: { borderRadius: 14 },

  err: { color: "#FF8A8A", marginTop: 10 },

  primaryBtn: { borderRadius: 14, backgroundColor: "#2FA8FF", marginTop: 14 },
  primaryBtnContent: { height: 48 },
  primaryBtnLabel: { fontWeight: "800", color: "#06101F" },

  dangerBtn: {
    borderRadius: 14,
    borderColor: "rgba(255,138,138,0.6)",
    marginTop: 10,
  },
  dangerLabel: { fontWeight: "800", color: "#FF8A8A" },

  secondaryBtn: {
    borderRadius: 14,
    borderColor: "rgba(140,165,210,0.35)",
    marginTop: 10,
  },
  secondaryBtnLabel: { fontWeight: "700", color: "#EAF2FF" },
});
