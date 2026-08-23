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

// Array of skills with custom icon names
const skills = [
  { id: "1", name: "Python / C++", icon: "code-slash-outline" as const },
  { id: "2", name: "Frontend (React, JS)", icon: "desktop-outline" as const },
  { id: "3", name: "Unity / Unreal Engine", icon: "game-controller-outline" as const },
  { id: "4", name: "SQL / NoSQL бази даних", icon: "server-outline" as const },
  { id: "5", name: "Blender / 3D", icon: "cube-outline" as const },
];

export default function About() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Арсеній</Text>
        
        <Image
          source={{
            uri: "https://avatars.fastly.steamstatic.com/50cfc623e6c02827e8350640ec97d82a5fe3a792_full.jpg",
          }}
          style={styles.avatar}
        />

        <View style={styles.description}>
          <Text style={styles.text}>
            Мені 16 років, я навчаюся в 11 класі та вже 3 роки відвідую Академію
            ШАГ.
          </Text>
          <Text style={styles.text}>
            В ІТ маю певні досягнення і сподіваюся, що вони допоможуть мені у
            майбутньому.
          </Text>
          <Text style={styles.text}>
            Люблю грати в комп’ютерні ігри, кататися на електросамокаті та добре
            проводити час.
          </Text>
          <Text style={styles.text}>
            Хочу вивчати React Native, адже це потужний інструмент мобільної
            розробки, який відкриває багато можливостей для кар’єри.
          </Text>
        </View>

        <Text style={styles.subtitle}>Мої навички та інтереси:</Text>
        
        <View style={styles.skillsList}>
          {skills.map((item) => (
            <View key={item.id} style={styles.skillCard}>
              <Ionicons name={item.icon} size={22} color="#4F46E5" style={styles.skillIcon} />
              <Text style={styles.skillText}>{item.name}</Text>
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
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    color: "#4F46E5",
    marginVertical: 12,
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: "#4F46E5",
    marginVertical: 12,
  },
  description: {
    marginVertical: 12,
    gap: 8,
    width: "100%",
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
    alignSelf: "flex-start",
    width: "100%",
  },
  skillsList: {
    width: "100%",
    gap: 10,
  },
  skillCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  skillIcon: {
    marginRight: 12,
  },
  skillText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  buttonGoBack: {
    backgroundColor: "#4F46E5",
    paddingVertical: 14,
    borderRadius: 12,
    textAlign: "center",
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 24,
    marginBottom: 24,
    width: "100%",
    overflow: "hidden",
  },
});

