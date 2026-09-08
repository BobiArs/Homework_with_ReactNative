import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from "../../components/Header";
import { TodoForm } from "../../components/TodoForm";
import { TodoList } from "../../components/TodoList";
import { useTheme } from "../../context/ThemeContext";

export default function IndexScreen() {
  const { colors } = useTheme();
  // Реактивне отримання списку завдань
  const todos = useQuery(api.todos.getTodos);

  // Мутації
  const addTodo = useMutation(api.todos.createTodo);
  const toggleTodo = useMutation(api.todos.toggleTodo);
  const updateTodo = useMutation(api.todos.updateTodo);
  const deleteTodo = useMutation(api.todos.deleteTodo);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bg }]}
      edges={["top"]}
    >
      <Header
        totalCount={todos?.length ?? 0}
        completedCount={todos?.filter((t) => t.isCompleted).length ?? 0}
      />

      <TodoForm
        onAdd={async (text) => {
          await addTodo({ text });
        }}
      />

      {/* Обробка стану завантаження */}
      {todos === undefined ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Синхронізація з Convex...
          </Text>
        </View>
      ) : (
        <TodoList
          todos={todos}
          onToggle={async (id) => {
            await toggleTodo({ id: id as any });
          }}
          onDelete={async (id) => {
            await deleteTodo({ id: id as any });
          }}
          onEdit={async (id, text) => {
            await updateTodo({ id: id as any, text });
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    padding: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 24,
    paddingHorizontal: 20,
    width: "100%",
    maxWidth: 600,
    flex: 1,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 25,
    elevation: 5,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },
  listWrapper: {
    flex: 1,
  },
  centerContainer: { flex: 1, justifyContent: "center" },
});
