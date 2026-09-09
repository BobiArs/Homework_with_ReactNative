# Практичне завдання: Todo App 6.0 — Автентифікація користувачів, Convex Auth та ізоляція персональних даних

У цьому практичному завданні ви інтегруєте повноцінну систему автентифікації у свій мобільний додаток (**`rn-todo-list`**) за допомогою бібліотеки **Convex Auth** (`@convex-dev/auth`).

Кожен користувач матиме власний захищений обліковий запис, персональний список завдань та окрему аналітику продуктивності, повністю ізольовану від інших користувачів у хмарі Convex.

---

## 🎯 Мета завдання

1. **Встановити та ініціалізувати бібліотеку автентифікації**:
   - Встановлення `@convex-dev/auth` та `@auth/core@0.41.1`.
   - Автоматична ініціалізація конфігурації та генерація JWT ключів (`npx @convex-dev/auth`).
2. **Оновити схему бази даних (`convex/schema.ts`)**:
   - Інтегрувати системні таблиці автентифікації (`...authTables`).
   - Прив'язати таблицю `todos` до облікового запису користувача через поле `userId: v.id("users")`.
   - Створити складені індекси для швидкої та безпечної вибірки (`by_user`, `by_user_creation`, `by_user_completion`).
3. **Захистити серверні функції бекенду (`convex/todos.ts` та `convex/users.ts`)**:
   - Використовувати `getAuthUserId(ctx)` для перевірки авторизації у всіх Queries та Mutations.
   - Гарантувати, що користувач може переглядати, створювати, змінювати та видаляти **виключно власні завдання**.
   - Створити запит `currentUser` для отримання профілю активного користувача (ім'я, email).
4. **Організувати захищену навігацію в `app/_layout.tsx`**:
   - Замінити `ConvexProvider` на `ConvexAuthProvider`.
   - Використати умовний рендеринг за допомогою `<AuthLoading>`, `<Unauthenticated>` та `<Authenticated>`.
5. **Створити сучасні екрани входу та реєстрації**:
   - 🔐 **`app/sign-in.tsx`** — форма входу (Email + Пароль) з валідацією, індикатором завантаження та обробкою помилок.
   - 📝 **`app/sign-up.tsx`** — форма реєстрації (Ім'я користувача + Email + Пароль + Підтвердження пароля).
6. **Оновити екран налаштувань (`app/(tabs)/settings.tsx`)**:
   - Додати картку профілю користувача (аватар, ім'я, email).
   - Додати кнопку виходу з акаунта (**Sign Out**) із модальним вікном підтвердження (`Alert.alert`).
7. **Персоналізувати інтерфейс списку справ (`app/(tabs)/index.tsx`)**:
   - Додати привітання з ім'ям авторизованого користувача.

---

## 📁 Очікувана структура проєкту

```text
rn-todo-list/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx        # Конфігурація таб-бару
│   │   ├── index.tsx          # 📝 Вкладка 1: Персональний список справ + привітання
│   │   ├── stats.tsx          # 📊 Вкладка 2: Персональна статистика користувача
│   │   └── settings.tsx       # ⚙️ Вкладка 3: Налаштування + Профіль користувача + Sign Out
│   ├── _layout.tsx            # Кореневий макет (ConvexAuthProvider + Auth-навігація)
│   ├── sign-in.tsx            # 🔐 Екран входу (Email + Password)
│   └── sign-up.tsx            # 📝 Екран реєстрації (Name + Email + Password)
├── assets/                    # Іконки та зображення
├── components/                # UI компоненти (Header, TodoForm, TodoItem, TodoList тощо)
├── context/
│   └── ThemeContext.tsx       # Глобальний контекст теми (Light / Dark)
├── convex/                    # 🚀 Хмарний бекенд Convex
│   ├── _generated/            # Автогенеровані типи Convex
│   ├── auth.config.ts         # Конфігурація провайдера автентифікації
│   ├── auth.ts                # Серверний екземпляр convexAuth з Password провайдером
│   ├── http.ts                # HTTP-роутер для маршрутів авторизації
│   ├── schema.ts              # Схема БД (...authTables, todos з userId та індексами)
│   ├── todos.ts               # Захищені Queries та Mutations для завдань
│   ├── tsconfig.json          # TypeScript конфігурація для бекенду Convex
│   └── users.ts               # Запит даних поточного користувача (currentUser)
├── types/
│   └── index.ts               # Типи TypeScript
├── app.config.ts              # Динамічна конфігурація Expo
├── eas.json                   # Профілі збірок EAS
├── .env.local                 # Локальні змінні оточення (EXPO_PUBLIC_CONVEX_URL)
├── package.json
└── tsconfig.json
```

---

## 📋 Покроковий план виконання

### Крок 1: Встановлення бібліотек та автоматична ініціалізація

1. Встановіть необхідні пакети у корені проєкту `rn-todo-list`:

   ```bash
   npm install @convex-dev/auth @auth/core@0.41.1
   npx expo install expo-secure-store
   ```

2. Запустіть автоматичну ініціалізацію Convex Auth:
   ```bash
   npx @convex-dev/auth
   ```

> [!TIP]
> **Що робить команда `npx @convex-dev/auth` автоматично:**
>
> - Автоматично генерує пару RSA-ключів (`JWT_PRIVATE_KEY` та `JWKS`) і зберігає їх у змінних середовища вашого Convex Deployment.
> - Автоматично створює файли `convex/auth.config.ts`, `convex/auth.ts` та `convex/http.ts`.

---

### Крок 2: Перевірка конфігурації провайдера (`convex/auth.ts`)

Переконайтеся, що файл **`convex/auth.ts`** містить підключення провайдера **`Password`**:

```typescript
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});
```

---

### Крок 3: Оновлення схеми бази даних (`convex/schema.ts`)

Відкрийте файл **`convex/schema.ts`** та додайте системні таблиці авторизації `authTables`, а також прив'яжіть завдання до користувача через `userId: v.id("users")`:

```typescript
import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // 1. Системні таблиці авторизації (users, authSessions, authAccounts тощо)
  ...authTables,

  // 2. Таблиця завдань із прив'язкою до користувача
  todos: defineTable({
    userId: v.id("users"),
    text: v.string(),
    isCompleted: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_creation", ["userId", "createdAt"])
    .index("by_user_completion", ["userId", "isCompleted"]),
});
```

#### 💡 Що змінилося у схемі:

- `...authTables` — автоматично створює таблиці `users`, `authSessions`, `authAccounts`, `authVerificationCodes` тощо.
- `userId: v.id("users")` — гарантує, що кожне створене завдання має конкретного власника.
- Складені індекси `by_user_creation` та `by_user_completion` дозволяють миттєво фільтрувати та сортувати завдання саме поточного користувача.

---

### Крок 4: Створення запиту поточного користувача (`convex/users.ts`)

Створіть файл **`convex/users.ts`** для отримання інформації про поточного авторизованого користувача:

```typescript
import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }
    return await ctx.db.get(userId);
  },
});
```

---

### Крок 5: Захист серверних функцій у `convex/todos.ts`

Оновіть файл **`convex/todos.ts`**. Усі функції тепер мають перевіряти `getAuthUserId(ctx)` та виконувати дії виключно над записами поточного користувача:

```typescript
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

// 1. Отримання списку завдань ТІЛЬКИ поточного користувача
export const getTodos = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }

    return await ctx.db
      .query("todos")
      .withIndex("by_user_creation", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

// 2. Персональна статистика продуктивності поточного користувача
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return { total: 0, completed: 0, active: 0, percentage: 0 };
    }

    const userTodos = await ctx.db
      .query("todos")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const total = userTodos.length;
    const completed = userTodos.filter((t) => t.isCompleted).length;
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

// 3. Створення нового завдання з прив'язкою до userId
export const createTodo = mutation({
  args: {
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("Користувач не авторизований");
    }

    const trimmedText = args.text.trim();
    if (trimmedText.length === 0) {
      throw new ConvexError("Текст завдання не може бути порожнім");
    }

    return await ctx.db.insert("todos", {
      userId,
      text: trimmedText,
      isCompleted: false,
      createdAt: Date.now(),
    });
  },
});

// 4. Перемикання статусу виконання (з перевіркою власника)
export const toggleTodo = mutation({
  args: {
    id: v.id("todos"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("Не авторизовано");
    }

    const todo = await ctx.db.get(args.id);
    if (!todo) {
      throw new ConvexError("Завдання не знайдено");
    }

    if (todo.userId !== userId) {
      throw new ConvexError("Немає доступу до зміни цього завдання");
    }

    await ctx.db.patch(args.id, {
      isCompleted: !todo.isCompleted,
    });
  },
});

// 5. Оновлення тексту завдання (з перевіркою власника)
export const updateTodo = mutation({
  args: {
    id: v.id("todos"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("Не авторизовано");
    }

    const todo = await ctx.db.get(args.id);
    if (!todo) {
      throw new ConvexError("Завдання не знайдено");
    }

    if (todo.userId !== userId) {
      throw new ConvexError("Немає доступу до редагування цього завдання");
    }

    const trimmed = args.text.trim();
    if (trimmed.length === 0) {
      throw new ConvexError("Текст завдання не може бути порожнім");
    }

    await ctx.db.patch(args.id, {
      text: trimmed,
    });
  },
});

// 6. Видалення одного завдання (з перевіркою власника)
export const deleteTodo = mutation({
  args: {
    id: v.id("todos"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("Не авторизовано");
    }

    const todo = await ctx.db.get(args.id);
    if (!todo) {
      throw new ConvexError("Завдання не знайдено");
    }

    if (todo.userId !== userId) {
      throw new ConvexError("Немає доступу до видалення цього завдання");
    }

    await ctx.db.delete(args.id);
  },
});

// 7. Видалення всіх завершених завдань поточного користувача
export const clearCompleted = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("Не авторизовано");
    }

    const completedTodos = await ctx.db
      .query("todos")
      .withIndex("by_user_completion", (q) =>
        q.eq("userId", userId).eq("isCompleted", true),
      )
      .collect();

    for (const todo of completedTodos) {
      await ctx.db.delete(todo._id);
    }

    return { deletedCount: completedTodos.length };
  },
});

// 8. Повне очищення списку справ поточного користувача
export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("Не авторизовано");
    }

    const userTodos = await ctx.db
      .query("todos")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const todo of userTodos) {
      await ctx.db.delete(todo._id);
    }

    return { deletedCount: userTodos.length };
  },
});
```

---

### Крок 6: Налаштування `ConvexAuthProvider` та захищеної навігації (`app/_layout.tsx`)

Оновіть кореневий макет **`app/_layout.tsx`**.

> [!IMPORTANT]
> Для збереження токенів авторизації на мобільних пристроях (iOS Keychain / Android Keystore) використовуємо **`expo-secure-store`**. Без адаптера `storage` сесія користувача скидатиметься при кожному перезапуску додатку.

```tsx
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import {
  Authenticated,
  AuthLoading,
  ConvexReactClient,
  Unauthenticated,
} from "convex/react";
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

// Адаптер для збереження токенів сесії у SecureStore
const secureStorage = {
  getItem: SecureStore.getItemAsync,
  setItem: SecureStore.setItemAsync,
  removeItem: SecureStore.deleteItemAsync,
};

function RootNavigator() {
  const { colors, isDarkMode } = useTheme();

  return (
    <>
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      {/* 1. Стан перевірки сесії при запуску додатку */}
      <AuthLoading>
        <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </AuthLoading>

      {/* 2. Неавторизований користувач -> Стек авторизації */}
      <Unauthenticated>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="sign-up" />
        </Stack>
      </Unauthenticated>

      {/* 3. Авторизований користувач -> Основні вкладки додатку */}
      <Authenticated>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="(tabs)" />
        </Stack>
      </Authenticated>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ConvexAuthProvider
          client={convex}
          storage={
            Platform.OS === "android" || Platform.OS === "ios"
              ? secureStorage
              : undefined
          }
        >
          <RootNavigator />
        </ConvexAuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
```

---

### Крок 7: Створення екрану входу (`app/sign-in.tsx`)

Створіть файл **`app/sign-in.tsx`** із красивим фірмовим дизайном, іконками та повною валідацією:

```tsx
import { useTheme } from "@/context/ThemeContext";
import { useAuthActions } from "@convex-dev/auth/react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignInScreen() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const { colors } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Помилка", "Будь ласка, заповніть усі поля");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("email", email.trim().toLowerCase());
      formData.append("password", password);
      formData.append("flow", "signIn");

      await signIn("password", formData);
      // Автоматичне перенаправлення завдяки <Authenticated>
    } catch (error) {
      Alert.alert(
        "Помилка входу",
        "Невірний email або пароль. Спробуйте ще раз.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: colors.primary },
              ]}
            >
              <MaterialIcons
                name="check-circle-outline"
                size={44}
                color="#FFFFFF"
              />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Todo App</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Увійдіть для доступу до своїх завдань
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email Input */}
            <View
              style={[
                styles.inputContainer,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <MaterialIcons
                name="mail-outline"
                size={22}
                color={colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Email адреса"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Password Input */}
            <View
              style={[
                styles.inputContainer,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <MaterialIcons
                name="lock-outline"
                size={22}
                color={colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Пароль"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: colors.primary },
                isLoading && styles.buttonDisabled,
              ]}
              onPress={handleSignIn}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="login" size={20} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Увійти</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer Link */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              Немає облікового запису?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.push("/sign-up")}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>
                Зареєструватися
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: "center",
    marginBottom: 36,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
  },
  button: {
    flexDirection: "row",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 32,
  },
  footerText: {
    fontSize: 15,
  },
  footerLink: {
    fontSize: 15,
    fontWeight: "700",
  },
});
```

---

### Крок 8: Створення екрану реєстрації (`app/sign-up.tsx`)

Створіть файл **`app/sign-up.tsx`** із полями для імені, email, пароля та підтвердження пароля:

```tsx
import { useTheme } from "@/context/ThemeContext";
import { useAuthActions } from "@convex-dev/auth/react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignUpScreen() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const { colors } = useTheme();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Помилка", "Будь ласка, заповніть усі обов'язкові поля");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Помилка", "Введені паролі не співпадають");
      return;
    }

    if (password.length < 8) {
      Alert.alert("Помилка", "Пароль має містити щонайменше 8 символів");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("email", email.trim().toLowerCase());
      formData.append("password", password);
      formData.append("flow", "signUp");

      await signIn("password", formData);
      // Автоматичне перенаправлення завдяки <Authenticated>
    } catch (error) {
      Alert.alert(
        "Помилка реєстрації",
        "Не вдалося створити профіль. Можливо, такий email уже зареєстровано.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: colors.primary },
              ]}
            >
              <MaterialIcons
                name="person-add-alt-1"
                size={40}
                color="#FFFFFF"
              />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              Створення акаунта
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Створіть свій профіль для збереження завдань
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Name Input */}
            <View
              style={[
                styles.inputContainer,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <MaterialIcons
                name="person-outline"
                size={22}
                color={colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Ваше ім'я"
                value={name}
                onChangeText={setName}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Email Input */}
            <View
              style={[
                styles.inputContainer,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <MaterialIcons
                name="mail-outline"
                size={22}
                color={colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Email адреса"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Password Input */}
            <View
              style={[
                styles.inputContainer,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <MaterialIcons
                name="lock-outline"
                size={22}
                color={colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Пароль (мін. 8 символів)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Confirm Password Input */}
            <View
              style={[
                styles.inputContainer,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <MaterialIcons
                name="verified-user"
                size={22}
                color={colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Підтвердження пароля"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: colors.primary },
                isLoading && styles.buttonDisabled,
              ]}
              onPress={handleSignUp}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="how-to-reg" size={20} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Зареєструватися</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer Link */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              Вже маєте обліковий запис?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>
                Увійти
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
  },
  form: {
    gap: 14,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
  },
  button: {
    flexDirection: "row",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 28,
  },
  footerText: {
    fontSize: 15,
  },
  footerLink: {
    fontSize: 15,
    fontWeight: "700",
  },
});
```

---

### Крок 9: Оновлення екрану налаштувань (`app/(tabs)/settings.tsx`)

Додайте на екран налаштувань блок із даними профілю користувача та кнопку виходу з акаунту:

```tsx
import { api } from "@/convex/_generated/api";
import { useTheme } from "@/context/ThemeContext";
import { useAuthActions } from "@convex-dev/auth/react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useMutation, useQuery } from "convex/react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { signOut } = useAuthActions();

  // Отримання даних поточного користувача
  const user = useQuery(api.users.currentUser);

  // Мутації очищення
  const clearCompleted = useMutation(api.todos.clearCompleted);
  const clearAll = useMutation(api.todos.clearAll);

  const handleSignOut = () => {
    Alert.alert("Вихід з облікового запису", "Ви впевнені, що хочете вийти?", [
      { text: "Скасувати", style: "cancel" },
      {
        text: "Вийти",
        style: "destructive",
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  const handleClearCompleted = () => {
    Alert.alert(
      "Видалити завершені",
      "Видалити всі виконані завдання зі свого списку?",
      [
        { text: "Скасувати", style: "cancel" },
        {
          text: "Видалити",
          style: "destructive",
          onPress: async () => {
            const res = await clearCompleted();
            Alert.alert("Успішно", `Видалено завершених: ${res.deletedCount}`);
          },
        },
      ],
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      "Очистити все",
      "Ви впевнені, що хочете видалити абсолютно всі свої завдання?",
      [
        { text: "Скасувати", style: "cancel" },
        {
          text: "Очистити все",
          style: "destructive",
          onPress: async () => {
            const res = await clearAll();
            Alert.alert(
              "Успішно",
              `Список повністю очищено (${res.deletedCount})`,
            );
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bg }]}
      edges={["top"]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          ⚙️ Налаштування
        </Text>

        {/* 1. Блок профілю користувача */}
        <View
          style={[
            styles.card,
            styles.userCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <MaterialIcons name="person" size={32} color="#FFFFFF" />
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>
              {user?.name ?? "Користувач"}
            </Text>
            <Text style={[styles.userEmail, { color: colors.textMuted }]}>
              {user?.email ?? "Завантаження..."}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.signOutIconBtn}
            onPress={handleSignOut}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons
              name="logout"
              size={24}
              color={colors.danger ?? "#EF4444"}
            />
          </TouchableOpacity>
        </View>

        {/* 2. Блок теми оформлення */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <MaterialIcons
                name={isDarkMode ? "dark-mode" : "light-mode"}
                size={24}
                color={colors.primary}
              />
              <Text style={[styles.rowLabel, { color: colors.text }]}>
                Темна тема
              </Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* 3. Керування даними */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
          КЕРУВАННЯ ЗАВДАННЯМИ
        </Text>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleClearCompleted}
          >
            <MaterialIcons name="remove-done" size={22} color="#F59E0B" />
            <Text style={[styles.actionLabel, { color: colors.text }]}>
              Видалити завершені завдання
            </Text>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.actionRow} onPress={handleClearAll}>
            <MaterialIcons
              name="delete-forever"
              size={22}
              color={colors.danger ?? "#EF4444"}
            />
            <Text
              style={[
                styles.actionLabel,
                { color: colors.danger ?? "#EF4444" },
              ]}
            >
              Видалити всі мої завдання
            </Text>
          </TouchableOpacity>
        </View>

        {/* 4. Кнопка виходу */}
        <TouchableOpacity
          style={[
            styles.signOutFullButton,
            { borderColor: colors.danger ?? "#EF4444" },
          ]}
          onPress={handleSignOut}
        >
          <MaterialIcons
            name="logout"
            size={20}
            color={colors.danger ?? "#EF4444"}
          />
          <Text
            style={[
              styles.signOutFullButtonText,
              { color: colors.danger ?? "#EF4444" },
            ]}
          >
            Вийти з акаунта
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.8,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
  },
  signOutIconBtn: {
    padding: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 12,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  signOutFullButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
    marginTop: 24,
  },
  signOutFullButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
```

---

### Крок 10: Оновлення головного екрану `app/(tabs)/index.tsx`

Додайте звернення до поточного користувача у верхній частині екрану:

```tsx
import Header from "@/components/Header";
import TodoForm from "@/components/TodoForm";
import TodoList from "@/components/TodoList";
import { api } from "@/convex/_generated/api";
import { useTheme } from "@/context/ThemeContext";
import { useMutation, useQuery } from "convex/react";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TodosScreen() {
  const { colors } = useTheme();

  // Отримання користувача та завдань
  const user = useQuery(api.users.currentUser);
  const todos = useQuery(api.todos.getTodos);

  // Мутації
  const addTodo = useMutation(api.todos.createTodo);
  const toggleTodo = useMutation(api.todos.toggleTodo);
  const deleteTodo = useMutation(api.todos.deleteTodo);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bg }]}
      edges={["top"]}
    >
      {/* Персональне привітання */}
      <View style={styles.greetingContainer}>
        <Text style={[styles.greetingSubtitle, { color: colors.textMuted }]}>
          З поверненням,
        </Text>
        <Text style={[styles.greetingTitle, { color: colors.text }]}>
          {user?.name ?? "Користувач"} 👋
        </Text>
      </View>

      <Header
        totalCount={todos?.length ?? 0}
        completedCount={todos?.filter((t) => t.isCompleted).length ?? 0}
      />

      <TodoForm
        onAdd={async (text) => {
          await addTodo({ text });
        }}
      />

      {/* Список або завантаження */}
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
  container: {
    flex: 1,
  },
  greetingContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  greetingSubtitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: "800",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
});
```

---

## ⚡ Шпаргалка основних дій

| Дія                          | Метод / Команда                                         | Опис                                              |
| :--------------------------- | :------------------------------------------------------ | :------------------------------------------------ |
| **Авто-налаштування**        | `npx @convex-dev/auth`                                  | Генерує JWT-ключі у хмарі та конфігураційні файли |
| **Реєстрація**               | `signIn("password", formDataWithFlowSignUp)`            | Створює новий запис у `users` та авторизує сесію  |
| **Вхід**                     | `signIn("password", formDataWithFlowSignIn)`            | Перевіряє хеш пароля та створює активну сесію     |
| **Вихід**                    | `signOut()`                                             | Завершує активну сесію та скидає токени           |
| **Поточний юзер на клієнті** | `useQuery(api.users.currentUser)`                       | Повертає об'єкт користувача (`name`, `email`)     |
| **Поточний юзер на бекенді** | `await getAuthUserId(ctx)`                              | Повертає `Id<"users">` або `null`                 |
| **Захист екранів**           | `<Authenticated>`, `<Unauthenticated>`, `<AuthLoading>` | Декларативний захист маршрутів у `_layout.tsx`    |

---

## 💯 Критерії оцінювання (100 балів)

| Критерій                                                         |    Бали    | Опис                                                                                                                                                                                                                                                     |
| :--------------------------------------------------------------- | :--------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Конфігурація Convex Auth та схема бази даних**              | **20 б.**  | Встановлено пакети, виконано ініціалізацію `npx @convex-dev/auth`, налаштовано `auth.ts` з провайдером `Password`. Схема `schema.ts` містить `...authTables` та `userId: v.id("users")` з індексами `by_user`, `by_user_creation`, `by_user_completion`. |
| **2. Захист серверних функцій бекенду (`todos.ts`, `users.ts`)** | **25 б.**  | Усі Queries та Mutations перевіряють `getAuthUserId(ctx)`. Забезпечено повну ізоляцію даних: жоден користувач не бачить і не може редагувати/видалити чужі завдання. Створено запит `currentUser`.                                                       |
| **3. Захищена навігація в `app/_layout.tsx`**                    | **15 б.**  | Підключено `ConvexAuthProvider`. Коректно налаштовано роботу `<AuthLoading>`, `<Unauthenticated>` (стек з `sign-in`, `sign-up`) та `<Authenticated>` (основний стек `(tabs)`).                                                                           |
| **4. Екрани авторизації `sign-in.tsx` та `sign-up.tsx`**         | **20 б.**  | Реалізовано повноцінний UI з полями введення, іконками, валідацією (порожні поля, мінімальна довжина пароля, збіг паролів), індикатором завантаження та викликом `signIn` з відповідним `flow`.                                                          |
| **5. Профіль користувача та Sign Out у Налаштуваннях**           | **15 б.**  | На екрані `settings.tsx` відображаються дані поточного користувача (ім'я, email) та працює кнопка виходу з акаунта з модальним діалогом підтвердження `Alert.alert`.                                                                                     |
| **6. UX, адаптивність тем та персоналізація**                    |  **5 б.**  | Усі нові екрани коректно підтримують світлу/темну тему через `ThemeContext`. На головному екрані відображається персональне привітання користувача.                                                                                                      |
| **РАЗОМ**                                                        | **100 б.** |                                                                                                                                                                                                                                                          |

---

## 📦 Формат здачі завдання

1. Завантажте оновлений код у ваш репозиторій на GitHub.
2. Переконайтеся, що додаток коректно запускається командою `npx expo start` разом із бекендом `npx convex dev`.
3. У файлі `README.md` вашого репозиторію додайте:
   - Короткий опис реалізованої автентифікації.
   - 2-3 скріншоти:
     - Екран входу / реєстрації (`sign-in` / `sign-up`).
     - Головний екран із персональним списком справ та привітанням.
     - Екран налаштувань із карткою профілю користувача.
4. Надішліть посилання на репозиторій на перевірку.
