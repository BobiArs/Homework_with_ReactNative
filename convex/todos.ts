import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

// 1. Отримання всіх завдань (від новіших до старіших)
export const getTodos = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("todos")
      .withIndex("by_created_at")
      .order("desc")
      .collect();
  },
});

// 2. Отримання аналітики продуктивності (для вкладки Статистика)
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const allTodos = await ctx.db.query("todos").collect();
    const total = allTodos.length;
    const completed = allTodos.filter((t) => t.isCompleted).length;
    const active = total - completed;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    return {
      total,
      completed,
      active,
      percentage,
    };
  },
});

// 3. Створення нового завдання
export const createTodo = mutation({
  args: {
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const trimmedText = args.text.trim();
    if (trimmedText.length === 0) {
      throw new ConvexError("Текст завдання не може бути порожнім");
    }

    return await ctx.db.insert("todos", {
      text: trimmedText,
      isCompleted: false,
      createdAt: Date.now(),
    });
  },
});

// 4. Перемикання статусу виконання
export const toggleTodo = mutation({
  args: {
    id: v.id("todos"),
  },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.id);
    if (!todo) {
      throw new ConvexError("Завдання не знайдено");
    }

    await ctx.db.patch(args.id, {
      isCompleted: !todo.isCompleted,
    });
  },
});

// 5. Оновлення тексту завдання
export const updateTodo = mutation({
  args: {
    id: v.id("todos"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const trimmed = args.text.trim();
    if (trimmed.length === 0) {
      throw new ConvexError("Текст завдання не може бути порожнім");
    }

    await ctx.db.patch(args.id, {
      text: trimmed,
    });
  },
});

// 6. Видалення одного завдання
export const deleteTodo = mutation({
  args: {
    id: v.id("todos"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// 7. Видалення всіх завершених завдань
export const clearCompleted = mutation({
  args: {},
  handler: async (ctx) => {
    const completedTodos = await ctx.db
      .query("todos")
      .withIndex("by_completion", (q) => q.eq("isCompleted", true))
      .collect();

    for (const todo of completedTodos) {
      await ctx.db.delete(todo._id);
    }

    return { deletedCount: completedTodos.length };
  },
});

// 8. Видалення абсолютно всіх завдань
export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("todos").collect();
    for (const todo of all) {
      await ctx.db.delete(todo._id);
    }
    return { deletedCount: all.length };
  },
});
