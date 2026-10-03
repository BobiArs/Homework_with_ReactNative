import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

export const getPaginatedMessages = query({
  args: {
    conversationId: v.id("conversations"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);

    const result = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("desc")
      .paginate(args.paginationOpts);

    const page = await Promise.all(
      result.page.map(async (msg) => {
        const sender = await ctx.db.get(msg.senderId);

        const reactions = await ctx.db
          .query("messageReactions")
          .withIndex("by_message", (q) => q.eq("messageId", msg._id))
          .collect();

        const reactionMap = new Map<
          string,
          { count: number; hasReacted: boolean }
        >();
        for (const r of reactions) {
          const existing = reactionMap.get(r.emoji) || {
            count: 0,
            hasReacted: false,
          };
          existing.count += 1;
          if (currentUserId && r.userId === currentUserId) {
            existing.hasReacted = true;
          }
          reactionMap.set(r.emoji, existing);
        }

        const reactionList = Array.from(reactionMap.entries()).map(
          ([emoji, data]) => ({
            emoji,
            count: data.count,
            hasReacted: data.hasReacted,
          }),
        );

        let imageUrl = msg.imageUrl;
        if (msg.storageId && !imageUrl) {
          imageUrl = (await ctx.storage.getUrl(msg.storageId)) ?? undefined;
        }

        let audioUrl = msg.audioUrl;
        if (msg.audioStorageId && !audioUrl) {
          audioUrl =
            (await ctx.storage.getUrl(msg.audioStorageId)) ?? undefined;
        }

        let videoUrl = msg.videoUrl;
        if (msg.videoStorageId && !videoUrl) {
          videoUrl =
            (await ctx.storage.getUrl(msg.videoStorageId)) ?? undefined;
        }

        return {
          ...msg,
          imageUrl,
          audioUrl,
          videoUrl,
          isSystem: msg.isSystem ?? false,
          senderName: sender?.username ?? sender?.name ?? "Користувач",
          senderAvatar: sender?.image,
          isMine: currentUserId ? msg.senderId === currentUserId : false,
          reactions: reactionList,
        };
      }),
    );

    return {
      ...result,
      page,
    };
  },
});

export const sendMessage = mutation({
  args: {
    // Підтримка назви поля залежно від схеми: conversationId або chatRoomId
    chatRoomId: v.optional(v.id("chatRooms")),
    conversationId: v.optional(v.id("conversations")),

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

    const targetId = (args.conversationId ?? args.chatRoomId) as unknown as Id<"conversations">;
    if (!targetId) {
      throw new Error("Не вказано ідентифікатор кімнати чату або бесіди");
    }

    let conversation = await ctx.db.get(targetId);
    let participantIds: string[] = [];
    let chatTitle: string | undefined;

    if (conversation) {
      participantIds = (conversation as any).participantIds ?? [];
      chatTitle = (conversation as any).name ?? (conversation as any).title;
    } else {
      const room = await ctx.db.get(targetId as unknown as Id<"chatRooms">);
      if (!room) {
        throw new Error("Кімнату чату не знайдено");
      }
      chatTitle = room.title;
      participantIds = [];
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

    // Вставка повідомлення в базу відповідно до схеми messages
    const messageId = await ctx.db.insert("messages", {
      conversationId: targetId,
      senderId: currentUserId,
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
      createdAt: now,
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

    // Оновлюємо кімнату чату або бесіду
    if (conversation) {
      await ctx.db.patch(conversation._id, {
        lastMessage: previewText,
        lastMessageAt: now,
      });
    } else {
      const room = await ctx.db.get(targetId as unknown as Id<"chatRooms">);
      if (room) {
        await ctx.db.patch(room._id, {
          lastMessage: previewText,
          lastMessageAt: now,
        });
      }
    }

    // =========================================================================
    // ✅ ВІДПРАВКА PUSH-СПОВІЩЕНЬ УСІМ ІНШИМ УЧАСНИКАМ БЕСІДИ
    // =========================================================================
    const otherParticipantIds = participantIds.filter(
      (id) => id !== currentUserId,
    );

    if (otherParticipantIds.length > 0) {
      const otherUsers = await Promise.all(
        otherParticipantIds.map((id) => ctx.db.get(id as any)),
      );

      const isGroupChat = participantIds.length > 2 || !!chatTitle;
      const notificationTitle =
        isGroupChat && chatTitle
          ? `${chatTitle} • ${senderName}`
          : senderName;

      const pushNotificationsToSend = otherUsers
        .filter((user) => user && (user as any).pushToken)
        .map((user) => ({
          pushToken: (user as any).pushToken as string,
          title: notificationTitle,
          body: previewText,
          data: {
            type: "chat",
            chatRoomId: targetId,
            conversationId: targetId,
          },
        }));

      if (pushNotificationsToSend.length === 1) {
        await ctx.scheduler.runAfter(
          0,
          internal.pushNotifications.sendPushNotification,
          pushNotificationsToSend[0],
        );
      } else if (pushNotificationsToSend.length > 1) {
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

export const generateUploadUrl = mutation(async (ctx) => {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Unauthorized: Потрібна авторизація");
  }
  return await ctx.storage.generateUploadUrl();
});

export const toggleReaction = mutation({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized: Потрібна авторизація");
    }

    const existing = await ctx.db
      .query("messageReactions")
      .withIndex("by_user_and_message", (q) =>
        q.eq("userId", userId).eq("messageId", args.messageId),
      )
      .collect();

    const currentMatch = existing.find((r) => r.emoji === args.emoji);

    if (currentMatch) {
      await ctx.db.delete(currentMatch._id);
    } else {
      await ctx.db.insert("messageReactions", {
        messageId: args.messageId,
        userId,
        emoji: args.emoji,
      });
    }

    return { success: true };
  },
});

export const getReactionUsers = query({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const reactions = await ctx.db
      .query("messageReactions")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .filter((q) => q.eq(q.field("emoji"), args.emoji))
      .collect();

    const users = await Promise.all(
      reactions.map(async (r) => {
        const u = await ctx.db.get(r.userId);
        if (!u) return null;
        return {
          _id: u._id,
          name: u.name ?? u.username ?? "Користувач",
          image: u.image,
        };
      }),
    );

    return users.filter((u): u is NonNullable<typeof u> => u !== null);
  },
});

// Допоміжні засоби для забезпечення зворотньої сумісності
export const sendMediaMessage = mutation({
  args: {
    conversationId: v.optional(v.id("conversations")),
    chatRoomId: v.optional(v.id("chatRooms")),
    storageId: v.id("_storage"),
    caption: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const targetId = args.conversationId;
    if (!targetId) throw new Error("Missing conversationId");

    const imageUrl = await ctx.storage.getUrl(args.storageId);
    return await ctx.db.insert("messages", {
      conversationId: targetId,
      senderId: userId,
      content: args.caption?.trim() || "",
      imageUrl: imageUrl ?? undefined,
      storageId: args.storageId,
      createdAt: Date.now(),
    });
  },
});

export const editMessage = mutation({
  args: { messageId: v.id("messages"), content: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const msg = await ctx.db.get(args.messageId);
    if (!msg || msg.senderId !== userId) throw new Error("Forbidden");
    await ctx.db.patch(args.messageId, { content: args.content.trim() });
  },
});

export const deleteMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const msg = await ctx.db.get(args.messageId);
    if (!msg || msg.senderId !== userId) throw new Error("Forbidden");
    if (msg.storageId) {
      try {
        await ctx.storage.delete(msg.storageId);
      } catch (e) {}
    }
    await ctx.db.delete(args.messageId);
  },
});
