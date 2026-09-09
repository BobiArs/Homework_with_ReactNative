import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Реєструє загальну схему бази даних - defineSchema
// визначає структуру таблиці та типи кожного поля - defineTable
export default defineSchema({
  // 1. Системні таблиці авторизації (users, authSessions, authAccounts тощо)
  ...authTables,

  todos: defineTable({
    text: v.string(),
    isCompleted: v.boolean(),
    createdAt: v.number(),
    userId: v.id("users"),
  })
    .index("by_user", ["userId"])
    .index("by_user_creation", ["userId", "createdAt"])
    .index("by_user_completion", ["userId", "isCompleted"]),
});
