// src/screens/CreateListingScreen.tsx
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import React, { useEffect, useMemo, useState } from "react";
import { Image, KeyboardAvoidingView, Modal, Platform, ScrollView, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import {
  Appbar,
  Button,
  HelperText,
  IconButton,
  Menu,
  Text,
  TextInput,
} from "react-native-paper";
import { API_BASE, apiFetch } from "../api/client";
import { useAuth } from "../context/AuthContext";

type Coords = { latitude: number; longitude: number };
type Cat = { id: number | string; name: string };

const CONDITION_OPTIONS = [
  { value: "nuevo", label: "Nuevo" },
  { value: "usado_como_nuevo", label: "Usado - Como nuevo" },
  { value: "usado_buen_estado", label: "Usado - Buen estado" },
  { value: "usado_aceptable", label: "Usado - Aceptable" },
];

// 🎨 Colores para que "Nueva publicación" quede igual que el resto
const BG = "#0b0f1a"; // fondo oscuro de la pantalla
const TEXT = "#ffffff";

export default function CreateListingScreen({ navigation }: any) {
  const { token } = useAuth();

  // ===== Form =====
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  // ===== Categoría =====
  const [cats, setCats] = useState<Cat[]>([]);
  const [catOpen, setCatOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<number | null>(null);

  // ===== Condición =====
  const [condOpen, setCondOpen] = useState(false);
  const [condition, setCondition] = useState<string>(
    CONDITION_OPTIONS[0].value
  );

  // ===== Fotos =====
  const [photos, setPhotos] = useState<string[]>([]);

  // ===== Ubicación / mapa =====
  const [coords, setCoords] = useState<Coords | null>(null);
  const [cityLabel, setCityLabel] = useState<string>("");
  const [locErr, setLocErr] = useState<string | null>(null);

  const [mapOpen, setMapOpen] = useState(false);
  const [draftCoords, setDraftCoords] = useState<Coords | null>(null);

  // ===== UI =====
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => title.trim().length > 0 && !loading,
    [title, loading]
  );

  // cargar categorías
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

  // ubicación al entrar (auto)
  useEffect(() => {
    if (coords) return;

    (async () => {
      try {
        setLocErr(null);

        const enabled = await Location.hasServicesEnabledAsync();
        if (!enabled) {
          setLocErr("Servicios de ubicación desactivados.");
          return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocErr("Permiso de ubicación denegado.");
          return;
        }

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
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (!enabled) {
        setLocErr("Servicios de ubicación desactivados.");
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocErr("Permiso de ubicación denegado.");
        return;
      }

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

  // =========================
  // Fotos: galería / archivos / cámara
  // =========================
  const pickFromGallery = async () => {
    try {
      setErr(null);

      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return setErr("Permiso de galería denegado.");

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        // ⚠️ en Android real, multiple selection da problemas en varios dispositivos
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      if (res.canceled) return;

      const uri = res.assets?.[0]?.uri;
      if (!uri) return setErr("No se pudo leer la imagen seleccionada.");

      setPhotos((prev) => [...prev, uri].slice(0, 10));
    } catch (e: any) {
      setErr(e?.message || "Error abriendo la galería");
    }
  };


  const pickFromFiles = async () => {
    setErr(null);
    const res = await DocumentPicker.getDocumentAsync({
      type: "image/*",
      multiple: true,
      copyToCacheDirectory: true,
    });

    if (res.canceled) return;
    const uris = res.assets.map((a) => a.uri);
    setPhotos((prev) => [...prev, ...uris].slice(0, 10));
  };

  const pickFromCamera = async () => {
    setErr(null);

    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return setErr("Permiso de cámara denegado.");

    if (photos.length >= 10) return setErr("Máximo 10 fotos.");

    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });

    if (res.canceled) return;

    const uri = res.assets?.[0]?.uri;
    if (!uri) return;

    setPhotos((prev) => [...prev, uri].slice(0, 10));
  };

  const removePhoto = (idx: number) =>
    setPhotos((prev) => prev.filter((_, i) => i !== idx));

  const uploadOneImage = async (id: number | string, uri: string) => {
    if (!token) throw new Error("No hay token");

    const form = new FormData();
    const filename = uri.split("/").pop() || "image.jpg";
    const ext = filename.split(".").pop()?.toLowerCase();
    const mime =
      ext === "png"
        ? "image/png"
        : ext === "webp"
          ? "image/webp"
          : "image/jpeg";

    form.append("file", { uri, name: filename, type: mime } as any);

    const r = await fetch(`${API_BASE}/listings/${id}/images`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    if (!r.ok) throw new Error(await r.text());
    return r.json();
  };

  const submit = async () => {
    if (!canSubmit) return;

    setErr(null);
    setLoading(true);

    try {
      const payload: any = {
        title: title.trim(),
        description: description.trim() || null,
        price: price ? Number(price) : 0,
        category_id: categoryId,
        condition,
        city: cityLabel || null,
        lat_approx: coords?.latitude ?? null,
        lon_approx: coords?.longitude ?? null,
      };

      // ✅ SOLO CREATE
      const created = await apiFetch("/listings", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const id = created?.id;
      if (!id) throw new Error("No vino id del listing");

      // subir fotos
      if (photos.length) {
        for (const uri of photos) await uploadOneImage(id, uri);
      }

      // ✅ STACK LIMPIO + refresco marketplace + detalle
      const refreshTick = Date.now();

      navigation.reset({
        index: 1,
        routes: [
          {
            name: "Tabs",
            params: {
              screen: "Marketplace",
              params: { refresh: refreshTick },
            },
          },
          {
            name: "ListingDetail",
            params: { listingId: String(id) },
          },
        ],
      });
    } catch (e: any) {
      setErr(e?.message || "Error al publicar");
    } finally {
      setLoading(false);
    }
  };

  const selectedCatName = useMemo(() => {
    const c = cats.find((x) => Number(x.id) === Number(categoryId));
    return c?.name || "Seleccionar categoría";
  }, [cats, categoryId]);

  const selectedCondLabel = useMemo(() => {
    return (
      CONDITION_OPTIONS.find((x) => x.value === condition)?.label ||
      "Seleccionar estado"
    );
  }, [condition]);

  return (
    // ✅ Contenedor principal con fondo oscuro para que el Appbar no quede blanco
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* ✅ Appbar fuera del ScrollView + mismo color del fondo */}
      <Appbar.Header style={{ backgroundColor: BG }} elevated={false}>
        <Appbar.BackAction
          color={TEXT}
          onPress={() => navigation.goBack()}
        />
        <Appbar.Content
          title="Nueva publicación"
          titleStyle={{ color: TEXT }}
        />
      </Appbar.Header>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        keyboardVerticalOffset={0}
      >

        <ScrollView
          style={{ flex: 1, backgroundColor: BG }}
          contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 80 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Fotos */}
          <View style={{ gap: 10 }}>
            <Text style={{ fontWeight: "700", color: TEXT }}>
              Fotos ({photos.length}/10)
            </Text>

            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              <Button mode="outlined" onPress={pickFromCamera} disabled={loading}>
                Tomar foto
              </Button>
              <Button mode="outlined" onPress={pickFromGallery} disabled={loading}>
                Agregar desde galería
              </Button>
              <Button mode="outlined" onPress={pickFromFiles} disabled={loading}>
                Agregar desde archivos
              </Button>
            </View>

            {photos.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10 }}
              >
                {photos.map((uri, idx) => (
                  <View key={uri + idx} style={{ width: 110 }}>
                    <Image
                      source={{ uri }}
                      style={{
                        width: 110,
                        height: 110,
                        borderRadius: 12,
                        backgroundColor: "#eee",
                      }}
                    />
                    <Button
                      compact
                      onPress={() => removePhoto(idx)}
                      disabled={loading}
                    >
                      Quitar
                    </Button>
                  </View>
                ))}
              </ScrollView>
            ) : null}

            <Text style={{ opacity: 0.6, fontSize: 12, color: TEXT }}>
              La primera foto será la principal.
            </Text>
          </View>

          <TextInput label="Título *" value={title} onChangeText={setTitle} />
          <HelperText type={title.trim() ? "info" : "error"} visible>
            {title.trim() ? "OK" : "El título es obligatorio"}
          </HelperText>

          <TextInput
            label="Precio"
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
          />

          {/* Ubicación */}
          <View style={{ gap: 6 }}>
            <Text style={{ fontWeight: "700", color: TEXT }}>Ubicación</Text>
            <Text style={{ opacity: 0.8, color: TEXT }}>
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

          {/* Categoría dropdown */}
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
                  onPress={() => {
                    setCategoryId(Number(c.id));
                    setCatOpen(false);
                  }}
                  title={c.name}
                />
              ))
            ) : (
              <Menu.Item
                title="No hay categorías"
                onPress={() => setCatOpen(false)}
              />
            )}
          </Menu>

          {/* Estado/condición dropdown */}
          <Menu
            visible={condOpen}
            onDismiss={() => setCondOpen(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setCondOpen(true)}
                disabled={loading}
              >
                {selectedCondLabel}
              </Button>
            }
          >
            {CONDITION_OPTIONS.map((s) => (
              <Menu.Item
                key={s.value}
                onPress={() => {
                  setCondition(s.value);
                  setCondOpen(false);
                }}
                title={s.label}
              />
            ))}
          </Menu>

          <TextInput
            label="Descripción"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />

          {err ? <Text style={{ color: "red" }}>{err}</Text> : null}

          <Button
            mode="contained"
            onPress={submit}
            loading={loading}
            disabled={!canSubmit}
          >
            Publicar
          </Button>

          {/* espacio final */}
          <View style={{ height: 8 }} />
        </ScrollView>
      </KeyboardAvoidingView>

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
            <Text variant="titleMedium" style={{ flex: 1 }}>
              Elegir ubicación
            </Text>
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

          <View style={{ padding: 12 }}>
            <Text style={{ opacity: 0.7 }}>
              Tip: toca el mapa o arrastra el pin para fijar la ubicación.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}
