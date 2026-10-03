import { ConfigContext, ExpoConfig } from "expo/config";

// EAS налаштування (отримайте з вашого app.json або після виконання eas project:init)
const EAS_PROJECT_ID = "486ba263-d184-4a0d-90f7-d087fadc7b32"; // Наприклад, "3137fc56-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
const PROJECT_SLUG = "modern-chat";
const OWNER = "bobi_it_new"; // Ваш логін на expo.dev
const SAFE_OWNER = OWNER.replace(/_/g, ""); // "bobiitnew" (iOS bundle identifier не може містити підкреслень '_')

// Базова конфігурація Production
const APP_NAME = "Modern Chat By Bobi";
const BUNDLE_IDENTIFIER = `com.${SAFE_OWNER}.modernchat.bobi`;
const PACKAGE_NAME = `com.${SAFE_OWNER}.modernchat.bobi`;
const SCHEME = "modernchat-by-bobi";

// Шляхи до базових іконок
const ICON = "./assets/images/icons/icon.jpg";
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
  const isDev = process.env.APP_ENV === "development";
  const APP_NAME = isDev ? "Modern Chat Dev" : "Modern Chat";
  const PACKAGE_NAME = "com.modernchat.app";

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
        projectId: config.extra?.eas?.projectId ?? EAS_PROJECT_ID,
      },
    },

    experiments: {
      typedRoutes: true,
    },
  };
};

// Функція генерації налаштувань для кожного середовища
export const getDynamicAppConfig = (
  environment: "development" | "preview" | "production",
) => {
  if (environment === "development") {
    return {
      name: `${APP_NAME} Dev`,
      bundleIdentifier: `${BUNDLE_IDENTIFIER}.dev`,
      packageName: `${PACKAGE_NAME}.dev`,
      icon: "./assets/images/icons/icon-dev.jpg",
      adaptiveIconForeground:
        "./assets/images/icons/android-icon-foreground-dev.jpg",
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
      icon: "./assets/images/icons/icon-preview.jpg",
      adaptiveIconForeground: "./assets/images/icons/icon-preview.jpg",
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
    adaptiveIconForeground: ICON,
    adaptiveIconBackground: ADAPTIVE_ICON_BACKGROUND,
    adaptiveIconMonochrome: ADAPTIVE_ICON_MONOCHROME,
    scheme: SCHEME,
  };
};
