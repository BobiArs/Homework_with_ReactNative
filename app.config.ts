import { ConfigContext, ExpoConfig } from "expo/config";

// EAS налаштування (отримайте з вашого app.json або після eas project:init)
const EAS_PROJECT_ID = "c976cfd5-2984-41e2-a72a-e0add7241966"; // Наприклад, "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
const PROJECT_SLUG = "home-work_2";
const OWNER = "bobi_it_new"; // Ваш логін на expo.dev

// Базова конфігурація Production
const APP_NAME = "Todo App by Bobi";
const CLEAN_OWNER = OWNER.replace(/_/g, "");
const BUNDLE_IDENTIFIER = `com.${CLEAN_OWNER}.rntodolistbobi`;
const PACKAGE_NAME = `com.${CLEAN_OWNER}.rntodolistbobi`;
const SCHEME = "rntodolistbobi";

// Шляхи до базових іконок
const ICON = "./assets/images/icon.png";
const ADAPTIVE_ICON_FOREGROUND = "./assets/images/android-icon-foreground.png";
const ADAPTIVE_ICON_BACKGROUND = "./assets/images/android-icon-background.png";
const ADAPTIVE_ICON_MONOCHROME = "./assets/images/android-icon-monochrome.png";

export default ({ config }: ConfigContext): ExpoConfig => {
  const rawEnv = process.env.APP_ENV?.trim();
  const environment =
    (rawEnv as "development" | "preview" | "production") ||
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

    ios: {
      supportsTablet: true,
      bundleIdentifier: dynamicConfig.bundleIdentifier,
      buildNumber: "1",
    },

    android: {
      package: dynamicConfig.packageName,
      versionCode: 1,
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
  environment: "development" | "preview" | "production",
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
