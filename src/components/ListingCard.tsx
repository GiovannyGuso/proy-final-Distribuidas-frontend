import { Image, StyleSheet, View } from "react-native";
import { Text, TouchableRipple } from "react-native-paper";

export default function ListingCard({
  item,
  onPress,
}: {
  item: any;
  onPress: () => void;
}) {
  const img = item?.images?.[0]?.url;

  return (
    <TouchableRipple onPress={onPress} rippleColor="rgba(47,168,255,0.15)">
      <View style={styles.card}>
        {/* Imagen */}
        <View style={styles.imageWrap}>
          {img ? (
            <Image
              source={{ uri: img }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={{ opacity: 0.6 }}>Sin imagen</Text>
            </View>
          )}
        </View>

        {/* Contenido */}
        <View style={styles.content}>
          <Text numberOfLines={1} style={styles.title}>
            {item.title ?? "Sin título"}
          </Text>

          <Text style={styles.price}>${item.price ?? 0}</Text>

          {item.city ? (
            <Text numberOfLines={1} style={styles.city}>
              {item.city}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(10, 18, 34, 0.95)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(140,165,210,0.18)",
    overflow: "hidden",
    marginBottom: 12,
  },

  imageWrap: {
    height: 160,
    backgroundColor: "rgba(140,165,210,0.08)",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  content: {
    padding: 12,
    gap: 4,
  },

  title: {
    color: "#EAF2FF",
    fontWeight: "800",
    fontSize: 16,
  },

  price: {
    color: "#2FA8FF",
    fontWeight: "900",
    fontSize: 15,
    marginTop: 2,
  },

  city: {
    color: "rgba(234,242,255,0.65)",
    fontSize: 13,
  },
});
