import { Ionicons } from "@expo/vector-icons";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useTodos } from "../../context/TodoContext";

export default function SettingsScreen() {
  const { isDarkMode, toggleTheme, colors } = useTheme();
  const { clearCompleted, clearAll } = useTodos();

  const handleClearCompleted = () => {
    Alert.alert("Підтвердження", "Видалити всі виконані завдання?", [
      { text: "Скасувати", style: "cancel" },
      { text: "Видалити", style: "destructive", onPress: clearCompleted },
    ]);
  };

  const handleClearAll = () => {
    Alert.alert("Увага!", "Видалити всі завдання?", [
      { text: "Скасувати", style: "cancel" },
      { text: "Видалити все", style: "destructive", onPress: clearAll },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Налаштування
          </Text>
        </View>

        <View style={styles.content}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
            ЗОВНІШНІЙ ВИГЛЯД
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons
                  name={isDarkMode ? "moon" : "sunny"}
                  size={22}
                  color={colors.primary}
                />
                <Text style={[styles.rowTitle, { color: colors.text }]}>
                  {isDarkMode ? "Темна тема" : "Світла тема"}
                </Text>
              </View>
              <Switch value={isDarkMode} onValueChange={toggleTheme} />
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
            КЕРУВАННЯ ДАНИМИ
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <TouchableOpacity style={styles.row} onPress={handleClearCompleted}>
              <View style={styles.rowLeft}>
                <Ionicons
                  name="checkmark-done-outline"
                  size={22}
                  color={colors.primary}
                />
                <Text style={[styles.rowTitle, { color: colors.text }]}>
                  Очистити виконані
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            <View
              style={[styles.divider, { backgroundColor: colors.border }]}
            />

            <TouchableOpacity style={styles.row} onPress={handleClearAll}>
              <View style={styles.rowLeft}>
                <Ionicons
                  name="trash-bin-outline"
                  size={22}
                  color={colors.danger}
                />
                <Text style={[styles.rowTitle, { color: colors.danger }]}>
                  Видалити всі завдання
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
            ПРО ДОДАТОК
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons
                  name="information-circle-outline"
                  size={22}
                  color={colors.primary}
                />
                <Text style={[styles.rowTitle, { color: colors.text }]}>
                  Todo App 2.0
                </Text>
              </View>
              <Text style={{ color: colors.textMuted }}>v2.0.0</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { padding: 20, alignItems: "center" },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "700" },
  content: { width: "100%", maxWidth: 600 },
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
});
