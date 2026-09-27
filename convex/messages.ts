import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
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
        q.eq("conversationId", args.conversationId)
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
          })
        );

        let imageUrl = msg.imageUrl;
        if (msg.storageId && !imageUrl) {
          imageUrl = (await ctx.storage.getUrl(msg.storageId)) ?? undefined;
        }

        let audioUrl = msg.audioUrl;
        if (msg.audioStorageId && !audioUrl) {
          audioUrl = (await ctx.storage.getUrl(msg.audioStorageId)) ?? undefined;
        }

        return {
          ...msg,
          imageUrl,
          audioUrl,
          isSystem: msg.isSystem ?? false,
          senderName:
            sender?.username ?? sender?.name ?? "Користувач",
          senderAvatar: sender?.image,
          isMine: currentUserId ? msg.senderId === currentUserId : false,
          reactions: reactionList,
        };
      })
    );

    return {
      ...result,
      page,
    };
  },
});

export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    imageUrl: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    audioUrl: v.optional(v.string()),
    audioStorageId: v.optional(v.id("_storage")),
    audioDuration: v.optional(v.number()),
    replyToId: v.optional(v.id("messages")),
    replyToSender: v.optional(v.string()),
    replyToText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized: Потрібна авторизація");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Бесіду не знайдено");
    }

    const user = await ctx.db.get(userId);
    const userName = user?.username ?? user?.name ?? "Користувач";

    const trimmedContent = args.content.trim();

    const now = Date.now();
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: userId,
      content: trimmedContent,
      imageUrl: args.imageUrl,
      storageId: args.storageId,
      audioUrl: args.audioUrl,
      audioStorageId: args.audioStorageId,
      audioDuration: args.audioDuration,
      createdAt: now,
      replyToId: args.replyToId,
      replyToSender: args.replyToSender,
      replyToText: args.replyToText,
      isSystem: false,
    });

    const displayMsg =
      trimmedContent ||
      (args.imageUrl
        ? "📷 Фотографія"
        : args.audioStorageId || args.audioUrl
        ? "🎤 Голосове повідомлення"
        : "Повідомлення");

    await ctx.db.patch(args.conversationId, {
      lastMessage: conversation.isGroup ? `${userName}: ${displayMsg}` : displayMsg,
      lastMessageAt: now,
    });

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
        q.eq("userId", userId).eq("messageId", args.messageId)
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
      })
    );

    return users.filter((u): u is NonNullable<typeof u> => u !== null);
  },
});

// Legacy helpers for backwards compatibility
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
