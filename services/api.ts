import Constants from "expo-constants";
import { Platform } from "react-native";
import type { Todo } from "../types";

const getBaseUrl = (): string => {
  if (Platform.OS === "web") {
    return "http://localhost:3000";
  }

  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;

  if (hostUri) {
    const ip = hostUri.split(":")[0];
    return `http://${ip}:3000`;
  }

  return Platform.OS === "android"
    ? "http://10.0.2.2:3000"
    : "http://localhost:3000";
};

const BASE_URL = getBaseUrl();
const API_URL = `${BASE_URL}/todos`;

export const getTodos = async (): Promise<Todo[]> => {
  const response = await fetch(API_URL);
  if (!response.ok) {
    throw new Error(`Помилка завантаження: ${response.statusText}`);
  }
  return response.json();
};

export const addTodo = async (text: string): Promise<Todo> => {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      completed: false,
      createdAt: Date.now(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Помилка додавання: ${response.statusText}`);
  }
  return response.json();
};

export const toggleTodo = async (
  id: string,
  completed: boolean,
): Promise<Todo> => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completed }),
  });

  if (!response.ok) {
    throw new Error(`Помилка оновлення статусу: ${response.statusText}`);
  }
  return response.json();
};

export const updateTodoText = async (
  id: string,
  text: string,
): Promise<Todo> => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(`Помилка оновлення тексту: ${response.statusText}`);
  }
  return response.json();
};

export const deleteTodo = async (id: string): Promise<void> => {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Помилка видалення: ${response.statusText}`);
  }
};
