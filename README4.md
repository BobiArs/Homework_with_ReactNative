# Практичне завдання: Todo App 3.0 — Інтеграція хмарного бекенду Convex та Real-Time синхронізація

У цьому практичному завданні ви переведете свій мобільний додаток (**`rn-todo-list`**) з локального збереження (`AsyncStorage` / `json-server`) на сучасний **хмарний реактивний бекенд Convex**. 

Ви навчитеся проектувати серверні схеми на чистому TypeScript, писати серверні функції (Queries та Mutations), підключати `ConvexProvider` у React Native та працювати з автоматичною **Real-Time синхронізацією даних**.

---

## 🎯 Мета завдання

1. **Встановити та ініціалізувати Convex** у проєкті `rn-todo-list`.
2. **Описати схему бази даних (`convex/schema.ts`)** для таблиці `todos` із валідацією полів (`text`, `isCompleted`, `createdAt`) та індексами.
3. **Створити серверні функції (`convex/todos.ts`)**:
   - `getTodos` (`query`) — отримання списку завдань із сортуванням у реальному часі.
   - `getStats` (`query`) — розрахунок аналітики продуктивності на стороні бекенду.
   - `createTodo` (`mutation`) — додавання нового завдання з валідацією.
   - `toggleTodo` (`mutation`) — перемикання статусу виконання.
   - `updateTodo` (`mutation`) — редагування тексту завдання.
   - `deleteTodo` (`mutation`) — видалення окремого завдання.
   - `clearCompleted` (`mutation`) — видалення всіх завершених завдань.
   - `clearAll` (`mutation`) — повне очищення списку.
4. **Підключити `ConvexProvider`** у кореневому макеті (`app/_layout.tsx`).
5. **Оновити інтерфейс вкладок додатку**:
   - 📝 **`app/(tabs)/index.tsx`**: замінити локальний стейт на хуки `useQuery(api.todos.getTodos)` та `useMutation`.
   - 📊 **`app/(tabs)/stats.tsx`**: підключити реактивні показники, які миттєво оновлюються при зміні завдань.
   - ⚙️ **`app/(tabs)/settings.tsx`**: підключити виклик мутацій масового очищення.
6. **Позбутися застарілого коду**: видалити `TodoContext.tsx` або старий `services/api.ts`, оскільки Convex бере на себе функції глобального менеджера стану та мережевого шару.

---

## 📁 Очікувана структура проєкту

```text
rn-todo-list/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx        # Конфігурація таб-бару (іконки, кольори, підписи)
│   │   ├── index.tsx          # 📝 Вкладка 1: Список завдань (useQuery, useMutation)
│   │   ├── stats.tsx          # 📊 Вкладка 2: Статистика (useQuery(api.todos.getStats))
│   │   └── settings.tsx       # ⚙️ Вкладка 3: Налаштування (тема + очищення Convex)
│   └── _layout.tsx            # Кореневий макет (ConvexProvider + ThemeProvider)
├── components/
│   ├── Header.tsx             # Заголовок та лічильник
│   ├── TodoForm.tsx           # Форма створення нового завдання
│   ├── TodoItem.tsx           # Окремий елемент завдання (useMutation для toggle/delete)
│   └── TodoList.tsx           # FlatList зі статусами завантаження (ActivityIndicator)
├── context/
│   └── ThemeContext.tsx       # Контекст тем (Light/Dark + AsyncStorage для налаштувань теми)
├── convex/                    # 🚀 Хмарний бекенд Convex
│   ├── _generated/            # Автогенеровані типи Convex (створюються автоматично)
│   ├── schema.ts              # Схема бази даних (defineSchema, defineTable)
│   └── todos.ts               # Серверні Queries та Mutations
├── types/
│   └── index.ts               # Типи TypeScript (ThemeColors тощо)
├── .env                       # Змінні оточення (EXPO_PUBLIC_CONVEX_URL)
├── app.json
├── package.json
└── tsconfig.json
```

---

## 📋 Покроковий план виконання

### Крок 1: Встановлення пакету Convex та запуск деплою

1. У корені проєкту `rn-todo-list` встановіть клієнтську бібліотеку:

   ```bash
   npm install convex
   ```

