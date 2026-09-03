import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useTodos } from "../../context/TodoContext";

export default function StatsScreen() {
  const { colors } = useTheme();
  const { todos } = useTodos();

  const total = todos.length;
  const completed = todos.filter((t) => t.completed).length;
  const active = total - completed;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Статистика</Text>
          <Text style={{ color: colors.textMuted }}>
            Аналітика продуктивності
          </Text>
        </View>

        <View style={styles.grid}>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons name="list" size={24} color={colors.primary} />
            <Text style={[styles.cardValue, { color: colors.text }]}>
              {total}
            </Text>
            <Text style={{ color: colors.textMuted }}>Всього завдань</Text>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons name="time-outline" size={24} color="#f59e0b" />
            <Text style={[styles.cardValue, { color: colors.text }]}>
              {active}
            </Text>
            <Text style={{ color: colors.textMuted }}>В процесі</Text>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={24}
              color={colors.success}
            />
            <Text style={[styles.cardValue, { color: colors.text }]}>
              {completed}
            </Text>
            <Text style={{ color: colors.textMuted }}>Виконано</Text>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons name="analytics-outline" size={24} color="#8b5cf6" />
            <Text style={[styles.cardValue, { color: colors.text }]}>
              {percentage}%
            </Text>
            <Text style={{ color: colors.textMuted }}>Прогрес</Text>
          </View>
        </View>

        <View
          style={[
            styles.progressCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.progressTitle, { color: colors.text }]}>
            Прогрес виконання: {percentage}%
          </Text>
          <View style={[styles.barBg, { backgroundColor: colors.cardBg }]}>
            <View
              style={[
                styles.barFill,
                { backgroundColor: colors.primary, width: `${percentage}%` },
              ]}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { padding: 20, alignItems: "center" },
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
});
