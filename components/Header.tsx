import { StyleSheet, Text, View } from "react-native";

interface HeaderProps {
  totalCount: number;
  completedCount: number;
}

export function Header({ totalCount, completedCount }: HeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.titleGroup}>
        <Text style={styles.icon}>📝</Text>
        <Text style={styles.title}>Мій Список Завдань</Text>
      </View>
      <Text style={styles.subtitle}>
        {totalCount > 0
          ? `Виконано ${completedCount} з ${totalCount} завдань`
          : "Додайте своє перше завдання"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 24,
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
  icon: {
    fontSize: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e293b",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: "#64748b",
    fontSize: 14,
    fontWeight: "400",
  },
});
