import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Header } from "../../components/Header";
import { TodoForm } from "../../components/TodoForm";
import { TodoList } from "../../components/TodoList";
import { useTheme } from "../../context/ThemeContext";
import { useTodos } from "../../context/TodoContext";

export default function IndexScreen() {
  const { colors } = useTheme();
  const { todos, loading, addTodo, toggleTodo, editTodo, deleteTodo, refreshTodos } =
    useTodos();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshTodos();
    setRefreshing(false);
  };

  const completedCount = todos.filter((t) => t.completed).length;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Header totalCount={todos.length} completedCount={completedCount} />

          <TodoForm onAdd={addTodo} loading={loading} />

          {loading && !refreshing && todos.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                Завантаження завдань...
              </Text>
            </View>
          ) : (
            <View style={styles.listWrapper}>
              <TodoList
                todos={todos}
                refreshing={refreshing}
                onRefresh={handleRefresh}
                onToggle={toggleTodo}
                onDelete={deleteTodo}
                onEdit={editTodo}
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
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
});
