import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  // Користувачі
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    username: v.optional(v.string()), // Унікальний нікнейм користувача (@username)
    bio: v.optional(v.string()), // Статус або короткий опис профілю
    avatarStorageId: v.optional(v.id("_storage")),
  }).index("by_email", ["email"]),

  // Чат-кімнати
  chatRooms: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    creatorId: v.id("users"),
    lastMessage: v.optional(v.string()),
    lastMessageAt: v.optional(v.number()),
  }).index("by_creator", ["creatorId"]),

  // Повідомлення в кімнатах
  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    imageUrl: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    audioUrl: v.optional(v.string()),
    audioStorageId: v.optional(v.id("_storage")),
    audioDuration: v.optional(v.number()),
    // 👇 НОВІ ПОЛЯ:
    waveform: v.optional(v.array(v.number())), // 32 нормалізовані амплітуди [0.1 .. 1.0]
    videoUrl: v.optional(v.string()), // Публічний URL відео
    videoStorageId: v.optional(v.id("_storage")), // ID відеофайлу в Convex Storage
    videoDuration: v.optional(v.number()), // Тривалість відео у секундах
    isVideoNote: v.optional(v.boolean()), // true для круглих відео
    createdAt: v.number(),
    replyToId: v.optional(v.id("messages")),
    replyToSender: v.optional(v.string()),
    replyToText: v.optional(v.string()),
    isSystem: v.optional(v.boolean()),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_created_at", ["createdAt"]),

  typingIndicators: defineTable({
    chatRoomId: v.id("chatRooms"),
    userId: v.id("users"),
    userName: v.string(),
    lastTypedAt: v.number(),
  })
    .index("by_room", ["chatRoomId"])
    .index("by_user_and_room", ["userId", "chatRoomId"]),

  // Реакції на повідомлення
  messageReactions: defineTable({
    messageId: v.id("messages"),
    userId: v.id("users"),
    emoji: v.string(), // "❤️", "👍", "😂", ...
  })
    .index("by_message", ["messageId"])
    .index("by_user_and_message", ["userId", "messageId"]),

  conversations: defineTable({
    isGroup: v.boolean(), // true для груп, false для особистих діалогів
    name: v.optional(v.string()), // Назва групи (для групових чатів)
    participantIds: v.array(v.id("users")), // Масив ID учасників
    creatorId: v.id("users"), // Автор/творець чату
    adminIds: v.optional(v.array(v.id("users"))), // 👈 НОВЕ ПОЛЕ: Список ID адміністраторів чату
    lastMessage: v.optional(v.string()), // Текст останнього повідомлення для списку чатів
    lastMessageAt: v.optional(v.number()), // Час останнього повідомлення (для сортування)
  }),
});
