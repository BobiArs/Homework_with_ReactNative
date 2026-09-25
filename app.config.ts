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

  return {
    ...config,
    name: dynamicConfig.name,
    slug: PROJECT_SLUG,
    version: "1.0.0",
    orientation: "portrait",
    icon: dynamicConfig.icon,
    scheme: dynamicConfig.scheme,
    userInterfaceStyle: "dark",

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
      icon: dynamicConfig.icon,
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
