# Інструкція 16: Локальна збірка та деплой Android додатку Modern Chat (Continuous Native Generation, Gradle Build & Standalone APK) 🚀📦

У цій інструкції ми здійснюємо фінальний інженерний перехід: перетворюємо наш React Native / Expo проєкт **`modern-chat`** зі стану розробницького прототипу під Expo Go на **повноцінний автономний нативний мобільний додаток (Standalone APK)**, зібраний локально за допомогою **Continuous Native Generation (CNG)** та збирача **Gradle 8+**.

Зібраний файл `.apk` повністю незалежний від комп'ютера розробника: його можна передати на будь-який смартфон чи емулятор Android, встановити та використовувати без запущеного сервера Metro Bundler. Додаток безпосередньо з'єднується з хмарною базою даних **Convex** та зберігає всі мультимедійні можливості, реалізовані у попередніх домашніх завданнях (голосові повідомлення, відеокружечки, звукова хвиля, реакції, ролі в чатах, фотографії та автентифікацію).

---

## 📚 Зміст

1. [Архітектура нативної збірки (Continuous Native Generation)](#1-архітектура-нативної-збірки-continuous-native-generation)
2. [Крок 1: Перевірка та налаштування локального оточення (JDK 17 та Android SDK)](#крок-1-перевірка-та-налаштування-локального-оточення-jdk-17-та-android-sdk)
3. [Крок 2: Динамічна конфігурація app.config.ts під проект Modern Chat](#крок-2-динамічна-конфігурація-appconfigts-під-проект-modern-chat)
4. [Крок 3: Перевірка змінних середовища Convex (.env.local)](#крок-3-перевірка-змінних-середовища-convex-envlocal)
5. [Крок 4: Генерація нативного коду (npx expo prebuild)](#крок-4-генерація-нативного-коду-npx-expo-prebuild)
6. [Крок 5: Налаштування android/local.properties та пам'яті Gradle](#крок-5-налаштування-androidlocalproperties-та-памяті-gradle)
7. [Крок 6: Компіляція Debug APK (assembleDebug)](#крок-6-компіляція-debug-apk-assembledebug)
8. [Крок 7: Компіляція автономного Release APK (assembleRelease)](#крок-7-компіляція-автономного-release-apk-assemblerelease)
9. [Крок 8: Підключення пристрою та встановлення через ADB](#крок-8-підключення-пристрою-та-встановлення-через-adb)
10. [Крок 9: Тестування автономної роботи додатку](#крок-9-тестування-автономної-роботи-додатку)
11. [Крок 10: Бонус — локальна збірка через EAS CLI (eas build --local)](#крок-10-бонус--локальна-збірка-через-eas-cli-eas-build---local)
12. [Крок 11: Вирішення типових помилок збірки (Troubleshooting)](#крок-11-вирішення-типових-помилок-збірки-troubleshooting)
13. [Чекліст готовності та здача результатів](#чекліст-готовності-та-здача-результатів)

---

## 1. Архітектура нативної збірки (Continuous Native Generation)

До цього моменту додаток запускався всередині пісочниці **Expo Go**. Хоча Expo Go зручний для швидкого старту, він має суттєві обмеження:

- Вимагає постійного з'єднання з комп'ютером через Metro Bundler (`npx expo start`).
- Містить фіксований набір C++ бібліотек та не дозволяє додавати кастомні нативні модулі.
- Не оптимізований за розміром та швидкодією для кінцевих користувачів.

Сучасний підхід Expo базується на **Continuous Native Generation (CNG)**:

```
                    ┌─────────────────────────┐
                    │      app.config.ts      │
                    │ (Конфігурація проекту)  │
                    └────────────┬────────────┘
                                 │
                     npx expo prebuild --clean
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │      android/ папка     │
                    │  AndroidManifest.xml    │
                    │  build.gradle / NDK     │
                    │  Нативні плагіни C++/Kt │
                    └────────────┬────────────┘
                                 │
                   ./gradlew assembleRelease
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │     app-release.apk     │
                    │  Автономний застосунок  │
                    │  (JS Bundle + Hermes)   │
                    └─────────────────────────┘
```

Папка `/android` є артефактом збірки (вона додається в `.gitignore`). Уся конфігурація описується у `app.config.ts`, а збірка здійснюється компілятором **Gradle**.

---

## Крок 1: Перевірка та налаштування локального оточення (JDK 17 та Android SDK)

Для локальної збірки потрібні два фундаментальні інструменти:

1. **Java Development Kit (JDK 17)** — обов'язково LTS-версія 17 (версії 21+ призводять до помилок несумісності Gradle).
2. **Android SDK** — містить компілятори платформи, утиліту `adb` та нативні інструменти збірки.

### 1.1. Перевірка версії Java

Відкрийте термінал та виконайте:

```bash
javac -version
java -version
```

Очікувана відповідь: версія повинна починатися з `17.x.x` (наприклад, `javac 17.0.12` або `17.0.20`).

> [!CAUTION]
> Якщо у вас встановлено Java 21, 23 чи новішу, Gradle завершить збірку з помилкою `Unsupported class file major version`. Встановіть саме **OpenJDK 17**:
>
> - **Ubuntu / Debian / Mint:** `sudo apt update && sudo apt install -y openjdk-17-jdk`
> - **macOS:** `brew install openjdk@17`
> - **Windows:** `winget install Microsoft.OpenJDK.17` або [Adoptium Temurin 17](https://adoptium.net/temurin/releases/?version=17).

### 1.2. Перевірка змінних оточення Android SDK

Виконайте команду:

```bash
echo $ANDROID_HOME
adb --version
```

Якщо змінні не встановлені, додайте їх у ваш профіль оболонки (`~/.bashrc` або `~/.zshrc` на Linux/macOS):

```bash
# Для Linux:
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
```

Для **Windows** додайте системні змінні через панель керування:

- `JAVA_HOME` ➔ `C:\Program Files\Microsoft\jdk-17.x.x-hotspot\`
- `ANDROID_HOME` ➔ `C:\Users\<Ваше_Ім'я>\AppData\Local\Android\Sdk`
- До змінної `Path`: `%JAVA_HOME%\bin`, `%ANDROID_HOME%\platform-tools`, `%ANDROID_HOME%\cmdline-tools\latest\bin`.

### 1.3. Прийняття ліцензій Android SDK

Перед першим пребілдом прийміть умови ліцензій Google:

```bash
yes | sdkmanager --licenses
```

_(На Windows: запустіть `sdkmanager --licenses` та натискайте `y` на кожному питанні)._

---

## Крок 2: Динамічна конфігурація app.config.ts під проект Modern Chat

У нашому проєкті **`modern-chat`** конфігурація повинна динамічно змінювати назву застосунку та ідентифікатор пакета (`packageName`) залежно від змінної `APP_ENV`. Крім того, додаток містить усі мультимедійні плагіни (`expo-audio`, `expo-camera`, `expo-image-picker`), розроблені у попередніх ДЗ.

Перевірте або створіть файл `app.config.ts` у корені проєкту `modern-chat`:

```typescript
// app.config.ts
import { ConfigContext, ExpoConfig } from "expo/config";

// Базові налаштування додатку Modern Chat
const APP_NAME = "Modern Chat";
const PACKAGE_NAME = "com.modernchat.app";
const SCHEME = "modernchat";
const SLUG = "modernchat"; // або "modern-chat"

export default ({ config }: ConfigContext): ExpoConfig => {
  // Визначаємо поточне середовище (за замовчуванням development)
  const environment =
    (process.env.APP_ENV as "development" | "preview" | "production") ||
    "development";

  console.log("⚙️  Поточне середовище збірки:", environment);
  console.log("📦 URL бази даних Convex:", process.env.EXPO_PUBLIC_CONVEX_URL);

  const isDev = environment === "development";

  return {
    ...config,

    name: isDev ? `${APP_NAME} Dev` : APP_NAME,
    slug: SLUG,
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: isDev ? `${SCHEME}-dev` : SCHEME,
    userInterfaceStyle: "dark",

    ios: {
      supportsTablet: true,
      bundleIdentifier: isDev ? `${PACKAGE_NAME}.dev` : PACKAGE_NAME,
      infoPlist: {
        NSCameraUsageDescription:
          "Додатку Modern Chat потрібен доступ до камери для запису відеокружечків та фотографій.",
        NSPhotoLibraryUsageDescription:
          "Додатку Modern Chat потрібен доступ до медіатеки для вибору та надсилання фотографій.",
        NSMicrophoneUsageDescription:
          "Додатку Modern Chat потрібен доступ до мікрофона для запису звуку у відеоповідомленнях та голосових повідомленнях.",
      },
    },

    android: {
      package: isDev ? `${PACKAGE_NAME}.dev` : PACKAGE_NAME,
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
      ],
    },

    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
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
            "Додатку Modern Chat потрібен доступ до камери для запису відеокружечків.",
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
          photosPermission:
            "Додатку Modern Chat потрібен доступ до ваших фотографій.",
        },
      ],
      "expo-secure-store",
    ],

    experiments: {
      typedRoutes: true,
    },
  };
};
```

> [!IMPORTANT]
> Переконайтеся, що старий файл `app.json` видалено (або збережено як `app.json.backup`), оскільки він може викликати конфлікти з динамічним `app.config.ts`.
>
> Перевірити валідність конфігурації можна командою:
>
> ```bash
> npx expo config --type public
> ```

---

## Крок 3: Перевірка змінних середовища Convex (.env.local)

Автономний APK під час запуску на телефоні не має доступу до вашої локальної файлової системи. Тому всі змінні бекенду імплантуються у JavaScript-бандл під час компіляції завдяки префіксу `EXPO_PUBLIC_`.

Переконайтеся, що у файлі `.env.local` коректно вказано URL вашого Convex-проекту:

```bash
# .env.local
CONVEX_DEPLOYMENT=dev:your-deployment-id
EXPO_PUBLIC_CONVEX_URL=https://your-deployment-id.convex.cloud
EXPO_PUBLIC_CONVEX_SITE_URL=https://your-deployment-id.convex.site
```

Також перевірте, що у файлі `.gitignore` присутні рядки для захисту ключів та нативних артефактів:

```gitignore
# local env files
.env*.local

# generated native folders
/ios
/android
```

---

## Крок 4: Генерація нативного коду (npx expo prebuild)

Запустіть процес генерації нативної структури проєкту Android:

```bash
npx expo prebuild --platform android --clean
```

### Що робить ця команда:

1. Зчитує `app.config.ts` та резолвить усі нативні плагіни (`expo-camera`, `expo-audio`, `expo-splash-screen`, `expo-secure-store`).
2. Створює директорію `android/` з повною структурою Gradle-проєкту.
3. Автоматично наповнює `AndroidManifest.xml` необхідними дозволами (камера, мікрофон, читання сховища).
4. Генерує `android/app/build.gradle` та виконуваний скрипт `gradlew`.

---

## Крок 5: Налаштування android/local.properties та пам'яті Gradle

Gradle повинен знати точне розташування вашого Android SDK. У багатьох випадках збірка зупиняється через помилку `SDK location not found`.

### 5.1. Створення `android/local.properties`

Створіть або оновіть файл `android/local.properties` усередині згенерованої папки `android/`:

- **Для Linux:**
  ```properties
  sdk.dir=/home/<ваше_ім'я_користувача>/Android/Sdk
  ```
- **Для macOS:**
  ```properties
  sdk.dir=/Users/<ваше_ім'я>/Library/Android/sdk
  ```
- **Для Windows:**
  ```properties
  sdk.dir=C\:\\Users\\<Ваше_Ім'я>\\AppData\\Local\\Android\\Sdk
  ```

### 5.2. Оптимізація виділення пам'яті (`android/gradle.properties`)

React Native New Architecture компілює значну кількість C++ коду (Hermes, TurboModules, Fabric). Щоб процес не впав через `OutOfMemoryError` або `Daemon disappeared`, відкрийте `android/gradle.properties` та переконайтеся у наявності параметрів:

```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m
org.gradle.parallel=true
org.gradle.caching=true
```

---

## Крок 6: Компіляція Debug APK (assembleDebug)

Debug APK збирається найшвидше, оскільки компілятор не виконує важкої оптимізації розміру байткоду.

Перейдіть у папку `android` та запустіть компіляцію:

### На Linux / macOS:

```bash
cd android
chmod +x gradlew
./gradlew assembleDebug
```

### На Windows (PowerShell):

```powershell
cd android
.\gradlew.bat assembleDebug
```

> [!NOTE]
> Перша збірка зазвичай триває від 5 до 12 хвилин, оскільки Gradle завантажує залежності, NDK та компілює нативні модулі C++. Усі наступні збірки завдяки кешу триватимуть 1–2 хвилини.

Після успішного завершення ви побачите повідомлення:

```text
BUILD SUCCESSFUL in 3m 48s
xxx actionable tasks: xxx executed
```

📍 **Шлях до готового файлу:**

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Крок 7: Компіляція автономного Release APK (assembleRelease)

Для створення фінального автономного дистрибутива, готового до відправки друзям або встановлення на будь-який телефон без очікування сервера розробника:

### Для Linux / macOS:

```bash
# Збірка з production-конфігурацією (назва "Modern Chat" замість "Modern Chat Dev"):
cd ..
APP_ENV=production npx expo prebuild --platform android --clean
cd android
./gradlew assembleRelease
```

### Для Windows:

```powershell
cd ..
$env:APP_ENV="production"; npx expo prebuild --platform android --clean
cd android
.\gradlew.bat assembleRelease
```

📍 **Шлях до готового файлу Release:**

```text
android/app/build/outputs/apk/release/app-release.apk
```

Цей файл розміром ~45–60 МБ містить повністю скомпільований JavaScript-бандл, стиснуті ресурси та оптимізований нативний код.

---

## Крок 8: Підключення пристрою та встановлення через ADB

### 8.1. Увімкнення USB-налагодження на Android-смартфоні:

1. Відкрийте **Налаштування** ➔ **Про телефон**.
2. Натисніть **«Номер збірки»** (Build Number) 7 разів поспіль.
3. Перейдіть у новий розділ **«Параметри розробника»** (Developer Options).
4. Увімкніть **«Налагодження по USB»** (USB Debugging) та **«Встановлення через USB»**.
5. Підключіть смартфон до комп'ютера кабелем. На екрані смартфона підтвердіть дозвіл: _«Завжди дозволяти з цього комп'ютера»_.

### 8.2. Перевірка підключення:

У терміналі виконайте:

```bash
adb devices
```

Ви повинні побачити рядок з ID вашого пристрою та статусом `device`:

```text
List of devices attached
RFCW31ABCDE    device
```

### 8.3. Встановлення APK на пристрій:

З кореня проєкту виконайте команду:

```bash
# Для Release APK:
adb install -r android/app/build/outputs/apk/release/app-release.apk

# Для Debug APK:
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

_(Ключ `-r` забезпечує перевстановлення поверх існуючого застосунку зі збереженням кешу даних)._

У разі успіху з'явиться повідомлення:

```text
Performing Streamed Install
Success
```

---

## Крок 9: Тестування автономної роботи додатку

Це найважливіший крок перевірки:

1. **Зупиніть комп'ютерний сервер:** переконайтеся, що `npx expo start` зупинено (`Ctrl + C`).
2. **Від'єднайте кабель** від смартфона (або вимкніть Wi-Fi на комп'ютері).
3. **Запустіть додаток `Modern Chat` на смартфоні з меню лаунчера.**
4. **Перевірте чекліст автономності:**
   - [ ] Застосунок запускається без помилки `Unable to connect to Metro`.
   - [ ] Відображається правильна темна іконка та назва додатку в системі (`Modern Chat` або `Modern Chat Dev`).
   - [ ] Працює реєстрація або вхід користувача через Convex Auth.
   - [ ] Завантажуються кімнати та повідомлення з чатів.
   - [ ] Працює запис та прослуховування голосових повідомлень (запит дозволу на мікрофон).
   - [ ] Працює зйомка відеокружечка фронтальною камерою (запит дозволу на камеру) та надсилання у Convex Storage.
   - [ ] Працює інтерактивна звукова хвиля (Waveform) та перемикання швидкості відтворення (1x / 1.5x / 2x).

---

## Крок 10: Бонус — локальна збірка через EAS CLI (eas build --local)

Якщо ви бажаєте скористатися офіційним конвеєром EAS без ручного виклику Gradle:

1. Створіть файл `eas.json` у корені проєкту:

```json
{
  "cli": {
    "version": ">= 16.0.0"
  },
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

2. Запустіть локальну компіляцію через утиліту EAS:

```bash
npx eas-cli build --platform android --profile preview --local
```

EAS проведе системні перевірки, виконає пребілд і збереже готовий APK безпосередньо у робочу директорію.

---

## Крок 11: Вирішення типових помилок збірки (Troubleshooting)

### 🔴 Помилка: `SDK location not found. Define a valid SDK location with an ANDROID_HOME environment variable or by setting the sdk.dir path in local.properties`

- **Рішення:** Створіть файл `android/local.properties` і пропишіть абсолютний шлях до вашого SDK (`sdk.dir=/home/<user>/Android/Sdk` для Linux або `sdk.dir=C\:\\Users\\<user>\\AppData\\Local\\Android\\Sdk` для Windows).

---

### 🔴 Помилка: `Unsupported class file major version 65` (або `67`)

- **Причина:** У системі активна Java версії 21 або 23 замість Java 17.
- **Рішення:**
  1. Перевірте версію: `javac -version`.
  2. Перемкніться на OpenJDK 17 (`export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64`).
  3. Зупиніть підвислі демони Gradle: `cd android && ./gradlew --stop`.

---

### 🔴 Помилка: `Expiring Daemon because JVM heap space is exhausted` або `Daemon disappeared`

- **Причина:** Нестача оперативної пам'яті для JVM під час компіляції C++ коду.
- **Рішення:** У файлі `android/gradle.properties` встановіть `org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m` та закрийте важкі програми (браузери, емулятори) перед збіркою.

---

### 🔴 Помилка: `Permission denied: ./gradlew`

- **Причина:** Скрипт Gradle Wrapper не має прапорця виконуваного файлу на Linux/macOS.
- **Рішення:**
  ```bash
  cd android
  chmod +x gradlew
  ```

---

### 🔴 Помилка: `Failed to install the following Android SDK packages as some licences have not been accepted`

- **Рішення:** Виконайте у терміналі команду прийняття ліцензій:
  ```bash
  yes | sdkmanager --licenses
  ```

---

### 🔴 Збірка падає через застарілий кеш після зміни плагінів

- **Рішення:** Очистіть нативну папку та згенеруйте її заново:
  ```bash
  cd ..
  rm -rf android
  npx expo prebuild --platform android --clean
  ```

---

## Чекліст готовності та здача результатів

Перед здачею домашнього завдання перевірте:

- [ ] Локально встановлено OpenJDK 17 та Android SDK.
- [ ] Файл `app.config.ts` містить правильні налаштування для `Modern Chat`, адаптивну іконку, плагіни `expo-audio`, `expo-camera`, `expo-splash-screen`, `expo-image-picker` та `expo-secure-store`.
- [ ] Пребілд `npx expo prebuild --platform android --clean` успішно генерує папку `android/`.
- [ ] У `android/local.properties` вказано точний шлях до вашого Android SDK (`sdk.dir`).
- [ ] Успішно виконано команду `./gradlew assembleDebug` або `./gradlew assembleRelease` зі статусом `BUILD SUCCESSFUL`.
- [ ] APK встановлено на реальний пристрій або емулятор через `adb install`.
- [ ] Додаток працює автономно з вимкненим терміналом комп'ютера, коректно відображає дані з Convex і записує голосові/відеоповідомлення.
