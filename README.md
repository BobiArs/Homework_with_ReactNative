# Практичне завдання: Todo App 4.0 — Мульти-середовищна конфігурація, EAS Build, OTA оновлення та Публікація

У цьому фінальному практичному завданні ви підготуєте свій мобільний додаток (**`rn-todo-list`**) до **професійного релізу та публікації**. 

Ви навчитеся налаштовувати професійну інфраструктуру мобільної розробки: динамічну конфігурацію середовищ (**Development**, **Preview**, **Production**), хмарні збірки через **EAS Build**, генерацію автономних інсталяційних файлів (APK/IPA), доставку швидких бездротових оновлень (**EAS Update / OTA**) та деплой серверної логіки **Convex** у Production.

---

## 🎯 Мета завдання

1. **Ініціалізувати проєкт в EAS** (Expo Application Services) та зв'язати його з вашим Expo-акаунтом.
2. **Перевести конфігурацію на динамічний `app.config.ts`**:
   - Автоматична зміна назви додатку (`Todo App Dev`, `Todo App Preview`, `Todo App`).
   - Унікальні Package Name / Bundle ID (`.dev`, `.preview`, базовий), що дозволяє встановлювати поруч усі 3 версії на один смартфон.
   - Динамічні схеми діплінків та підключення іконок під кожне середовище.
3. **Налаштувати профілі збірок у `eas.json`**:
   - 🛠️ **`development`** — клієнт розробника для підключення до локального Metro Bundler.
   - 🚀 **`preview`** — автономна внутрішня збірка (Standalone APK/Internal distribution) для тестування без сервера Metro.
   - 🌟 **`production`** — релізна оптимізована збірка для публікації в Google Play / App Store.
4. **Підготувати унікальні іконки для різних середовищ** (з позначками `DEV` та `PREVIEW` у папці `assets/images/icons/`).
5. **Налаштувати змінні середовища в EAS Dashboard** для кожного профілю окремо (`APP_ENV`, `EXPO_PUBLIC_CONVEX_URL`, `CONVEX_DEPLOYMENT`).
6. **Зібрати та встановити автономний Preview APK** на фізичний пристрій або емулятор.
7. **Налаштувати та протестувати бездротові оновлення (EAS Update / OTA)**:
   - Внести зміни в UI та опублікувати JS-оновлення без повторної компіляції нативного коду.
8. **Виконати деплой схеми Convex у Production (`npx convex deploy`)**.

---

## 📁 Очікувана структура проєкту

```text
rn-todo-list/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx        # Таб-бар
│   │   ├── index.tsx          # 📝 Вкладка 1: Список справ (Convex)
│   │   ├── stats.tsx          # 📊 Вкладка 2: Статистика продуктивності
│   │   └── settings.tsx       # ⚙️ Вкладка 3: Налаштування
│   └── _layout.tsx            # Кореневий макет (ConvexProvider + ThemeProvider)
├── assets/
│   └── images/
│       ├── icon.png                   # Базова релізна іконка (Production)
│       ├── android-icon-foreground.png
│       ├── android-icon-background.png
│       ├── splash-icon.png
│       └── icons/                     # 🎨 Іконки для різних збірок
│           ├── icon-dev.png           # Іконка з бейджем DEV
│           ├── android-icon-foreground-dev.png
│           ├── icon-preview.png       # Іконка з бейджем PREVIEW
│           └── android-icon-foreground-preview.png
├── components/                # UI компоненти
├── context/
│   └── ThemeContext.tsx       # Тема оформлення
├── convex/                    # 🚀 Хмарний бекенд Convex
│   ├── schema.ts
│   └── todos.ts
├── app.config.ts              # ⚙️ Динамічна конфігурація середовищ Expo
├── eas.json                   # 🚀 Конфігурація профілів EAS Build & Update
├── .env.local                 # Локальні змінні оточення
├── app.json.backup            # Резервна копія оригінального app.json
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

3. Зробіть резервну копію файлу `app.json`:
   ```bash
   cp app.json app.json.backup
   ```

4. Ініціалізуйте проєкт в EAS (якщо ще не робили цього раніше):
   ```bash
   eas project:init
   ```
   *Команда зв'яже ваш локальний проєкт з хмарою Expo і виведе `projectId`.*

---

### Крок 2: Створення динамічної конфігурації `app.config.ts`

Створіть файл **`app.config.ts`** у корені проєкту `rn-todo-list`. Він динамічно підставлятиме ідентифікатори відповідно до значення змінної `process.env.APP_ENV`:

```typescript
import { ConfigContext, ExpoConfig } from "expo/config";