2. Запустіть ініціалізацію Convex у режимі розробки:

   ```bash
   npx convex dev
   ```

   > **Що потрібно зробити в консолі:**
   > 1. Авторизуйтеся у браузері через GitHub або Email.
   > 2. Оберіть **"Create a new project"** та назвіть його `rn-todo-list`.
   > 3. Команда створить папку `convex/` та згенерує службові типи `convex/_generated/`.
   > 4. Залиште цей термінал працювати у фоні для автоматичної компіляції та синхронізації змін.

---

### Крок 2: Налаштування змінних оточення (`.env`)

Створіть або відредагуйте файл `.env` у кореневій папці проєкту:

```env
EXPO_PUBLIC_CONVEX_URL=https://your-deployment-name.convex.cloud
```

> [!IMPORTANT]
> - Замініть URL на ваше персональне посилання (його виведе команда `npx convex dev` або ви знайдете його у `.env.local`).
> - Префікс **`EXPO_PUBLIC_`** є обов'язковим для того, щоб Expo передав змінну у клієнтський бандл.
> - Якщо додаток не бачить змінну — перезапустіть Expo з очищенням кешу: `npx expo start -c`.

---

### Крок 3: Створення схеми бази даних (`convex/schema.ts`)

Створіть файл `convex/schema.ts` для суворої типізації таблиці `todos`:

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  todos: defineTable({
    text: v.string(),
    isCompleted: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_creation_time", ["createdAt"])
    .index("by_completion", ["isCompleted"]),
});
```

#### Пояснення:
- `defineSchema` — реєструє загальну схему бази даних.
- `defineTable` — визначає структуру таблиці та типи кожного поля.
- `v.string()`, `v.boolean()`, `v.number()` — вбудовані валідатори даних.
- `.index(...)` — створює індекси для оптимізації сортування та фільтрації.

---

### Крок 4: Створення бекенд-функцій (`convex/todos.ts`)

Створіть файл `convex/todos.ts` із повним набором CRUD-операцій:

```typescript
import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";

// 1. Отримання всіх завдань (від новіших до старіших)
export const getTodos = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("todos")
      .withIndex("by_creation_time")
      .order("desc")
      .collect();
  },
});

// 2. Отримання аналітики продуктивності (для вкладки Статистика)
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const allTodos = await ctx.db.query("todos").collect();
    const total = allTodos.length;
    const completed = allTodos.filter((t) => t.isCompleted).length;
    const active = total - completed;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    return {
      total,
      completed,
      active,
      percentage,
    };
  },
});

// 3. Створення нового завдання
export const createTodo = mutation({
  args: {
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const trimmedText = args.text.trim();
    if (trimmedText.length === 0) {
      throw new ConvexError("Текст завдання не може бути порожнім");
    }

    return await ctx.db.insert("todos", {
      text: trimmedText,
      isCompleted: false,
      createdAt: Date.now(),
    });
  },
});

// 4. Перемикання статусу виконання
export const toggleTodo = mutation({
  args: {
    id: v.id("todos"),
  },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.id);
    if (!todo) {
      throw new ConvexError("Завдання не знайдено");
    }

    await ctx.db.patch(args.id, {
      isCompleted: !todo.isCompleted,
    });
  },
});

// 5. Оновлення тексту завдання
export const updateTodo = mutation({
  args: {
    id: v.id("todos"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const trimmed = args.text.trim();
    if (trimmed.length === 0) {
      throw new ConvexError("Текст завдання не може бути порожнім");
    }

    await ctx.db.patch(args.id, {
      text: trimmed,
    });
  },
});

// 6. Видалення одного завдання
export const deleteTodo = mutation({
  args: {
    id: v.id("todos"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// 7. Видалення всіх завершених завдань
export const clearCompleted = mutation({
  args: {},
  handler: async (ctx) => {
    const completedTodos = await ctx.db
      .query("todos")
      .withIndex("by_completion", (q) => q.eq("isCompleted", true))
      .collect();

    for (const todo of completedTodos) {
      await ctx.db.delete(todo._id);
    }

    return { deletedCount: completedTodos.length };
  },
});

// 8. Видалення абсолютно всіх завдань
export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("todos").collect();
    for (const todo of all) {
      await ctx.db.delete(todo._id);
    }
    return { deletedCount: all.length };
  },
});
```

---

### Крок 5: Підключення `ConvexProvider` у `app/_layout.tsx`

Оновіть кореневий макет `app/_layout.tsx`:

```tsx
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";

// Створення клієнта Convex
const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false, // Вимикаємо веб-попередження для React Native
});

