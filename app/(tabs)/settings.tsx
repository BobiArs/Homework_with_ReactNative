import { useTheme } from "@/context/ThemeContext";
import { api } from "@/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
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

export default function SettingsScreen() {
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { signOut } = useAuthActions();

  // Отримання даних поточного користувача
  const user = useQuery(api.users.currentUser);

  // Мутації очищення
  const clearCompleted = useMutation(api.todos.clearCompleted);
  const clearAll = useMutation(api.todos.clearAll);

  const handleSignOut = () => {
    Alert.alert("Вихід з облікового запису", "Ви впевнені, що хочете вийти?", [
      { text: "Скасувати", style: "cancel" },
      {
        text: "Вийти",
        style: "destructive",
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          ⚙️ Налаштування
        </Text>

        {/* 1. Блок профілю користувача */}
        <View
          style={[
            styles.card,
            styles.userCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <MaterialIcons name="person" size={32} color="#FFFFFF" />
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>
              {user?.name ?? "Користувач"}
            </Text>
            <Text style={[styles.userEmail, { color: colors.textMuted }]}>
              {user?.email ?? "Завантаження..."}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.signOutIconBtn}
            onPress={handleSignOut}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons
              name="logout"
              size={24}
              color={colors.danger ?? "#EF4444"}
            />
          </TouchableOpacity>
        </View>

        {/* 2. Блок теми оформлення */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <MaterialIcons
                name={isDarkMode ? "dark-mode" : "light-mode"}
                size={24}
                color={colors.primary}
              />
              <Text style={[styles.rowLabel, { color: colors.text }]}>
                Темна тема
              </Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* 3. Керування даними */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
          КЕРУВАННЯ ЗАВДАННЯМИ
        </Text>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleClearCompleted}
          >
            <MaterialIcons name="remove-done" size={22} color="#F59E0B" />
            <Text style={[styles.actionLabel, { color: colors.text }]}>
              Видалити завершені завдання
            </Text>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.actionRow} onPress={handleClearAll}>
            <MaterialIcons
              name="delete-forever"
              size={22}
              color={colors.danger ?? "#EF4444"}
            />
            <Text
              style={[
                styles.actionLabel,
                { color: colors.danger ?? "#EF4444" },
              ]}
            >
              Видалити всі мої завдання
            </Text>
          </TouchableOpacity>
        </View>

        {/* 4. Кнопка виходу */}
        <TouchableOpacity
          style={[
            styles.signOutFullButton,
            { borderColor: colors.danger ?? "#EF4444" },
          ]}
          onPress={handleSignOut}
        >
          <MaterialIcons
            name="logout"
            size={20}
            color={colors.danger ?? "#EF4444"}
          />
          <Text
            style={[
              styles.signOutFullButtonText,
              { color: colors.danger ?? "#EF4444" },
            ]}
          >
            Вийти з акаунта
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 20,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
  },
  signOutIconBtn: {
    padding: 8,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 12,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
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
  signOutFullButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
    marginTop: 24,
  },
  signOutFullButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
