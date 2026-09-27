# Інструкція 14: Керування груповим чатом: ролі учасників, творець чату, додавання нових користувачів та видалення чату

У цій інструкції ми розширимо функціонал месенджера в додатку **`prostir`**, додавши професійну систему адміністрування та керування груповими бесідами на рівні **Telegram**, **Discord** та **WhatsApp**.

Ми реалізуємо:

1. **Ідентифікацію творця чату (Chat Creator / Owner):**
   - Той, хто створює груповий чат, автоматично стає його **Власником** (`creatorId`).
   - Власник наділяється найвищим рівнем привілеїв: безповоротне видалення групи, призначення та зняття адміністраторів, вилучення будь-яких учасників.
   - Візуальні бейджі (👑 **Творець**) у списку учасників та в деталях чату.
2. **Систему ролей та дозволів (Roles & Permissions):**
   - **👑 Творець (Owner):** повний контроль над чатом, учасниками, ролями та життєвим циклом чату.
   - **🛡️ Адміністратор (Admin):** право додавати нових учасників, вилучати звичайних учасників, керувати налаштуваннями чату.
   - **👤 Учасник (Member):** стандартний доступ до листування та можливість добровільно покинути бесіду.
3. **Додавання нових учасників (Add Members):**
   - Модальне вікно пошуку та мульти-вибору користувачів (`AddMembersModal`).
   - Фільтрація користувачів (приховування тих, хто вже є учасником бесіди).
   - Автоматична генерація системних сповіщень у чаті (наприклад: _«Олександр додав(ла) до групи: Марія, Іван»_).
4. **Вилучення учасників та вихід із чату (Kick & Leave):**
   - Адміністратори та творець можуть вилучати учасників.
   - Будь-який користувач може самостійно вийти з чату («Покинути групу»).
5. **Видалення чату (Delete Conversation):**
   - **Груповий чат:** Творець має ексклюзивне право видалити чат назавжди. При видаленні відбувається **каскадне очищення** всіх повідомлень чату та реакцій до них у Convex.
   - **Особистий діалог (1-on-1):** Будь-який з двох співрозмовників може видалити спільний діалог.
   - Підтвердження через діалогове вікно `Alert.alert` для запобігання випадковим діям.
6. **Системні повідомлення (System Messages):**
   - Спеціальний тип повідомлень (`isSystem: true`), що центрується на екрані та інформує про ключові події в чаті (додавання, вилучення, зміна ролей).

---

## 📚 Зміст