function RootNavigator() {
  const { isDarkMode } = useTheme();

  return (
    <>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ConvexProvider client={convex}>
        <ThemeProvider>
          <RootNavigator />
        </ThemeProvider>
      </ConvexProvider>
    </SafeAreaProvider>
  );
}
```

---

### Крок 6: Оновлення екрану списку завдань `app/(tabs)/index.tsx`

Переведіть екран завдань на використання хуків `useQuery` та `useMutation`:

```tsx
import React from "react";
import { View, StyleSheet, ActivityIndicator, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useTheme } from "@/context/ThemeContext";

import Header from "@/components/Header";
import TodoForm from "@/components/TodoForm";
import TodoList from "@/components/TodoList";

export default function TodosScreen() {
  const { colors } = useTheme();

  // Реактивне отримання списку завдань
  const todos = useQuery(api.todos.getTodos);

  // Мутації
  const addTodo = useMutation(api.todos.createTodo);
  const toggleTodo = useMutation(api.todos.toggleTodo);
  const deleteTodo = useMutation(api.todos.deleteTodo);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]}>
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
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 14 },
});
```

---

### Крок 7: Оновлення екрану статистики `app/(tabs)/stats.tsx`

Підключіть функцію `api.todos.getStats` за допомогою хука `useQuery`:

```tsx
import React from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useTheme } from "@/context/ThemeContext";

