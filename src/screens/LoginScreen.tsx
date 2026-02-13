// LoginScreen.tsx - login tradicional + registro con menús (día/mes/año scroll) + Google (Auth0)
import * as AuthSession from "expo-auth-session";
import Constants from "expo-constants";
import React, { useEffect, useMemo, useState } from "react";

import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Divider,
  HelperText,
  Menu,
  RadioButton,
  SegmentedButtons,
  Surface,
  Text,
  TextInput,
} from "react-native-paper";

import * as WebBrowser from "expo-web-browser";

import { login, loginWithAuth0, register, RegisterPayload } from "../api/auth";
import { AUTH0_CLIENT_ID, AUTH0_DOMAIN } from "../config";
import { useAuth } from "../context/AuthContext";

WebBrowser.maybeCompleteAuthSession();

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

function isEmailValid(v: string) {
  const s = v.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isLeapYear(y: number) {
  return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
}

function daysInMonth(year: number, month: number) {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  if ([4, 6, 9, 11].includes(month)) return 30;
  return 31;
}

export default function LoginScreen() {
  const { setToken } = useAuth();

  // ===== estado =====
  const [mode, setMode] = useState<"login" | "register">("login");

  // ✅ Registro
  const [firstName, setFirstName] = useState("Comprador");
  const [lastName, setLastName] = useState("Demo");

  // ✅ ahora como ProfileScreen (num)
  const [birthDay, setBirthDay] = useState<number>(1);
  const [birthMonth, setBirthMonth] = useState<number>(1);
  const [birthYear, setBirthYear] = useState<number>(2000);

  // ✅ menús (scroll)
  const [dayOpen, setDayOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);

  // female | male | na
  const [sex, setSex] = useState<"female" | "male" | "na">("na");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);

  // ===== Auth0 discovery =====
  const discovery = AuthSession.useAutoDiscovery(
    AUTH0_DOMAIN ? `https://${AUTH0_DOMAIN}` : ""
  );

  // ===== redirect URI (Expo Go usa proxy / APK usa scheme) =====
  const redirectUri = useMemo(() => {
    const isExpoGo = Constants.appOwnership === "expo";

    const uri = isExpoGo
      ? AuthSession.makeRedirectUri()
      : AuthSession.makeRedirectUri({
          scheme: "marketplace",
          path: "auth",
          preferLocalhost: false,
        });

    return uri;
  }, []);

  // ===== Auth request =====
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: AUTH0_CLIENT_ID,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      scopes: ["openid", "profile", "email"],
      usePKCE: true,
      extraParams: { connection: "google-oauth2" },
    },
    discovery
  );
  
  // ===== Manejo respuesta Auth0 =====
  useEffect(() => {
    if (!response || response.type !== "success" || !discovery || !request) return;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const code = response.params.code;
        if (!code) throw new Error("Auth0 no devolvió authorization code");

        const verifier = request.codeVerifier;
        if (!verifier) throw new Error("PKCE verifier perdido. Reinicia Expo con -c.");

        const tokenRes = await AuthSession.exchangeCodeAsync(
          {
            clientId: AUTH0_CLIENT_ID,
            code,
            redirectUri,
            extraParams: { code_verifier: verifier },
          },
          discovery
        );

        const idToken = (tokenRes as any).idToken;
        if (!idToken) throw new Error("Auth0 no devolvió id_token");

        const data = await loginWithAuth0(idToken);
        await setToken(data.token);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [response, discovery, request, redirectUri, setToken]);

  // ✅ Years (lista completa 1900..actual)
  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const arr: number[] = [];
    for (let y = current; y >= 1900; y--) arr.push(y);
    return arr;
  }, []);

  // ✅ maxDays según mes/año
  const maxDays = useMemo(() => daysInMonth(birthYear, birthMonth), [birthYear, birthMonth]);

  // ✅ si cambias mes/año y el día queda inválido, ajusta
  useEffect(() => {
    if (birthDay > maxDays) setBirthDay(maxDays);
  }, [birthDay, maxDays]);

  const validateRegister = useMemo(() => {
    if (mode !== "register") return { ok: true, msg: null as string | null };

    const fn = firstName.trim();
    const ln = lastName.trim();
    if (!fn) return { ok: false, msg: "Nombre es requerido." };
    if (!ln) return { ok: false, msg: "Apellido es requerido." };

    const current = new Date().getFullYear();
    if (!Number.isInteger(birthYear) || birthYear < 1900 || birthYear > current) {
      return { ok: false, msg: `Año inválido (1900-${current}).` };
    }
    if (!Number.isInteger(birthMonth) || birthMonth < 1 || birthMonth > 12) {
      return { ok: false, msg: "Mes inválido (1-12)." };
    }

    const md = daysInMonth(birthYear, birthMonth);
    if (!Number.isInteger(birthDay) || birthDay < 1 || birthDay > md) {
      return { ok: false, msg: `Día inválido para ${MONTHS[birthMonth - 1]} (${md} días).` };
    }

    if (!isEmailValid(email)) return { ok: false, msg: "Email inválido." };
    if (!password || password.length < 6) {
      return { ok: false, msg: "Password mínimo 6 caracteres." };
    }

    return { ok: true, msg: null };
  }, [mode, firstName, lastName, birthDay, birthMonth, birthYear, email, password]);

  // ===== Login / Register =====
  const onSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      if (mode === "login") {
        if (!isEmailValid(email)) throw new Error("Email inválido.");
        if (!password) throw new Error("Password es requerido.");
        const data = await login(email, password);
        await setToken(data.token);
        return;
      }

      // mode === register
      if (!validateRegister.ok) throw new Error(validateRegister.msg || "Datos inválidos.");

      const payload: RegisterPayload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        birth_day: birthDay,
        birth_month: birthMonth,
        birth_year: birthYear,
        sex,
        email: email.trim().toLowerCase(),
        password,
      };

      const data = await register(payload);
      await setToken(data.token);
    } catch (e: any) {
      setError(e.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  // ===== Google/Auth0 =====
  const onGoogle = async () => {
    setError(null);

    if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID) {
      setError("Falta AUTH0_DOMAIN o AUTH0_CLIENT_ID");
      return;
    }
    if (!discovery) {
      setError("Discovery de Auth0 aún cargando...");
      return;
    }
    if (!request) {
      setError("Auth request aún no lista (espera 1-2s y prueba de nuevo)");
      return;
    }

    await promptAsync();
  };

  const title = mode === "login" ? "Iniciar sesión" : "Crear cuenta";
  const subtitle =
    mode === "login"
      ? "Bienvenido de vuelta. Ingresa tus credenciales."
      : "Crea tu cuenta en segundos.";

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        <View style={styles.bgTopGlow} />
        <View style={styles.bgBottomGlow} />

        <KeyboardAvoidingView
          style={styles.inner}
          behavior={Platform.OS === "ios" ? "padding" : "padding"}
        >
          <View style={styles.header}>
            <Text style={styles.brand}>MARKETPLACE</Text>
            <Text style={styles.brandSub}>Compra • Vende • Publica</Text>
          </View>

          <Surface style={styles.card} elevation={0}>
            <SegmentedButtons
              value={mode}
              onValueChange={(v) => {
                setMode(v as any);
                setError(null);
              }}
              buttons={[
                { value: "login", label: "Login", icon: "login" },
                { value: "register", label: "Registro", icon: "account-plus" },
              ]}
              style={styles.segment}
              density="small"
            />

            <View style={{ gap: 4 }}>
              <Text style={styles.cardTitle}>{title}</Text>
              <Text style={styles.cardSubtitle}>{subtitle}</Text>
            </View>

            <View style={{ height: 12 }} />

            {/* ================= REGISTER ================= */}
            {mode === "register" && (
              <View style={{ gap: 8 }}>
                <TextInput
                  label="Nombre"
                  value={firstName}
                  onChangeText={setFirstName}
                  mode="outlined"
                  left={<TextInput.Icon icon="account" />}
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  textColor="#EAF2FF"
                  placeholderTextColor="#93A4C7"
                  theme={paperDarkInputTheme}
                  editable={!loading}
                />

                <TextInput
                  label="Apellido"
                  value={lastName}
                  onChangeText={setLastName}
                  mode="outlined"
                  left={<TextInput.Icon icon="account" />}
                  style={styles.input}
                  outlineStyle={styles.inputOutline}
                  textColor="#EAF2FF"
                  placeholderTextColor="#93A4C7"
                  theme={paperDarkInputTheme}
                  editable={!loading}
                />

                {/* ✅ Menús scroll como ProfileScreen */}
                <Text style={{ color: "rgba(234,242,255,0.75)", fontWeight: "700" }}>
                  Fecha de nacimiento
                </Text>

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
                          disabled={loading}
                        >
                          Día: {birthDay}
                        </Button>
                      }
                    >
                      <ScrollView style={{ maxHeight: 260 }}>
                        {Array.from({ length: maxDays }, (_, i) => i + 1).map((d) => (
                          <Menu.Item
                            key={d}
                            title={String(d)}
                            onPress={() => {
                              setBirthDay(d);
                              setDayOpen(false);
                            }}
                          />
                        ))}
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
                          disabled={loading}
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
                          disabled={loading}
                        >
                          A: {birthYear}
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

                <Text style={{ color: "rgba(234,242,255,0.75)", fontWeight: "700" }}>
                  Sexo
                </Text>

                <RadioButton.Group onValueChange={(v) => setSex(v as any)} value={sex}>
                  <View style={styles.radioRow}>
                    <View style={styles.radioItem}>
                      <RadioButton value="female" />
                      <Text style={styles.radioLabel}>Mujer</Text>
                    </View>

                    <View style={styles.radioItem}>
                      <RadioButton value="male" />
                      <Text style={styles.radioLabel}>Hombre</Text>
                    </View>

                    <View style={styles.radioItem}>
                      <RadioButton value="na" />
                      <Text style={styles.radioLabel}>Prefiero no decir</Text>
                    </View>
                  </View>
                </RadioButton.Group>

                {!validateRegister.ok ? (
                  <HelperText type="error" visible style={styles.error}>
                    {validateRegister.msg}
                  </HelperText>
                ) : null}
              </View>
            )}

            {/* ================= EMAIL / PASS (both modes) ================= */}
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              mode="outlined"
              left={<TextInput.Icon icon="email-outline" />}
              style={styles.input}
              outlineStyle={styles.inputOutline}
              textColor="#EAF2FF"
              placeholderTextColor="#93A4C7"
              theme={paperDarkInputTheme}
              editable={!loading}
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              mode="outlined"
              left={<TextInput.Icon icon="lock-outline" />}
              right={
                <TextInput.Icon
                  icon={showPass ? "eye-off-outline" : "eye-outline"}
                  onPress={() => setShowPass((v) => !v)}
                />
              }
              style={styles.input}
              outlineStyle={styles.inputOutline}
              textColor="#EAF2FF"
              placeholderTextColor="#93A4C7"
              theme={paperDarkInputTheme}
              editable={!loading}
            />

            {!!error && (
              <HelperText type="error" visible={!!error} style={styles.error}>
                {error}
              </HelperText>
            )}

            <View style={{ height: 6 }} />

            <Button
              mode="contained"
              onPress={onSubmit}
              loading={loading}
              disabled={loading || (mode === "register" && !validateRegister.ok)}
              icon={mode === "login" ? "login" : "account-plus"}
              contentStyle={styles.primaryBtnContent}
              style={styles.primaryBtn}
              labelStyle={styles.primaryBtnLabel}
            >
              {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
            </Button>

            <Button
              mode="outlined"
              onPress={() => setMode((m) => (m === "login" ? "register" : "login"))}
              disabled={loading}
              icon={mode === "login" ? "account-plus" : "login"}
              style={styles.secondaryBtn}
              labelStyle={styles.secondaryBtnLabel}
            >
              {mode === "login" ? "No tengo cuenta (Registrarme)" : "Ya tengo cuenta (Login)"}
            </Button>

            <View style={{ height: 12 }} />
            <Divider style={styles.divider} />
            <View style={{ height: 12 }} />

            <Button
              mode="contained-tonal"
              onPress={onGoogle}
              disabled={loading}
              icon="google"
              style={styles.googleBtn}
              labelStyle={styles.googleBtnLabel}
              contentStyle={styles.googleBtnContent}
            >
              Continuar con Google (Auth0)
            </Button>

            <Text style={styles.footNote}>
              Al continuar aceptas los Términos y la Política de Privacidad.
            </Text>
          </Surface>

          <View style={styles.bottomSpace} />
        </KeyboardAvoidingView>

        {loading && (
          <View style={styles.loadingOverlay} pointerEvents="auto">
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>Procesando...</Text>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

/** Tema oscuro para inputs Paper (sin tocar tu theme global) */
const paperDarkInputTheme = {
  colors: {
    primary: "#2FA8FF",
    outline: "rgba(140, 165, 210, 0.35)",
    background: "rgba(10, 20, 40, 0.55)",
  },
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#070C16" },
  inner: { flex: 1, paddingHorizontal: 18, justifyContent: "center" },

  bgTopGlow: {
    position: "absolute",
    top: -120,
    left: -120,
    width: 320,
    height: 320,
    borderRadius: 180,
    backgroundColor: "rgba(47,168,255,0.20)",
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

  header: { alignItems: "center", marginBottom: 16 },
  brand: { color: "#EAF2FF", fontSize: 26, letterSpacing: 1.6, fontWeight: "800" },
  brandSub: { color: "rgba(234,242,255,0.70)", marginTop: 6, fontSize: 12 },

  card: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: "rgba(10, 18, 34, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(140,165,210,0.18)",
  },

  segment: { marginBottom: 12 },
  cardTitle: { color: "#EAF2FF", fontSize: 18, fontWeight: "800" },
  cardSubtitle: { color: "rgba(234,242,255,0.68)", fontSize: 12, lineHeight: 16 },

  input: { backgroundColor: "transparent", marginBottom: 10 },
  inputOutline: { borderRadius: 14 },

  error: { marginTop: 6, marginBottom: 6 },

  primaryBtn: { borderRadius: 14, backgroundColor: "#2FA8FF" },
  primaryBtnContent: { height: 48 },
  primaryBtnLabel: { fontWeight: "800", letterSpacing: 0.3, color: "#06101F" },

  secondaryBtn: { borderRadius: 14, borderColor: "rgba(140,165,210,0.35)" },
  secondaryBtnLabel: { fontWeight: "700", color: "#EAF2FF" },

  divider: { backgroundColor: "rgba(140,165,210,0.22)" },

  googleBtn: { borderRadius: 14, backgroundColor: "rgba(47,168,255,0.15)" },
  googleBtnContent: { height: 48 },
  googleBtnLabel: { fontWeight: "800", color: "#EAF2FF" },

  footNote: {
    marginTop: 10,
    fontSize: 11,
    color: "rgba(234,242,255,0.55)",
    textAlign: "center",
    lineHeight: 14,
  },

  bottomSpace: { height: 28 },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  loadingText: { color: "#EAF2FF", fontWeight: "700" },

  radioRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  radioItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  radioLabel: { color: "#EAF2FF", fontWeight: "700" },
});
