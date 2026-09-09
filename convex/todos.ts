import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

// 1. Отримання всіх завдань (від новіших до старіших)
export const getTodos = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }

    return await ctx.db
      .query("todos")
      .withIndex("by_user_creation", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

// 2. Отримання аналітики продуктивності (для вкладки Статистика)
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return { total: 0, completed: 0, active: 0, percentage: 0 };
    }

    const userTodos = await ctx.db
      .query("todos")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const total = userTodos.length;
    const completed = userTodos.filter((t) => t.isCompleted).length;
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
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("Користувач не авторизований");
    }

    const trimmedText = args.text.trim();
    if (trimmedText.length === 0) {
      throw new ConvexError("Текст завдання не може бути порожнім");
    }

    return await ctx.db.insert("todos", {
      userId,
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

    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("Не авторизовано");
    }

    if (todo.userId !== userId) {
      throw new ConvexError("Немає доступу до зміни цього завдання");
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

    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("Не авторизовано");
    }

    const todo = await ctx.db.get(args.id);
    if (!todo) {
      throw new ConvexError("Завдання не знайдено");
    }

    if (todo.userId !== userId) {
      throw new ConvexError("Немає доступу до редагування цього завдання");
    }

    await ctx.db.patch(args.id, {
      text: trimmed,
    });
  },
});

// 6. Видалення одного завдання (з перевіркою власника)
export const deleteTodo = mutation({
  args: {
    id: v.id("todos"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("Не авторизовано");
    }

    const todo = await ctx.db.get(args.id);
    if (!todo) {
      throw new ConvexError("Завдання не знайдено");
    }

    if (todo.userId !== userId) {
      throw new ConvexError("Немає доступу до видалення цього завдання");
    }

    await ctx.db.delete(args.id);
  },
});

// 7. Видалення всіх завершених завдань
export const clearCompleted = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("Не авторизовано");
    }

    const completedTodos = await ctx.db
      .query("todos")
      .withIndex("by_user_completion", (q) =>
        q.eq("userId", userId).eq("isCompleted", true),
      )
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
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("Не авторизовано");
    }

    const userTodos = await ctx.db
      .query("todos")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const todo of userTodos) {
      await ctx.db.delete(todo._id);
    }

    return { deletedCount: userTodos.length };
  },
});
