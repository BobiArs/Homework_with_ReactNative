# Інструкція 17: Push-сповіщення (Push Notifications), Firebase Cloud Messaging (FCM v1) та Deep Linking у месенджері Modern Chat 🔔📲

У цій інструкції ми реалізуємо один із найважливіших нативних функціоналів мобільного месенджера — **Push-сповіщення (Push Notifications)** та **глибоку маршрутизацію (Deep Linking)** на базі бібліотеки **`expo-notifications`**, хмарної бази даних **Convex** та транспорту **Firebase Cloud Messaging (FCM v1)**.

Після проходження інструкції користувачі вашого додатку **`modern-chat`** отримуватимуть миттєві системні банери у шторці смартфонів навіть тоді, коли додаток **згорнутий у фоні або повністю закритий**. Натискання на сповіщення автоматично розгортатиме додаток і переходитиме безпосередньо у відповідний діалог або груповий чат!

---

## 📚 Зміст

1. [Архітектура доставки сповіщень та життєвий цикл](#1-архітектура-доставки-сповіщень-та-життєвий-цикл)
2. [Крок 1. Встановлення залежностей](#крок-1-встановлення-залежностей)
3. [Крок 2. Налаштування нативної конфігурації app.config.ts](#крок-2-налаштування-нативної-конфігурації-appconfigts)
4. [Крок 3. Налаштування Firebase Console для Android](#крок-3-налаштування-firebase-console-для-android)
5. [Крок 4. Налаштування FCM v1 у EAS Credentials](#крок-4-налаштування-fcm-v1-у-eas-credentials)
6. [Крок 5. Оновлення схеми бази даних convex/schema.ts](#крок-5-оновлення-схеми-бази-даних-convexschemats)
7. [Крок 6. Мутація збереження токена convex/users.ts](#крок-6-мутація-збереження-токена-convexusersts)
8. [Крок 7. Сервіс відправки сповіщень convex/pushNotifications.ts](#крок-7-сервіс-відправки-сповіщень-convexpushnotificationsts)
9. [Крок 8. Диспетчеризація сповіщень у повідомленнях convex/messages.ts](#крок-8-диспетчеризація-сповіщень-у-повідомленнях-convexmessagests)
10. [Крок 9. Клієнтський хук hooks/usePushNotifications.ts та Deep Linking](#крок-9-клієнтський-хук-hooksusepushnotificationsts-та-deep-linking)
11. [Крок 10. Підключення хука в InitialLayout.tsx](#крок-10-підключення-хука-в-initiallayouttsx)
12. [Крок 11. Перезбірка нативного клієнта (Development Build / APK)](#крок-11-перезбірка-нативного-клієнта-development-build--apk)
13. [Крок 12. Тестування та перевірка сценаріїв](#крок-12-тестування-та-перевірка-сценаріїв)
14. [Крок 13. Вирішення типових проблем (Troubleshooting)](#крок-13-вирішення-типових-проблем-troubleshooting)
15. [Повні готові лістинги файлів](#15-повні-готові-лістинги-файлів)

---

## 1. Архітектура доставки сповіщень та життєвий цикл

### Чому не можна обійтися звичайним WebSocket / Convex?

База даних Convex забезпечує миттєву реактивність інтерфейсу в реальному часі через WebSocket. Проте:

- Коли користувач **блокує телефон** або **згортає додаток**, мобільна операційна система (Android / iOS) з метою економії заряду батареї **заморожує JavaScript-потік** та примусово закриває активні мережеві з'єднання.
- Єдиний надійний спосіб розбудити пристрій та повідомити людину про нове повідомлення — **системний Push Notification**, який надсилається через сервери Google (FCM) або Apple (APNs).

### Схема взаємодії компонентів

```
[Користувач 1 відправляє повідомлення]
                 │
                 ▼
     [Convex Mutation: sendMessage]
                 │
                 ├─► Запис нового повідомлення в таблицю `messages`
                 ├─► Оновлення `lastMessage` у кімнаті чату
                 │
                 ▼ (ctx.scheduler.runAfter(0, internal.pushNotifications.send...))
     [Convex Internal Action] ───► HTTP POST (JSON) ───► [Expo Push Service]
                                                                │
                                                                ▼ (FCM V1 API)
                                                   [Firebase Cloud Messaging]
                                                                │
                                                                ▼
                                                    [Android Смартфон Користувача 2]
                                                                │
                 ┌──────────────────────────────────────────────┴──────────────────────────────┐
                 │                                                                             │
                 ▼ (Додаток у фоні / закритий)                                                 ▼ (Додаток відкритий)
      [Системний банер у шторці]                                                [Foreground банер зі звуком]
                 │                                                                (setNotificationHandler)
                 ▼ (Клік по сповіщенню)
    [Хук usePushNotifications]
                 │
                 ▼ (Deep Linking)
    router.push('/chat/[id]')
```

> [!NOTE]
> **Чому використовується Expo Push Service?**  
> Пряма взаємодія з нативними серверами Apple (APNs) та Google (FCM v1) вимагає підтримки різних форматів шифрування, OAuth 2.0 токенів та різних HTTP-структур. Expo надає єдиний безкоштовний шлюз: ви надсилаєте повідомлення на `https://exp.host/--/api/v2/push/send` у зручному JSON-форматі з токеном `ExponentPushToken[...]`, а Expo автоматично транслює його у Firebase FCM v1 для Android або APNs для iOS.

---

## Крок 1. Встановлення залежностей

У кореневій директорії проєкту `modern-chat` (або `prostir`) встановіть бібліотеку `expo-notifications` та допоміжний модуль `expo-constants`:

```bash
npx expo install expo-notifications expo-constants
```

> [!IMPORTANT]
> Нативні Push-сповіщення для Android 13+ **не підтримуються** у стандартному пісочничному клієнті **Expo Go**. Для повноцінної перевірки пушів необхідний **Development Build** (`npx expo run:android`) або зібраний **Standalone APK** (`assembleDebug` / `assembleRelease` / EAS Build).

---

## Крок 2. Налаштування нативної конфігурації `app.config.ts`

Відкрийте файл `app.config.ts`. Нам необхідно:

1. Зареєструвати плагін `expo-notifications`.
2. Додати системні дозволи `POST_NOTIFICATIONS` та `VIBRATE` у секцію `android.permissions`.
3. Додати поле `googleServicesFile: "./google-services.json"`.
4. Переконатися у наявності `extra.eas.projectId`.

Оновіть `app.config.ts`:

```ts
// app.config.ts
import { ConfigContext, ExpoConfig } from "expo/config";

const isDev = process.env.APP_ENV === "development";
const APP_NAME = isDev ? "Modern Chat Dev" : "Modern Chat";
const PACKAGE_NAME = "com.modernchat.app";

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    name: APP_NAME,
    slug: "modern-chat",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "modernchat",
    userInterfaceStyle: "dark",

    android: {
      package: isDev ? `${PACKAGE_NAME}.dev` : PACKAGE_NAME,

      // ✅ 1. Шлях до конфігураційного файлу Firebase для Android:
      googleServicesFile: "./google-services.json",

      adaptiveIcon: {
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundColor: "#000000",
      },

      permissions: [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.READ_MEDIA_IMAGES",

        // ✅ 2. Обов'язкові системні дозволи для доставки сповіщень:
        "android.permission.VIBRATE",
        "android.permission.POST_NOTIFICATIONS", // Обов'язково для Android 13+ (API 33+)
      ],
    },

    plugins: [
      "expo-router",
      [
        "expo-audio",
        {
          microphonePermission:
            "Додатку Modern Chat потрібен доступ до мікрофона для запису голосових повідомлень.",
        },
      ],
      [
        "expo-camera",
        {
          cameraPermission:
            "Додатку Modern Chat потрібен доступ до камери для зйомки відеокружечків.",
          microphonePermission:
            "Додатку Modern Chat потрібен доступ до мікрофона для запису звуку у відеокружечках.",
          recordAudioAndroid: true,
        },
      ],
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#000000",
        },
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "Додатку потрібен доступ до ваших фотографій.",
        },
      ],
      "expo-secure-store",

      // ✅ 3. Плагін сповіщень Expo Notifications:
      [
        "expo-notifications",
        {
          icon: "./assets/images/icon.png",
          color: "#000000",
          defaultChannel: "default",
          sounds: [],
          enableBackgroundRemoteNotifications: false,
        },
      ],
    ],

    // ✅ 4. Ідентифікатор EAS Project ID (потрібен для отримання ExponentPushToken)
    extra: {
      ...config.extra,
      eas: {
        projectId: config.extra?.eas?.projectId ?? "ВАШ_EAS_PROJECT_ID",
      },
    },

    experiments: {
      typedRoutes: true,
    },
  };
};
```

> [!TIP]
> Якщо у вас ще немає `projectId`, виконайте команду `npx eas project:init` або перегляньте його в кабінеті на [expo.dev](https://expo.dev).

---

## Крок 3. Налаштування Firebase Console для Android

Бібліотека `expo-notifications` на платформі Android надсилає пуші через сервіс **Firebase Cloud Messaging (FCM)**.

### 3.1. Створення додатку у Firebase Console

1. Перейдіть до [Firebase Console](https://console.firebase.google.com/) та авторизуйтеся через Google-акаунт.
2. Створіть новий проєкт (наприклад, `Modern Chat`).
3. На головній сторінці натисніть кнопку додавання застосунку **Android** (іконка робота).
4. Заповніть поле **Android package name**:
   - Якщо збираєте development-версію: `com.modernchat.app.dev`
   - Якщо збираєте production-версію: `com.modernchat.app`
     _(Рекомендується зареєструвати обидва пакети в одному Firebase-проєкті, додавши другий додаток через кнопку "Add app")_.
5. Натисніть **Register app** та завантажте файл **`google-services.json`**.

### 3.2. Розміщення `google-services.json`

Покладіть завантажений файл `google-services.json` у два місця проєкту:

```text
modern-chat/
├── google-services.json          ← 1. Корінь проєкту (для Expo Prebuild)
└── android/
    └── app/
        └── google-services.json  ← 2. Папка android/app/ (для нативного Gradle)
```

### 3.3. Перевірка файлів Gradle

1. **`android/build.gradle`**:  
   Переконайтеся, що в блоці `buildscript.dependencies` підключено плагін Google Services:

   ```groovy
   buildscript {
     repositories {
       google()
       mavenCentral()
     }
     dependencies {
       classpath('com.android.tools.build:gradle')
       classpath('com.facebook.react:react-native-gradle-plugin')
       classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')
       // ✅ ДОДАТИ:
       classpath('com.google.gms:google-services:4.4.2')
     }
   }
   ```

2. **`android/app/build.gradle`**:  
   Переконайтеся, що в самому кінці файлу додано застосування плагіна:
   ```groovy
   // В самому кінці android/app/build.gradle:
   apply plugin: "com.google.gms.google-services"
   ```

---

## Крок 4. Налаштування FCM v1 у EAS Credentials

Google повністю вивів з експлуатації старий протокол FCM Legacy і вимагає сучасного протоколу **FCM HTTP v1 API**. Для його роботи Expo Push Service повинен мати права відправника від вашого імені.

### 4.1. Генерація ключа Google Service Account

1. У Firebase Console натисніть на іконку шестерні біля пункту _Project Overview_ ➔ **Project settings**.
2. Перейдіть на вкладку **Service accounts**.
3. Переконайтеся, що вибрано **Firebase Admin SDK**.
4. Натисніть кнопку **Generate new private key** ➔ підтвердіть вибір **Generate key**.
5. На ваш комп'ютер завантажиться `.json` файл із приватним ключем доступу.

### 4.2. Завантаження ключа до EAS

У терміналі проєкту запустіть інтерактивний менеджер сертифікатів:

```bash
eas credentials --platform android
```

1. Виберіть потрібний build profile: **`development`** (або `preview` / `production`).
2. Виберіть пункт меню: **`Google Service Account`** (FCM V1).
3. Виберіть пункт: **`Upload a Google Service Account Key`**.
4. Вкажіть шлях до завантаженого JSON-файлу ключа.

Тепер Expo має офіційний авторизований доступ для надсилання пушів на будь-які Android-пристрої вашого додатку!

---

## Крок 5. Оновлення схеми бази даних `convex/schema.ts`

Кожен пристрій має унікальний системний токен `ExponentPushToken`. Щоб бекенд знав, на який пристрій надсилати сповіщення при появі нового повідомлення, додамо поле `pushToken` до таблиці `users`.

Відкрийте `convex/schema.ts` та додайте поле:

```ts
// convex/schema.ts
import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    username: v.optional(v.string()),
    bio: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),

    // ✅ ДОДАТИ: Токен для отримання push-сповіщень від Expo Push Service
    pushToken: v.optional(v.string()),
  }).index("by_email", ["email"]),

  // ... інші таблиці (chatRooms, messages, reactions) залишаються без змін
});
```

---

## Крок 6. Мутація збереження токена `convex/users.ts`

Створимо мутацію `savePushToken`, яку клієнтський додаток викликатиме при вході користувача після отримання системного дозволу.

Додайте в кінець файлу `convex/users.ts`:

```ts
// convex/users.ts
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ... попередній код файлу users.ts ...

/**
 * Зберігає або оновлює ExponentPushToken поточного авторизованого користувача
 */
export const savePushToken = mutation({
  args: {
    pushToken: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized: Користувач не авторизований");
    }

    // Зберігаємо актуальний push-токен у записі користувача
    await ctx.db.patch(userId, {
      pushToken: args.pushToken,
    });

    return { success: true };
  },
});

/**
 * Очищає pushToken при виході користувача з акаунта
 */
export const removePushToken = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    await ctx.db.patch(userId, {
      pushToken: undefined,
    });

    return { success: true };
  },
});
```

---

## Крок 7. Сервіс відправки сповіщень `convex/pushNotifications.ts`

Створіть новий файл `convex/pushNotifications.ts`. У ньому ми напишемо два внутрішні екшени (`internalAction`):

1. `sendPushNotification` — відправка одного сповіщення одному користувачу (1-on-1 приватні діалоги).
2. `sendPushNotificationsBatch` — пакетна відправка масиву сповіщень кільком отримувачам одночасно (групові чати).

```ts
// convex/pushNotifications.ts
import { internalAction } from "./_generated/server";
import { v } from "convex/values";

/**
 * Внутрішній екшен для відправки одиничного push-сповіщення
 */
export const sendPushNotification = internalAction({
  args: {
    pushToken: v.string(),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
  },
  handler: async (_ctx, args) => {
    // Перевірка базового формату Expo токена
    if (!args.pushToken || !args.pushToken.startsWith("ExponentPushToken[")) {
      console.log(
        "⚠️ Пропускаємо відправку: некоректний pushToken:",
        args.pushToken,
      );
      return { success: false, reason: "Invalid token" };
    }

    const payload = {
      to: args.pushToken,
      sound: "default",
      title: args.title,
      body: args.body,
      data: args.data ?? {},
      priority: "high",
      channelId: "default",
    };

    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log("📨 Push send result:", JSON.stringify(result));
      return result;
    } catch (error) {
      console.error("❌ Помилка відправки push-сповіщення:", error);
      return { error: String(error) };
    }
  },
});

/**
 * Внутрішній екшен для пакетної відправки (групові чати)
 */
export const sendPushNotificationsBatch = internalAction({
  args: {
    notifications: v.array(
      v.object({
        pushToken: v.string(),
        title: v.string(),
        body: v.string(),
        data: v.optional(v.any()),
      }),
    ),
  },
  handler: async (_ctx, args) => {
    // Фільтруємо лише валідні токени
    const validMessages = args.notifications
      .filter(
        (n) => n.pushToken && n.pushToken.startsWith("ExponentPushToken["),
      )
      .map((n) => ({
        to: n.pushToken,
        sound: "default",
        title: n.title,
        body: n.body,
        data: n.data ?? {},
        priority: "high",
        channelId: "default",
      }));

    if (validMessages.length === 0) {
      return { sent: 0 };
    }

    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validMessages),
      });

      const result = await response.json();
      console.log(
        `📨 Batch push result (${validMessages.length} recipients):`,
        result,
      );
      return result;
    } catch (error) {
      console.error("❌ Помилка пакетної відправки push-сповіщень:", error);
      return { error: String(error) };
    }
  },
});
```

> [!NOTE]
> **Чому використовується `internalAction` замість звичайної `mutation`?**  
> Мутації в Convex є повністю транзакційними та детермінованими: вони виконуються ізольовано і їм заборонено робити зовнішні HTTP-запити через `fetch()`. Для виходу у зовнішній інтернет використовуються `action` / `internalAction`. Виклик екшену зсередини мутації здійснюється безпечно через асинхронний планувальник: `ctx.scheduler.runAfter(0, ...)`.

---

## Крок 8. Диспетчеризація сповіщень у повідомленнях `convex/messages.ts`

Оновимо мутацію `sendMessage`. При відправці нового повідомлення сервер повинен:

1. Визначити, хто є отримувачами:
   - В особистому діалозі — співрозмовник.
   - У груповому чаті — **усі інші учасники бесіди**, крім автора повідомлення.
2. Сформувати інформативне прев'ю повідомлення:
   - Текст повідомлення.
   - Якщо це кругле відео (Video Note): `📹 Відеоповідомлення (${dur}с)`.
   - Якщо це аудіоповідомлення: `🎤 Голосове повідомлення (${dur}с)`.
   - Якщо це фотографія: `📷 Фотографія`.
3. Сформувати інформативний заголовок:
   - Для групового чату: `Назва чату • Ім'я автора`.
   - Для особистого діалогу: `Ім'я автора`.
4. Запланувати відправку push-сповіщення через `ctx.scheduler.runAfter`.

Оновіть мутацію `sendMessage` у `convex/messages.ts`:

```ts
// convex/messages.ts
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api"; // ✅ ДОДАТИ ІМПОРТ
import { mutation, query } from "./_generated/server";

export const sendMessage = mutation({
  args: {
    // Підтримка назви поля залежно від вашої схеми: chatRoomId або conversationId
    chatRoomId: v.optional(v.id("chatRooms")),
    conversationId: v.optional(v.id("chatRooms")),

    content: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    audioStorageId: v.optional(v.id("_storage")),
    audioDuration: v.optional(v.number()),
    videoStorageId: v.optional(v.id("_storage")),
    videoDuration: v.optional(v.number()),
    isVideoNote: v.optional(v.boolean()),
    waveform: v.optional(v.array(v.number())),
    replyToId: v.optional(v.id("messages")),
    replyToSender: v.optional(v.string()),
    replyToText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Unauthorized: Необхідно увійти в систему");
    }

    const roomId = (args.chatRoomId ?? args.conversationId)!;
    if (!roomId) {
      throw new Error("Не вказано ідентифікатор кімнати чату");
    }

    const chatRoom = await ctx.db.get(roomId);
    if (!chatRoom) {
      throw new Error("Кімнату чату не знайдено");
    }

    const sender = await ctx.db.get(currentUserId);
    const senderName = sender?.name ?? sender?.username ?? "Користувач";

    // Отримання публічних URL для медіафайлів
    let imageUrl: string | undefined;
    if (args.storageId) {
      imageUrl = (await ctx.storage.getUrl(args.storageId)) ?? undefined;
    }

    let audioUrl: string | undefined;
    if (args.audioStorageId) {
      audioUrl = (await ctx.storage.getUrl(args.audioStorageId)) ?? undefined;
    }

    let videoUrl: string | undefined;
    if (args.videoStorageId) {
      videoUrl = (await ctx.storage.getUrl(args.videoStorageId)) ?? undefined;
    }

    const now = Date.now();
    const trimmedContent = args.content?.trim() ?? "";

    // Вставка повідомлення в базу
    const messageId = await ctx.db.insert("messages", {
      chatRoomId: roomId,
      senderId: currentUserId,
      senderName,
      senderPhoto: sender?.image,
      content: trimmedContent,
      imageUrl,
      storageId: args.storageId,
      audioUrl,
      audioStorageId: args.audioStorageId,
      audioDuration: args.audioDuration,
      videoUrl,
      videoStorageId: args.videoStorageId,
      videoDuration: args.videoDuration,
      isVideoNote: args.isVideoNote,
      waveform: args.waveform,
      replyToId: args.replyToId,
      replyToSender: args.replyToSender,
      replyToText: args.replyToText,
    });

    // Формуємо текст прев'ю останнього повідомлення для списку чатів та для пуша
    let previewText = trimmedContent;
    if (!previewText) {
      if (args.isVideoNote) {
        const dur = args.videoDuration
          ? ` (${Math.round(args.videoDuration)}с)`
          : "";
        previewText = `📹 Відеоповідомлення${dur}`;
      } else if (args.audioStorageId) {
        const dur = args.audioDuration
          ? ` (${Math.round(args.audioDuration)}с)`
          : "";
        previewText = `🎤 Голосове повідомлення${dur}`;
      } else if (args.storageId) {
        previewText = "📷 Фотографія";
      } else {
        previewText = "Нове повідомлення";
      }
    }

    // Оновлюємо кімнату чату
    await ctx.db.patch(roomId, {
      lastMessage: previewText,
      lastMessageAt: now,
    });

    // =========================================================================
    // ✅ ВІДПРАВКА PUSH-СПОВІЩЕНЬ УСІМ ІНШИМ УЧАСНИКАМ БЕСІДИ
    // =========================================================================
    const participants: string[] = chatRoom.participantIds ?? [];

    // Вибираємо всіх учасників, крім відправника
    const otherParticipantIds = participants.filter(
      (id) => id !== currentUserId,
    );

    if (otherParticipantIds.length > 0) {
      // Завантажуємо записи інших користувачів для отримання їх pushToken
      const otherUsers = await Promise.all(
        otherParticipantIds.map((id) => ctx.db.get(id as any)),
      );

      // Визначаємо заголовок сповіщення:
      // Якщо це груповий чат (3+ людей або є назва title): "Назва групи • Ім'я"
      // Якщо особистий чат: "Ім'я"
      const isGroupChat =
        (chatRoom.participantIds?.length ?? 0) > 2 || !!chatRoom.title;
      const notificationTitle =
        isGroupChat && chatRoom.title
          ? `${chatRoom.title} • ${senderName}`
          : senderName;

      // Формуємо масив пушів для тих, у кого збережено pushToken
      const pushNotificationsToSend = otherUsers
        .filter((user) => user && (user as any).pushToken)
        .map((user) => ({
          pushToken: (user as any).pushToken as string,
          title: notificationTitle,
          body: previewText,
          data: {
            type: "chat",
            chatRoomId: roomId,
            conversationId: roomId,
          },
        }));

      if (pushNotificationsToSend.length === 1) {
        // Одиночний чат -> виклик одиночного екшену
        await ctx.scheduler.runAfter(
          0,
          internal.pushNotifications.sendPushNotification,
          pushNotificationsToSend[0],
        );
      } else if (pushNotificationsToSend.length > 1) {
        // Груповий чат -> виклик пакетного екшену
        await ctx.scheduler.runAfter(
          0,
          internal.pushNotifications.sendPushNotificationsBatch,
          { notifications: pushNotificationsToSend },
        );
      }
    }

    return messageId;
  },
});
```

---

## Крок 9. Клієнтський хук `hooks/usePushNotifications.ts` та Deep Linking

Створіть файл `hooks/usePushNotifications.ts`. Хук виконує такі ключові завдання:

1. **Foreground Handler:** налаштовує показ системного банера та звук, коли додаток активний.
2. **Android Channel:** реєструє Notification Channel `default` із максимальною важливістю `MAX`.
3. **Запит дозволів:** викликає системний діалог Android 13+ / iOS.
4. **Отримання токена:** звертається до сервісу Expo та зберігає токен у базі Convex через `api.users.savePushToken`.
5. **Deep Linking у фоні:** слухач `addNotificationResponseReceivedListener` реагує на тап по сповіщенню, коли додаток був згорнутий.
6. **Deep Linking при холодному старті (Cold Start):** хук `Notifications.useLastNotificationResponse()` виявляє тап по сповіщенню, якщо додаток був повністю закритий!

Створіть `hooks/usePushNotifications.ts`:

```ts
// hooks/usePushNotifications.ts
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { useConvexAuth } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";

/**
 * 1. Глобальне налаштування показу сповіщень у Foreground-режимі (коли додаток відкрито).
 * За замовчуванням мобільні ОС глушать сповіщення, якщо користувач вже перебуває в додатку.
 * Ми вказуємо системі: показувати банер, відтворювати звук та оновлювати лічильник.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const savePushToken = useMutation(api.users.savePushToken);
  const router = useRouter();

  /**
   * 2. Відстеження сповіщення при "Холодному старті" (Cold Start):
   * Якщо додаток був вивантажений з пам'яті (вбитий), і користувач тапнув на сповіщення,
   * цей хук повертає відповідний об'єкт відповіді після запуску програми.
   */
  const lastNotificationResponse = Notifications.useLastNotificationResponse();

  const notificationListener = useRef<Notifications.EventSubscription | null>(
    null,
  );
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  /**
   * Уніфікована навігація (Deep Linking) на відповідний екран
   */
  const handleNotificationNavigation = (data: any) => {
    if (!data) return;
    console.log("🧭 Deep Linking за сповіщенням:", data);

    const roomId = data.chatRoomId || data.conversationId;
    if (roomId) {
      // Підтримує стандартний маршрут чату
      router.push(`/chat/${roomId}`);
    } else {
      router.push("/(tabs)");
    }
  };

  // Реакція на клік по сповіщенню при холодному старті
  useEffect(() => {
    if (
      lastNotificationResponse &&
      lastNotificationResponse.actionIdentifier ===
        Notifications.DEFAULT_ACTION_IDENTIFIER
    ) {
      const data = lastNotificationResponse.notification.request.content.data;
      handleNotificationNavigation(data);
    }
  }, [lastNotificationResponse]);

  // Реєстрація токена та підписка на події в рантаймі
  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    // Отримання токена пристрою та запис у базу даних Convex
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        console.log("📲 Отримано ExponentPushToken:", token);
        savePushToken({ pushToken: token }).catch((err) => {
          console.error("❌ Помилка збереження pushToken у Convex:", err);
        });
      }
    });

    // Слухач надходження сповіщення у відкритому додатку (Foreground)
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log(
          "🔔 Отримано сповіщення у фокусі:",
          notification.request.content.title,
        );
      });

    // Слухач кліку по сповіщенню у згорнутому стані (Background)
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        handleNotificationNavigation(data);
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [isAuthenticated, isLoading]);
}

/**
 * Реєстрація каналу для Android, запит системних дозволів та отримання токена
 */
async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Налаштування каналу обов'язкове для Android 8.0+
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX, // Максимальний пріоритет (спливаючий банер)
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FFFFFF",
      sound: "default",
    });
  }

  // Перевірка та динамічний запит дозволу (Android 13+ / iOS)
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("⚠️ Користувач не надав дозвіл на системні сповіщення");
    return null;
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.warn("⚠️ Увага: extra.eas.projectId не вказано в app.config.ts");
    }

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );

    return tokenData.data;
  } catch (error) {
    console.error("❌ Не вдалося отримати токен від Expo:", error);
    return null;
  }
}
```

---

## Крок 10. Підключення хука в `InitialLayout.tsx`

Компонент `components/InitialLayout.tsx` (або кореневий `app/_layout.tsx`) знаходиться всередині провайдера автентифікації `ConvexAuthProvider`. Підключимо хук `usePushNotifications` саме сюди:

```tsx
// components/InitialLayout.tsx
import { useEffect } from "react";
import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import * as SplashScreen from "expo-splash-screen";
import { Stack, useRouter, useSegments } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

// ✅ ДОДАТИ ІМПОРТ:
import { usePushNotifications } from "@/hooks/usePushNotifications";

export default function InitialLayout() {
  // ✅ ВИКЛИК ХУКА PUSH-СПОВІЩЕНЬ:
  usePushNotifications();

  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.users.currentUser, isAuthenticated ? {} : "skip");
  const { signOut } = useAuthActions();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || (isAuthenticated && user === undefined)) return;

    const inAuthScreen = segments[0] === "(auth)";

    if (isAuthenticated) {
      if (user === null) {
        void signOut();
        SplashScreen.hideAsync().catch(() => {});
        return;
      }
      if (inAuthScreen) {
        router.replace("/(tabs)");
      }
    } else {
      if (!inAuthScreen) {
        router.replace("/(auth)/login");
      }
    }

    SplashScreen.hideAsync().catch(() => {});
  }, [isAuthenticated, isLoading, user, segments, router, signOut]);

  if (isLoading || (isAuthenticated && user === undefined)) {
    return null;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
```

---

## Крок 11. Перезбірка нативного клієнта (Development Build / APK)

Оскільки ми змінили нативний конфіг `app.config.ts`, додали файли `google-services.json` та системні дозволи, необхідно перезібрати клієнт розробника або автономний APK:

### Варіант А: Локальний запуск Android Development Client

```bash
npx expo run:android
```

### Варіант Б: Локальна збірка автономного APK через Gradle

```bash
cd android
./gradlew assembleDebug
```

### Варіант В: Хмарна збірка через EAS Build (якщо налаштовано)

```bash
eas build --platform android --profile preview
```

---

## Крок 12. Тестування та перевірка сценаріїв

### 12.1. Перевірка збереження токена у Convex

1. Запустіть зібраний додаток на смартфоні чи емуляторі.
2. Увійдіть у свій акаунт. При появі системного запиту: _"Дозволити додатку Modern Chat надсилати сповіщення?"_ ➔ натисніть **Дозволити**.
3. Відкрийте панель **Convex Dashboard** ➔ вкладка **Data** ➔ таблиця **users**.
4. Знайдіть свій запис та переконайтеся, що поле `pushToken` заповнено:
   ```text
   ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
   ```

### 12.2. Ручна відправка через Expo Push Notification Tool

1. Перейдіть до офіційного інструменту: [https://expo.dev/notifications](https://expo.dev/notifications).
2. Скопіюйте свій `ExponentPushToken` із Convex Dashboard та вставте у поле **Expo Push Token**.
3. Вкажіть параметри:
   - **Title:** `Modern Chat 🔔`
   - **Message:** `Тестове повідомлення успішно доставлено!`
   - **Data (JSON):** `{"chatRoomId": "тут_id_вашого_чату"}`
4. Натисніть **Send Notification**.
5. Перевірте отримання спливаючого банера на пристрої!

### 12.3. Тестування реального листування між двома користувачами

Авторизуйтеся з двох пристроїв (Користувач 1 і Користувач 2):

1. **Foreground-тест:** Користувач 2 тримає додаток відкритим. Користувач 1 надсилає повідомлення ➔ Користувач 2 бачить красивий банер зверху зі звуком.
2. **Background-тест:** Користувач 2 згортає додаток (на головний екран смартфона). Користувач 1 відправляє повідомлення ➔ Користувач 2 отримує сповіщення у системній шторці Android. Натискання на сповіщення розгортає додаток і **відкриває екран листування**.
3. **Cold Start-тест:** Користувач 2 повністю закриває додаток (змахує зі списку останніх запущених програм). Користувач 1 надсилає голосове повідомлення ➔ у шторці з'являється `🎤 Голосове повідомлення (5с)`. Користувач 2 натискає на банер ➔ додаток завантажується з нуля і автоматично переходить прямо в бесіду!
4. **Груповий чат:** У кімнаті з трьома учасниками Користувач 1 надсилає повідомлення ➔ Користувач 2 і Користувач 3 одночасно отримують пуш із назвою групи та текстом. Сам Користувач 1 пуша не отримує.

---

## Крок 13. Вирішення типових проблем (Troubleshooting)

### Помилка: `Device pushToken is null or undefined`

- **Причина 1:** Ви тестуєте в стандартному Expo Go. На Android 13+ нативні токени FCM не працюють у Expo Go. Використовуйте `npx expo run:android`.
- **Причина 2:** Користувач натиснув "Заборонити" у системному діалозі дозволів. Зайдіть у _Налаштування смартфона ➔ Додатки ➔ Modern Chat ➔ Сповіщення ➔ Увімкнути_.
- **Причина 3:** Не вказано `extra.eas.projectId` у `app.config.ts`. Виконайте `npx eas project:init` або вкажіть його вручну.

### Помилка: `DeviceNotRegistered` або `InvalidCredentials` у логах Convex

- **Причина:** Не налаштовано або застарів ключ Google Service Account у EAS Credentials.
- **Вирішення:** Завантажте новий JSON-ключ із Firebase Console (_Service accounts_) та виконайте `eas credentials --platform android` ➔ виберіть _Upload a Google Service Account Key_.

### Сповіщення не з'являються, коли додаток відкрито

- **Вирішення:** Переконайтеся, що на початку `hooks/usePushNotifications.ts` викликано `Notifications.setNotificationHandler` з параметрами `shouldShowAlert: true, shouldPlaySound: true`.

### При натисканні на сповіщення екран чату не відкривається

- **Причина:** Неправильний формат поля в об'єкті `data` сповіщення (наприклад, сервер передав `chatRoomId`, а клієнт очікує `conversationId`, або навпаки).
- **Вирішення:** У `handleNotificationNavigation` використовуйте універсальну перевірку:
  ```ts
  const roomId = data.chatRoomId || data.conversationId;
  if (roomId) router.push(`/chat/${roomId}`);
  ```

---

## 15. Повні готові лістинги файлів

<details>
<summary><b>1. convex/pushNotifications.ts</b></summary>

```ts
import { internalAction } from "./_generated/server";
import { v } from "convex/values";

export const sendPushNotification = internalAction({
  args: {
    pushToken: v.string(),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
  },
  handler: async (_ctx, args) => {
    if (!args.pushToken || !args.pushToken.startsWith("ExponentPushToken[")) {
      console.log("⚠️ Некоректний Expo pushToken:", args.pushToken);
      return { success: false, reason: "Invalid token" };
    }

    const payload = {
      to: args.pushToken,
      sound: "default",
      title: args.title,
      body: args.body,
      data: args.data ?? {},
      priority: "high",
      channelId: "default",
    };

    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log("📨 Push result:", JSON.stringify(result));
      return result;
    } catch (error) {
      console.error("❌ Помилка відправки push-сповіщення:", error);
      return { error: String(error) };
    }
  },
});

export const sendPushNotificationsBatch = internalAction({
  args: {
    notifications: v.array(
      v.object({
        pushToken: v.string(),
        title: v.string(),
        body: v.string(),
        data: v.optional(v.any()),
      }),
    ),
  },
  handler: async (_ctx, args) => {
    const validMessages = args.notifications
      .filter(
        (n) => n.pushToken && n.pushToken.startsWith("ExponentPushToken["),
      )
      .map((n) => ({
        to: n.pushToken,
        sound: "default",
        title: n.title,
        body: n.body,
        data: n.data ?? {},
        priority: "high",
        channelId: "default",
      }));

    if (validMessages.length === 0) return { sent: 0 };

    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validMessages),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("❌ Помилка пакетної відправки:", error);
      return { error: String(error) };
    }
  },
});
```

</details>

<details>
<summary><b>2. hooks/usePushNotifications.ts</b></summary>

```ts
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { useConvexAuth } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const savePushToken = useMutation(api.users.savePushToken);
  const router = useRouter();
  const lastNotificationResponse = Notifications.useLastNotificationResponse();

  const notificationListener = useRef<Notifications.EventSubscription | null>(
    null,
  );
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  const handleNotificationNavigation = (data: any) => {
    if (!data) return;
    const roomId = data.chatRoomId || data.conversationId;
    if (roomId) {
      router.push(`/chat/${roomId}`);
    } else {
      router.push("/(tabs)");
    }
  };

  useEffect(() => {
    if (
      lastNotificationResponse &&
      lastNotificationResponse.actionIdentifier ===
        Notifications.DEFAULT_ACTION_IDENTIFIER
    ) {
      const data = lastNotificationResponse.notification.request.content.data;
      handleNotificationNavigation(data);
    }
  }, [lastNotificationResponse]);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        savePushToken({ pushToken: token }).catch((err) => {
          console.error("Помилка збереження pushToken у Convex:", err);
        });
      }
    });

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("🔔 Foreground notification:", notification);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        handleNotificationNavigation(data);
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [isAuthenticated, isLoading]);
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FFFFFF",
      sound: "default",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );

    return tokenData.data;
  } catch (error) {
    console.error("Не вдалося отримати pushToken:", error);
    return null;
  }
}
```

</details>

---

## 🎯 Підсумок

Вітаємо! Ви успішно побудували надійну інфраструктуру Push-сповіщень:

1. Зареєстрували додаток у **Firebase Console** та підключили сучасний **FCM v1**.
2. Налаштували нативні дозволи та Notification Channel у **`expo-notifications`**.
3. Створили асинхронний бекенд-сервіс у **Convex** із плануванням відправки повідомлень у черзі.
4. Реалізували повноцінний **Deep Linking**, що дозволяє користувачам в один клік зі шторки переходити до потрібного чату як із фону, так і при "холодному старті".
