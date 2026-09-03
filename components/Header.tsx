import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../context/ThemeContext";

interface HeaderProps {
  totalCount: number;
  completedCount: number;
}

export function Header({ totalCount, completedCount }: HeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.header}>
      <View style={styles.titleGroup}>
        <Ionicons name="checkbox" size={30} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>
          Мій Список Завдань
        </Text>
      </View>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        {totalCount > 0
          ? `Виконано ${completedCount} з ${totalCount} завдань`
          : "Додайте своє перше завдання"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  titleGroup: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "400",
  },
});
