import type { Todo } from "@/types";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Header } from "../components/Header";
import { TodoForm } from "../components/TodoForm";
import { TodoList } from "../components/TodoList";
import {
  addTodo,
  deleteTodo,
  getTodos,
  toggleTodo,
  updateTodoText,
} from "../services/api";

export default function Index() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTodos = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const data = await getTodos();
      setTodos(data);
    } catch (err) {
      setError(
        "Не вдалося з'єднатися з сервером. Переконайтеся, що json-server запущено (порт 3000).",
      );
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const handleAdd = async (text: string) => {
    try {
      const newTodo = await addTodo(text);
      setTodos((prev) => [...prev, newTodo]);
    } catch (err) {
      Alert.alert("Помилка", "Не вдалося створити завдання.");
      console.error(err);
    }
  };

  const handleToggle = async (id: string, completed: boolean) => {
    try {
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed } : t)),
      );
      await toggleTodo(id, completed);
    } catch (err) {
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: !completed } : t)),
      );
      Alert.alert("Помилка", "Не вдалося оновити статус завдання.");
      console.error(err);
    }
  };

  const handleEdit = async (id: string, text: string) => {
    try {
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, text } : t)));
      await updateTodoText(id, text);
    } catch (err) {
      fetchTodos();
      Alert.alert("Помилка", "Не вдалося оновити текст завдання.");
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setTodos((prev) => prev.filter((t) => t.id !== id));
      await deleteTodo(id);
    } catch (err) {
      fetchTodos();
      Alert.alert("Помилка", "Не вдалося видалити завдання.");
      console.error(err);
    }
  };

  const completedCount = useMemo(
    () => todos.filter((t) => t.completed).length,
    [todos],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.card}>
          <Header totalCount={todos.length} completedCount={completedCount} />

          {error && (
            <View style={styles.errorBanner}>
              <View style={styles.errorTextContainer}>
                <Text style={styles.errorTitle}>{"Помилка з'єднання"}</Text>
                <Text style={styles.errorDesc}>{error}</Text>
              </View>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => fetchTodos()}
              >
                <Text style={styles.retryBtnText}>Повторити</Text>
              </TouchableOpacity>
            </View>
          )}

          <TodoForm onAdd={handleAdd} loading={loading} />

          {loading && !refreshing && todos.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366f1" />
              <Text style={styles.loadingText}>Завантаження...</Text>
            </View>
          ) : (
            <View style={styles.listWrapper}>
              <TodoList
                todos={todos}
                refreshing={refreshing}
                onRefresh={() => fetchTodos(true)}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onEdit={handleEdit}
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
    backgroundColor: "#f5f7fb",
  },
  container: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    padding: 16,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
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
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 12,
  },
  errorTextContainer: {
    flex: 1,
  },
  errorTitle: {
    color: "#991b1b",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  errorDesc: {
    color: "#991b1b",
    fontSize: 13,
  },
  retryBtn: {
    backgroundColor: "#dc2626",
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  retryBtnText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 13,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    color: "#64748b",
    fontSize: 14,
    marginTop: 12,
  },
  listWrapper: {
    flex: 1,
  },
});
