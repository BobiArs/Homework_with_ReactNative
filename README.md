# Практичне завдання: Modern Chat 4.0 — Мульти-середовищна конфігурація, EAS Build, OTA оновлення та Деплой

У цьому фінальному практичному завданні ви підготуєте свій мобільний месенджер (**`modern-chat`**) до **професійного релізу та деплою**.

Це завдання є логічним завершенням розробки додатку, яку ви вели впродовж попередніх модулів:
* **ДЗ 7** ([`lesson-07-module-05/docs-home-work-modern-chat`](../lesson-07-module-05/docs-home-work-modern-chat)) — базовий чат, кімнати та авторизація Convex Auth.
* **ДЗ 8** ([`lesson-08-module-05/home-work-08`](../lesson-08-module-05/home-work-08)) — редагування/видалення повідомлень, медіа у Convex Storage та індикатор набору тексту.
* **ДЗ 9** ([`lesson-09-module-06/home-work-09`](../lesson-09-module-06/home-work-09)) — свайп-жести Reanimated, цитування повідомлень та профілі користувачів.

Тепер ви перетворите свій проєкт із локального прототипу для Expo Go на **автономний нативний мобільний додаток**: налаштуєте ізольовані середовища (**Development**, **Preview**, **Production**), зберете автономний інсталяційний файл **APK**, налаштуєте доставку швидких оновлень «по повітрю» (**EAS Update / OTA**) та задеплоїте бекенд **Convex** у Production.

---

## 🎯 Мета завдання

1. **Ініціалізувати проєкт в EAS** (Expo Application Services) та зв'язати його з вашим Expo-акаунтом.
2. **Перевести конфігурацію на динамічний `app.config.ts`**:
   - Автоматична зміна назви додатку залежно від середовища (`Modern Chat Dev`, `Modern Chat Preview`, `Modern Chat`).
   - Унікальні Package Name / Bundle ID (`.dev`, `.preview`, базовий), що дозволяє встановлювати поруч усі 3 версії на один смартфон одночасно.
   - Динамічні схеми діплінків (`modernchat-dev`, `modernchat-preview`, `modernchat`).
3. **Налаштувати профілі збірок у `eas.json`**:
   - 🛠️ **`development`** — клієнт розробника для підключення до локального Metro Bundler.
   - 🚀 **`preview`** — автономна внутрішня збірка (Standalone APK / Internal distribution) для тестування без сервера Metro.
   - 🌟 **`production`** — релізна оптимізована збірка для публікації в Google Play / App Store.
4. **Підготувати унікальні іконки для різних середовищ** (з бейджами `DEV` та `PREVIEW` у папці `assets/images/icons/`).
5. **Налаштувати змінні середовища в EAS Dashboard** для кожного профілю окремо (`APP_ENV`, `EXPO_PUBLIC_CONVEX_URL`, `EXPO_PUBLIC_CONVEX_SITE_URL`, `CONVEX_DEPLOYMENT`).
6. **Зібрати та встановити автономний Preview APK** на фізичний пристрій або емулятор (через хмару EAS або локально `eas build --local`).
7. **Налаштувати та протестувати бездротові оновлення (EAS Update / OTA)**:
   - Внести зміни в UI та опублікувати JS-оновлення без повторної компіляції нативного коду.
8. **Виконати деплой схеми Convex у Production (`npx convex deploy`)**.

---

## 📁 Очікувана структура проєкту

