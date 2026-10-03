import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getConversations = query({
  args: {},
  handler: async (ctx) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) return [];

    const conversations = await ctx.db.query("conversations").collect();

    const userConversations = conversations.filter((c) =>
      c.participantIds.includes(currentUserId)
    );

    const enriched = await Promise.all(
      userConversations.map(async (c) => {
        let otherUser = null;
        if (!c.isGroup) {
          const otherUserId = c.participantIds.find((id) => id !== currentUserId);
          if (otherUserId) {
            const u = await ctx.db.get(otherUserId);
            if (u) {
              otherUser = {
                _id: u._id,
                username: u.username ?? u.name ?? "Користувач",
                fullname: u.name ?? u.username ?? "",
                image: u.image,
              };
            }
          }
        }
        return {
          ...c,
          otherUser,
          participantCount: c.participantIds.length,
        };
      })
    );

    return enriched.sort((a, b) => (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0));
  },
});

export const getConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) return null;

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return null;

    if (!conversation.participantIds.includes(currentUserId)) {
      throw new Error("Access denied: Ви не є учасником цієї бесіди");
    }

    let otherUser = null;
    if (!conversation.isGroup) {
      const otherUserId = conversation.participantIds.find(
        (id) => id !== currentUserId
      );
      if (otherUserId) {
        otherUser = await ctx.db.get(otherUserId);
      }
    }

    const adminIds = conversation.adminIds ?? [conversation.creatorId];
    const isCreator = conversation.creatorId === currentUserId;
    const isAdmin = adminIds.includes(currentUserId) || isCreator;

    const participants = await Promise.all(
      conversation.participantIds.map(async (id) => {
        const user = await ctx.db.get(id);
        if (!user) return null;

        let role: "creator" | "admin" | "member" = "member";
        if (id === conversation.creatorId) {
          role = "creator";
        } else if (adminIds.includes(id)) {
          role = "admin";
        }

        return {
          _id: user._id,
          username: user.username ?? user.name ?? "Користувач",
          fullname: user.name ?? user.username ?? "",
          image: user.image,
          role,
        };
      })
    );

    return {
      ...conversation,
      adminIds,
      otherUser: otherUser
        ? {
            _id: otherUser._id,
            username: otherUser.username ?? otherUser.name ?? "Користувач",
            fullname: otherUser.name ?? otherUser.username ?? "",
            image: otherUser.image,
          }
        : null,
      participants: participants.filter(
        (p): p is NonNullable<typeof p> => p !== null
      ),
      currentUserRole: isCreator
        ? "creator"
        : isAdmin
        ? "admin"
        : ("member" as "creator" | "admin" | "member"),
      canManageMembers: isAdmin || isCreator,
      canDeleteChat: isCreator || !conversation.isGroup,
    };
  },
});

export const getOrCreateConversation = mutation({
  args: { participantId: v.id("users") },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Unauthorized: Необхідно авторизуватися");
    }

    const conversations = await ctx.db.query("conversations").collect();
    const existing = conversations.find(
      (c) =>
        !c.isGroup &&
        c.participantIds.length === 2 &&
        c.participantIds.includes(currentUserId) &&
        c.participantIds.includes(args.participantId)
    );

    if (existing) {
      return existing._id;
    }

    const now = Date.now();
    const conversationId = await ctx.db.insert("conversations", {
      isGroup: false,
      participantIds: [currentUserId, args.participantId],
      creatorId: currentUserId,
      adminIds: [currentUserId],
      lastMessageAt: now,
    });

    return conversationId;
  },
});

export const createGroupConversation = mutation({
  args: {
    name: v.string(),
    participantIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Unauthorized: Необхідно авторизуватися");
    }

    const trimmedName = args.name.trim();
    if (!trimmedName) {
      throw new Error("Введіть назву групового чату");
    }

    const uniqueParticipants = Array.from(
      new Set([currentUserId, ...args.participantIds])
    );

    if (uniqueParticipants.length < 2) {
      throw new Error("Груповий чат повинен мати щонайменше 2 учасників");
    }

    const now = Date.now();

    const conversationId = await ctx.db.insert("conversations", {
      isGroup: true,
      name: trimmedName,
      participantIds: uniqueParticipants,
      creatorId: currentUserId,
      adminIds: [currentUserId],
      lastMessage: "Груповий чат створено",
      lastMessageAt: now,
    });

    await ctx.db.insert("messages", {
      conversationId,
      senderId: currentUserId,
      content: "🎉 Груповий чат створено",
      createdAt: now,
      isSystem: true,
    });

    return conversationId;
  },
});

export const addParticipantsToConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
    newParticipantIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Unauthorized: Необхідно авторизуватися");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Бесіду не знайдено");
    }

    if (!conversation.isGroup) {
      throw new Error("Додавати нових учасників можна лише в групові чати");
    }

    const adminIds = conversation.adminIds ?? [conversation.creatorId];
    const hasPermission =
      conversation.creatorId === currentUserId ||
      adminIds.includes(currentUserId);

    if (!hasPermission) {
      throw new Error("Лише адміністратори можуть додавати нових учасників");
    }

    const toAdd = args.newParticipantIds.filter(
      (id) => !conversation.participantIds.includes(id)
    );

    if (toAdd.length === 0) {
      return { addedCount: 0 };
    }

    const updatedParticipants = [...conversation.participantIds, ...toAdd];
    const now = Date.now();

    await ctx.db.patch(args.conversationId, {
      participantIds: updatedParticipants,
      lastMessageAt: now,
    });

    const actor = await ctx.db.get(currentUserId);
    const actorName = actor?.username ?? actor?.name ?? "Користувач";

    const addedUsers = await Promise.all(toAdd.map((id) => ctx.db.get(id)));
    const addedNames = addedUsers
      .map((u) => u?.username ?? u?.name ?? "учасника")
      .join(", ");

    const systemContent = `👋 ${actorName} додав(ла) до групи: ${addedNames}`;

    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: currentUserId,
      content: systemContent,
      createdAt: now,
      isSystem: true,
    });

    await ctx.db.patch(args.conversationId, {
      lastMessage: systemContent,
      lastMessageAt: now,
    });

    return { addedCount: toAdd.length };
  },
});

