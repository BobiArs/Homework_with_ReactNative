import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";

export default function StatsScreen() {
  const { colors } = useTheme();
  const stats = useQuery(api.todos.getStats);

  if (stats === undefined) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bg }]}
      edges={["top"]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          📊 Статистика
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Аналітика завдань у реальному часі
        </Text>

        <View style={styles.grid}>
          {/* Картка 1: Всього */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons name="list" size={28} color={colors.primary} />
            <Text style={[styles.cardValue, { color: colors.text }]}>
              {stats.total}
            </Text>
            <Text style={[styles.cardLabel, { color: colors.textMuted }]}>
              Всього завдань
            </Text>
          </View>

          {/* Картка 2: Активні */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons name="time" size={28} color="#F59E0B" />
            <Text style={[styles.cardValue, { color: colors.text }]}>
              {stats.active}
            </Text>
            <Text style={[styles.cardLabel, { color: colors.textMuted }]}>
              В процесі
            </Text>
          </View>

          {/* Картка 3: Виконані */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons
              name="checkmark-done-circle"
              size={28}
              color={colors.success}
            />
            <Text style={[styles.cardValue, { color: colors.text }]}>
              {stats.completed}
            </Text>
            <Text style={[styles.cardLabel, { color: colors.textMuted }]}>
              Виконано
            </Text>
          </View>

          {/* Картка 4: Відсоток */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons name="trending-up" size={28} color="#8B5CF6" />
            <Text style={[styles.cardValue, { color: colors.text }]}>
              {stats.percentage}%
            </Text>
            <Text style={[styles.cardLabel, { color: colors.textMuted }]}>
              Прогрес
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  header: { marginBottom: 20, alignItems: "center" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 4 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    width: "100%",
    maxWidth: 600,
    marginBottom: 20,
  },
  card: { width: "48%", padding: 16, borderRadius: 12, borderWidth: 1 },
  cardValue: { fontSize: 24, fontWeight: "700", marginVertical: 4 },
  progressCard: {
    width: "100%",
    maxWidth: 600,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  progressTitle: { fontSize: 16, fontWeight: "600", marginBottom: 10 },
  barBg: { height: 10, borderRadius: 5, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 5 },
  cardLabel: { fontSize: 13 },
  subtitle: { fontSize: 14, marginTop: 4, marginBottom: 20 },
  content: { padding: 20 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
});