export default function StatsScreen() {
  const { colors } = useTheme();

  // Реактивна статистика з Convex
  const stats = useQuery(api.todos.getStats);

  if (stats === undefined) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>📊 Статистика</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Аналітика завдань у реальному часі
        </Text>

        <View style={styles.grid}>
          {/* Картка 1: Всього */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="list" size={28} color={colors.primary} />
            <Text style={[styles.cardValue, { color: colors.text }]}>{stats.total}</Text>
            <Text style={[styles.cardLabel, { color: colors.textMuted }]}>Всього завдань</Text>
          </View>

          {/* Картка 2: Активні */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="time" size={28} color="#F59E0B" />
            <Text style={[styles.cardValue, { color: colors.text }]}>{stats.active}</Text>
            <Text style={[styles.cardLabel, { color: colors.textMuted }]}>В процесі</Text>
          </View>

          {/* Картка 3: Виконані */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="checkmark-done-circle" size={28} color={colors.success} />
            <Text style={[styles.cardValue, { color: colors.text }]}>{stats.completed}</Text>
            <Text style={[styles.cardLabel, { color: colors.textMuted }]}>Виконано</Text>
          </View>

          {/* Картка 4: Відсоток */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="trending-up" size={28} color="#8B5CF6" />
            <Text style={[styles.cardValue, { color: colors.text }]}>{stats.percentage}%</Text>
            <Text style={[styles.cardLabel, { color: colors.textMuted }]}>Прогрес</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "bold" },
  subtitle: { fontSize: 14, marginTop: 4, marginBottom: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    width: "48%",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 6,
  },
  cardValue: { fontSize: 24, fontWeight: "bold" },
  cardLabel: { fontSize: 13 },
});
```

---

### Крок 8: Оновлення екрану налаштувань `app/(tabs)/settings.tsx`

Підключіть мутації очищення до кнопок у налаштуваннях:

```tsx
import React from "react";
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useTheme } from "@/context/ThemeContext";

export default function SettingsScreen() {
  const { isDarkMode, toggleTheme, colors } = useTheme();

  // Мутації Convex
  const clearCompleted = useMutation(api.todos.clearCompleted);
  const clearAll = useMutation(api.todos.clearAll);

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
      ]
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
            Alert.alert("Успішно", `Базу очищено. Видалено ${res.deletedCount} завдань`);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>⚙️ Налаштування</Text>

        {/* Секція теми */}
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>ОФОРМЛЕННЯ</Text>
        <View style={[styles.rowCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.rowLeft}>
            <Ionicons
              name={isDarkMode ? "moon" : "sunny"}
              size={22}
              color={isDarkMode ? "#A78BFA" : "#F59E0B"}
            />
            <Text style={[styles.rowText, { color: colors.text }]}>Темна тема</Text>
          </View>
          <Switch value={isDarkMode} onValueChange={toggleTheme} />
        </View>

        {/* Секція керування даними Convex */}
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>КЕРУВАННЯ ХМАРОЮ CONVEX</Text>
        
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={handleClearCompleted}
        >
          <Ionicons name="checkmark-done" size={20} color="#F59E0B" />
          <Text style={[styles.actionButtonText, { color: colors.text }]}>Видалити виконані завдання</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.dangerButton, { backgroundColor: colors.surface, borderColor: colors.danger }]}
          onPress={handleClearAll}
        >
          <Ionicons name="trash" size={20} color={colors.danger} />
          <Text style={[styles.actionButtonText, { color: colors.danger }]}>Видалити абсолютно всі завдання</Text>
        </TouchableOpacity>

        {/* Інфо */}
        <Text style={[styles.versionText, { color: colors.textMuted }]}>
          Todo App v3.0 (Convex Cloud Edition)
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 20 },
  sectionHeader: { fontSize: 12, fontWeight: "bold", marginTop: 16, marginBottom: 8, letterSpacing: 0.5 },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowText: { fontSize: 16, fontWeight: "500" },
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
  actionButtonText: { fontSize: 15, fontWeight: "500" },
  versionText: { textAlign: "center", marginTop: 32, fontSize: 12 },
});
```

---

### Крок 9: Видалення застарілого коду

Видаліть файли `services/api.ts` або `context/TodoContext.tsx`, якщо вони раніше використовувалися.
Зверніть увагу: `ThemeContext.tsx` залишається, оскільки налаштування локальної теми (Світла/Темна) зберігаються на самому пристрої через `AsyncStorage`.

---

## ⚡ Як протестувати Real-Time магію Convex

1. Відкрийте ваш мобільний додаток у симуляторі/телефоні (`npx expo start`).
2. Відкрийте панель керування Convex Dashboard:
   ```bash
   npx convex dashboard
   ```
3. Додайте або видаліть завдання безпосередньо у веб-інтерфейсі Dashboard або відкрийте додаток у двох вікнах (наприклад, iOS Simulator + Android або Web).
4. **Зверніть увагу:** екран завдань та лічильники на екрані статистики на телефоні оновлюються **миттєво в реальному часі** без ручного оновлення екрану!

---

## 💯 Критерії оцінювання (100 балів)

| Критерій | Бали | Опис |
| :--- | :---: | :--- |
| **1. Ініціалізація та конфігурація Convex** | **20 б.** | Встановлено `convex`, налаштовано `EXPO_PUBLIC_CONVEX_URL` у `.env`, підключено `ConvexProvider` у `app/_layout.tsx`. |
| **2. Схема бази даних (`convex/schema.ts`)** | **15 б.** | Описано таблицю `todos` з валідацією типів `v.*` та індексами `by_creation_time` і `by_completion`. |
| **3. Серверні функції (`convex/todos.ts`)** | **25 б.** | Реалізовано всі необхідні queries (`getTodos`, `getStats`) та mutations (`createTodo`, `toggleTodo`, `deleteTodo`, `clearCompleted`, `clearAll`). |
| **4. Реактивний список завдань** | **20 б.** | Головний екран працює через `useQuery` та `useMutation`, коректно відображається лоадер під час початкового завантаження. |
| **5. Екрани Статистики та Налаштувань** | **15 б.** | Екран статистики автоматично перераховує дані через `getStats`, налаштування успішно викликають мутації масового очищення. |
| **6. Якість коду, типізація та збереження теми** | **5 б.** | Відсутність помилок TypeScript, збережено функціонал зміни теми (`ThemeContext`). |
| **РАЗОМ** | **100 б.** | |

---

## 📦 Формат здачі завдання

1. Завантажте оновлений проєкт `rn-todo-list` у свій GitHub-репозиторій.
2. Додайте у `README.md` скріншоти або коротку GIF/відео-демонстрацію роботи додатку (додавання завдання, миттєве оновлення статистики, масове видалення).
3. Надішліть посилання на репозиторій на перевірку.
