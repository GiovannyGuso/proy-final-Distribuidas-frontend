///Appnavigator.tsx: aquí definimos toda la navegación de la app, tanto stack como tabs. Es el punto de entrada para la navegación, y se usa en App.tsx.
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAuth } from "../context/AuthContext";

import ChatRoomScreen from "../screens/ChatRoomScreen";
import ChatsScreen from "../screens/ChatsScreen";
import CreateListingScreen from "../screens/CreateListingScreen";
import EditListingScreen from "../screens/EditListingScreen";
import ListingDetailScreen from "../screens/ListingDetailScreen";
import ListingsScreen from "../screens/ListingsScreen";
import LoginScreen from "../screens/LoginScreen";
import MyListingsScreen from "../screens/MyListingsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SellDashboardScreen from "../screens/SellDashboardScreen";

// ✅ IMPORTANTE: para íconos en tabs (opcional)
import { MaterialCommunityIcons } from "@expo/vector-icons";

type RootStackParamList = {
  Tabs: undefined;
  CreateListing: any;
  MyListings: undefined;
  ListingDetail: { listingId: string };
  EditListing: { listingId: string };
  Chats: undefined;
  ChatRoom: { chatId: string; otherName?: string };
};

type AuthStackParamList = { Login: undefined };

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator();

// 🎨 TerrePlus tokens (mismos que venimos usando)
const COLORS = {
  bg: "#070C16",
  header: "rgba(10, 18, 34, 0.98)",
  border: "rgba(140,165,210,0.18)",
  text: "#EAF2FF",
  muted: "rgba(234,242,255,0.55)",
  primary: "#2FA8FF",
};

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false, // usamos headers dentro de screens o stack
        tabBarStyle: {
          backgroundColor: COLORS.header,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarLabelStyle: { fontWeight: "700" },

        // ✅ íconos (opcional, pero queda pro)
        tabBarIcon: ({ color, size, focused }) => {
          // se sobreescribe por screen abajo con "tabBarIcon"
          return (
            <MaterialCommunityIcons name="circle" size={size} color={color} />
          );
        },
      }}
    >
      <Tab.Screen
        name="Marketplace"
        component={ListingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="storefront-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Vender"
        component={SellDashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="tag-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Perfil"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AuthedStack() {
  return (
    <RootStack.Navigator
      screenOptions={{
        // ✅ Stack header oscuro (para pantallas que usen header del stack)
        headerStyle: { backgroundColor: COLORS.header },
        headerTintColor: COLORS.text,
        headerTitleStyle: { fontWeight: "800" },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: COLORS.bg },
      }}
    >
      <RootStack.Screen name="Tabs" component={AppTabs} options={{ headerShown: false }} />

      {/* Desde Vender */}
      <RootStack.Screen
        name="CreateListing"
        component={CreateListingScreen}
        options={{ title: "Nueva publicación",  headerShown: false }}
      />
      <RootStack.Screen
        name="MyListings"
        component={MyListingsScreen}
        options={{ title: "Mis publicaciones",  headerShown: false }}
      />
      <RootStack.Screen
        name="EditListing"
        component={EditListingScreen}
        options={{ title: "Editar publicación", headerShown: false }}
      />

      {/* Detalle */}
      <RootStack.Screen
        name="ListingDetail"
        component={ListingDetailScreen}
        options={{ title: "Detalle" }}
      />

      {/* Chats */}
      <RootStack.Screen
        name="Chats"
        component={ChatsScreen}
        options={{ title: "Chats" }}
      />
      <RootStack.Screen
        name="ChatRoom"
        component={ChatRoomScreen}
        options={{ title: "Chat" }}
      />
    </RootStack.Navigator>
  );
}

function LoginStack() {
  return (
    <AuthStack.Navigator>
      <AuthStack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
    </AuthStack.Navigator>
  );
}

export default function AppNavigator() {
  const { token, loading } = useAuth();

  try {
    if (loading) return null;
    return token ? <AuthedStack /> : <LoginStack />;
  } catch (e) {
    console.error("❌ ERROR EN AppNavigator:", e);
    return null;
  }
}