export const updateParticipantRole = mutation({
  args: {
    conversationId: v.id("conversations"),
    targetUserId: v.id("users"),
    newRole: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Unauthorized: Необхідно авторизуватися");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || !conversation.isGroup) {
      throw new Error("Груповий чат не знайдено");
    }

    if (conversation.creatorId !== currentUserId) {
      throw new Error("Лише творець групи може призначати адміністраторів");
    }

    if (args.targetUserId === conversation.creatorId) {
      throw new Error("Неможливо змінити роль творця групи");
    }

    if (!conversation.participantIds.includes(args.targetUserId)) {
      throw new Error("Користувач не є учасником цього чату");
    }

    let adminIds = conversation.adminIds ?? [conversation.creatorId];

    if (args.newRole === "admin") {
      if (!adminIds.includes(args.targetUserId)) {
        adminIds = [...adminIds, args.targetUserId];
      }
    } else {
      adminIds = adminIds.filter((id) => id !== args.targetUserId);
    }

    await ctx.db.patch(args.conversationId, { adminIds });

    const actor = await ctx.db.get(currentUserId);
    const target = await ctx.db.get(args.targetUserId);
    const actorName = actor?.username ?? actor?.name ?? "Творець";
    const targetName = target?.username ?? target?.name ?? "Користувач";

    const systemContent =
      args.newRole === "admin"
        ? `🛡️ ${actorName} призначив(ла) ${targetName} адміністратором`
        : `👤 ${actorName} зняв(ла) права адміністратора у ${targetName}`;

    const now = Date.now();
    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: currentUserId,
      content: systemContent,
      createdAt: now,
      isSystem: true,
    });

    await ctx.db.patch(args.conversationId, {
      lastMessage: systemContent,
      lastMessageAt: now,
    });

    return { success: true };
  },
});

export const removeParticipant = mutation({
  args: {
    conversationId: v.id("conversations"),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Unauthorized: Необхідно авторизуватися");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || !conversation.isGroup) {
      throw new Error("Груповий чат не знайдено");
    }

    if (!conversation.participantIds.includes(args.targetUserId)) {
      throw new Error("Користувач не є учасником цієї бесіди");
    }

    const isSelf = currentUserId === args.targetUserId;
    const isCreator = conversation.creatorId === currentUserId;
    const adminIds = conversation.adminIds ?? [conversation.creatorId];
    const isCurrentAdmin = adminIds.includes(currentUserId) || isCreator;
    const isTargetAdmin = adminIds.includes(args.targetUserId);

    if (isSelf) {
      if (isCreator && conversation.participantIds.length > 1) {
        throw new Error(
          "Творець не може покинути групу, поки в ній є інші учасники. Видаліть групу або передайте права."
        );
      }
    } else {
      if (!isCurrentAdmin) {
        throw new Error("У вас немає прав для вилучення учасників");
      }

      if (args.targetUserId === conversation.creatorId) {
        throw new Error("Неможливо вилучити творця групи");
      }

      if (!isCreator && isTargetAdmin) {
        throw new Error("Адміністратор не може вилучити іншого адміністратора");
      }
    }

    const updatedParticipants = conversation.participantIds.filter(
      (id) => id !== args.targetUserId
    );
    const updatedAdminIds = adminIds.filter((id) => id !== args.targetUserId);

    await ctx.db.patch(args.conversationId, {
      participantIds: updatedParticipants,
      adminIds: updatedAdminIds,
    });

    const actor = await ctx.db.get(currentUserId);
    const target = await ctx.db.get(args.targetUserId);
    const actorName = actor?.username ?? actor?.name ?? "Користувач";
    const targetName = target?.username ?? target?.name ?? "Користувач";

    const systemContent = isSelf
      ? `🚪 ${targetName} залишив(ла) групу`
      : `🚫 ${actorName} вилучив(ла) ${targetName} з групи`;

    const now = Date.now();
    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: currentUserId,
      content: systemContent,
      createdAt: now,
      isSystem: true,
    });

    await ctx.db.patch(args.conversationId, {
      lastMessage: systemContent,
      lastMessageAt: now,
    });

    return { success: true };
  },
});

export const deleteConversation = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Unauthorized: Необхідно авторизуватися");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Бесіду не знайдено");
    }

    if (!conversation.participantIds.includes(currentUserId)) {
      throw new Error("Ви не маєте доступу до цієї бесіди");
    }

    if (conversation.isGroup && conversation.creatorId !== currentUserId) {
      throw new Error("Лише творець групи може видалити груповий чат для всіх");
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    for (const msg of messages) {
      const reactions = await ctx.db
        .query("messageReactions")
        .withIndex("by_message", (q) => q.eq("messageId", msg._id))
        .collect();

      for (const reaction of reactions) {
        await ctx.db.delete(reaction._id);
      }

      if (msg.storageId) {
        try {
          await ctx.storage.delete(msg.storageId);
        } catch (e) {
          // ignore
        }
      }

      await ctx.db.delete(msg._id);
    }

    await ctx.db.delete(args.conversationId);

    return { success: true };
  },
});