// EAS налаштування (отримайте з вашого app.json або після eas project:init)
const EAS_PROJECT_ID = "YOUR_EAS_PROJECT_ID"; // Наприклад, "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
const PROJECT_SLUG = "rn-todo-list";
const OWNER = "your-expo-username"; // Ваш логін на expo.dev

// Базова конфігурація Production
const APP_NAME = "Todo App";
const BUNDLE_IDENTIFIER = `com.${OWNER}.rntodolist`;
const PACKAGE_NAME = `com.${OWNER}.rntodolist`;
const SCHEME = "rntodolist";

// Шляхи до базових іконок
const ICON = "./assets/images/icon.png";
const ADAPTIVE_ICON_FOREGROUND = "./assets/images/android-icon-foreground.png";
const ADAPTIVE_ICON_BACKGROUND = "./assets/images/android-icon-background.png";
const ADAPTIVE_ICON_MONOCHROME = "./assets/images/android-icon-monochrome.png";

export default ({ config }: ConfigContext): ExpoConfig => {
  const environment =
    (process.env.APP_ENV as "development" | "preview" | "production") ||
    "development";

  console.log("⚙️  Building rn-todo-list for environment:", environment);
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
    userInterfaceStyle: "automatic",
    newArchEnabled: true,

    ios: {
      supportsTablet: true,
      bundleIdentifier: dynamicConfig.bundleIdentifier,
      buildNumber: "1",
    },

    android: {
      package: dynamicConfig.packageName,
      versionCode: 1,
      edgeToEdgeEnabled: true,
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: dynamicConfig.adaptiveIconForeground,
        backgroundImage: dynamicConfig.adaptiveIconBackground,
        monochromeImage: dynamicConfig.adaptiveIconMonochrome,
      },
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
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000",
          },
        },
      ],
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
> Після створення `app.config.ts`, статичний файл `app.json` можна видалити (`rm app.json`).

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
      "channel": "preview"
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

---

### Крок 4: Створення іконок з бейджами для Dev та Preview

Створіть папку `assets/images/icons/` та підготуйте окремі іконки з візуальними позначками:

```bash
mkdir -p assets/images/icons
cp assets/images/icon.png assets/images/icons/icon-dev.png
cp assets/images/android-icon-foreground.png assets/images/icons/android-icon-foreground-dev.png
cp assets/images/icon.png assets/images/icons/icon-preview.png
cp assets/images/android-icon-foreground.png assets/images/icons/android-icon-foreground-preview.png
```

- **`icon-dev.png`**: додайте помаранчеву стрічку/бейдж з написом **`DEV`** у кутку.
- **`icon-preview.png`**: додайте синю стрічку/бейдж з написом **`PREVIEW`**.

---

### Крок 5: Налаштування змінних оточення в EAS Dashboard

