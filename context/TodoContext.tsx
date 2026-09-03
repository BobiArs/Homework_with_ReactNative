import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import type { Todo } from "../types";

interface TodoContextType {
  todos: Todo[];
  loading: boolean;
  addTodo: (text: string) => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  editTodo: (id: string, text: string) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  clearCompleted: () => Promise<void>;
  clearAll: () => Promise<void>;
  refreshTodos: () => Promise<void>;
}

const STORAGE_KEY = "@todo_list_storage";

const INITIAL_TODOS: Todo[] = [
  {
    id: "1",
    text: "Ознайомитися з розкладом табів",
    completed: true,
    createdAt: Date.now() - 7200000,
  },
  {
    id: "2",
    text: "Зробити домашнє завдання Todo App 2.0",
    completed: false,
    createdAt: Date.now() - 3600000,
  },
];

const TodoContext = createContext<TodoContextType | undefined>(undefined);

export const TodoProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  const saveTodos = async (newTodos: Todo[]) => {
    setTodos(newTodos);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newTodos));
  };

  const loadTodos = async () => {
    setLoading(true);
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        setTodos(JSON.parse(data));
      } else {
        await saveTodos(INITIAL_TODOS);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTodos();
  }, []);

  const addTodo = (text: string) =>
    saveTodos([
      {
        id: Date.now().toString(),
        text,
        completed: false,
        createdAt: Date.now(),
      },
      ...todos,
    ]);

  const toggleTodo = (id: string) =>
    saveTodos(
      todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    );

  const editTodo = (id: string, text: string) =>
    saveTodos(todos.map((t) => (t.id === id ? { ...t, text } : t)));

  const deleteTodo = (id: string) =>
    saveTodos(todos.filter((t) => t.id !== id));

  const clearCompleted = () => saveTodos(todos.filter((t) => !t.completed));

  const clearAll = () => saveTodos([]);

  return (
    <TodoContext.Provider
      value={{
        todos,
        loading,
        addTodo,
        toggleTodo,
        editTodo,
        deleteTodo,
        clearCompleted,
        clearAll,
        refreshTodos: loadTodos,
      }}
    >
      {children}
    </TodoContext.Provider>
  );
};

export const useTodos = () => {
  const ctx = useContext(TodoContext);
  if (!ctx) throw new Error("useTodos must be used within TodoProvider");
  return ctx;
};
