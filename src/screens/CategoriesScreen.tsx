import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { List, Surface, Text } from "react-native-paper";

const CATS = [
  { name: "Vehículos", icon: "car" },
  { name: "Alquileres", icon: "home-city" },
  { name: "Ropa de mujer", icon: "tshirt-crew" },
  { name: "Ropa de hombre", icon: "tshirt-v" },
  { name: "Muebles", icon: "sofa" },
  { name: "Electrónica", icon: "cellphone" },
  { name: "Antigüedades y colección", icon: "basket" },
  { name: "Arte y manualidades", icon: "palette" },
  { name: "Autopartes", icon: "cog" },
];

export default function CategoriesScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      {/* Glows decorativos */}
      <View style={styles.bgTopGlow} />
      <View style={styles.bgBottomGlow} />

      <FlatList
        data={CATS}
        keyExtractor={(it) => it.name}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Categorías</Text>
            <Text style={styles.subtitle}>
              Elige una categoría para filtrar publicaciones
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              navigation.navigate("Listings", { categoryName: item.name })
            }
          >
            <Surface style={styles.card} elevation={0}>
              <List.Item
                title={item.name}
                titleStyle={styles.cardTitle}
                left={(props) => (
                  <List.Icon
                    {...props}
                    icon={item.icon}
                    color="#2FA8FF"
                  />
                )}
                right={(props) => (
                  <List.Icon
                    {...props}
                    icon="chevron-right"
                    color="rgba(234,242,255,0.6)"
                  />
                )}
              />
            </Surface>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070C16",
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  /* ===== Glows ===== */
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

  /* ===== Header ===== */
  header: {
    marginTop: 20,
    marginBottom: 16,
  },
  title: {
    color: "#EAF2FF",
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    color: "rgba(234,242,255,0.65)",
    fontSize: 13,
    marginTop: 6,
  },

  /* ===== Cards ===== */
  card: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: "rgba(10, 18, 34, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(140,165,210,0.18)",
  },

  cardTitle: {
    color: "#EAF2FF",
    fontWeight: "700",
    fontSize: 15,
  },
});