В особистому кабінеті на [expo.dev](https://expo.dev) перейдіть до проєкту `rn-todo-list` → **Configuration** → **Environment variables** і додайте змінні для кожного середовища:

#### 1. Для середовища `Development`:
| Name | Value | Type |
| :--- | :--- | :--- |
| `APP_ENV` | `development` | String |
| `EXPO_PUBLIC_CONVEX_URL` | Ваш Convex dev URL (з `.env.local`) | String |
| `CONVEX_DEPLOYMENT` | Ваш Convex dev deployment ID | String |

#### 2. Для середовища `Preview`:
| Name | Value | Type |
| :--- | :--- | :--- |
| `APP_ENV` | `preview` | String |
| `EXPO_PUBLIC_CONVEX_URL` | Той самий Convex URL (або окремий staging деплой) | String |
| `CONVEX_DEPLOYMENT` | Той самий deployment ID | String |

#### 3. Для середовища `Production`:
| Name | Value | Type |
| :--- | :--- | :--- |
| `APP_ENV` | `production` | String |
| `EXPO_PUBLIC_CONVEX_URL` | Ваш Production Convex URL | String |
| `CONVEX_DEPLOYMENT` | Ваш Production deployment ID | String |

Стягніть змінні в локальний файл:
```bash
eas env:pull --environment development
```

---

### Крок 6: Збірка та встановлення автономного Preview APK

1. Запустіть хмарну збірку автономного файлу:
   - **Для Android (APK):**
     ```bash
     eas build --platform android --profile preview
     ```
   - **Для iOS (Simulator/Ad-hoc):**
     ```bash
     eas build --platform ios --profile preview
     ```

2. Після завершення збірки завантажте та встановіть згенерований додаток **«Todo App Preview»** на свій телефон або емулятор.
3. Переконайтеся, що додаток відкривається **без запущеного Metro Bundler / комп'ютера** та успішно синхронізує завдання з базою Convex!

---

### Крок 7: Тестування швидких бездротових оновлень (EAS Update / OTA)

1. Зробіть будь-яку помітну візуальну зміну в додатку (наприклад, змініть колір кнопки в `TodoForm.tsx` або додайте привітальне повідомлення в `Header.tsx`).
2. Опублікуйте бездротове оновлення безпосередньо у канал **`preview`**:
   ```bash
   eas update --platform all --environment preview --channel preview --message "UI: оновлено колір кнопок та заголовок"
   ```
3. Відкрийте додаток **«Todo App Preview»** на телефоні, повністю закрийте його (вивантажте з пам'яті) і відкрийте знову.
4. **Результат:** Зміни інтерфейсу застосуються автоматично по повітрю без перевстановлення APK!

---

### Крок 8: Деплой бекенду Convex у Production

Перед фінальною публікацією відправте схему та серверні функції у Production деплой Convex:

```bash
npx convex deploy
```

---

## ⚡ Шпаргалка основних команд

| Дія | Команда |
| :--- | :--- |
| **Локальна розробка** | `npx convex dev` + `npx expo start -c` |
| **Збірка Dev Client** | `eas build --platform android --profile development` |
| **Збірка автономного Preview APK** | `eas build --platform android --profile preview` |
| **Збірка Production релізу** | `eas build --platform all --profile production` |
| **Відправка OTA оновлення в Preview** | `eas update --platform all --environment preview --channel preview --message "..."` |
| **Стягнути змінні з EAS** | `eas env:pull --environment development` |
| **Деплой Convex у хмару** | `npx convex deploy` |

---

## 💯 Критерії оцінювання (100 балів)

| Критерій | Бали | Опис |
| :--- | :---: | :--- |
| **1. Динамічна конфігурація `app.config.ts`** | **25 б.** | Реалізовано динамічну зміну назви, Bundle ID / Package Name (`.dev`, `.preview`) та схем діплінків залежно від `APP_ENV`. |
| **2. Налаштування `eas.json` та EAS Environment Variables** | **20 б.** | Описано профілі `development`, `preview`, `production` з відповідними каналами, налаштовано змінні в EAS Dashboard. |
| **3. Іконки для різних середовищ** | **15 б.** | Створено окремі версії іконок з позначками `DEV` та `PREVIEW` у папці `assets/images/icons/`. |
| **4. Успішна автономна Preview збірка** | **25 б.** | Згенеровано збірку профілю `preview` (APK або iOS build), додаток самостійно працює без Metro Bundler та підключається до Convex. |
| **5. Демонстрація OTA оновлення (EAS Update)** | **15 б.** | Успішно відправлено та продемонстровано застосування бездротового оновлення через команду `eas update`. |
| **РАЗОМ** | **100 б.** | |

---

## 📦 Формат здачі завдання

1. Завантажте оновлений код у свій GitHub-репозиторій.
2. У файлі `README.md`:
   - Додайте посилання на публічну сторінку вашої Preview збірки в Expo Dashboard (або QR-код для завантаження APK).
   - Прикріпіть скріншот списку збірок з консолі [expo.dev/builds](https://expo.dev).
   - Прикріпіть 1-2 скріншоти встановленого Preview додатку на телефоні з кастомною іконкою `PREVIEW`.
3. Надішліть посилання на репозиторій на перевірку.
