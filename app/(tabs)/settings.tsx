import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";

export default function SettingsScreen() {
  const { isDarkMode, toggleTheme, colors } = useTheme();
  // Мутації Convex
  const clearCompleted = useMutation(api.todos.clearCompleted);
  const clearAll = useMutation(api.todos.clearAll);

  const handleClearCompleted = () => {
    Alert.alert(
      "Очистити виконані",
      "Ви впевнені, що хочете видалити всі виконані завдання?",
      [
        { text: "Скасувати", style: "cancel" },
        {
          text: "Видалити",
          style: "destructive",
          onPress: async () => {
            const res = await clearCompleted();
            Alert.alert("Успішно", `Видалено ${res.deletedCount} завдань`);
          },
        },
      ],
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      "Видалити ВСІ завдання",
      "Цю дію неможливо буде скасувати. Видалити всі завдання з хмари?",
      [
        { text: "Скасувати", style: "cancel" },
        {
          text: "Видалити все",
          style: "destructive",
          onPress: async () => {
            const res = await clearAll();
            Alert.alert(
              "Успішно",
              `Базу очищено. Видалено ${res.deletedCount} завдань`,
            );
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bg }]}
      edges={["top"]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          ⚙️ Налаштування
        </Text>

        {/* Секція теми */}
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>
          ОФОРМЛЕННЯ
        </Text>
        <View
          style={[
            styles.rowCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.rowLeft}>
            <Ionicons
              name={isDarkMode ? "moon" : "sunny"}
              size={22}
              color={isDarkMode ? "#A78BFA" : "#F59E0B"}
            />
            <Text style={[styles.rowText, { color: colors.text }]}>
              Темна тема
            </Text>
          </View>
          <Switch value={isDarkMode} onValueChange={toggleTheme} />
        </View>

        {/* Секція керування даними Convex */}
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>
          КЕРУВАННЯ ХМАРОЮ CONVEX
        </Text>

        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          onPress={handleClearCompleted}
        >
          <Ionicons name="checkmark-done" size={20} color="#F59E0B" />
          <Text style={[styles.actionButtonText, { color: colors.text }]}>
            Видалити виконані завдання
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.dangerButton,
            { backgroundColor: colors.surface, borderColor: colors.danger },
          ]}
          onPress={handleClearAll}
        >
          <Ionicons name="trash" size={20} color={colors.danger} />
          <Text style={[styles.actionButtonText, { color: colors.danger }]}>
            Видалити абсолютно всі завдання
          </Text>
        </TouchableOpacity>

        {/* Інфо */}
        <Text style={[styles.versionText, { color: colors.textMuted }]}>
          Todo App v3.0 (Convex Cloud Edition)
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "700" },
  content: { padding: 20, width: "100%", maxWidth: 600 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 6,
  },
  card: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowTitle: { fontSize: 15, fontWeight: "600" },
  divider: { height: 1, width: "100%" },
  actionButtonText: { fontSize: 15, fontWeight: "500" },
  versionText: { textAlign: "center", marginTop: 32, fontSize: 12 },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  dangerButton: {},
  rowText: { fontSize: 16, fontWeight: "500" },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
});