1. [Архітектура та модель прав (Roles & Permissions)](#1-архітектура-та-модель-прав-roles--permissions)
   - [1.1. Матриця прав доступу](#11-матриця-прав-доступу)
   - [1.2. Схема життєвого циклу та потік даних](#12-схема-життєвого-циклу-та-потік-даних)
2. [Крок 1: Оновлення схеми бази даних у `convex/schema.ts`](#крок-1-оновлення-схеми-бази-даних-у-convexschemats)
   - [2.1. Додавання списку адміністраторів `adminIds`](#21-додавання-списку-адміністраторів-adminids)
   - [2.2. Додавання прапорця системного повідомлення `isSystem`](#22-додавання-прапорця-системного-повідомлення-issystem)
3. [Крок 2: Оновлення бекенду в `convex/conversations.ts`](#крок-2-оновлення-бекенду-в-convexconversationsts)
   - [3.1. Збагачення ролями у `getConversations` та `getConversation`](#31-збагачення-ролями-у-getconversations-та-getconversation)
   - [3.2. Оновлення створення групи `createGroupConversation`](#32-оновлення-створення-групи-creategroupconversation)
   - [3.3. Мутація додавання учасників `addParticipantsToConversation`](#33-мутація-додавання-учасників-addparticipantstoconversation)
   - [3.4. Мутація зміни ролі учасника `updateParticipantRole`](#34-мутація-зміни-ролі-учасника-updateparticipantrole)
   - [3.5. Мутація вилучення учасника або виходу `removeParticipant`](#35-мутація-вилучення-учасника-або-виходу-removeparticipant)
   - [3.6. Мутація каскадного видалення чату `deleteConversation`](#36-мутація-каскадного-видалення-чату-deleteconversation)
4. [Крок 3: Оновлення `convex/messages.ts` (підтримка системних сповіщень)](#крок-3-оновлення-convexmessagests-підтримка-системних-сповіщень)
5. [Крок 4: Оновлення компонента `components/MessageBubble.tsx`](#крок-4-оновлення-компонента-componentsmessagebubbletsx)
6. [Крок 5: Створення модального вікна додавання учасників `components/AddMembersModal.tsx`](#крок-5-створення-модального-вікна-додавання-учасників-componentsaddmembersmodaltsx)
7. [Крок 6: Створення модального вікна деталей та керування групою `components/GroupInfoModal.tsx`](#крок-6-створення-модального-вікна-деталей-та-керування-групою-componentsgroupinfomodaltsx)
8. [Крок 7: Інтеграція в екран листування `app/messages/[id].tsx`](#крок-7-інтеграція-в-екран-листування-appmessagesidtsx)
9. [Крок 8: Інтеграція видалення чату у списку бесід `app/messages/index.tsx`](#крок-8-інтеграція-видалення-чату-у-списку-бесід-appmessagesindextsx)
10. [Повні оновлені лістинги файлів](#10-повні-оновлені-лістинги-файлів)
    - [10.1. `convex/schema.ts`](#101-повний-оновлений-файл-convexschemats)
    - [10.2. `convex/conversations.ts`](#102-повний-оновлений-файл-convexconversationsts)
    - [10.3. `convex/messages.ts`](#103-повний-оновлений-файл-convexmessagests)
    - [10.4. `components/MessageBubble.tsx`](#104-повний-оновлений-файл-componentsmessagebubbletsx)
    - [10.5. `components/AddMembersModal.tsx`](#105-новий-файл-componentsaddmembersmodaltsx)
    - [10.6. `components/GroupInfoModal.tsx`](#106-новий-файл-componentsgroupinfomodaltsx)
    - [10.7. `app/messages/[id].tsx`](#107-повний-оновлений-файл-appmessagesidtsx)
    - [10.8. `app/messages/index.tsx`](#108-повний-оновлений-файл-appmessagesindextsx)
11. [Тестування та чекліст перевірки](#11-тестування-та-чекліст-перевірки)

---

## 1. Архітектура та модель прав (Roles & Permissions)

### 1.1. Матриця прав доступу

|               Можливість / Дія                | 👑 Творець (Creator / Owner) | 🛡️ Адміністратор (Admin) | 👤 Звичайний учасник (Member) |
| :-------------------------------------------: | :--------------------------: | :----------------------: | :---------------------------: |
|  **Надсилання повідомлень / медіа / аудіо**   |              ✅              |            ✅            |              ✅               |
|   **Реакції та відповіді на повідомлення**    |              ✅              |            ✅            |              ✅               |
|      **Перегляд списку учасників чату**       |              ✅              |            ✅            |              ✅               |
|      **Додавання нових учасників у чат**      |              ✅              |            ✅            |              ❌               |
|   **Вилучення звичайного учасника (Kick)**    |              ✅              |            ✅            |              ❌               |
|         **Вилучення адміністратора**          |              ✅              |            ❌            |              ❌               |
|   **Призначення учасника адміністратором**    |              ✅              |            ❌            |              ❌               |
|       **Зняття статусу адміністратора**       |              ✅              |            ❌            |              ❌               |
| **Вихід із чату за власним бажанням (Leave)** |   ✅ _(якщо не останній)_    |            ✅            |              ✅               |
|     **Повне безповоротне видалення чату**     |              ✅              |            ❌            |              ❌               |

> [!NOTE]
> В особистих діалогах (1-on-1, `isGroup: false`) концепція адміністраторів відсутня: кожен із двох співрозмовників має право видалити діалог зі свого списку (або для обох сторін).

---

### 1.2. Схема життєвого циклу та потік даних

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 Життєвий цикл чату                                     │
│                                                                                        │
│  [ Створення групи ] ───► Встановлення creatorId = currentUserId                       │
│                               adminIds = [currentUserId]                               │
│                               Системне повідомлення: "Групу створено"                  │
│                                                                                        │
│  [ Додавання людей ] ───► Перевірка прав (Адмін або Творець)                           │
│                               Оновлення participantIds                                 │
│                               Системне повідомлення: "X додав(ла) Y"                   │
│                                                                                        │
│  [ Зміна ролей ]    ───► Тільки Творець (Creator)                                      │
│                               Додавання/видалення з adminIds                           │
│                               Системне повідомлення: "X призначив Y адміном"           │
│                                                                                        │
│  [ Видалення чату ]  ───► Тільки Творець для груп / будь-хто для 1-на-1                │
│                               1. Видалення реакцій (messageReactions)                  │
│                               2. Видалення файлів зі сховища (Storage)                 │
│                               3. Видалення повідомлень (messages)                      │
│                               4. Видалення розмови (conversations)                     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Крок 1: Оновлення схеми бази даних у `convex/schema.ts`

Відкрийте файл [`convex/schema.ts`].

### 2.1. Додавання списку адміністраторів `adminIds`

У таблиці `conversations` поле `creatorId` уже зафіксовано. Додамо поле `adminIds: v.optional(v.array(v.id("users")))`, що містить список ідентифікаторів користувачів із правами адміністратора.

### 2.2. Додавання прапорця системного повідомлення `isSystem`

У таблиці `messages` додамо опціональне поле `isSystem: v.optional(v.boolean())`. Якщо `isSystem: true`, клієнт відображатиме повідомлення як інформаційне системне сповіщення (по центру, без аватара автора).

```typescript
// convex/schema.ts

  conversations: defineTable({
    isGroup: v.boolean(), // true для груп, false для особистих діалогів
    name: v.optional(v.string()), // Назва групи (для групових чатів)
    participantIds: v.array(v.id("users")), // Масив ID учасників
    creatorId: v.id("users"), // Автор/творець чату
    adminIds: v.optional(v.array(v.id("users"))), // 👈 НОВЕ ПОЛЕ: Список ID адміністраторів чату
    lastMessage: v.optional(v.string()), // Текст останнього повідомлення для списку чатів
    lastMessageAt: v.optional(v.number()), // Час останнього повідомлення (для сортування)
  }),

  messages: defineTable({
    conversationId: v.id("conversations"), // ID бесіди
    senderId: v.id("users"), // ID автора повідомлення
    content: v.string(), // Текст повідомлення
    imageUrl: v.optional(v.string()), // Публічний URL фото (якщо прикріплено)
    storageId: v.optional(v.id("_storage")), // ID файлу в сховищі Convex
    audioUrl: v.optional(v.string()), // Публічний URL аудіо (якщо прикріплено)
    audioStorageId: v.optional(v.id("_storage")), // ID аудіофайлу в сховищі Convex
    audioDuration: v.optional(v.number()), // тривалість у секундах
    createdAt: v.number(), // Час створення (Date.now())
    replyToId: v.optional(v.id("messages")),
    replyToSender: v.optional(v.string()),
    replyToText: v.optional(v.string()),
    isSystem: v.optional(v.boolean()), // 👈 НОВЕ ПОЛЕ: true для системних сповіщень (додавання, вилучення, ролі)
  })
    .index("by_conversation", ["conversationId"])
    .index("by_created_at", ["createdAt"]),
```

---

## Крок 2: Оновлення бекенду в `convex/conversations.ts`

Відкрийте файл [`convex/conversations.ts`].

У цьому модулі ми оновимо запити отримання бесід та додамо нові мутації керування учасниками, ролями та видаленням.

### 3.1. Збагачення ролями у `getConversations` та `getConversation`

Оновимо запит `getConversation`, щоб він повертав:

- Список адміністраторів `adminIds`.
- Роль поточного користувача: `currentUserRole: "creator" | "admin" | "member"`.
- Права поточного користувача:
  - `canManageMembers: boolean` (чи може додавати нових людей або вилучати учасників).
  - `canDeleteChat: boolean` (чи може повністю видалити бесіду).
- Збагачений список `participants` з полем `role`:
  - `"creator"` — творець групи.
  - `"admin"` — призначений адміністратор.
  - `"member"` — звичайний учасник.

```typescript
// convex/conversations.ts

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
        (id) => id !== currentUserId,
      );
      if (otherUserId) {
        otherUser = await ctx.db.get(otherUserId);
      }
    }

    const adminIds = conversation.adminIds ?? [conversation.creatorId];
    const isCreator = conversation.creatorId === currentUserId;
    const isAdmin = adminIds.includes(currentUserId) || isCreator;

    // Збагачуємо учасників даними профілю та їхньою роллю
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
          fullname: user.fullname ?? user.name ?? "",
          image: user.image,
          role,
        };
      }),
    );

    return {
      ...conversation,
      adminIds,
      otherUser: otherUser
        ? {
            _id: otherUser._id,
            username: otherUser.username ?? otherUser.name ?? "Користувач",
            fullname: otherUser.fullname ?? otherUser.name ?? "",
            image: otherUser.image,
          }
        : null,
      participants: participants.filter(
        (p): p is NonNullable<typeof p> => p !== null,
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
```

---

### 3.2. Оновлення створення групи `createGroupConversation`

При створенні групи ми:

1. Ініціалізуємо `adminIds: [currentUserId]`, щоб творець мав статус адміна.
2. Вставляємо перше системне повідомлення в історію чату: _«Груповий чат створено»_.

```typescript
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
      new Set([currentUserId, ...args.participantIds]),
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
      adminIds: [currentUserId], // 👈 Творець автоматично стає адміном
      lastMessage: "Груповий чат створено",
      lastMessageAt: now,
    });

    // Додаємо початкове системне повідомлення
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
```

---

### 3.3. Мутація додавання учасників `addParticipantsToConversation`

Дозволяє додавати нових людей до вже створеної групи.

- **Права:** додавати мають право адміністратори або творець.
- Відфільтровуються користувачі, які вже є в чаті.
- Створюється системне повідомлення з переліком доданих імен.

```typescript
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

    // Залишаємо тільки тих, кого ще немає в чаті
    const toAdd = args.newParticipantIds.filter(
      (id) => !conversation.participantIds.includes(id),
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

    // Отримуємо імена доданих користувачів для системного повідомлення
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
```

---

### 3.4. Мутація зміни ролі учасника `updateParticipantRole`

Дозволяє призначати звичайного учасника адміністратором або повертати йому статус звичайного учасника.

- **Права:** змінювати ролі має право **ТІЛЬКИ Творець чату (`creatorId`)**.
- Змінювати роль творця неможливо.

```typescript
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

    // Тільки творець групи може надавати або забирати права адміністратора
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

    // Отримуємо дані для системного повідомлення
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
```

---

### 3.5. Мутація вилучення учасника або виходу `removeParticipant`

Підтримує два сценарії:

1. **Добровільний вихід (Leave):** коли `targetUserId === currentUserId`.
2. **Примусове вилучення (Kick):**
   - Творець може вилучити будь-кого.
   - Адміністратор може вилучити звичайного учасника (але не іншого адміна чи творця).
   - Звичайний учасник не може вилучати нікого.

```typescript
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
      // Якщо творець намагається вийти і він єдиний залишився
      if (isCreator && conversation.participantIds.length > 1) {
        throw new Error(
          "Творець не може покинути групу, поки в ній є інші учасники. Видаліть групу або передайте права.",
        );
      }
    } else {
      // Примусове вилучення іншого учасника
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
      (id) => id !== args.targetUserId,
    );
    const updatedAdminIds = adminIds.filter((id) => id !== args.targetUserId);

    await ctx.db.patch(args.conversationId, {
      participantIds: updatedParticipants,
      adminIds: updatedAdminIds,
    });

    // Формуємо системне повідомлення
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
```

---

### 3.6. Мутація каскадного видалення чату `deleteConversation`

Повністю та безповоротно видаляє бесіду разом з усіма її повідомленнями та реакціями.

- **Груповий чат:** право на видалення має **виключно Творець (`creatorId`)**.
- **1-on-1 чат:** видалити може будь-який зі співрозмовників.

```typescript
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

    // Перевірка прав для групового чату
    if (conversation.isGroup && conversation.creatorId !== currentUserId) {
      throw new Error("Лише творець групи може видалити груповий чат для всіх");
    }

    // 1. Знаходимо всі повідомлення чату
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();

    // 2. Для кожного повідомлення каскадно видаляємо всі реакції
    for (const msg of messages) {
      const reactions = await ctx.db
        .query("messageReactions")
        .withIndex("by_message", (q) => q.eq("messageId", msg._id))
        .collect();

      for (const reaction of reactions) {
        await ctx.db.delete(reaction._id);
      }

      // Видаляємо саме повідомлення
      await ctx.db.delete(msg._id);
    }

    // 3. Видаляємо документ самої розмови
    await ctx.db.delete(args.conversationId);

    return { success: true };
  },
});
```

---

## Крок 3: Оновлення `convex/messages.ts` (підтримка системних сповіщень)

Відкрийте файл [`convex/messages.ts`].

Переконайтеся, що запити `getMessages` та `getPaginatedMessages` повертають прапорець `isSystem: msg.isSystem ?? false`:

```typescript
// convex/messages.ts

// У getMessages та getPaginatedMessages всередині map:
return {
  ...msg,
  isSystem: msg.isSystem ?? false, // 👈 Передаємо на клієнт
  senderName:
    sender?.username ?? sender?.fullname ?? sender?.name ?? "Користувач",
  senderImage: sender?.image,
  isMine: msg.senderId === currentUserId,
  senderAvatar: sender?.image,
};
```

---

## Крок 4: Оновлення компонента `components/MessageBubble.tsx`

Відкрийте існуючий файл [`components/MessageBubble.tsx`].

У ньому необхідно внести **3 точкові зміни**:

### 4.1. Додати поле `isSystem` в інтерфейс `MessageBubbleProps`

**Що змінити:**
Знайдіть інтерфейс `MessageBubbleProps` та додайте опціональний проп `isSystem?: boolean`:

```typescript
// components/MessageBubble.tsx

interface MessageBubbleProps {
  content: string;
  imageUrl?: string;
  createdAt: number;
  isMine: boolean;
  senderName: string;
  isGroup: boolean;
  senderAvatar?: string;
  senderId: string;
  audioUrl?: string;
  audioDuration?: number;
  replyToSender?: string;
  replyToText?: string;
  reactions?: ReactionItem[];
  onToggleReaction: (emoji: string) => void;
  isSystem?: boolean; // 👈 Додаємо для підтримки системних повідомлень
}
```

> [!NOTE]
> **Чому це потрібно:**
> TypeScript та компонент мають розрізняти тип повідомлення: звичайне повідомлення користувача чи службова дія чату (створення групи, додавання/вилучення людей, надання прав адміна).

---

### 4.2. Прийняти проп `isSystem` у параметрах компонента

**Що змінити:**
У списку параметрів (деструктуризації) `MessageBubbleComponent` прийміть `isSystem = false`:

```typescript
const MessageBubbleComponent: React.FC<MessageBubbleProps> = ({
  content,
  imageUrl,
  createdAt,
  isMine,
  senderName,
  isGroup,
  senderAvatar,
  senderId,
  audioUrl,
  audioDuration,
  replyToSender,
  replyToText,
  reactions,
  onToggleReaction,
  isSystem = false, // 👈 Значення за замовчуванням
}) => {
```

> [!NOTE]
> **Чому це потрібно:**
> За замовчуванням `isSystem = false`, тому для всіх існуючих та нових звичайних повідомлень зберігається стандартний вигляд без жодних побічних ефектів.

---

### 4.3. Додати умовний рендеринг системного повідомлення

**Що змінити:**
Одразу на початку компонента (після виклику хуків `useRouter`, але перед поверненням основної верстки бульбашки) додайте блок перевірки `if (isSystem)`:

```tsx
  const router = useRouter();
  const [isViewerVisible, setIsViewerVisible] = useState(false);

  // 👈 Ранній вихід: рендеримо компактну плашку по центру для системних подій
  if (isSystem) {
    return (
      <View className="my-2.5 items-center justify-center px-6">
        <View className="bg-surfaceLight/80 px-3.5 py-1.5 rounded-full border border-surface">
          <Text className="text-grey text-[11px] font-medium text-center">
            {content}
          </Text>
        </View>
      </View>
    );
  }

  // Форматуємо час: наприклад "14:32"
  const timeString = new Date(createdAt).toLocaleTimeString([], {
```

> [!IMPORTANT]
> **Чому це потрібно:**
> Системні сповіщення (наприклад, _"🎉 Груповий чат створено"_, _"👋 Олександр додав(ла) до групи: Марія"_, _"🚪 Іван залишив(ла) групу"_):
>
> 1. **Не є репліками діалогу:** вони не повинні вирівнюватися праворуч чи ліворуч (`isMine`).
> 2. **Не мають автора:** не потрібно показувати аватарку, нікнейм або перехід у профіль.
> 3. **Не потребують дій взаємодії:** на них не ставлять реакції сердечок і не відповідають свайпом.
> 4. **Мають виглядати нативно:** компактна нейтральна пігулка сірого кольору по центру екрана — це загальноприйнятий стандарт сучасних месенджерів (Telegram, WhatsApp, Viber).

---

## Крок 5: Створення модального вікна додавання учасників `components/AddMembersModal.tsx`

Створіть новий файл [`components/AddMembersModal.tsx`].

Цей компонент відповідає за:

- Пошук користувачів через `api.users.searchUsers`.
- Автоматичну фільтрацію тих користувачів, які **вже є учасниками чату** (`currentParticipantIds`).
- Мульти-вибір чекбоксами.
- Виклик мутації `api.conversations.addParticipantsToConversation`.

```tsx
// components/AddMembersModal.tsx
import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { COLORS } from "@/constants/theme";

interface AddMembersModalProps {
  visible: boolean;
  onClose: () => void;
  conversationId: Id<"conversations">;
  currentParticipantIds: Id<"users">[];
}

export const AddMembersModal: React.FC<AddMembersModalProps> = ({
  visible,
  onClose,
  conversationId,
  currentParticipantIds,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<Id<"users">[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const users = useQuery(api.users.searchUsers, { queryText: searchQuery });
  const addParticipantsMutation = useMutation(
    api.conversations.addParticipantsToConversation,
  );

  // Фільтруємо користувачів, які вже є в чаті
  const availableUsers = (users ?? []).filter(
    (u) => !currentParticipantIds.includes(u._id),
  );

  const toggleSelect = (userId: Id<"users">) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter((id) => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  const handleAdd = async () => {
    if (selectedUserIds.length === 0) return;

    try {
      setIsSubmitting(true);
      await addParticipantsMutation({
        conversationId,
        newParticipantIds: selectedUserIds,
      });
      setSelectedUserIds([]);
      setSearchQuery("");
      onClose();
    } catch (error: any) {
      Alert.alert(
        "Помилка",
        error?.message || "Не вдалося додати нових учасників",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/70 justify-end">
        <View className="bg-surface rounded-t-3xl h-[80%] border-t border-surfaceLight p-4">
          {/* Верхня панель */}
          <View className="flex-row items-center justify-between pb-3 border-b border-surfaceLight">
            <TouchableOpacity onPress={onClose} className="p-1">
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <Text className="text-white font-bold text-lg">
              Додати учасників
            </Text>

            <TouchableOpacity
              onPress={handleAdd}
              disabled={selectedUserIds.length === 0 || isSubmitting}
              className={`px-3 py-1.5 rounded-full ${
                selectedUserIds.length > 0 && !isSubmitting
                  ? "bg-primary"
                  : "opacity-40"
              }`}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-white font-semibold text-xs">
                  Додати ({selectedUserIds.length})
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Пошук */}
          <View className="flex-row items-center bg-surfaceLight rounded-xl px-3 py-2 my-3">
            <Ionicons name="search" size={18} color={COLORS.grey} />
            <TextInput
              placeholder="Пошук за іменем або нікнеймом..."
              placeholderTextColor={COLORS.grey}
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 text-white ml-2 text-sm"
              autoCapitalize="none"
            />
          </View>

          {/* Список користувачів */}
          {users === undefined ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : availableUsers.length === 0 ? (
            <View className="flex-1 justify-center items-center px-4">
              <Ionicons
                name="people-outline"
                size={44}
                color={COLORS.grey}
                style={{ marginBottom: 8 }}
              />
              <Text className="text-grey text-sm text-center">
                {searchQuery
                  ? "Користувачів не знайдено"
                  : "Усі доступні користувачі вже є в цьому чаті"}
              </Text>
            </View>
          ) : (
            <FlatList
              data={availableUsers}
              keyExtractor={(item) => item._id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = selectedUserIds.includes(item._id);

                return (
                  <TouchableOpacity
                    onPress={() => toggleSelect(item._id)}
                    className="flex-row items-center justify-between py-2.5 px-2 border-b border-surfaceLight/50"
                  >
                    <View className="flex-row items-center flex-1 mr-2">
                      <Image
                        source={{
                          uri:
                            item.image ||
                            "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
                        }}
                        style={{ width: 44, height: 44, borderRadius: 22 }}
                        contentFit="cover"
                      />
                      <View className="ml-3 flex-1">
                        <Text
                          numberOfLines={1}
                          className="text-white font-semibold text-sm"
                        >
                          {item.fullname || item.username}
                        </Text>
                        <Text className="text-grey text-xs">
                          @{item.username}
                        </Text>
                      </View>
                    </View>

                    <View
                      className={`w-6 h-6 rounded-full border items-center justify-center ${
                        isSelected
                          ? "bg-primary border-primary"
                          : "border-grey/50"
                      }`}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};
```

---

## Крок 6: Створення модального вікна деталей та керування групою `components/GroupInfoModal.tsx`

Створіть новий файл [`components/GroupInfoModal.tsx`].

Цей компонент відкривається при натисканні на хедер чату та містить:

1. Загальну інформацію про групу (назва, кількість людей, дата створення).
2. Інформацію про те, **хто створив чат** (👑 Власник).
3. Кнопку **«+ Додати учасників»** (для адміністраторів та творця).
4. Список учасників із бейджами ролей:
   - 👑 `Творець` (жовто-помаранчевий бейдж)
   - 🛡️ `Адмін` (акцентний бейдж)
   - `Учасник` (нейтральний)
5. Меню керування кожним учасником (Action Sheet):
   - Надання прав адміністратора / зняття статусу.
   - Вилучення учасника з групи (Kick).
6. Червоні кнопки дій у підвалі:
   - **«Вийти з групи»** (для учасників).
   - **«Видалити групу для всіх»** (лише для Творця з вікном підтвердження).

```tsx
// components/GroupInfoModal.tsx
import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { COLORS } from "@/constants/theme";
import { AddMembersModal } from "./AddMembersModal";

interface ParticipantItem {
  _id: Id<"users">;
  username: string;
  fullname: string;
  image?: string;
  role: "creator" | "admin" | "member";
}

interface GroupInfoModalProps {
  visible: boolean;
  onClose: () => void;
  conversationId: Id<"conversations">;
  groupName: string;
  creatorId: Id<"users">;
  participants: ParticipantItem[];
  currentUserRole: "creator" | "admin" | "member";
  canManageMembers: boolean;
  canDeleteChat: boolean;
  onConversationDeleted: () => void;
}

export const GroupInfoModal: React.FC<GroupInfoModalProps> = ({
  visible,
  onClose,
  conversationId,
  groupName,
  creatorId,
  participants,
  currentUserRole,
  canManageMembers,
  canDeleteChat,
  onConversationDeleted,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const currentUser = useQuery(api.users.currentUser);

  const updateRoleMutation = useMutation(
    api.conversations.updateParticipantRole,
  );
  const removeParticipantMutation = useMutation(
    api.conversations.removeParticipant,
  );
  const deleteConversationMutation = useMutation(
    api.conversations.deleteConversation,
  );

  // Знаходимо творця чату
  const creator = participants.find((p) => p._id === creatorId);

  // Обробка зміни ролі учасника
  const handleToggleAdmin = (participant: ParticipantItem) => {
    const isCurrentlyAdmin = participant.role === "admin";
    const nextRole = isCurrentlyAdmin ? "member" : "admin";

    Alert.alert(
      isCurrentlyAdmin ? "Зняти адміністратора" : "Призначити адміністратором",
      `Ви впевнені, що хочете ${
        isCurrentlyAdmin ? "зняти права адміна у" : "зробити адміном"
      } ${participant.username}?`,
      [
        { text: "Скасувати", style: "cancel" },
        {
          text: "Підтвердити",
          onPress: async () => {
            try {
              setIsActionLoading(true);
              await updateRoleMutation({
                conversationId,
                targetUserId: participant._id,
                newRole: nextRole,
              });
            } catch (err: any) {
              Alert.alert("Помилка", err?.message || "Не вдалося змінити роль");
            } finally {
              setIsActionLoading(false);
            }
          },
        },
      ],
    );
  };

  // Обробка вилучення учасника
  const handleKickParticipant = (participant: ParticipantItem) => {
    Alert.alert(
      "Вилучити з групи",
      `Ви впевнені, що хочете вилучити ${participant.username} з групи?`,
      [
        { text: "Скасувати", style: "cancel" },
        {
          text: "Вилучити",
          style: "destructive",
          onPress: async () => {
            try {
              setIsActionLoading(true);
              await removeParticipantMutation({
                conversationId,
                targetUserId: participant._id,
              });
            } catch (err: any) {
              Alert.alert("Помилка", err?.message || "Не вдалося вилучити");
            } finally {
              setIsActionLoading(false);
            }
          },
        },
      ],
    );
  };

  // Вихід із групи
  const handleLeaveGroup = () => {
    Alert.alert(
      "Покинути групу",
      "Ви більше не отримуватимете повідомлення з цього чату.",
      [
        { text: "Скасувати", style: "cancel" },
        {
          text: "Покинути",
          style: "destructive",
          onPress: async () => {
            try {
              if (!currentUser?._id) return;
              setIsActionLoading(true);

              await removeParticipantMutation({
                conversationId,
                targetUserId: currentUser._id,
              });
              onClose();
              onConversationDeleted();
            } catch (err: any) {
              Alert.alert("Помилка", err?.message || "Не вдалося покинути чат");
            } finally {
              setIsActionLoading(false);
            }
          },
        },
      ],
    );
  };

  // Повне видалення чату
  const handleDeleteGroup = () => {
    Alert.alert(
      "Видалити групу назавжди?",
      "Усі повідомлення, файли та історію буде безповоротно видалено для всіх учасників.",
      [
        { text: "Скасувати", style: "cancel" },
        {
          text: "Видалити",
          style: "destructive",
          onPress: async () => {
            try {
              setIsActionLoading(true);
              await deleteConversationMutation({ conversationId });
              onClose();
              onConversationDeleted();
            } catch (err: any) {
              Alert.alert("Помилка", err?.message || "Не вдалося видалити чат");
            } finally {
              setIsActionLoading(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/70 justify-end">
        <View className="bg-surface rounded-t-3xl h-[85%] border-t border-surfaceLight p-4">
          {/* Хедер модалки */}
          <View className="flex-row items-center justify-between pb-3 border-b border-surfaceLight">
            <TouchableOpacity onPress={onClose} className="p-1">
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text className="text-white font-bold text-lg">Деталі групи</Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Інформація про групу */}
          <View className="items-center py-4 border-b border-surfaceLight">
            <View className="w-16 h-16 rounded-full bg-surfaceLight border border-surface items-center justify-center mb-2">
              <Ionicons name="people" size={32} color={COLORS.primary} />
            </View>
            <Text className="text-white font-bold text-lg">{groupName}</Text>
            <Text className="text-grey text-xs mt-0.5">
              {participants.length} учасників • Творець: @
              {creator?.username ?? "user"}
            </Text>
          </View>

          {/* Кнопка додавання нових людей */}
          {canManageMembers && (
            <TouchableOpacity
              onPress={() => setIsAddModalOpen(true)}
              className="flex-row items-center bg-surfaceLight/80 p-3 rounded-xl my-3 border border-surfaceLight"
            >
              <View className="w-8 h-8 rounded-full bg-primary/20 items-center justify-center mr-3">
                <Ionicons name="person-add" size={18} color={COLORS.primary} />
              </View>
              <Text className="text-white font-semibold text-sm flex-1">
                Додати нових учасників
              </Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.grey} />
            </TouchableOpacity>
          )}

          {/* Список учасників */}
          <Text className="text-grey font-semibold text-xs uppercase tracking-wider mb-2 px-1">
            Учасники ({participants.length})
          </Text>

          <FlatList
            data={participants}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isItemCreator = item.role === "creator";
              const isItemAdmin = item.role === "admin";

              return (
                <View className="flex-row items-center justify-between py-2.5 px-2 border-b border-surfaceLight/40">
                  <View className="flex-row items-center flex-1 mr-2">
                    <Image
                      source={{
                        uri:
                          item.image ||
                          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
                      }}
                      style={{ width: 40, height: 40, borderRadius: 20 }}
                      contentFit="cover"
                    />
                    <View className="ml-3 flex-1">
                      <View className="flex-row items-center gap-1.5">
                        <Text
                          numberOfLines={1}
                          className="text-white font-semibold text-sm"
                        >
                          {item.fullname || item.username}
                        </Text>
                        {isItemCreator && (
                          <View className="bg-yellow-500/20 px-1.5 py-0.5 rounded">
                            <Text className="text-yellow-400 text-[10px] font-bold">
                              👑 Власник
                            </Text>
                          </View>
                        )}
                        {!isItemCreator && isItemAdmin && (
                          <View className="bg-primary/20 px-1.5 py-0.5 rounded">
                            <Text className="text-primary text-[10px] font-bold">
                              🛡️ Адмін
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-grey text-xs">
                        @{item.username}
                      </Text>
                    </View>
                  </View>

                  {/* Меню дій над учасником */}
                  {currentUserRole === "creator" && !isItemCreator && (
                    <View className="flex-row items-center gap-2">
                      <TouchableOpacity
                        onPress={() => handleToggleAdmin(item)}
                        className="p-1.5 bg-surfaceLight rounded-lg"
                      >
                        <Ionicons
                          name={isItemAdmin ? "shield" : "shield-outline"}
                          size={18}
                          color={isItemAdmin ? COLORS.primary : COLORS.grey}
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleKickParticipant(item)}
                        className="p-1.5 bg-red-500/10 rounded-lg"
                      >
                        <Ionicons
                          name="person-remove-outline"
                          size={18}
                          color="#EF4444"
                        />
                      </TouchableOpacity>
                    </View>
                  )}

                  {currentUserRole === "admin" &&
                    !isItemCreator &&
                    !isItemAdmin && (
                      <TouchableOpacity
                        onPress={() => handleKickParticipant(item)}
                        className="p-1.5 bg-red-500/10 rounded-lg"
                      >
                        <Ionicons
                          name="person-remove-outline"
                          size={18}
                          color="#EF4444"
                        />
                      </TouchableOpacity>
                    )}
                </View>
              );
            }}
          />

          {/* Нижні кнопки дій */}
          <View className="pt-3 border-t border-surfaceLight gap-2">
            {canDeleteChat ? (
              <TouchableOpacity
                onPress={handleDeleteGroup}
                disabled={isActionLoading}
                className="flex-row items-center justify-center bg-red-500/15 py-3 rounded-xl border border-red-500/30 active:opacity-70"
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color="#EF4444"
                  style={{ marginRight: 6 }}
                />
                <Text className="text-red-500 font-semibold text-sm">
                  Видалити групу для всіх
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleLeaveGroup}
                disabled={isActionLoading}
                className="flex-row items-center justify-center bg-red-500/15 py-3 rounded-xl border border-red-500/30 active:opacity-70"
              >
                <Ionicons
                  name="log-out-outline"
                  size={18}
                  color="#EF4444"
                  style={{ marginRight: 6 }}
                />
                <Text className="text-red-500 font-semibold text-sm">
                  Покинути групу
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Модальне вікно вибору нових людей */}
      <AddMembersModal
        visible={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        conversationId={conversationId}
        currentParticipantIds={participants.map((p) => p._id)}
      />
    </Modal>
  );
};
```

---

## Крок 7: Інтеграція в екран листування `app/messages/[id].tsx`

Відкрийте файл [`app/messages/[id].tsx`].

Нам необхідно:

1. Зробити клікабельним заголовок/аватар у верхньому хедері чату (або додати кнопку `information-circle-outline` праворуч), щоб при натисканні відкривалося вікно `GroupInfoModal`.
2. Якщо чат було видалено або користувача вилучено, безпечно повернутися назад: `router.replace("/messages")`.
3. Передавати прапорець `isSystem` у компонент `MessageBubble`.

### 7.1. Додавання стану модального вікна

```tsx
const [isGroupInfoVisible, setIsGroupInfoVisible] = useState(false);
```

### 7.2. Оновлення хедера чату

```tsx
{
  /* Хедер чату */
}
<View className="flex-row items-center justify-between px-4 py-3 border-b border-surface">
  <View className="flex-row items-center flex-1 mr-2">
    <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
      <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
    </TouchableOpacity>

    {/* Натискання на аватар та назву для відкриття інфо */}
    <TouchableOpacity
      onPress={() => conversation.isGroup && setIsGroupInfoVisible(true)}
      disabled={!conversation.isGroup}
      className="flex-row items-center flex-1"
    >
      {conversation.isGroup ? (
        <View className="w-10 h-10 rounded-full bg-surfaceLight border border-surface items-center justify-center mr-3">
          <Ionicons name="people" size={20} color={COLORS.primary} />
        </View>
      ) : (
        <Image
          source={{
            uri:
              headerAvatar ??
              "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
          }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            marginRight: 12,
          }}
          contentFit="cover"
        />
      )}

      <View className="flex-1 justify-center">
        <Text numberOfLines={1} className="text-white font-bold text-base">
          {headerTitle}
        </Text>

        <Text className="text-grey text-xs">
          {conversation.isGroup
            ? `${conversation.participants.length} учасників • Натисніть для інфо`
            : `@${conversation.otherUser?.username ?? "user"}`}
        </Text>
      </View>
    </TouchableOpacity>
  </View>

  {/* Кнопка налаштувань / інформації про групу */}
  {conversation.isGroup && (
    <TouchableOpacity
      onPress={() => setIsGroupInfoVisible(true)}
      className="p-1 active:opacity-70"
    >
      <Ionicons
        name="information-circle-outline"
        size={24}
        color={COLORS.primary}
      />
    </TouchableOpacity>
  )}
</View>;
```

### 7.3. Підключення `GroupInfoModal` у підвалі екрана

```tsx
{
  conversation.isGroup && (
    <GroupInfoModal
      visible={isGroupInfoVisible}
      onClose={() => setIsGroupInfoVisible(false)}
      conversationId={conversationId}
      groupName={conversation.name ?? "Груповий чат"}
      creatorId={conversation.creatorId}
      participants={conversation.participants}
      currentUserRole={conversation.currentUserRole}
      canManageMembers={conversation.canManageMembers}
      canDeleteChat={conversation.canDeleteChat}
      onConversationDeleted={() => router.replace("/messages")}
    />
  );
}
```

---

## Крок 8: Інтеграція видалення чату у списку бесід `app/messages/index.tsx`

Відкрийте файл [`app/messages/index.tsx`].

Додамо можливість довгого натискання (`onLongPress`) на будь-який чат у списку для виклику меню швидкого видалення або виходу.

```tsx
// app/messages/index.tsx
import { Alert } from "react-native";
import { useMutation } from "convex/react";

// Всередині компонента:
const deleteConversationMutation = useMutation(
  api.conversations.deleteConversation,
);
const removeParticipantMutation = useMutation(
  api.conversations.removeParticipant,
);

const handleLongPressChat = (item: any) => {
  if (item.isGroup) {
    if (item.creatorId === currentUserId) {
      Alert.alert("Керування групою", `Оберіть дію для групи «${item.name}»:`, [
        { text: "Скасувати", style: "cancel" },
        {
          text: "Видалити групу для всіх",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Підтвердження",
              "Безповоротно видалити групу та всі повідомлення?",
              [
                { text: "Скасувати", style: "cancel" },
                {
                  text: "Видалити",
                  style: "destructive",
                  onPress: () =>
                    deleteConversationMutation({ conversationId: item._id }),
                },
              ],
            );
          },
        },
      ]);
    } else {
      Alert.alert(
        "Покинути групу",
        `Ви впевнені, що хочете покинути «${item.name}»?`,
        [
          { text: "Скасувати", style: "cancel" },
          {
            text: "Покинути",
            style: "destructive",
            onPress: () =>
              removeParticipantMutation({
                conversationId: item._id,
                targetUserId: currentUserId,
              }),
          },
        ],
      );
    }
  } else {
    // Особистий 1-на-1 діалог
    Alert.alert("Видалити діалог", "Видалити це листування?", [
      { text: "Скасувати", style: "cancel" },
      {
        text: "Видалити",
        style: "destructive",
        onPress: () => deleteConversationMutation({ conversationId: item._id }),
      },
    ]);
  }
};
```

---

## 10. Повні оновлені лістинги файлів

### 10.1. Повний оновлений файл `convex/schema.ts`

```typescript
import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    username: v.optional(v.string()),
    fullname: v.optional(v.string()),
    bio: v.optional(v.string()),
    followers: v.optional(v.number()),
    following: v.optional(v.number()),
    posts: v.optional(v.number()),
  }).index("by_email", ["email"]),

  posts: defineTable({
    userId: v.id("users"),
    imageUrl: v.string(),
    storageId: v.id("_storage"),
    caption: v.optional(v.string()),
    likes: v.number(),
    comments: v.number(),
    createdAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  likes: defineTable({
    userId: v.id("users"),
    postId: v.id("posts"),
  })
    .index("by_post", ["postId"])
    .index("by_user_and_post", ["userId", "postId"]),

  comments: defineTable({
    userId: v.id("users"),
    postId: v.id("posts"),
    content: v.string(),
  }).index("by_post", ["postId"]),

  follows: defineTable({
    followerId: v.id("users"),
    followingId: v.id("users"),
  })
    .index("by_follower", ["followerId"])
    .index("by_following", ["followingId"])
    .index("by_both", ["followerId", "followingId"]),

  notifications: defineTable({
    receiverId: v.id("users"),
    senderId: v.id("users"),
    type: v.union(v.literal("like"), v.literal("comment"), v.literal("follow")),
    postId: v.optional(v.id("posts")),
    commentId: v.optional(v.id("comments")),
  }).index("by_receiver", ["receiverId"]),

  bookmarks: defineTable({
    userId: v.id("users"),
    postId: v.id("posts"),
  })
    .index("by_user", ["userId"])
    .index("by_post", ["postId"])
    .index("by_both", ["userId", "postId"]),

  stories: defineTable({
    userId: v.id("users"),
    imageUrl: v.string(),
    storageId: v.id("_storage"),
    expiresAt: v.number(),
    views: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_expires", ["expiresAt"]),

  conversations: defineTable({
    isGroup: v.boolean(),
    name: v.optional(v.string()),
    participantIds: v.array(v.id("users")),
    creatorId: v.id("users"),
    adminIds: v.optional(v.array(v.id("users"))), // 👈 Список адміністраторів
    lastMessage: v.optional(v.string()),
    lastMessageAt: v.optional(v.number()),
  }),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    imageUrl: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    audioUrl: v.optional(v.string()),
    audioStorageId: v.optional(v.id("_storage")),
    audioDuration: v.optional(v.number()),
    createdAt: v.number(),
    replyToId: v.optional(v.id("messages")),
    replyToSender: v.optional(v.string()),
    replyToText: v.optional(v.string()),
    isSystem: v.optional(v.boolean()), // 👈 Системні повідомлення
  })
    .index("by_conversation", ["conversationId"])
    .index("by_created_at", ["createdAt"]),

  messageReactions: defineTable({
    messageId: v.id("messages"),
    userId: v.id("users"),
    emoji: v.string(),
  })
    .index("by_message", ["messageId"])
    .index("by_user_and_message", ["userId", "messageId"]),
});
```

---

### 10.2. Повний оновлений файл `convex/conversations.ts`

```typescript
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Отримує всі бесіди, у яких бере участь поточний користувач
 */
export const getConversations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const allConversations = await ctx.db.query("conversations").collect();

    const userConversations = allConversations.filter((c) =>
      c.participantIds.includes(userId),
    );

    userConversations.sort(
      (a, b) =>
        (b.lastMessageAt ?? b._creationTime) -
        (a.lastMessageAt ?? a._creationTime),
    );

    const enriched = await Promise.all(
      userConversations.map(async (conv) => {
        let otherUser = null;
        if (!conv.isGroup) {
          const otherUserId = conv.participantIds.find((id) => id !== userId);
          if (otherUserId) {
            otherUser = await ctx.db.get(otherUserId);
          }
        }

        const participants = await Promise.all(
          conv.participantIds.map((id) => ctx.db.get(id)),
        );

        return {
          ...conv,
          otherUser: otherUser
            ? {
                _id: otherUser._id,
                username: otherUser.username ?? otherUser.name ?? "Користувач",
                fullname: otherUser.fullname ?? otherUser.name ?? "",
                image: otherUser.image,
              }
            : null,
          participantCount: conv.participantIds.length,
          participants: participants.filter((p) => p !== null),
        };
      }),
    );

    return enriched;
  },
});

/**
 * Отримує або створює 1-on-1 діалог
 */
export const getOrCreateDirectConversation = mutation({
  args: { participantId: v.id("users") },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Unauthorized: Необхідно авторизуватися");
    }

    if (currentUserId === args.participantId) {
      throw new Error("Не можна створити чат із самим собою");
    }

    const allConversations = await ctx.db.query("conversations").collect();
    const existing = allConversations.find(
      (c) =>
        !c.isGroup &&
        c.participantIds.length === 2 &&
        c.participantIds.includes(currentUserId) &&
        c.participantIds.includes(args.participantId),
    );

    if (existing) {
      return existing._id;
    }

    const newConversationId = await ctx.db.insert("conversations", {
      isGroup: false,
      participantIds: [currentUserId, args.participantId],
      creatorId: currentUserId,
      lastMessage: undefined,
      lastMessageAt: Date.now(),
    });

    return newConversationId;
  },
});

/**
 * Створює новий груповий чат
 */
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
      new Set([currentUserId, ...args.participantIds]),
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

/**
 * Отримує деталі конкретної бесіди з ролями та дозволами
 */
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
        (id) => id !== currentUserId,
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
          fullname: user.fullname ?? user.name ?? "",
          image: user.image,
          role,
        };
      }),
    );

    return {
      ...conversation,
      adminIds,
      otherUser: otherUser
        ? {
            _id: otherUser._id,
            username: otherUser.username ?? otherUser.name ?? "Користувач",
            fullname: otherUser.fullname ?? otherUser.name ?? "",
            image: otherUser.image,
          }
        : null,
      participants: participants.filter(
        (p): p is NonNullable<typeof p> => p !== null,
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

/**
 * Додає нових учасників до групового чату
 */
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
      (id) => !conversation.participantIds.includes(id),
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

/**
 * Змінює роль учасника (Admin <-> Member)
 */
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

/**
 * Вилучає учасника з групи або дозволяє покинути чат
 */
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
          "Творець не може покинути групу, поки в ній є інші учасники. Видаліть групу або призначте іншого творця.",
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
      (id) => id !== args.targetUserId,
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

/**
 * Каскадне видалення бесіди
 */
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
        q.eq("conversationId", args.conversationId),
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

      await ctx.db.delete(msg._id);
    }

    await ctx.db.delete(args.conversationId);

    return { success: true };
  },
});
```

---

### 10.3. Повний оновлений файл `convex/messages.ts`

```typescript
import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const generateUploadUrl = mutation(async (ctx) => {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new Error("Unauthorized: Необхідно авторизуватися");
  }
  return await ctx.storage.generateUploadUrl();
});

export const getMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) return [];

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || !conversation.participantIds.includes(currentUserId)) {
      return [];
    }

    const rawMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();

    rawMessages.sort((a, b) => b.createdAt - a.createdAt);

    const enrichedMessages = await Promise.all(
      rawMessages.map(async (msg) => {
        const sender = await ctx.db.get(msg.senderId);
        return {
          ...msg,
          isSystem: msg.isSystem ?? false,
          senderName:
            sender?.username ??
            sender?.fullname ??
            sender?.name ??
            "Користувач",
          senderImage: sender?.image,
          isMine: msg.senderId === currentUserId,
          senderAvatar: sender?.image,
        };
      }),
    );

    return enrichedMessages;
  },
});

export const getPaginatedMessages = query({
  args: {
    conversationId: v.id("conversations"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || !conversation.participantIds.includes(currentUserId)) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    const paginated = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("desc")
      .paginate(args.paginationOpts);

    const enrichedMessages = await Promise.all(
      paginated.page.map(async (msg) => {
        const sender = await ctx.db.get(msg.senderId);

        const reactions = await ctx.db
          .query("messageReactions")
          .withIndex("by_message", (q) => q.eq("messageId", msg._id))
          .collect();

        const reactionCounts = reactions.reduce(
          (acc, curr) => {
            if (!acc[curr.emoji]) {
              acc[curr.emoji] = { count: 0, hasReacted: false };
            }
            acc[curr.emoji].count += 1;
            if (curr.userId === currentUserId) {
              acc[curr.emoji].hasReacted = true;
            }
            return acc;
          },
          {} as Record<string, { count: number; hasReacted: boolean }>,
        );

        const formattedReactions = Object.entries(reactionCounts).map(
          ([emoji, { count, hasReacted }]) => ({
            emoji,
            count,
            hasReacted,
          }),
        );

        return {
          ...msg,
          isSystem: msg.isSystem ?? false,
          senderName:
            sender?.username ??
            sender?.fullname ??
            sender?.name ??
            "Користувач",
          senderAvatar: sender?.image,
          isMine: msg.senderId === currentUserId,
          reactions: formattedReactions,
        };
      }),
    );

    return {
      ...paginated,
      page: enrichedMessages,
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
    replyToId: v.optional(v.id("messages")),
    replyToSender: v.optional(v.string()),
    replyToText: v.optional(v.string()),
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

    if (!conversation.participantIds.includes(currentUserId)) {
      throw new Error("Ви не можете надсилати повідомлення в цей чат");
    }

    const trimmedContent = args.content.trim();
    if (!trimmedContent && !args.storageId && !args.audioStorageId) {
      throw new Error("Повідомлення не може бути порожнім");
    }

    let imageUrl: string | undefined = undefined;
    if (args.storageId) {
      const url = await ctx.storage.getUrl(args.storageId);
      if (url) imageUrl = url;
    }

    let audioUrl: string | undefined = undefined;
    if (args.audioStorageId) {
      const url = await ctx.storage.getUrl(args.audioStorageId);
      if (url) audioUrl = url;
    }

    const now = Date.now();

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: currentUserId,
      content: trimmedContent,
      imageUrl,
      storageId: args.storageId,
      audioUrl,
      audioStorageId: args.audioStorageId,
      audioDuration: args.audioDuration,
      createdAt: now,
      replyToId: args.replyToId,
      replyToSender: args.replyToSender,
      replyToText: args.replyToText,
      isSystem: false,
    });

    let previewText = trimmedContent;
    if (!previewText) {
      if (args.audioStorageId) {
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

export const toggleReaction = mutation({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized: Необхідно авторизуватися");
    }

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Повідомлення не знайдено");
    }

    const existing = await ctx.db
      .query("messageReactions")
      .withIndex("by_user_and_message", (q) =>
        q.eq("userId", userId).eq("messageId", args.messageId),
      )
      .first();

    if (existing) {
      if (existing.emoji === args.emoji) {
        await ctx.db.delete(existing._id);
        return { action: "removed" };
      } else {
        await ctx.db.patch(existing._id, { emoji: args.emoji });
        return { action: "updated", emoji: args.emoji };
      }
    } else {
      await ctx.db.insert("messageReactions", {
        messageId: args.messageId,
        userId,
        emoji: args.emoji,
      });
      return { action: "added", emoji: args.emoji };
    }
  },
});
```

---

### 10.4. Повний оновлений файл `components/MessageBubble.tsx`

```tsx
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { memo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { MessageReactions, ReactionItem } from "./MessageReactions";
import { VoiceMessagePlayer } from "./VoiceMessagePlayer";

interface MessageBubbleProps {
  content: string;
  imageUrl?: string;
  createdAt: number;
  isMine: boolean;
  senderName: string;
  isGroup: boolean;
  senderAvatar?: string;
  senderId: string;
  audioUrl?: string;
  audioDuration?: number;
  replyToSender?: string;
  replyToText?: string;
  reactions?: ReactionItem[];
  onToggleReaction: (emoji: string) => void;
  isSystem?: boolean;
}

const MessageBubbleComponent: React.FC<MessageBubbleProps> = ({
  content,
  imageUrl,
  createdAt,
  isMine,
  senderName,
  isGroup,
  senderAvatar,
  senderId,
  audioUrl,
  audioDuration,
  replyToSender,
  replyToText,
  reactions,
  onToggleReaction,
  isSystem = false,
}) => {
  const router = useRouter();

  if (isSystem) {
    return (
      <View className="my-2.5 items-center justify-center px-6">
        <View className="bg-surfaceLight/80 px-3.5 py-1.5 rounded-full border border-surface">
          <Text className="text-grey text-[11px] font-medium text-center">
            {content}
          </Text>
        </View>
      </View>
    );
  }

  const timeString = new Date(createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View
      className={`my-1 max-w-[82%] ${
        isMine ? "self-end items-end" : "self-start items-start"
      }`}
    >
      <TouchableOpacity onPress={() => router.push(`/user/${senderId}`)}>
        <View className="flex-row items-center gap-1 mb-1">
          <Image
            source={{
              uri:
                senderAvatar ||
                "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
            }}
            style={{ width: 22, height: 22, borderRadius: 50 }}
            contentFit="cover"
          />
          {!isMine && isGroup && (
            <Text className="text-grey text-[11px] ml-1 font-medium">
              {senderName}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      <View
        className={`px-3 py-2 rounded-2xl ${
          isMine
            ? "bg-primary rounded-tr-xs"
            : "bg-surface border border-surfaceLight rounded-tl-xs"
        }`}
      >
        {replyToSender && (
          <View className="mb-2 p-2 rounded-lg bg-black/25 border-l-2 border-white/80">
            <Text className="text-white/90 font-bold text-[11px] mb-0.5">
              {replyToSender}
            </Text>
            <Text numberOfLines={2} className="text-white/70 text-[12px]">
              {replyToText || "Вкладення"}
            </Text>
          </View>
        )}

        {imageUrl && (
          <View className="mb-2 rounded-xl overflow-hidden">
            <Image
              source={{ uri: imageUrl }}
              style={{ width: 220, height: 220, borderRadius: 12 }}
              contentFit="cover"
              transition={200}
            />
          </View>
        )}

        {audioUrl && (
          <VoiceMessagePlayer
            audioUrl={audioUrl}
            duration={audioDuration}
            isMine={isMine}
          />
        )}

        {content ? (
          <Text className="text-white text-base leading-5">{content}</Text>
        ) : null}

        <Text
          className={`text-[10px] mt-1 self-end ${
            isMine ? "text-white/70" : "text-grey"
          }`}
        >
          {timeString}
        </Text>

        <MessageReactions
          reactions={reactions}
          onToggleReaction={onToggleReaction}
          isMine={isMine}
        />
      </View>
    </View>
  );
};

export const MessageBubble = memo(MessageBubbleComponent);
```

---

### 10.5. Новий файл `components/AddMembersModal.tsx`

```tsx
import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface AddMembersModalProps {
  visible: boolean;
  onClose: () => void;
  conversationId: Id<"conversations">;
  currentParticipantIds: Id<"users">[];
}

export const AddMembersModal: React.FC<AddMembersModalProps> = ({
  visible,
  onClose,
  conversationId,
  currentParticipantIds,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<Id<"users">[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const users = useQuery(api.users.searchUsers, { queryText: searchQuery });
  const addParticipantsMutation = useMutation(
    api.conversations.addParticipantsToConversation,
  );

  const availableUsers = (users ?? []).filter(
    (u) => !currentParticipantIds.includes(u._id),
  );

  const toggleSelect = (userId: Id<"users">) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter((id) => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  const handleAdd = async () => {
    if (selectedUserIds.length === 0) return;

    try {
      setIsSubmitting(true);
      await addParticipantsMutation({
        conversationId,
        newParticipantIds: selectedUserIds,
      });
      setSelectedUserIds([]);
      setSearchQuery("");
      onClose();
    } catch (error: any) {
      Alert.alert(
        "Помилка",
        error?.message || "Не вдалося додати нових учасників",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/70 justify-end">
        <View className="bg-surface rounded-t-3xl h-[80%] border-t border-surfaceLight p-4">
          <View className="flex-row items-center justify-between pb-3 border-b border-surfaceLight">
            <TouchableOpacity onPress={onClose} className="p-1">
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <Text className="text-white font-bold text-lg">
              Додати учасників
            </Text>

            <TouchableOpacity
              onPress={handleAdd}
              disabled={selectedUserIds.length === 0 || isSubmitting}
              className={`px-3 py-1.5 rounded-full ${
                selectedUserIds.length > 0 && !isSubmitting
                  ? "bg-primary"
                  : "opacity-40"
              }`}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-white font-semibold text-xs">
                  Додати ({selectedUserIds.length})
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center bg-surfaceLight rounded-xl px-3 py-2 my-3">
            <Ionicons name="search" size={18} color={COLORS.grey} />
            <TextInput
              placeholder="Пошук за іменем або нікнеймом..."
              placeholderTextColor={COLORS.grey}
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 text-white ml-2 text-sm"
              autoCapitalize="none"
            />
          </View>

          {users === undefined ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : availableUsers.length === 0 ? (
            <View className="flex-1 justify-center items-center px-4">
              <Ionicons
                name="people-outline"
                size={44}
                color={COLORS.grey}
                style={{ marginBottom: 8 }}
              />
              <Text className="text-grey text-sm text-center">
                {searchQuery
                  ? "Користувачів не знайдено"
                  : "Усі доступні користувачі вже є в цьому чаті"}
              </Text>
            </View>
          ) : (
            <FlatList
              data={availableUsers}
              keyExtractor={(item) => item._id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = selectedUserIds.includes(item._id);

                return (
                  <TouchableOpacity
                    onPress={() => toggleSelect(item._id)}
                    className="flex-row items-center justify-between py-2.5 px-2 border-b border-surfaceLight/50"
                  >
                    <View className="flex-row items-center flex-1 mr-2">
                      <Image
                        source={{
                          uri:
                            item.image ||
                            "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
                        }}
                        style={{ width: 44, height: 44, borderRadius: 22 }}
                        contentFit="cover"
                      />
                      <View className="ml-3 flex-1">
                        <Text
                          numberOfLines={1}
                          className="text-white font-semibold text-sm"
                        >
                          {item.fullname || item.username}
                        </Text>
                        <Text className="text-grey text-xs">
                          @{item.username}
                        </Text>
                      </View>
                    </View>

                    <View
                      className={`w-6 h-6 rounded-full border items-center justify-center ${
                        isSelected
                          ? "bg-primary border-primary"
                          : "border-grey/50"
                      }`}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};
```

---

### 10.6. Новий файл `components/GroupInfoModal.tsx`

```tsx
import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AddMembersModal } from "./AddMembersModal";

interface ParticipantItem {
  _id: Id<"users">;
  username: string;
  fullname: string;
  image?: string;
  role: "creator" | "admin" | "member";
}

interface GroupInfoModalProps {
  visible: boolean;
  onClose: () => void;
  conversationId: Id<"conversations">;
  groupName: string;
  creatorId: Id<"users">;
  participants: ParticipantItem[];
  currentUserRole: "creator" | "admin" | "member";
  canManageMembers: boolean;
  canDeleteChat: boolean;
  onConversationDeleted: () => void;
}

export const GroupInfoModal: React.FC<GroupInfoModalProps> = ({
  visible,
  onClose,
  conversationId,
  groupName,
  creatorId,
  participants,
  currentUserRole,
  canManageMembers,
  canDeleteChat,
  onConversationDeleted,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const currentUser = useQuery(api.users.currentUser);

  const updateRoleMutation = useMutation(
    api.conversations.updateParticipantRole,
  );
  const removeParticipantMutation = useMutation(
    api.conversations.removeParticipant,
  );
  const deleteConversationMutation = useMutation(
    api.conversations.deleteConversation,
  );

  const creator = participants.find((p) => p._id === creatorId);

  const handleToggleAdmin = (participant: ParticipantItem) => {
    const isCurrentlyAdmin = participant.role === "admin";
    const nextRole = isCurrentlyAdmin ? "member" : "admin";

    Alert.alert(
      isCurrentlyAdmin ? "Зняти адміністратора" : "Призначити адміністратором",
      `Ви впевнені, що хочете ${
        isCurrentlyAdmin ? "зняти права адміна у" : "зробити адміном"
      } ${participant.username}?`,
      [
        { text: "Скасувати", style: "cancel" },
        {
          text: "Підтвердити",
          onPress: async () => {
            try {
              setIsActionLoading(true);
              await updateRoleMutation({
                conversationId,
                targetUserId: participant._id,
                newRole: nextRole,
              });
            } catch (err: any) {
              Alert.alert("Помилка", err?.message || "Не вдалося змінити роль");
            } finally {
              setIsActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleKickParticipant = (participant: ParticipantItem) => {
    Alert.alert(
      "Вилучити з групи",
      `Ви впевнені, що хочете вилучити ${participant.username} з групи?`,
      [
        { text: "Скасувати", style: "cancel" },
        {
          text: "Вилучити",
          style: "destructive",
          onPress: async () => {
            try {
              setIsActionLoading(true);
              await removeParticipantMutation({
                conversationId,
                targetUserId: participant._id,
              });
            } catch (err: any) {
              Alert.alert("Помилка", err?.message || "Не вдалося вилучити");
            } finally {
              setIsActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      "Покинути групу",
      "Ви більше не отримуватимете повідомлення з цього чату.",
      [
        { text: "Скасувати", style: "cancel" },
        {
          text: "Покинути",
          style: "destructive",
          onPress: async () => {
            try {
              if (!currentUser?._id) return;
              setIsActionLoading(true);

              await removeParticipantMutation({
                conversationId,
                targetUserId: currentUser._id,
              });
              onClose();
              onConversationDeleted();
            } catch (err: any) {
              Alert.alert("Помилка", err?.message || "Не вдалося покинути чат");
            } finally {
              setIsActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleDeleteGroup = () => {
    Alert.alert(
      "Видалити групу назавжди?",
      "Усі повідомлення, файли та історію буде безповоротно видалено для всіх учасників.",
      [
        { text: "Скасувати", style: "cancel" },
        {
          text: "Видалити",
          style: "destructive",
          onPress: async () => {
            try {
              setIsActionLoading(true);
              await deleteConversationMutation({ conversationId });
              onClose();
              onConversationDeleted();
            } catch (err: any) {
              Alert.alert("Помилка", err?.message || "Не вдалося видалити чат");
            } finally {
              setIsActionLoading(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/70 justify-end">
        <View className="bg-surface rounded-t-3xl h-[85%] border-t border-surfaceLight p-4">
          <View className="flex-row items-center justify-between pb-3 border-b border-surfaceLight">
            <TouchableOpacity onPress={onClose} className="p-1">
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text className="text-white font-bold text-lg">Деталі групи</Text>
            <View style={{ width: 28 }} />
          </View>

          <View className="items-center py-4 border-b border-surfaceLight">
            <View className="w-16 h-16 rounded-full bg-surfaceLight border border-surface items-center justify-center mb-2">
              <Ionicons name="people" size={32} color={COLORS.primary} />
            </View>
            <Text className="text-white font-bold text-lg">{groupName}</Text>
            <Text className="text-grey text-xs mt-0.5">
              {participants.length} учасників • Творець: @
              {creator?.username ?? "user"}
            </Text>
          </View>

          {canManageMembers && (
            <TouchableOpacity
              onPress={() => setIsAddModalOpen(true)}
              className="flex-row items-center bg-surfaceLight/80 p-3 rounded-xl my-3 border border-surfaceLight"
            >
              <View className="w-8 h-8 rounded-full bg-primary/20 items-center justify-center mr-3">
                <Ionicons name="person-add" size={18} color={COLORS.primary} />
              </View>
              <Text className="text-white font-semibold text-sm flex-1">
                Додати нових учасників
              </Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.grey} />
            </TouchableOpacity>
          )}

          <Text className="text-grey font-semibold text-xs uppercase tracking-wider mb-2 px-1">
            Учасники ({participants.length})
          </Text>

          <FlatList
            data={participants}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isItemCreator = item.role === "creator";
              const isItemAdmin = item.role === "admin";

              return (
                <View className="flex-row items-center justify-between py-2.5 px-2 border-b border-surfaceLight/40">
                  <View className="flex-row items-center flex-1 mr-2">
                    <Image
                      source={{
                        uri:
                          item.image ||
                          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
                      }}
                      style={{ width: 40, height: 40, borderRadius: 20 }}
                      contentFit="cover"
                    />
                    <View className="ml-3 flex-1">
                      <View className="flex-row items-center gap-1.5">
                        <Text
                          numberOfLines={1}
                          className="text-white font-semibold text-sm"
                        >
                          {item.fullname || item.username}
                        </Text>
                        {isItemCreator && (
                          <View className="bg-yellow-500/20 px-1.5 py-0.5 rounded">
                            <Text className="text-yellow-400 text-[10px] font-bold">
                              👑 Власник
                            </Text>
                          </View>
                        )}
                        {!isItemCreator && isItemAdmin && (
                          <View className="bg-primary/20 px-1.5 py-0.5 rounded">
                            <Text className="text-primary text-[10px] font-bold">
                              🛡️ Адмін
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-grey text-xs">
                        @{item.username}
                      </Text>
                    </View>
                  </View>

                  {/* Меню дій над учасником */}
                  {currentUserRole === "creator" && !isItemCreator && (
                    <View className="flex-row items-center gap-2">
                      <TouchableOpacity
                        onPress={() => handleToggleAdmin(item)}
                        className="p-1.5 bg-surfaceLight rounded-lg"
                      >
                        <Ionicons
                          name={isItemAdmin ? "shield" : "shield-outline"}
                          size={18}
                          color={isItemAdmin ? COLORS.primary : COLORS.grey}
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleKickParticipant(item)}
                        className="p-1.5 bg-red-500/10 rounded-lg"
                      >
                        <Ionicons
                          name="person-remove-outline"
                          size={18}
                          color="#EF4444"
                        />
                      </TouchableOpacity>
                    </View>
                  )}

                  {currentUserRole === "admin" &&
                    !isItemCreator &&
                    !isItemAdmin && (
                      <TouchableOpacity
                        onPress={() => handleKickParticipant(item)}
                        className="p-1.5 bg-red-500/10 rounded-lg"
                      >
                        <Ionicons
                          name="person-remove-outline"
                          size={18}
                          color="#EF4444"
                        />
                      </TouchableOpacity>
                    )}
                </View>
              );
            }}
          />

          <View className="pt-3 border-t border-surfaceLight gap-2">
            {canDeleteChat ? (
              <TouchableOpacity
                onPress={handleDeleteGroup}
                disabled={isActionLoading}
                className="flex-row items-center justify-center bg-red-500/15 py-3 rounded-xl border border-red-500/30 active:opacity-70"
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color="#EF4444"
                  style={{ marginRight: 6 }}
                />
                <Text className="text-red-500 font-semibold text-sm">
                  Видалити групу для всіх
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleLeaveGroup}
                disabled={isActionLoading}
                className="flex-row items-center justify-center bg-red-500/15 py-3 rounded-xl border border-red-500/30 active:opacity-70"
              >
                <Ionicons
                  name="log-out-outline"
                  size={18}
                  color="#EF4444"
                  style={{ marginRight: 6 }}
                />
                <Text className="text-red-500 font-semibold text-sm">
                  Покинути групу
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <AddMembersModal
        visible={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        conversationId={conversationId}
        currentParticipantIds={participants.map((p) => p._id)}
      />
    </Modal>
  );
};
```

---

### 10.7. Повний оновлений файл `app/messages/[id].tsx`

```tsx
import { ChatInput } from "@/components/ChatInput";
import { GroupInfoModal } from "@/components/GroupInfoModal";
import { MessageBubble } from "@/components/MessageBubble";
import {
  ReactionPickerModal,
  ReactionPickerPosition,
} from "@/components/ReactionPickerModal";
import { SwipeableMessageItem } from "@/components/SwipeableMessageItem";
import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { File } from "expo-file-system";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { fetch } from "expo/fetch";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = id as Id<"conversations">;

  const [isSending, setIsSending] = useState(false);
  const [isGroupInfoVisible, setIsGroupInfoVisible] = useState(false);

  const conversation = useQuery(api.conversations.getConversation, {
    conversationId,
  });

  const {
    results: messages,
    status,
    loadMore,
    isLoading,
  } = usePaginatedQuery(
    api.messages.getPaginatedMessages,
    { conversationId },
    { initialNumItems: 25 },
  );

  const sendMessageMutation = useMutation(api.messages.sendMessage);
  const generateUploadUrlMutation = useMutation(api.messages.generateUploadUrl);
  const toggleReactionMutation = useMutation(api.messages.toggleReaction);

  const [replyingTo, setReplyingTo] = useState<{
    messageId: string;
    senderName: string;
    text: string;
  } | null>(null);

  const [pickerState, setPickerState] = useState<{
    messageId: Id<"messages">;
    position: ReactionPickerPosition;
  } | null>(null);

  const handleToggleReaction = async (
    messageId: Id<"messages">,
    emoji: string,
  ) => {
    try {
      await toggleReactionMutation({ messageId, emoji });
    } catch (error) {
      console.error("Помилка зміни реакції:", error);
    }
  };

  const handleSendAudio = async (audioUri: string, durationSeconds: number) => {
    try {
      setIsSending(true);
      const uploadUrl = await generateUploadUrlMutation();
      const file = new File(audioUri);

      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "audio/m4a" },
        body: file,
      });

      if (!uploadResult.ok) {
        const errorText = await uploadResult.text();
        throw new Error(
          `Не вдалося завантажити аудіо: HTTP ${uploadResult.status}${
            errorText ? ` — ${errorText}` : ""
          }`,
        );
      }

      const { storageId } = await uploadResult.json();

      await sendMessageMutation({
        conversationId,
        content: "",
        audioStorageId: storageId,
        audioDuration: durationSeconds,
      });
    } catch (error: any) {
      Alert.alert(
        "Помилка",
        error.message || "Не вдалося надіслати голосове повідомлення",
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleSendMessage = async (text: string, selectedImageUri?: string) => {
    try {
      setIsSending(true);
      let storageId: Id<"_storage"> | undefined;

      if (selectedImageUri) {
        const uploadUrl = await generateUploadUrlMutation();
        const file = new File(selectedImageUri);
        const uploadResult = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "image/jpeg" },
          body: file,
        });
        const { storageId: uploadedId } = await uploadResult.json();
        storageId = uploadedId;
      }

      await sendMessageMutation({
        conversationId,
        content: text,
        storageId,
        replyToId: replyingTo?.messageId as Id<"messages"> | undefined,
        replyToSender: replyingTo?.senderName,
        replyToText: replyingTo?.text,
      });

      setReplyingTo(null);
    } catch (error: any) {
      Alert.alert(
        "Помилка",
        error?.message || "Не вдалося надіслати повідомлення",
      );
    } finally {
      setIsSending(false);
    }
  };

  if (conversation === undefined || (isLoading && messages.length === 0)) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!conversation) {
    return (
      <View className="flex-1 bg-black justify-center items-center px-4">
        <Text className="text-white text-base mb-4">Бесіду не знайдено</Text>
        <TouchableOpacity
          onPress={() => router.replace("/messages")}
          className="bg-primary px-4 py-2 rounded-xl"
        >
          <Text className="text-white font-semibold">Повернутися</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const headerTitle = conversation.isGroup
    ? (conversation.name ?? "Груповий чат")
    : conversation.otherUser?.fullname ||
      conversation.otherUser?.username ||
      "Користувач";

  const headerAvatar = conversation.isGroup
    ? null
    : conversation.otherUser?.image;

  return (
    <View className="flex-1 bg-black">
      {/* Хедер чату */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-surface">
        <View className="flex-row items-center flex-1 mr-2">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => conversation.isGroup && setIsGroupInfoVisible(true)}
            disabled={!conversation.isGroup}
            className="flex-row items-center flex-1"
          >
            {conversation.isGroup ? (
              <View className="w-10 h-10 rounded-full bg-surfaceLight border border-surface items-center justify-center mr-3">
                <Ionicons name="people" size={20} color={COLORS.primary} />
              </View>
            ) : (
              <Image
                source={{
                  uri:
                    headerAvatar ??
                    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
                }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  marginRight: 12,
                }}
                contentFit="cover"
              />
            )}

            <View className="flex-1 justify-center">
              <Text
                numberOfLines={1}
                className="text-white font-bold text-base"
              >
                {headerTitle}
              </Text>

              <Text className="text-grey text-xs">
                {conversation.isGroup
                  ? `${conversation.participants.length} учасників • Деталі ℹ️`
                  : `@${conversation.otherUser?.username ?? "user"}`}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {conversation.isGroup && (
          <TouchableOpacity
            onPress={() => setIsGroupInfoVisible(true)}
            className="p-1 active:opacity-70"
          >
            <Ionicons
              name="information-circle-outline"
              size={24}
              color={COLORS.primary}
            />
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 50}
      >
        <FlatList
          data={messages}
          inverted
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
          onEndReached={() => {
            if (status === "CanLoadMore") {
              loadMore(20);
            }
          }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            status === "LoadingMore" ? (
              <View className="py-4 items-center justify-center">
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <SwipeableMessageItem
              isMine={item.isMine}
              onReply={() => {
                if (item.isSystem) return;
                setReplyingTo({
                  messageId: item._id,
                  senderName: item.senderName,
                  text:
                    item.content ||
                    (item.imageUrl ? "📷 Фотографія" : "🎤 Голосове"),
                });
              }}
              onDoubleTap={() => {
                if (!item.isSystem) {
                  handleToggleReaction(item._id, "❤️");
                }
              }}
              onLongPress={(position) => {
                if (!item.isSystem) {
                  setPickerState({ messageId: item._id, position });
                }
              }}
            >
              <MessageBubble
                content={item.content}
                imageUrl={item.imageUrl}
                createdAt={item.createdAt}
                isMine={item.isMine}
                senderName={item.senderName}
                isGroup={conversation.isGroup}
                senderAvatar={item.senderAvatar}
                senderId={item.senderId}
                audioUrl={item.audioUrl}
                audioDuration={item.audioDuration}
                replyToSender={item.replyToSender}
                replyToText={item.replyToText}
                reactions={item.reactions}
                onToggleReaction={(emoji) =>
                  handleToggleReaction(item._id, emoji)
                }
                isSystem={item.isSystem}
              />
            </SwipeableMessageItem>
          )}
          ListEmptyComponent={
            isLoading ? null : (
              <View className="items-center justify-center py-16 scale-y-[-1]">
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={44}
                  color={COLORS.grey}
                  style={{ marginBottom: 8 }}
                />
                <Text className="text-grey text-sm text-center">
                  Повідомлень ще немає. Напишіть першим!
                </Text>
              </View>
            )
          }
        />

        <ChatInput
          onSendMessage={handleSendMessage}
          onSendAudio={handleSendAudio}
          isSending={isSending}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
        />
      </KeyboardAvoidingView>

      <ReactionPickerModal
        visible={!!pickerState}
        position={pickerState?.position}
        onClose={() => setPickerState(null)}
        onSelectEmoji={(emoji) => {
          if (pickerState) {
            handleToggleReaction(pickerState.messageId, emoji);
          }
        }}
      />

      {conversation.isGroup && (
        <GroupInfoModal
          visible={isGroupInfoVisible}
          onClose={() => setIsGroupInfoVisible(false)}
          conversationId={conversationId}
          groupName={conversation.name ?? "Груповий чат"}
          creatorId={conversation.creatorId}
          participants={conversation.participants}
          currentUserRole={conversation.currentUserRole}
          canManageMembers={conversation.canManageMembers}
          canDeleteChat={conversation.canDeleteChat}
          onConversationDeleted={() => router.replace("/messages")}
        />
      )}
    </View>
  );
}
```

---

### 10.8. Повний оновлений файл `app/messages/index.tsx`

```tsx
import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function MessagesScreen() {
  const conversations = useQuery(api.conversations.getConversations);
  const currentUser = useQuery(api.users.currentUser);

  const deleteConversationMutation = useMutation(
    api.conversations.deleteConversation,
  );
  const removeParticipantMutation = useMutation(
    api.conversations.removeParticipant,
  );

  const handleLongPressChat = (item: any) => {
    const isGroup = item.isGroup;
    const isCreator = currentUser?._id && item.creatorId === currentUser._id;

    if (isGroup) {
      if (isCreator) {
        Alert.alert(
          "Керування групою",
          `Оберіть дію для групи «${item.name}»:`,
          [
            { text: "Скасувати", style: "cancel" },
            {
              text: "Видалити групу для всіх",
              style: "destructive",
              onPress: () => {
                Alert.alert(
                  "Підтвердження видалення",
                  "Видалити цей чат та всі повідомлення для всіх учасників?",
                  [
                    { text: "Скасувати", style: "cancel" },
                    {
                      text: "Видалити",
                      style: "destructive",
                      onPress: async () => {
                        try {
                          await deleteConversationMutation({
                            conversationId: item._id,
                          });
                        } catch (e: any) {
                          Alert.alert("Помилка", e.message);
                        }
                      },
                    },
                  ],
                );
              },
            },
          ],
        );
      } else {
        Alert.alert(
          "Покинути групу",
          `Ви впевнені, що хочете покинути «${item.name}»?`,
          [
            { text: "Скасувати", style: "cancel" },
            {
              text: "Покинути",
              style: "destructive",
              onPress: async () => {
                try {
                  if (!currentUser?._id) return;
                  await removeParticipantMutation({
                    conversationId: item._id,
                    targetUserId: currentUser._id,
                  });
                } catch (e: any) {
                  Alert.alert("Помилка", e.message);
                }
              },
            },
          ],
        );
      }
    } else {
      // 1-on-1 чат
      Alert.alert("Видалити діалог", "Видалити це листування?", [
        { text: "Скасувати", style: "cancel" },
        {
          text: "Видалити",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteConversationMutation({
                conversationId: item._id,
              });
            } catch (e: any) {
              Alert.alert("Помилка", e.message);
            }
          },
        },
      ]);
    }
  };

  if (conversations === undefined) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {/* Хедер списку повідомлень */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-surface">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3 p-1 active:opacity-70"
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-white">Повідомлення</Text>
        </View>

        <TouchableOpacity
          onPress={() => router.push("/messages/new")}
          className="p-1 active:opacity-70"
        >
          <Ionicons name="create-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Список чатів */}
      <FlatList
        data={conversations}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 8 }}
        renderItem={({ item }) => {
          const title = item.isGroup
            ? (item.name ?? "Груповий чат")
            : item.otherUser?.fullname ||
              item.otherUser?.username ||
              "Користувач";

          const avatarUrl = item.isGroup ? null : item.otherUser?.image;
          const lastMsg = item.lastMessage || "Немає повідомлень";
          const formattedDate = item.lastMessageAt
            ? new Date(item.lastMessageAt).toLocaleDateString([], {
                day: "2-digit",
                month: "2-digit",
              })
            : "";

          return (
            <TouchableOpacity
              onPress={() => router.push(`/messages/${item._id}`)}
              onLongPress={() => handleLongPressChat(item)}
              delayLongPress={400}
              className="flex-row items-center px-4 py-3 active:bg-surface border-b border-surface/40"
            >
              {item.isGroup ? (
                <View className="w-12 h-12 rounded-full bg-surfaceLight border border-surface items-center justify-center mr-3">
                  <Ionicons name="people" size={24} color={COLORS.primary} />
                </View>
              ) : (
                <Image
                  source={{
                    uri:
                      avatarUrl ??
                      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
                  }}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    marginRight: 12,
                  }}
                  contentFit="cover"
                />
              )}

              <View className="flex-1 justify-center">
                <View className="flex-row items-center justify-between mb-1">
                  <Text
                    numberOfLines={1}
                    className="text-white font-semibold text-base flex-1 mr-2"
                  >
                    {title}
                  </Text>
                  <Text className="text-grey text-xs">{formattedDate}</Text>
                </View>

                <View className="flex-row items-center">
                  {item.isGroup && (
                    <Text className="text-primary text-xs font-medium mr-1.5">
                      {item.participantCount} уч. •
                    </Text>
                  )}
                  <Text numberOfLines={1} className="text-grey text-sm flex-1">
                    {lastMsg}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center mt-20 px-8">
            <Ionicons
              name="chatbubbles-outline"
              size={56}
              color={COLORS.grey}
              style={{ marginBottom: 12 }}
            />
            <Text className="text-white text-lg font-bold text-center mb-1">
              У вас ще немає бесід
            </Text>
            <Text className="text-grey text-sm text-center mb-6">
              Розпочніть спілкування з друзями або створіть власну групу
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/messages/new")}
              className="bg-primary px-5 py-2.5 rounded-full"
            >
              <Text className="text-white font-semibold text-sm">
                Написати повідомлення
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}
```

---

## 11. Тестування та чекліст перевірки

|  №  | Перевірка                                           | Очікуваний результат                                                                                                                                                                                                         |
| :-: | :-------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  1  | **Створення нового групового чату**                 | Створюється група, творець автоматично отримує `creatorId` та потрапляє в `adminIds`. У стрічці чату з'являється системне повідомлення: _«🎉 Груповий чат створено»_.                                                        |
|  2  | **Відображення інформації про творця**              | У `GroupInfoModal` біля імені творця відображається золотий бейдж `👑 Власник`. У підзаголовку вказано нікнейм автора.                                                                                                       |
|  3  | **Додавання нових учасників**                       | Натискання на «+ Додати нових учасників» відкриває модалку. Користувачі, які вже є в чаті, не дублюються у вибірці. Після вибору та збереження в чат додається повідомлення: _«👋 [Ім'я] додав(ла) до групи: [Нові імена]»_. |
|  4  | **Призначення адміністратора (Творець -> Учасник)** | Творець натискає іконку щита біля учасника. Учасник отримує бейдж `🛡️ Адмін`. У чаті з'являється системне повідомлення: _«🛡️ [Творець] призначив(ла) [Учасника] адміністратором»_.                                           |
|  5  | **Зняття статусу адміністратора**                   | Творець натискає іконку щита повторно. Роль змінюється на звичайного учасника, бейдж зникає, додається повідомлення у стрічку.                                                                                               |
|  6  | **Вилучення учасника (Kick)**                       | Творець або адмін натискає червону іконку вилучення. Користувач видаляється з `participantIds`. У чаті з'являється системне повідомлення: _«🚫 [Хто] вилучив(ла) [Кого] з групи»_.                                           |
|  7  | **Вихід із групи за власним бажанням (Leave)**      | Звичайний учасник або адмін натискає «Покинути групу». Користувач перенаправляється на екран `/messages`. У чаті для інших залишається запис: _«🚪 [Ім'я] залишив(ла) групу»_.                                               |
|  8  | **Видалення групи (Творець)**                       | Творець натискає «Видалити групу для всіх» з вікна деталей або через довге натискання у списку чатів. Після підтвердження бесіда каскадно видаляється з бази даних Convex разом з усіма повідомленнями та реакціями.         |
|  9  | **Захист від несанкціонованого видалення**          | Звичайні учасники та адміністратори не бачать кнопки «Видалити групу для всіх» і не мають технічної можливості викликати цю дію (бекент відхиляє мутацію помилкою).                                                          |
