# Інструкція з перенесення проєкту "Todo App" з React (Web) на React Native (Expo)

Цей посібник містить детальний опис спрощеної міграції додатку списку завдань (Todo App) з веб-версії на React (Vite) у мобільний додаток на React Native (Expo Router) з підключенням до REST API `json-server`.

---

---

## 1. Порівняльний аналіз: Web vs React Native

| Елемент              | React Web (`todo-react`)                      | React Native (`rn-todo-list`)                      | Пояснення                                                             |
| :------------------- | :-------------------------------------------- | :------------------------------------------------- | :-------------------------------------------------------------------- |
| **Контейнери**       | `<div>`, `<header>`, `<form>`, `<ul>`, `<li>` | `<View>`, `<SafeAreaView>`                         | Усі блоки замінюються на нативні компоненти `View` або `SafeAreaView` |
| **Текст**            | `<h1>`, `<p>`, `<span>`, `<strong>`           | `<Text>`                                           | Текст обов'язково має бути обгорнутий у `<Text>`                      |
| **Поле вводу**       | `<input type="text">`                         | `<TextInput>`                                      | Підтримує `placeholderTextColor`, `onSubmitEditing`, `returnKeyType`  |
| **Кнопки**           | `<button onClick={...}>`                      | `<TouchableOpacity onPress={...}>` / `<Pressable>` | Надають нативний зворотний зв'язок при дотику                         |
| **Списки**           | `<ul>` + `todos.map(...)`                     | `<FlatList>`                                       | Оптимізований рендеринг елементів списку з віртуалізацією             |
| **Оновлення списку** | Кнопка ручного оновлення                      | `<RefreshControl>`                                 | Підтримка нативного жесту **Pull-to-Refresh** (потягнути вниз)        |
| **Клавіатура**       | Стандартна поведінка браузера                 | `<KeyboardAvoidingView>`, `Keyboard.dismiss()`     | Запобігання перекриттю інтерфейсу віртуальною клавіатурою             |
| **Стилізація**       | CSS класи (`.css`, `className`)               | `StyleSheet.create()`                              | Об'єктний підхід до стилів                                            |

---

## 2. Особливості роботи з мережею на мобільних пристроях

При роботі з локальним сервером `json-server` (порт 3000):

- **Web / iOS Simulator**: локальна адреса — `http://localhost:3000`.
- **Android (Emulator / Фізичний пристрій)**: автоматично витягуємо IP комп'ютера з конфігурації Metro Bundler через `Constants.expoConfig?.hostUri` (наприклад, `http://192.168.0.105:3000` або `http://10.0.2.2:3000`).

---

## Крок 1: Ініціалізація та структура проєкту Expo

### Підсумкова файлова структура

```
rn-todo-list/
├── app/
│   ├── _layout.tsx      # Кореневий layout навігації
│   └── index.tsx        # Головний екран списку завдань
├── components/
│   ├── Header.tsx       # Заголовок та лічильник
│   ├── TodoForm.tsx     # Форма введення завдання
│   ├── TodoItem.tsx     # Окреме завдання (чекбокс, редагування, видалення)
│   └── TodoList.tsx     # FlatList списку завдань з Pull-to-Refresh
├── services/
│   └── api.ts           # Сервіс HTTP-запитів до json-server
├── types/
│   └── index.ts         # TypeScript типи
├── tsconfig.json
└── package.json
```

---

## Крок 2: Перенесення типів (TypeScript)

Файл `types/index.ts`:

## Крок 3: Створення сервісу API

Файл `services/api.ts`:

```typescript
import Constants from "expo-constants";
import { Platform } from "react-native";
import type { Todo } from "@/types";

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
```

---

## Крок 4: Адаптація UI-компонентів

### 4.1 Компонент `Header`

Файл `components/Header.tsx`:

```tsx
import { StyleSheet, Text, View } from "react-native";

interface HeaderProps {
  totalCount: number;
  completedCount: number;
}

export function Header({ totalCount, completedCount }: HeaderProps) {
  return ();
}

const styles = StyleSheet.create({});
```

---

### 4.2 Компонент `TodoForm`

Файл `components/TodoForm.tsx`:

```tsx
import { useState } from "react";
import {
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface TodoFormProps {
  onAdd: (text: string) => Promise<void>;
  loading: boolean;
}

export function TodoForm({ onAdd, loading }: TodoFormProps) {

  const handleSubmit = async () => {
    try {
      Keyboard.dismiss(); // Закриває клавіатуру
    } finally {
    }
  };

  return ();
}

const styles = StyleSheet.create({});
```

---

### 4.3 Компонент `TodoItem`

Файл `components/TodoItem.tsx`:

```tsx
import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { Todo } from "@/types";

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string, completed: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEdit: (id: string, text: string) => Promise<void>;
}

export function TodoItem({ todo, onToggle, onDelete, onEdit }: TodoItemProps) {

  return ();
}

const styles = StyleSheet.create({});
```

---

### 4.4 Компонент `TodoList`

Файл `components/TodoList.tsx`:

```tsx
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import type { Todo } from "@/types";
import { TodoItem } from "./TodoItem";

interface TodoListProps {
  todos: Todo[];
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  onToggle: (id: string, completed: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEdit: (id: string, text: string) => Promise<void>;
}

export function TodoList({
  todos,
  refreshing,
  onRefresh,
  onToggle,
  onDelete,
  onEdit,
}: TodoListProps) {
  if (todos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          Список завдань порожній. Додайте нове завдання!
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={todos}
      keyExtractor={(item) => item.id}
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
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#6366f1"]}
        />
      }
    />
  );
}

const styles = StyleSheet.create({});
```

---

## Крок 5: Складання головного екрану (`app/index.tsx`)

Файл `app/index.tsx`:

```tsx
import { useState, useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Header } from "@/components/Header";
import { TodoForm } from "@/components/TodoForm";
import { TodoList } from "@/components/TodoList";
import type { Todo } from "@/types";
import {
  getTodos,
  addTodo,
  toggleTodo,
  updateTodoText,
  deleteTodo,
} from "@/services/api";

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
                <Text style={styles.errorTitle}>{"⚠️ Помилка з'єднання"}</Text>
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

const styles = StyleSheet.create({});
```

---

## Крок 6: Налаштування навігації (`app/_layout.tsx`)

Файл `app/_layout.tsx`:

```tsx
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </>
  );
}
```

---

## Крок 7: Запуск та тестування

1. **Запуск сервера `json-server` (у першому терміналі):**

   ```bash
   cd ../server
   npm start
   ```

2. **Запуск Expo (у другому терміналі):**

   ```bash
   cd rn-todo-list
   npx expo start
   ```

   - Натисніть `a` для запуску в **Android Emulator**.
   - Натисніть `i` для запуску в **iOS Simulator**.
   - Натисніть `w` для тестування у **веб-версії**.
   - Відскануйте QR-код у додатку **Expo Go** на смартфоні.
