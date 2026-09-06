import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Реєструє загальну схему бази даних - defineSchema
// визначає структуру таблиці та типи кожного поля - defineTable
export default defineSchema({
  todos: defineTable({
    text: v.string(),
    isCompleted: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_created_at", ["createdAt"])
    .index("by_completion", ["isCompleted"]),
});