```text
modern-chat/
├── app/
│   ├── (app)/
│   │   ├── _layout.tsx                 # Головний стек / таби чату
│   │   ├── index.tsx                   # Список чат-кімнат зі свайпами
│   │   ├── room/
│   │   │   └── [id].tsx                # Кімната листування, відповіді та медіа
│   │   ├── profile.tsx                 # Екран профілю користувача
│   │   └── user/
│   │       └── [id].tsx                # Публічний екран співрозмовника
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── sign-in.tsx                 # Авторизація
│   │   └── sign-up.tsx                 # Реєстрація
│   └── _layout.tsx                     # Кореневий макет (ConvexAuthProvider + GestureHandler)
├── assets/
│   └── images/
│       ├── icon.png                    # Базова релізна іконка (Production)
│       ├── android-icon-foreground.png
│       ├── android-icon-background.png
│       ├── splash-icon.png
│       └── icons/                      # 🎨 Іконки для різних збірок
│           ├── icon-dev.png            # Іконка з бейджем DEV
│           ├── android-icon-foreground-dev.png
│           ├── icon-preview.png        # Іконка з бейджем PREVIEW
│           └── android-icon-foreground-preview.png
├── components/                         # UI компоненти чату
├── constants/
│   └── theme.ts                        # Палітра кольорів
├── convex/                             # 🚀 Хмарний бекенд Convex
│   ├── _generated/
│   ├── auth.config.ts
│   ├── auth.ts
│   ├── messages.ts
│   ├── rooms.ts
│   ├── schema.ts
│   └── users.ts
├── app.config.ts                       # ⚙️ Динамічна конфігурація середовищ Expo
├── eas.json                            # 🚀 Конфігурація профілів EAS Build & Update
├── .env.local                          # Локальні змінні оточення
├── app.json.backup                     # Резервна копія оригінального app.json
├── package.json
└── tsconfig.json
```

---

## 📋 Покроковий план виконання

### Крок 1: Встановлення інструментів та ініціалізація EAS

1. Переконайтеся, що у вас встановлено глобальний інструмент **EAS CLI**:
   ```bash
   npm install -g eas-cli
   ```

