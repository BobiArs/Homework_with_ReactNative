# Інструкція 18: Авторизація через Google (Google OAuth 2.0), Convex Auth, expo-web-browser та Deep Linking 🔐🌐

У цій покроковій інструкції ми реалізуємо функціонал **авторизації через Google (Social Login)** за протоколом **OAuth 2.0** у нашому мобільному додатку на React Native та Expo.

Ви навчитеся:

1. Налаштовувати проект у **Google Cloud Console**, створювати OAuth 2.0 Client ID типу **Web application** та налаштовувати безпечні Callback URL.
2. Конфігурувати середовище бекенду **Convex** за допомогою змінних середовища `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` та `SITE_URL`.
3. Підключати провайдер `@auth/core/providers/google` у `convex/auth.ts`, налаштовувати мапінг профілю (`name`, `email`, `image`) та зворотне перенаправлення `callbacks.redirect`.
4. Налаштовувати механізм **Deep Linking** (`app.config.ts`) та використовувати системне захищене браузерне вікно **`expo-web-browser`** для нативного проходження авторизації.
5. Створювати стильний брендований інтерфейс кнопки «Продовжити з Google» з повною підтримкою світлої та темної тем (`ThemeContext`).
6. Відображати реальну аватарку та ім'я користувача Google у профілі гравця (`app/(tabs)/statistics.tsx`).

---

## 📚 Зміст

