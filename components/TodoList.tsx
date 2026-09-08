import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../context/ThemeContext";
import type { Todo } from "../types";
import { TodoItem } from "./TodoItem";

interface TodoListProps {
  todos: Todo[];
  refreshing?: boolean;
  onRefresh?: () => Promise<void>;
  onToggle: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEdit: (id: string, text: string) => Promise<void>;
}

export function TodoList({
  todos,
  refreshing = false,
  onRefresh,
  onToggle,
  onDelete,
  onEdit,
}: TodoListProps) {
  const { colors } = useTheme();

  if (todos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          Список завдань порожній. Додайте нове завдання!
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={todos}
      keyExtractor={(item) => item._id ?? item.id ?? String(item.createdAt)}
      renderItem={({ item }) => (
        <TodoItem
          todo={item}
          onToggle={onToggle}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      )}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    paddingVertical: 36,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
  },
  list: {
    width: "100%",
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
    width: "100%",
  },
});
