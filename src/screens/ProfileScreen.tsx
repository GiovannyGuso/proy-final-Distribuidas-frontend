// src/screens/ProfileScreen.tsx
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Avatar,
  Button,
  HelperText,
  Menu,
  Surface,
  Text,
  TextInput,
} from "react-native-paper";
import { API_BASE } from "../api/client";
import { getMe, updateMe, uploadMyAvatar } from "../api/users";
import { useAuth } from "../context/AuthContext";

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function isLeapYear(y: number) {
  return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
}
function daysInMonth(year: number, month: number) {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  if ([4, 6, 9, 11].includes(month)) return 30;
  return 31;
}

type Sex = "female" | "male" | "na";

export default function ProfileScreen() {
  const { signOut, user } = useAuth();
  const email = (user as any)?.email ?? "";

  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = currentYear; y >= 1900; y--) arr.push(y);
    return arr;
  }, [currentYear]);

  // ===== estado remoto =====
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // ✅ modo edición
  const [isEditing, setIsEditing] = useState(false);

  // perfil (estado editable)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // ✅ NUEVO: descripción
  const [description, setDescription] = useState("");

  const [birthDay, setBirthDay] = useState<number>(1);
  const [birthMonth, setBirthMonth] = useState<number>(1);
  const [birthYear, setBirthYear] = useState<number>(2000);
  const [sex, setSex] = useState<Sex>("na");

  // snapshot para "Cancelar"
  const snapshotRef = useRef<any>(null);

  // menus
  const [dayOpen, setDayOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const [sexOpen, setSexOpen] = useState(false);

  const maxDays = useMemo(
    () => daysInMonth(birthYear, birthMonth),
    [birthYear, birthMonth]
  );

  useEffect(() => {
    if (birthDay > maxDays) setBirthDay(maxDays);
  }, [maxDays, birthDay]);

  const fullName = useMemo(() => {
    const a = `${firstName} ${lastName}`.trim();
    return a || (user as any)?.full_name || email || "Usuario";
  }, [firstName, lastName, user, email]);

  const avatarLabel = (fullName?.[0] || "U").toUpperCase();

  // ✅ soporta:
  // - Google/Auth0: https://...
  // - Azure: https://...
  // - si algún día devuelves /uploads/...: lo convierte a API_BASE + path
  const avatarResolved = useMemo(() => {
    if (!avatarUrl) return null;
    if (avatarUrl.startsWith("http")) return avatarUrl;
    return `${API_BASE}${avatarUrl}`;
  }, [avatarUrl]);

  const sexLabel = useMemo(() => {
    if (sex === "female") return "Mujer";
    if (sex === "male") return "Hombre";
    return "Prefiero no decir";
  }, [sex]);

  const birthLabel = useMemo(() => {
    const m = MONTHS[birthMonth - 1] || "";
    return `${birthDay} de ${m} de ${birthYear}`;
  }, [birthDay, birthMonth, birthYear]);

  const loadMe = useCallback(async () => {
    try {
      setErr(null);
      setLoading(true);

      const me: any = await getMe();

      // ✅ si Auth0 guardó picture, aquí llega avatar_url
      setAvatarUrl(me.avatar_url || null);

      setFirstName(me.first_name || "");
      setLastName(me.last_name || "");

      // ✅ NUEVO
      setDescription(me.description || "");

      setBirthDay(me.birth_day || 1);
      setBirthMonth(me.birth_month || 1);
      setBirthYear(me.birth_year || 2000);

      setSex((me.sex as any) || "na");

      // ✅ resetea edición al recargar
      setIsEditing(false);
    } catch (e: any) {
      setErr(e?.message || "No se pudo cargar el perfil");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const startEdit = () => {
    snapshotRef.current = {
      avatarUrl,
      firstName,
      lastName,
      description, // ✅
      birthDay,
      birthMonth,
      birthYear,
      sex,
    };
    setIsEditing(true);
  };

  const cancelEdit = () => {
    const s = snapshotRef.current;
    if (s) {
      setAvatarUrl(s.avatarUrl);
      setFirstName(s.firstName);
      setLastName(s.lastName);
      setDescription(s.description || ""); // ✅
      setBirthDay(s.birthDay);
      setBirthMonth(s.birthMonth);
      setBirthYear(s.birthYear);
      setSex(s.sex);
    }
    setIsEditing(false);
    setErr(null);
  };

  const validateAll = useCallback(() => {
    if (!firstName.trim()) throw new Error("Nombre es requerido");
    if (!lastName.trim()) throw new Error("Apellido es requerido");

    // ✅ descripción opcional, pero limita largo
    if (description && description.length > 500) {
      throw new Error("La descripción no puede superar 500 caracteres");
    }

    if (birthMonth < 1 || birthMonth > 12) throw new Error("Mes inválido");
    if (birthYear < 1900 || birthYear > currentYear)
      throw new Error("Año inválido");

    const md = daysInMonth(birthYear, birthMonth);
    if (birthDay < 1 || birthDay > md) {
      throw new Error(
        `Día inválido para ${MONTHS[birthMonth - 1]} (${md} días)`
      );
    }
  }, [
    firstName,
    lastName,
    description,
    birthDay,
    birthMonth,
    birthYear,
    currentYear,
  ]);

  const onSave = useCallback(async () => {
    try {
      setErr(null);
      validateAll();
      setBusy(true);

      await updateMe({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        birth_day: birthDay,
        birth_month: birthMonth,
        birth_year: birthYear,
        sex,
        description: description.trim(), // ✅ NUEVO
      } as any);

      await loadMe();
    } catch (e: any) {
      setErr(e?.message || "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }, [
    validateAll,
    firstName,
    lastName,
    description,
    birthDay,
    birthMonth,
    birthYear,
    sex,
    loadMe,
  ]);

  const pickFromGallery = useCallback(async () => {
    try {
      setErr(null);
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return setErr("Permiso de galería denegado.");

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
      });

      if (res.canceled) return;
      const uri = res.assets?.[0]?.uri;
      if (!uri) return;

      setBusy(true);
      await uploadMyAvatar(uri);
      await loadMe();
    } catch (e: any) {
      setErr(e?.message || "No se pudo subir la foto");
    } finally {
      setBusy(false);
    }
  }, [loadMe]);

  const pickFromCamera = useCallback(async () => {
    try {
      setErr(null);
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return setErr("Permiso de cámara denegado.");

      const res = await ImagePicker.launchCameraAsync({ quality: 0.85 });
      if (res.canceled) return;
      const uri = res.assets?.[0]?.uri;
      if (!uri) return;

      setBusy(true);
      await uploadMyAvatar(uri);
      await loadMe();
    } catch (e: any) {
      setErr(e?.message || "No se pudo subir la foto");
    } finally {
      setBusy(false);
    }
  }, [loadMe]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.bgTopGlow} />
        <View style={styles.bgBottomGlow} />
        <View style={[styles.content, { justifyContent: "center" }]}>
          <Text
            style={{ color: "rgba(234,242,255,0.75)", textAlign: "center" }}
          >
            Cargando perfil...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        <View style={styles.bgTopGlow} />
        <View style={styles.bgBottomGlow} />

        <Appbar.Header style={styles.appbar}>
          <Appbar.Content
            title="Perfil"
            titleStyle={{ color: "#EAF2FF", fontWeight: "800" }}
          />
          <Appbar.Action icon="refresh" onPress={loadMe} disabled={busy} />
        </Appbar.Header>

        <View style={styles.content}>
          <Surface style={styles.card} elevation={0}>
            <View style={styles.avatarWrap}>
              {avatarResolved ? (
                <Avatar.Image size={92} source={{ uri: avatarResolved }} />
              ) : (
                <Avatar.Text
                  size={92}
                  label={avatarLabel}
                  style={styles.avatar}
                  labelStyle={{ fontWeight: "900" }}
                />
              )}
            </View>

            {/* ✅ BOTONES FOTO SOLO SI EDITAS */}
            {isEditing && (
              <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
                <Button
                  mode="outlined"
                  onPress={pickFromCamera}
                  style={{ flex: 1 }}
                  disabled={busy}
                >
                  Cámara
                </Button>
                <Button
                  mode="outlined"
                  onPress={pickFromGallery}
                  style={{ flex: 1 }}
                  disabled={busy}
                >
                  Galería
                </Button>
              </View>
            )}

            <View style={{ height: 12 }} />

            {/* =======================
               MODO VISTA (NO EDITAR)
               ======================= */}
            {!isEditing && (
              <View style={{ gap: 10 }}>
                <Text style={styles.viewName}>{fullName || "Usuario"}</Text>
                {email ? <Text style={styles.email}>Email: {email}</Text> : null}

                {/* ✅ Descripción en vista */}
                <View style={{ gap: 6 }}>
                  <Text style={styles.kvKey}>Descripción</Text>
                  <Text style={styles.kvVal}>
                    {description?.trim() ? description.trim() : "Sin descripción"}
                  </Text>
                </View>

                <View style={styles.kvRow}>
                  <Text style={styles.kvKey}>Nacimiento</Text>
                  <Text style={styles.kvVal}>{birthLabel}</Text>
                </View>

                <View style={styles.kvRow}>
                  <Text style={styles.kvKey}>Sexo</Text>
                  <Text style={styles.kvVal}>{sexLabel}</Text>
                </View>

                {!!err && (
                  <HelperText type="error" visible={!!err} style={{ marginTop: 2 }}>
                    {err}
                  </HelperText>
                )}

                <Button
                  mode="contained"
                  onPress={startEdit}
                  disabled={busy}
                  style={styles.primaryBtn}
                  contentStyle={{ height: 48 }}
                  labelStyle={styles.primaryBtnLabel}
                >
                  Editar datos
                </Button>

                <View style={styles.divider} />

                <Button
                  mode="contained"
                  icon="logout"
                  onPress={signOut}
                  style={styles.logoutBtn}
                  contentStyle={{ height: 48 }}
                  labelStyle={styles.logoutLabel}
                  disabled={busy}
                >
                  Cerrar sesión
                </Button>
              </View>
            )}

            {/* =======================
               MODO EDICIÓN
               ======================= */}
            {isEditing && (
              <View style={{ gap: 8 }}>
                <TextInput
                  label="Nombre"
                  value={firstName}
                  onChangeText={setFirstName}
                  mode="outlined"
                  style={styles.input}
                  textColor="#EAF2FF"
                  placeholderTextColor="#93A4C7"
                  theme={paperDarkInputTheme}
                  editable={!busy}
                />
                <TextInput
                  label="Apellido"
                  value={lastName}
                  onChangeText={setLastName}
                  mode="outlined"
                  style={styles.input}
                  textColor="#EAF2FF"
                  placeholderTextColor="#93A4C7"
                  theme={paperDarkInputTheme}
                  editable={!busy}
                />

                {/* ✅ NUEVO: descripción editable */}
                <TextInput
                  label="Descripción"
                  value={description}
                  onChangeText={setDescription}
                  mode="outlined"
                  style={styles.input}
                  textColor="#EAF2FF"
                  placeholder="Cuéntanos algo sobre ti..."
                  placeholderTextColor="#93A4C7"
                  theme={paperDarkInputTheme}
                  editable={!busy}
                  multiline
                  numberOfLines={3}
                />

                <Text style={styles.sectionLabel}>Fecha de nacimiento</Text>

                <View style={{ flexDirection: "row", gap: 10 }}>
                  {/* Día */}
                  <View style={{ flex: 1 }}>
                    <Menu
                      visible={dayOpen}
                      onDismiss={() => setDayOpen(false)}
                      anchor={
                        <Button
                          mode="outlined"
                          onPress={() => setDayOpen(true)}
                          style={{ width: "100%" }}
                          contentStyle={{ height: 48 }}
                          labelStyle={{ color: "#EAF2FF", fontWeight: "800" }}
                          disabled={busy}
                        >
                          Día: {birthDay}
                        </Button>
                      }
                    >
                      <ScrollView style={{ maxHeight: 260 }}>
                        {Array.from({ length: maxDays }, (_, i) => i + 1).map(
                          (d) => (
                            <Menu.Item
                              key={d}
                              title={String(d)}
                              onPress={() => {
                                setBirthDay(d);
                                setDayOpen(false);
                              }}
                            />
                          )
                        )}
                      </ScrollView>
                    </Menu>
                  </View>

                  {/* Mes */}
                  <View style={{ flex: 1 }}>
                    <Menu
                      visible={monthOpen}
                      onDismiss={() => setMonthOpen(false)}
                      anchor={
                        <Button
                          mode="outlined"
                          onPress={() => setMonthOpen(true)}
                          style={{ width: "100%" }}
                          contentStyle={{ height: 48 }}
                          labelStyle={{ color: "#EAF2FF", fontWeight: "800" }}
                          disabled={busy}
                        >
                          {MONTHS[birthMonth - 1] || "Mes"}
                        </Button>
                      }
                    >
                      <ScrollView style={{ maxHeight: 260 }}>
                        {MONTHS.map((m, idx) => (
                          <Menu.Item
                            key={m}
                            title={m}
                            onPress={() => {
                              setBirthMonth(idx + 1);
                              setMonthOpen(false);
                            }}
                          />
                        ))}
                      </ScrollView>
                    </Menu>
                  </View>

                  {/* Año */}
                  <View style={{ flex: 1 }}>
                    <Menu
                      visible={yearOpen}
                      onDismiss={() => setYearOpen(false)}
                      anchor={
                        <Button
                          mode="outlined"
                          onPress={() => setYearOpen(true)}
                          style={{ width: "100%" }}
                          contentStyle={{ height: 48 }}
                          labelStyle={{ color: "#EAF2FF", fontWeight: "800" }}
                          disabled={busy}
                        >
                          {birthYear}
                        </Button>
                      }
                    >
                      <ScrollView style={{ maxHeight: 260 }}>
                        {years.map((y) => (
                          <Menu.Item
                            key={y}
                            title={String(y)}
                            onPress={() => {
                              setBirthYear(y);
                              setYearOpen(false);
                            }}
                          />
                        ))}
                      </ScrollView>
                    </Menu>
                  </View>
                </View>

                {/* Sexo */}
                <Menu
                  visible={sexOpen}
                  onDismiss={() => setSexOpen(false)}
                  anchor={
                    <Button
                      mode="outlined"
                      onPress={() => setSexOpen(true)}
                      disabled={busy}
                    >
                      Sexo: {sexLabel}
                    </Button>
                  }
                >
                  <Menu.Item
                    title="Mujer"
                    onPress={() => {
                      setSex("female");
                      setSexOpen(false);
                    }}
                  />
                  <Menu.Item
                    title="Hombre"
                    onPress={() => {
                      setSex("male");
                      setSexOpen(false);
                    }}
                  />
                  <Menu.Item
                    title="Prefiero no decir"
                    onPress={() => {
                      setSex("na");
                      setSexOpen(false);
                    }}
                  />
                </Menu>

                {email ? <Text style={styles.email}>Email: {email}</Text> : null}

                {!!err && (
                  <HelperText type="error" visible={!!err} style={{ marginTop: 2 }}>
                    {err}
                  </HelperText>
                )}

                <View style={{ height: 6 }} />

                <Button
                  mode="contained"
                  onPress={onSave}
                  loading={busy}
                  disabled={busy}
                  style={styles.primaryBtn}
                  contentStyle={{ height: 48 }}
                  labelStyle={styles.primaryBtnLabel}
                >
                  Guardar cambios
                </Button>

                <Button
                  mode="outlined"
                  onPress={cancelEdit}
                  disabled={busy}
                  style={{ borderRadius: 14 }}
                >
                  Cancelar
                </Button>
              </View>
            )}
          </Surface>
        </View>

        {busy && (
          <View style={styles.loadingOverlay} pointerEvents="auto">
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>Procesando…</Text>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const paperDarkInputTheme = {
  colors: {
    primary: "#2FA8FF",
    outline: "rgba(140, 165, 210, 0.35)",
    background: "rgba(10, 20, 40, 0.55)",
  },
};

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

  content: { padding: 16, gap: 12, justifyContent: "center", flex: 1 },

  card: {
    borderRadius: 18,
    padding: 16,
    gap: 10,
    backgroundColor: "rgba(10, 18, 34, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(140,165,210,0.18)",
  },

  avatarWrap: { alignItems: "center", marginBottom: 4 },
  avatar: { backgroundColor: "#2FA8FF" },

  input: { backgroundColor: "transparent" },

  viewName: {
    color: "#EAF2FF",
    fontWeight: "900",
    fontSize: 18,
    textAlign: "center",
  },
  email: { color: "rgba(234,242,255,0.65)", textAlign: "center" },

  kvRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  kvKey: { color: "rgba(234,242,255,0.55)", fontWeight: "700" },
  kvVal: { color: "rgba(234,242,255,0.85)", fontWeight: "800" },

  sectionLabel: {
    color: "rgba(234,242,255,0.75)",
    marginTop: 6,
    fontWeight: "800",
  },

  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "rgba(140,165,210,0.18)",
    marginVertical: 12,
  },

  primaryBtn: { borderRadius: 14, backgroundColor: "#2FA8FF" },
  primaryBtnLabel: { fontWeight: "800", color: "#06101F" },

  logoutBtn: { borderRadius: 14, backgroundColor: "rgba(255, 90, 90, 0.95)" },
  logoutLabel: { fontWeight: "800", color: "#1A0000" },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  loadingText: { color: "#EAF2FF", fontWeight: "700" },
});