2. Авторизуйтеся у вашому акаунті на [expo.dev](https://expo.dev):
   ```bash
   eas login
   ```

3. Зробіть резервну копію статичного файлу `app.json`:
   ```bash
   cp app.json app.json.backup
   ```

4. Ініціалізуйте проєкт в EAS (якщо ще не робили цього раніше):
   ```bash
   eas project:init
   ```
   *Команда зв'яже ваш локальний проєкт із хмарою Expo і пропише або виведе унікальний `projectId`.*

---

### Крок 2: Створення динамічної конфігурації `app.config.ts`

Створіть файл **`app.config.ts`** у корені проєкту `modern-chat`. Він динамічно підставлятиме назву, Bundle ID, Package Name, іконки та схеми залежно від змінної `process.env.APP_ENV`:

```typescript
// app.config.ts
import { ConfigContext, ExpoConfig } from "expo/config";

// EAS налаштування (отримайте з вашого app.json або після виконання eas project:init)
const EAS_PROJECT_ID = "ВАШ_EAS_PROJECT_ID"; // Наприклад, "3137fc56-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
const PROJECT_SLUG = "modern-chat";
const OWNER = "ваш-expo-username"; // Ваш логін на expo.dev

// Базова конфігурація Production
const APP_NAME = "Modern Chat";
const BUNDLE_IDENTIFIER = `com.${OWNER}.modernchat`;
const PACKAGE_NAME = `com.${OWNER}.modernchat`;
const SCHEME = "modernchat";

// Шляхи до базових іконок
const ICON = "./assets/images/icon.png";
const ADAPTIVE_ICON_FOREGROUND = "./assets/images/android-icon-foreground.png";
const ADAPTIVE_ICON_BACKGROUND = "./assets/images/android-icon-background.png";
const ADAPTIVE_ICON_MONOCHROME = "./assets/images/android-icon-monochrome.png";

export default ({ config }: ConfigContext): ExpoConfig => {
  const environment =
    (process.env.APP_ENV as "development" | "preview" | "production") ||
    "development";

  console.log("⚙️  Збірка Modern Chat для середовища:", environment);
  console.log("📦 Convex URL:", process.env.EXPO_PUBLIC_CONVEX_URL);

  const dynamicConfig = getDynamicAppConfig(environment);

  return {
    ...config,
    name: dynamicConfig.name,
    slug: PROJECT_SLUG,
    version: "1.0.0",
    orientation: "portrait",
    icon: dynamicConfig.icon,
    scheme: dynamicConfig.scheme,
    userInterfaceStyle: "dark",
    newArchEnabled: true,

    ios: {
      supportsTablet: true,
      bundleIdentifier: dynamicConfig.bundleIdentifier,
      buildNumber: "1",
      infoPlist: {
        NSCameraUsageDescription:
          "Додатку потрібен доступ до камери для фотографування та надсилання знімків у чат.",
        NSPhotoLibraryUsageDescription:
          "Додатку потрібен доступ до вашої медіатеки для надсилання фотографій та зміни аватарки.",
        NSMicrophoneUsageDescription:
          "Додатку потрібен доступ до мікрофона для запису голосових повідомлень.",
      },
    },

    android: {
      package: dynamicConfig.packageName,
      versionCode: 1,
      edgeToEdgeEnabled: true,
      adaptiveIcon: {
        backgroundColor: "#0F172A",
        foregroundImage: dynamicConfig.adaptiveIconForeground,
        backgroundImage: dynamicConfig.adaptiveIconBackground,
        monochromeImage: dynamicConfig.adaptiveIconMonochrome,
      },
      permissions: [
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.RECORD_AUDIO",
      ],
    },

    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },

    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#0F172A",
        },
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "Додатку потрібен доступ до ваших фотографій.",
          cameraPermission: "Додатку потрібен доступ до камери.",
        },
      ],
      "expo-secure-store",
    ],

    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },

    updates: {
      url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
    },
    runtimeVersion: {
      policy: "appVersion",
    },

    extra: {
      eas: {
        projectId: EAS_PROJECT_ID,
      },
      router: {},
    },

    owner: OWNER,
  };
};

// Функція генерації налаштувань для кожного середовища
export const getDynamicAppConfig = (
  environment: "development" | "preview" | "production"
) => {
  if (environment === "development") {
    return {
      name: `${APP_NAME} Dev`,
      bundleIdentifier: `${BUNDLE_IDENTIFIER}.dev`,
      packageName: `${PACKAGE_NAME}.dev`,
      icon: "./assets/images/icons/icon-dev.png",
      adaptiveIconForeground:
        "./assets/images/icons/android-icon-foreground-dev.png",
      adaptiveIconBackground: ADAPTIVE_ICON_BACKGROUND,
      adaptiveIconMonochrome: ADAPTIVE_ICON_MONOCHROME,
      scheme: `${SCHEME}-dev`,
    };
  }

  if (environment === "preview") {
    return {
      name: `${APP_NAME} Preview`,
      bundleIdentifier: `${BUNDLE_IDENTIFIER}.preview`,
      packageName: `${PACKAGE_NAME}.preview`,
      icon: "./assets/images/icons/icon-preview.png",
      adaptiveIconForeground:
        "./assets/images/icons/android-icon-foreground-preview.png",
      adaptiveIconBackground: ADAPTIVE_ICON_BACKGROUND,
      adaptiveIconMonochrome: ADAPTIVE_ICON_MONOCHROME,
      scheme: `${SCHEME}-preview`,
    };
  }

  // Production (за замовчуванням)
  return {
    name: APP_NAME,
    bundleIdentifier: BUNDLE_IDENTIFIER,
    packageName: PACKAGE_NAME,
    icon: ICON,
    adaptiveIconForeground: ADAPTIVE_ICON_FOREGROUND,
    adaptiveIconBackground: ADAPTIVE_ICON_BACKGROUND,
    adaptiveIconMonochrome: ADAPTIVE_ICON_MONOCHROME,
    scheme: SCHEME,
  };
};
```

> [!TIP]
> Після створення `app.config.ts` видаліть застарілий файл `app.json`:
> ```bash
> rm app.json
> ```

---

### Крок 3: Налаштування `eas.json` для збірок та OTA

Створіть або оновіть файл **`eas.json`** у корені проєкту:

```json
{
  "cli": {
    "version": ">= 16.28.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "environment": "development",
      "channel": "development"
    },
    "preview": {
      "distribution": "internal",
      "environment": "preview",
      "channel": "preview",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "autoIncrement": true,
      "environment": "production",
      "channel": "production"
    }
  },
  "submit": {
    "production": {}
  }
}
```

> **Важливо:** Рядок `"buildType": "apk"` у профілі `preview` вказує EAS збирати готовий автономний інсталяційний файл `.apk` замість формату `.aab` (який призначений виключно для Google Play Store).

---

### Крок 4: Створення іконок з бейджами для Dev та Preview

Створіть директорію `assets/images/icons/` та підготуйте окремі іконки з візуальними відмінностями:

```bash
mkdir -p assets/images/icons
cp assets/images/icon.png assets/images/icons/icon-dev.png
cp assets/images/android-icon-foreground.png assets/images/icons/android-icon-foreground-dev.png
cp assets/images/icon.png assets/images/icons/icon-preview.png
cp assets/images/android-icon-foreground.png assets/images/icons/android-icon-foreground-preview.png
```

* **`icon-dev.png`**: додайте помаранчеву позначку/стрічку з текстом **`DEV`** у кутку іконки.
* **`icon-preview.png`**: додайте синю або фіолетову позначку з текстом **`PREVIEW`**.

Це дозволить легко візуально розрізняти різні версії месенджера на робочому столі телефону.

---

### Крок 5: Налаштування змінних оточення в EAS Dashboard

В особистому кабінеті на [expo.dev](https://expo.dev) перейдіть до проєкту `modern-chat` → **Configuration** → **Environment variables** і додайте змінні для кожного середовища:

#### 1. Для середовища `Development`:
| Name | Value | Type |
| :--- | :--- | :--- |
| `APP_ENV` | `development` | Plain text |
| `EXPO_PUBLIC_CONVEX_URL` | Ваш Convex dev URL (з `.env.local`) | Plain text |
| `EXPO_PUBLIC_CONVEX_SITE_URL` | Ваш Convex dev site URL | Plain text |
| `CONVEX_DEPLOYMENT` | Ваш Convex deployment ID (dev:...) | Plain text |

#### 2. Для середовища `Preview`:
| Name | Value | Type |
| :--- | :--- | :--- |
| `APP_ENV` | `preview` | Plain text |
| `EXPO_PUBLIC_CONVEX_URL` | Той самий Convex URL | Plain text |
| `EXPO_PUBLIC_CONVEX_SITE_URL` | Той самий Convex site URL | Plain text |
| `CONVEX_DEPLOYMENT` | Той самий deployment ID | Plain text |

#### 3. Для середовища `Production`:
| Name | Value | Type |
| :--- | :--- | :--- |
| `APP_ENV` | `production` | Plain text |
| `EXPO_PUBLIC_CONVEX_URL` | Ваш Production Convex URL (після `npx convex deploy`) | Plain text |
| `EXPO_PUBLIC_CONVEX_SITE_URL` | Ваш Production Convex site URL | Plain text |
| `CONVEX_DEPLOYMENT` | Ваш Production deployment ID | Plain text |

Синхронізуйте локальний файл `.env.local`:
```bash
eas env:pull --environment development
```

---

### Крок 6: Збірка та встановлення автономного Preview APK

1. Запустіть збірку автономного інсталяційного APK-файлу:

   * **Варіант А (Хмарна збірка в інфраструктурі Expo):**
     ```bash
     eas build --platform android --profile preview
     ```

   * **Варіант Б (Швидка локальна збірка на вашому комп'ютері без очікування черги):**
     ```bash
     eas build --platform android --profile preview --local
     ```

2. Після завершення збірки завантажте та встановіть додаток **«Modern Chat Preview»** на свій смартфон чи емулятор (через QR-код, посилання або команду `adb install`).

3. **Перевірка автономності:**
   * Повністю вимкніть Metro Bundler / термінал комп'ютера.
   * Відкрийте встановлений додаток **«Modern Chat Preview»** на телефоні.
   * Переконайтеся, що додаток працює автономно: завантажує список кімнат, дозволяє листуватися, надсилати фото та переглядати профілі!

---

### Крок 7: Тестування швидких бездротових оновлень (EAS Update / OTA)

1. Зробіть будь-яку помітну візуальну зміну в інтерфейсі (наприклад, змініть колір хедера або додайте текст вітання у списку чатів).
2. Опублікуйте бездротове оновлення безпосередньо у канал **`preview`**:
   ```bash
   eas update --platform all --environment preview --channel preview --message "UI: оновлено стилі хедера та акцентні кольори"
   ```
3. Відкрийте додаток **«Modern Chat Preview»** на смартфоні, двічі повністю вивантажте його з пам'яті (Swipe to close) і запустіть знову.
4. **Результат:** Зміни інтерфейсу застосуються автоматично «по повітрю» без необхідності повторного завантаження або перевстановлення APK!

---

### Крок 8: Деплой бекенду Convex у Production

Перед фінальним релізом задеплойте схему бази даних, функції та аутентифікацію в окремий стабільний Production деплой:

```bash
npx convex deploy
```

---

## ⚡ Шпаргалка основних команд

| Дія | Команда |
| :--- | :--- |
| **Локальна розробка** | `npx convex dev` + `npx expo start -c` |
| **Збірка Dev Client** | `eas build --platform android --profile development` |
| **Збірка автономного Preview APK (хмара)** | `eas build --platform android --profile preview` |
| **Збірка Preview APK (локально на ПК)** | `eas build --platform android --profile preview --local` |
| **Збірка Production релізу (Google Play AAB)** | `eas build --platform android --profile production` |
| **Відправка OTA оновлення в канал Preview** | `eas update --platform all --environment preview --channel preview --message "..."` |
| **Стягнути змінні оточення з EAS** | `eas env:pull --environment development` |
| **Деплой Convex у Production** | `npx convex deploy` |

---

## 💯 Критерії оцінювання (100 балів)

| Критерій | Бали | Опис |
| :--- | :---: | :--- |
| **1. Динамічна конфігурація `app.config.ts`** | **25 б.** | Реалізовано динамічну зміну назви (`Modern Chat Dev/Preview`), Bundle ID / Package Name (`.dev`, `.preview`), permissions та схем діплінків залежно від `APP_ENV`. |
| **2. Налаштування `eas.json` та EAS Environment Variables** | **20 б.** | Описано профілі `development`, `preview` (тип `apk`), `production`, налаштовано змінні середовища в особистому кабінеті EAS. |
| **3. Іконки для різних середовищ** | **15 б.** | Підготовлено окремі версії іконок з бейджами `DEV` та `PREVIEW` у папці `assets/images/icons/`. |
| **4. Успішна автономна Preview збірка (APK)** | **25 б.** | Згенеровано працюючий автономний APK файл (хмарно або через `--local`), додаток відкривається без Metro та коректно взаємодіє з Convex. |
| **5. Демонстрація OTA оновлення (EAS Update)** | **15 б.** | Успішно надіслано та продемонстровано бездротове оновлення через команду `eas update`. |
| **РАЗОМ** | **100 б.** | |

---

## 📦 Формат здачі завдання

1. Завантажте оновлений код проєкту `modern-chat` у свій GitHub-репозиторій.
2. У файлі `README.md` вашого репозиторію додайте:
   - Посилання на публічну сторінку вашої Preview збірки в Expo Dashboard або пряме посилання / QR-код для завантаження APK.
   - Скріншот списку успішних збірок з панелі [expo.dev/builds](https://expo.dev).
   - Скріншот екрана телефону зі встановленим додатком `Modern Chat Preview` (видно іконку з бейджем).
   - Скріншот запущеного додатку з успішним входом та списком чатів.
3. Надішліть посилання на репозиторій на перевірку викладачу.