1. [Архітектура та життєвий цикл OAuth 2.0 у React Native](#1-архітектура-та-життєвий-цикл-oauth-20-у-react-native)
2. [Крок 1. Створення облікових даних у Google Cloud Console](#крок-1-створення-облікових-даних-у-google-cloud-console)
3. [Крок 2. Налаштування змінних оточення у Convex](#крок-2-налаштування-змінних-оточення-у-convex)
4. [Крок 3. Конфігурація провайдера Google у `convex/auth.ts`](#крок-3-конфігурація-провайдера-google-у-convexauthts)
5. [Крок 4. Налаштування Deep Linking схеми в `app.config.ts`](#крок-4-налаштування-deep-linking-схеми-в-appconfigts)
6. [Крок 5. Реалізація кнопки та логіки входу в `app/sign-in.tsx`](#крок-5-реалізація-кнопки-та-логіки-входу-в-appsign-intsx)
7. [Крок 6. Відображення аватара Google у профілі `app/(tabs)/statistics.tsx`](#крок-6-відображення-аватара-google-у-профілі-apptabsstatisticstsx)
8. [Крок 7. Захист секретних ключів та `.gitignore`](#крок-7-захист-секретних-ключів-та-gitignore)
9. [Повні готові лістинги файлів](#повні-готові-лістинги-файлів)
10. [Тестування та сценарії перевірки](#тестування-та-сценарії-перевірки)
11. [Вирішення типових проблем (Troubleshooting)](#вирішення-типових-проблем-troubleshooting)

---

## 1. Архітектура та життєвий цикл OAuth 2.0 у React Native

### Чому мобільний OAuth відрізняється від класичного веб-сайту?

У звичайному браузерному застосунку користувача просто перенаправляють на сторінку Google через `window.location.href`, а після успішного входу Google повертає користувача на заданий веб-URL.

У **нативному мобільному додатку** (`iOS` та `Android`):

1. **Ізоляція сесій:** Заборонено вбудовувати сторінку входу Google у звичайний WebView з міркувань безпеки (Google блокує запити з вбудованих веб-переглядачів через ризик перехоплення паролів).
2. **Системний браузер:** Необхідно відкривати спеціальну захищену сесію через системний браузер пристрою (Custom Tabs на Android або ASWebAuthenticationSession / SFSafariViewController на iOS). Для цього використовується бібліотека **`expo-web-browser`**.
3. **Deep Linking (Глибокі посилання):** Після підтвердження входу в браузері бекенд Convex надсилає HTTP-відповідь із редиректом на спеціальну схему додатку (наприклад, `tictactoe-dev://?code=...`). Операційна система перехоплює цей лінк, автоматично закриває браузерне вікно та повертає керування у мобільний додаток разом із кодом авторизації.

### Схема послідовності викликів

```
┌─────────────────────────┐
│     Мобільний клієнт    │
│    (app/sign-in.tsx)    │
└────────────┬────────────┘
             │ 1. Натискання кнопки "Продовжити з Google"
             │ 2. redirectTo = Linking.createURL("") -> "tictactoe-dev://"
             │ 3. signIn("google", { redirectTo })
             ▼
┌─────────────────────────┐
│      Бекенд Convex      │
│     (convex/auth.ts)    │
└────────────┬────────────┘
             │ 4. Генерує одноразовий URL авторизації Google із callback_url на Convex
             ▼
┌─────────────────────────┐
│    expo-web-browser     │
│ (Системний браузер OS)  │
└────────────┬────────────┘
             │ 5. Відкривається сторінка вибору акаунта Google
             │ 6. Користувач підтверджує вхід та дозволи
             ▼
┌─────────────────────────┐
│      Google OAuth       │
└────────────┬────────────┘
             │ 7. Редирект на Convex Callback URL:
             │    https://<deployment>.convex.site/api/auth/callback/google?code=...
             ▼
┌─────────────────────────┐
│      Бекенд Convex      │
└────────────┬────────────┘
             │ 8. Обмінює код на Google Access Token / ID Token
             │ 9. Зчитує профіль користувача (sub, email, name, picture)
             │ 10. Створює або оновлює користувача в таблиці `users`
             │ 11. Повертає HTTP 302 Redirect на схему мобільного додатку:
             │     tictactoe-dev://?code=<convex_auth_code>
             ▼
┌─────────────────────────┐
│    expo-web-browser     │
└────────────┬────────────┘
             │ 12. Перехоплює deep link, повертає { type: "success", url }
             ▼
┌─────────────────────────┐
│     Мобільний клієнт    │
└────────────┬────────────┘
             │ 13. Витягує `code` з URL та викликає signIn("google", { code })
             │ 14. ConvexAuthProvider зберігає JWT-сесію у SecureStore
             │ 15. InitialLayout автоматично перемикає екран на /(tabs)
```

---

## Крок 1. Створення облікових даних у Google Cloud Console

> [!IMPORTANT]
> Для роботи зв'язки **React Native + Convex Auth** облікові дані в Google Cloud Console створюються як **Web application** (Веб-додаток), оскільки зворотний виклик (OAuth Callback) обробляє бекенд Convex, а не мобільний клієнт напряму.

1. Перейдіть до [Google Cloud Console](https://console.cloud.google.com/) та увійдіть під своїм Google-акаунтом.
2. Створіть новий проект (наприклад, `TicTacToe-PV521`) або оберіть уже створений.

### 1.1. Налаштування екрана згоди (OAuth consent screen)

1. У бічному меню перейдіть у **APIs & Services** → **OAuth consent screen** (або **Google Auth Platform**).
2. Оберіть тип користувачів: **External** (Зовнішній) та натисніть **Create**.
3. Заповніть обов'язкові поля:
   - **App name**: `TicTacToe Mobile Game`
   - **User support email**: ваша електронна пошта.
   - **Developer contact information**: ваша електронна пошта.
4. На кроці **Scopes** натисніть **Add or Remove Scopes** та оберіть базові доступи:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
5. На кроці **Test users** (якщо додаток перебуває в режимі _Testing_): додайте свою пошту та пошти тестувальників, які входитимуть у гру.
6. Натисніть **Save and Continue**.

### 1.2. Створення OAuth 2.0 Client ID

1. У бічному меню відкрийте **Credentials** → натисніть **+ CREATE CREDENTIALS** → **OAuth client ID**.
2. Вкажіть параметри:
   - **Application type**: **Web application** (Обов'язково!).
   - **Name**: `TicTacToe Convex Web Client`.
   - **Authorized JavaScript origins**:
     Введіть ваш Convex Site URL (без скісної риски в кінці):
     ```text
     https://<YOUR_CONVEX_SITE_URL>
     ```
     _(Наприклад: `https://woozy-ant-227.eu-west-1.convex.site`)_
   - **Authorized redirect URIs**:
     Введіть точну адресу обробника OAuth зворотного виклику:
     ```text
     https://<YOUR_CONVEX_SITE_URL>/api/auth/callback/google
     ```
     _(Наприклад: `https://woozy-ant-227.eu-west-1.convex.site/api/auth/callback/google`)_
3. Натисніть **Create**.
4. Скопіюйте у надійне місце:
   - **Client ID** (вигляду `xxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com`)
   - **Client Secret** (вигляду `GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxxxx`)

---

## Крок 2. Налаштування змінних оточення у Convex

Бібліотека `@convex-dev/auth` автоматично шукає змінні `AUTH_GOOGLE_ID` та `AUTH_GOOGLE_SECRET` на стороні сервера Convex.

Також необхідно задати `SITE_URL` для коректної генерації абсолютних адрес зворотних викликів.

1. Дізнайтеся ваш `CONVEX_SITE_URL`:
   - Відкрийте файл `.env.local` у корені вашого проекту.
   - Знайдіть змінну `EXPO_PUBLIC_CONVEX_URL` (наприклад, `https://woozy-ant-227.eu-west-1.convex.cloud`).
   - Замініть домен `.convex.cloud` на `.convex.site`:
     `https://woozy-ant-227.eu-west-1.convex.site`

2. Встановіть змінні середовища у Convex за допомогою командного рядка:

```bash
npx convex env set AUTH_GOOGLE_ID <ВАШ_CLIENT_ID>
```

```bash
npx convex env set AUTH_GOOGLE_SECRET <ВАШ_CLIENT_SECRET>
```

```bash
npx convex env set SITE_URL https://<YOUR_CONVEX_SITE_URL>
```

3. Перевірте, що змінні збережено успішно:

```bash
npx convex env list
```

Ви повинні побачити у списку:

- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `SITE_URL`

---

## Крок 3. Конфігурація провайдера Google у `convex/auth.ts`

Відкрийте файл `convex/auth.ts`. Додайте провайдер `Google` з бібліотеки `@auth/core/providers/google`.

Налаштуйте:

1. Функцію `profile(params)`: зчитує унікальний ідентифікатор `params.sub`, `email`, ім'я `params.name` та аватарку `image: params.picture`.
2. Функцію зворотного виклику `callbacks.redirect`: дозволяє повернення у мобільний застосунок за динамічною схемою deep link.

```typescript
// convex/auth.ts
import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    // 1. Стандартна авторизація через Email та Пароль
    Password,

    // 2. Авторизація через Google OAuth 2.0
    Google({
      profile(params) {
        return {
          id: params.sub,
          email: params.email,
          name: params.name,
          image: params.picture, // Google передає URL аватарки у полі picture
        };
      },
    }),
  ],
  callbacks: {
    async redirect({ redirectTo }) {
      // Дозволяємо повернення у мобільний застосунок через Deep Link (tictactoe-dev://, tictactoe://)
      return redirectTo;
    },
  },
});
```

> [!NOTE]
> Схема бази даних у `convex/schema.ts` використовує визначення `authTables`. Таблиця `users` за замовчуванням підтримує поля `name?: string`, `email?: string`, `image?: string`, тому додаткових міграцій схеми не потрібно.

---

## Крок 4. Налаштування Deep Linking схеми в `app.config.ts`

Для того, щоб після входу через браузер система знала, який саме мобільний додаток повинен відкритися, у нативному маніфесті додатку має бути зареєстрована власна URL-схема (`scheme`).

Перевірте файл `app.config.ts`:

```typescript
// app.config.ts
const SCHEME = "tictactoe";

export const getDynamicAppConfig = (
  environment: "development" | "preview" | "production",
) => {
  if (environment === "development") {
    return {
      // ...
      scheme: `${SCHEME}-dev`, // tictactoe-dev://
    };
  }

  return {
    // ...
    scheme: SCHEME, // tictactoe://
  };
};
```

У клієнтському коді виклик `Linking.createURL("")` автоматично підставить активну схему (`tictactoe-dev://` або `tictactoe://`), забезпечуючи безшовну роботу як у середовищі розробки, так і в Production.

---

## Крок 5. Реалізація кнопки та логіки входу в `app/sign-in.tsx`

Відкрийте файл `app/sign-in.tsx`.

### 5.1. Необхідні імпорти

Переконайтеся, що імпортовано модулі `expo-web-browser`, `expo-linking` та векторні іконки `Ionicons`:

```typescript
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import Ionicons from "@expo/vector-icons/Ionicons";
```

### 5.2. Виклик `maybeCompleteAuthSession`

На верхньому рівні модуля (поза межами компонента) додайте виклик:

```typescript
// Забезпечує коректне закриття WebBrowser сесії при перехопленні редиректу
WebBrowser.maybeCompleteAuthSession();
```

### 5.3. Функція обробки `handleGoogleSignIn`

Усередині компонента `SignInScreen` створіть стан завантаження `isGoogleLoading` та асинхронну функцію входу:

```typescript
const [isGoogleLoading, setIsGoogleLoading] = useState(false);

const handleGoogleSignIn = async () => {
  try {
    setIsGoogleLoading(true);

    // 1. Формуємо адресу повернення у мобільний застосунок (Deep Link)
    const redirectTo = Linking.createURL("");

    // 2. Отримуємо URL авторизації від сервера Convex
    const { redirect } = await signIn("google", { redirectTo });
    if (!redirect) return;

    // 3. Відкриваємо захищену сесію у системному браузері
    const result = await WebBrowser.openAuthSessionAsync(
      redirect.toString(),
      redirectTo,
    );

    // 4. Отримуємо код авторизації зі зворотного URL
    if (result.type === "success" && result.url) {
      const code = new URL(result.url).searchParams.get("code");
      if (code) {
        // 5. Завершуємо вхід у Convex за отриманим кодом
        await signIn("google", { code });
        router.replace("/(tabs)");
      }
    }
  } catch (error) {
    console.error("Google Auth Error:", error);
    Alert.alert(
      "Помилка входу",
      "Не вдалося виконати авторизацію через Google. Спробуйте ще раз.",
    );
  } finally {
    setIsGoogleLoading(false);
  }
};
```

### 5.4. Розмітка розділювача «АБО» та кнопки Google

Розмістіть цей блок у формі одразу після основної кнопки входу за паролем:

```tsx
{
  /* Візуальний розділювач "АБО" */
}
<View style={styles.dividerContainer}>
  <View style={styles.dividerLine} />
  <Text style={styles.dividerText}>АБО</Text>
  <View style={styles.dividerLine} />
</View>;

{
  /* Кнопка входу через Google */
}
<TouchableOpacity
  style={[
    styles.googleButton,
    (isLoading || isGoogleLoading) && styles.buttonDisabled,
  ]}
  onPress={handleGoogleSignIn}
  disabled={isLoading || isGoogleLoading}
  activeOpacity={0.8}
>
  {isGoogleLoading ? (
    <ActivityIndicator color={colors.text} size="small" />
  ) : (
    <>
      <Ionicons name="logo-google" size={20} color="#EA4335" />
      <Text style={styles.googleButtonText}>Продовжити з Google</Text>
    </>
  )}
</TouchableOpacity>;
```

### 5.5. Стилізація кнопки під світлу та темну теми

Додайте стилі у функцію `createStyles`:

```typescript
dividerContainer: {
  flexDirection: "row",
  alignItems: "center",
  marginVertical: 6,
},
dividerLine: {
  flex: 1,
  height: 1,
  backgroundColor: colors.border,
},
dividerText: {
  fontSize: 12,
  fontWeight: "700",
  color: colors.textMuted,
  paddingHorizontal: 12,
  textTransform: "uppercase",
  letterSpacing: 0.5,
},
googleButton: {
  flexDirection: "row",
  backgroundColor: colors.surface,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.border,
  paddingVertical: 16,
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  shadowColor: colors.cardShadow,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: isDarkMode ? 0.25 : 0.08,
  shadowRadius: 4,
  elevation: 2,
},
googleButtonText: {
  color: colors.text,
  fontSize: 16,
  fontWeight: "700",
},
```

> [!TIP]
> Аналогічну кнопку та обробник можна додати і на екран реєстрації `app/sign-up.tsx`. Завдяки провайдеру Google реєстрація та вхід відбуваються через одну й ту саму дію: якщо користувача ще немає у базі даних, Convex створить новий обліковий запис автоматично.

---

## Крок 6. Відображення аватара Google у профілі `app/(tabs)/statistics.tsx`

Після входу через Google поле `image` поточного користувача містить URL-адресу його фотографії з облікового запису Google.

Оновіть картку гравця на екрані статистики `app/(tabs)/statistics.tsx`:

```tsx
// app/(tabs)/statistics.tsx
import { Image } from "expo-image"; // або Image з "react-native"

// Усередині StatisticsScreen при рендері картки користувача:
<View style={styles.userCard}>
  {user?.image ? (
    <Image
      source={{ uri: user.image }}
      style={styles.avatarImage}
      contentFit="cover"
      transition={200}
    />
  ) : (
    <View style={styles.avatarContainer}>
      <MaterialIcons name="sports-esports" size={26} color="#FFFFFF" />
    </View>
  )}
  <View style={styles.userInfo}>
    <Text style={styles.userName} numberOfLines={1}>
      {user?.name ?? "Гравець"}
    </Text>
    {user?.email ? (
      <Text style={styles.userEmail} numberOfLines={1}>
        {user.email}
      </Text>
    ) : null}
  </View>
  <TouchableOpacity
    style={styles.logoutButton}
    onPress={handleSignOut}
    activeOpacity={0.7}
    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
  >
    <MaterialIcons name="logout" size={20} color={colors.xMark} />
  </TouchableOpacity>
</View>;
```

Додайте стиль для круглої аватарки:

```typescript
avatarImage: {
  width: 48,
  height: 48,
  borderRadius: 24,
  marginRight: 14,
},
```

---

## Крок 7. Захист секретних ключів та `.gitignore`

Переконайтеся, що файл конфігурації секретів Google випадково не потрапить у репозиторій Git.

Перевірте кореневий файл `.gitignore`:

```gitignore
# Google OAuth & Firebase credentials
client_secret*.json
google-services.json

# Local env files
.env*.local
```

---

## Повні готові лістинги файлів

### 1. `convex/auth.ts`

```typescript
import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password,
    Google({
      profile(params) {
        return {
          id: params.sub,
          email: params.email,
          name: params.name,
          image: params.picture,
        };
      },
    }),
  ],
  callbacks: {
    async redirect({ redirectTo }) {
      return redirectTo;
    },
  },
});
```

---

### 2. `app/sign-in.tsx`

```tsx
import useTheme, { ColorScheme } from "@/context/ThemeContext";
import { useAuthActions } from "@convex-dev/auth/react";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
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

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();
  const styles = createStyles(colors, isDarkMode);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Вхід через Google OAuth
  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);

      const redirectTo = Linking.createURL("");
      const { redirect } = await signIn("google", { redirectTo });
      if (!redirect) return;

      const result = await WebBrowser.openAuthSessionAsync(
        redirect.toString(),
        redirectTo,
      );

      if (result.type === "success" && result.url) {
        const code = new URL(result.url).searchParams.get("code");
        if (code) {
          await signIn("google", { code });
          router.replace("/(tabs)");
        }
      }
    } catch (error) {
      console.error("Google Auth Error:", error);
      Alert.alert(
        "Помилка входу",
        "Не вдалося виконати авторизацію через Google. Спробуйте ще раз.",
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Вхід за паролем
  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Помилка", "Будь ласка, заповніть усі поля!");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("email", email.trim().toLowerCase());
      formData.append("password", password);
      formData.append("flow", "signIn");

      await signIn("password", formData);
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert("Помилка входу", "Невірний email або пароль");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Заголовок та емблема */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="sports-esports" size={44} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>Хрестики-Нулики</Text>
            <Text style={styles.subtitle}>Увійдіть у свій акаунт гравця</Text>
          </View>

          {/* Форма входу */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <MaterialIcons
                name="mail-outline"
                size={22}
                color={colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.inputContainer}>
              <MaterialIcons
                name="lock-outline"
                size={22}
                color={colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Пароль"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                (isLoading || isGoogleLoading) && styles.buttonDisabled,
              ]}
              onPress={handleSignIn}
              disabled={isLoading || isGoogleLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="login" size={20} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Увійти в гру</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Розділювач "АБО" */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>АБО</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Кнопка входу через Google */}
            <TouchableOpacity
              style={[
                styles.googleButton,
                (isLoading || isGoogleLoading) && styles.buttonDisabled,
              ]}
              onPress={handleGoogleSignIn}
              disabled={isLoading || isGoogleLoading}
              activeOpacity={0.8}
            >
              {isGoogleLoading ? (
                <ActivityIndicator color={colors.text} size="small" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color="#EA4335" />
                  <Text style={styles.googleButtonText}>
                    Продовжити з Google
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Перехід до реєстрації */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Немає акаунта? </Text>
            <TouchableOpacity onPress={() => router.push("/sign-up")}>
              <Text style={styles.footerLink}>Створити профіль</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ColorScheme, isDarkMode: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
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
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 18,
      shadowColor: colors.cardShadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDarkMode ? 0.35 : 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    title: {
      fontSize: 28,
      fontWeight: "800",
      letterSpacing: 0.5,
      color: colors.text,
      marginBottom: 6,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 15,
      fontWeight: "500",
      color: colors.textMuted,
      textAlign: "center",
    },
    form: {
      gap: 14,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      shadowColor: colors.cardShadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.2 : 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    inputIcon: {
      marginRight: 12,
    },
    input: {
      flex: 1,
      paddingVertical: 16,
      fontSize: 16,
      color: colors.text,
    },
    button: {
      flexDirection: "row",
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 4,
      shadowColor: colors.cardShadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDarkMode ? 0.35 : 0.15,
      shadowRadius: 8,
      elevation: 3,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: "#FFFFFF",
      fontSize: 17,
      fontWeight: "700",
    },
    dividerContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 6,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    dividerText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textMuted,
      paddingHorizontal: 12,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    googleButton: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      shadowColor: colors.cardShadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.25 : 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    googleButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "700",
    },
    footer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: 28,
    },
    footerText: {
      color: colors.textMuted,
      fontSize: 15,
      fontWeight: "500",
    },
    footerLink: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: "700",
    },
  });
```

---

## Тестування та сценарії перевірки

### 1. Перевірка першого входу

1. Запустіть бекенд Convex: `npx convex dev`.
2. Запустіть Expo Dev Client: `npx expo start --dev-client`.
3. Натисніть **«Продовжити з Google»**.
4. У вікні браузера виберіть ваш тестовий акаунт Google.
5. Переконайтеся, що вікно браузера автоматично закрилося, а додаток перейшов на головний екран `/(tabs)`.

### 2. Перевірка профілю та аватара

1. Перейдіть на вкладку **Статистика**.
2. Переконайтеся, що відображається ваше справжнє ім'я з Google та круглий аватар профілю.

### 3. Перевірка повторного входу та збереження сесії

1. Натисніть кнопку виходу (іконка виходу у картці профілю).
2. Ви знову опинитеся на екрані входу.
3. Повторно натисніть **«Продовжити з Google»** — вхід має відбутися миттєво без повторного запиту дозволів.
4. Перевірте, що вся статистика попередніх ігор збереглася.

---

## Вирішення типових проблем (Troubleshooting)

### 1. Помилка `redirect_uri_mismatch` (HTTP 400)

- **Причина:** URL перенаправлення, який надсилає Convex, не співпадає з дозволеними у Google Cloud Console.
- **Вирішення:**
  Перевірте значення `SITE_URL` у Convex (`npx convex env list`).
  У Google Cloud Console у полі **Authorized redirect URIs** має бути вказано абсолютно точний URL:
  `https://<YOUR_CONVEX_SITE_URL>/api/auth/callback/google`
  _(Переконайтеся у відсутності зайвих слешів `/` у кінці або пробілів)._

### 2. Помилка `Access blocked: App has not completed the verification process`

- **Причина:** Google обмежує авторизацію для додатків у режимі тестування.
- **Вирішення:**
  У Google Cloud Console відкрийте **OAuth consent screen** → вкладка **Test users** → натисніть **Add users** та вкажіть email акаунта, з якого ви виконуєте вхід.

### 3. Браузер не закривається або не повертає у мобільний застосунок

- **Причина:** Не налаштована схема `scheme` або відсутній виклик `maybeCompleteAuthSession`.
- **Вирішення:**
  1. Переконайтеся, що на самому початку `app/sign-in.tsx` присутній виклик:
     ```typescript
     WebBrowser.maybeCompleteAuthSession();
     ```
  2. Перевірте `convex/auth.ts`: у блоці `callbacks` має бути:
     ```typescript
     callbacks: {
       async redirect({ redirectTo }) {
         return redirectTo;
       },
     }
     ```
  3. Для тестування кастомних URL-схем рекомендується використовувати **Development Client** білд додатку (`npx expo run:android` або окремо зібраний Dev Client APK), оскільки базовий Expo Go має обмеження щодо кастомних схем.
