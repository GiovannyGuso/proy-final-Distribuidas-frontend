import { NavigationContainer } from "@react-navigation/native";
import { Provider as PaperProvider } from "react-native-paper";
import { AuthProvider } from "./src/context/AuthContext";
import { ChatPresenceProvider } from "./src/context/ChatPresenceContext";
import AppNavigator from "./src/navigation/AppNavigator";

export default function App() {
  return (
    <PaperProvider>
      <AuthProvider>
        <ChatPresenceProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </ChatPresenceProvider>
      </AuthProvider>
    </PaperProvider>
  );
}