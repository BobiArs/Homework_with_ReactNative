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
    conversationId: v.id("conversations"),
    content: v.string(),
    storageId: v.optional(v.id("_storage")),
    audioStorageId: v.optional(v.id("_storage")),
    audioDuration: v.optional(v.number()),
    waveform: v.optional(v.array(v.number())),
    videoStorageId: v.optional(v.id("_storage")),
    videoDuration: v.optional(v.number()),
    isVideoNote: v.optional(v.boolean()),
    replyToId: v.optional(v.id("messages")),
    replyToSender: v.optional(v.string()),
    replyToText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) throw new Error("Unauthorized");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || !conversation.participantIds.includes(currentUserId)) {
      throw new Error("Немає доступу до чату");
    }

    let imageUrl = args.storageId
      ? await ctx.storage.getUrl(args.storageId)
      : undefined;
    let audioUrl = args.audioStorageId
      ? await ctx.storage.getUrl(args.audioStorageId)
      : undefined;
    let videoUrl = args.videoStorageId
      ? await ctx.storage.getUrl(args.videoStorageId)
      : undefined;

    const now = Date.now();

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: currentUserId,
      content: args.content.trim(),
      imageUrl: imageUrl ?? undefined,
      storageId: args.storageId,
      audioUrl: audioUrl ?? undefined,
      audioStorageId: args.audioStorageId,
      audioDuration: args.audioDuration,
      waveform: args.waveform,
      videoUrl: videoUrl ?? undefined,
      videoStorageId: args.videoStorageId,
      videoDuration: args.videoDuration,
      isVideoNote: args.isVideoNote,
      createdAt: now,
      replyToId: args.replyToId,
      replyToSender: args.replyToSender,
      replyToText: args.replyToText,
    });

    let previewText = args.content.trim();
    if (!previewText) {
      if (args.videoStorageId) {
        previewText = "📹 Відеоповідомлення";
      } else if (args.audioStorageId) {
        const dur = args.audioDuration
          ? ` (${Math.round(args.audioDuration)}с)`
          : "";
        previewText = `🎤 Голосове повідомлення${dur}`;
      } else if (args.storageId) {
        previewText = "📷 Фотографія";
      }
    }

    await ctx.db.patch(args.conversationId, {
      lastMessage: previewText,
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
