import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Отримання поточного авторизованого користувача
 */
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);

    if (userId === null) {
      return null;
    }

    return await ctx.db.get(userId);
  },
});

/**
 * Генерація одноразового посилання для завантаження аватарки в Convex Storage
 */
export const generateAvatarUploadUrl = mutation(async (ctx) => {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Unauthorized: Потрібна авторизація");
  }
  return await ctx.storage.generateUploadUrl();
});

/**
 * Оновлення профілю поточного користувача
 */
export const updateUserProfile = mutation({
  args: {
    name: v.string(),
    username: v.optional(v.string()),
    bio: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized: Потрібна авторизація");
    }

    const trimmedName = args.name.trim();
    if (!trimmedName) {
      throw new Error("Ім'я користувача не може бути порожнім");
    }

    const patchData: Record<string, any> = {
      name: trimmedName,
      username: args.username?.trim().replace(/^@/, ""),
      bio: args.bio?.trim(),
    };

    // Якщо завантажено новий аватар, оновлюємо URL та ID сховища
    if (args.avatarStorageId) {
      const imageUrl = await ctx.storage.getUrl(args.avatarStorageId);
      if (imageUrl) {
        patchData.image = imageUrl;
        patchData.avatarStorageId = args.avatarStorageId;
      }
    }

    await ctx.db.patch(userId, patchData);
    return { success: true };
  },
});

/**
 * Отримання публічного профілю користувача за ID зі статистикою активності
 */
export const getUserProfile = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    // Підрахунок надісланих повідомлень
    const userMessages = await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("senderId"), args.userId))
      .collect();

    // Підрахунок створених кімнат
    const createdRooms = await ctx.db
      .query("chatRooms")
      .filter((q) => q.eq(q.field("creatorId"), args.userId))
      .collect();

    return {
      _id: user._id,
      name: user.name ?? "Користувач",
      email: user.email,
      image: user.image,
      username: user.username,
      bio: user.bio,
      _creationTime: user._creationTime,
      stats: {
        messagesCount: userMessages.length,
        roomsCreatedCount: createdRooms.length,
      },
    };
  },
});

/**
 * Пошук користувачів за ім'ям або нікнеймом
 */
export const searchUsers = query({
  args: { queryText: v.string() },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) return [];

    const allUsers = await ctx.db.query("users").collect();
    const queryLower = args.queryText.trim().toLowerCase();

    return allUsers
      .filter((user) => user._id !== currentUserId)
      .filter((user) => {
        if (!queryLower) return true;
        const nameMatch = user.name?.toLowerCase().includes(queryLower);
        const usernameMatch = user.username?.toLowerCase().includes(queryLower);
        const emailMatch = user.email?.toLowerCase().includes(queryLower);
        return nameMatch || usernameMatch || emailMatch;
      });
  },
});

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
