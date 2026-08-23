import { Link } from "expo-router";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const Landmarks = [
  {
    id: "1",
    name: "Парк ім. Пушкіна",
    description:
      "Зелений парк у центрі міста, популярне місце для прогулянок та відпочинку.",
  },
  {
    id: "2",
    name: "Краматорська гора",
    description:
      "Природна височина з гарними краєвидами, улюблене місце для туристів та місцевих.",
  },
  {
    id: "3",
    name: "Палац культури та техніки НКМЗ",
    description:
      "Відомий культурний центр міста, де проходять концерти та вистави.",
  },
];

export default function Kramatorsk() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Краматорськ</Text>
        <Image
          source={{ uri: "https://f.discover.ua/photo/3591/wGXuL.jpg" }}
          style={styles.image}
        />

        <View style={styles.description}>
          <Text style={styles.text}>
            Краматорськ — місто на сході України, відоме своєю промисловістю
            та мальовничими краєвидами.
          </Text>
          <Text style={styles.text}>
            Тут мешкає понад 150 тисяч людей, а місто є важливим культурним та
            економічним центром регіону.
          </Text>
          <Text style={styles.text}>
            Особливо подобаються зелені парки та сучасна інфраструктура.
          </Text>
        </View>

        <Text style={styles.subtitle}>Визначні місця:</Text>
        
        <View style={styles.landmarksList}>
          {Landmarks.map((item) => (
            <View key={item.id} style={styles.landmarkCard}>
              <View style={styles.landmarkHeader}>
                <Ionicons name="location-outline" size={20} color="#4F46E5" style={styles.landmarkIcon} />
                <Text style={styles.landmarkName}>{item.name}</Text>
              </View>
              <Text style={styles.landmarkDescription}>{item.description}</Text>
            </View>
          ))}
        </View>

        <Link style={styles.buttonGoBack} href="/">
          ⬅️ На головну
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scroll: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    color: "#4F46E5",
    marginVertical: 12,
  },
  image: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginVertical: 12,
  },
  description: {
    marginVertical: 12,
    gap: 8,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    color: "#475569",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 20,
    marginBottom: 12,
    textAlign: "left",
  },
  landmarksList: {
    width: "100%",
  },
  landmarkCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  landmarkHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  landmarkIcon: {
    marginRight: 6,
  },
  landmarkName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
  },
  landmarkDescription: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
    paddingLeft: 26,
  },
  buttonGoBack: {
    backgroundColor: "#4F46E5",
    paddingVertical: 14,
    borderRadius: 12,
    textAlign: "center",
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 24,
    overflow: "hidden",
  },
});

