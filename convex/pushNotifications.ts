import { v } from "convex/values";
import { internalAction } from "./_generated/server";

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
