// Хук виконує такі ключові завдання:

// 1. **Foreground Handler:** налаштовує показ системного банера та звук, коли додаток активний.
// 2. **Android Channel:** реєструє Notification Channel `default` із максимальною важливістю `MAX`.
// 3. **Запит дозволів:** викликає системний діалог Android 13+ / iOS.
// 4. **Отримання токена:** звертається до сервісу Expo та зберігає токен у базі Convex через `api.users.savePushToken`.
// 5. **Deep Linking у фоні:** слухач `addNotificationResponseReceivedListener` реагує на тап по сповіщенню, коли додаток був згорнутий.
// 6. **Deep Linking при холодному старті (Cold Start):** хук `Notifications.useLastNotificationResponse()` виявляє тап по сповіщенню, якщо додаток був повністю закритий!

import { api } from "@/convex/_generated/api";
import { useConvexAuth } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

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
      router.push("/(app)");
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
