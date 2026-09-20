# Інструкція 12: Пагінація та оптимізація завантаження чату (Inverted FlatList & Convex Pagination)

У цій інструкції ми виконаємо фундаментальну оптимізацію екрана чату для месенджера **Modern Chat**. Ми переведемо завантаження повідомлень на **серверну курсорну пагінацію Convex**, налаштуємо нативний **`Inverted FlatList`** (стандарт індустрії Telegram та WhatsApp) та оптимізуємо рендеринг бульбашок за допомогою **`React.memo`** і **`useCallback`**.

---

## Зміст

1. [Теорія: Чому звичайний список чату вбиває продуктивність?](#теорія-чому-звичайний-список-чату-вбиває-продуктивність)
2. [Архітектура Inverted FlatList: Як влаштований нативний чат](#архітектура-inverted-flatlist-як-влаштований-нативний-чат)
3. [Крок 1: Серверна пагінація у Convex (`convex/messages.ts`)](#крок-1-серверна-пагінація-у-convex-convexmessagests)
4. [Крок 2: Допоміжна мутація для швидкого тестування (`seedTestMessages`)](#крок-2-допоміжна-мутація-для-швидкого-тестування-seedtestmessages)
5. [Крок 3: Оптимізація компонента повідомлення `components/SwipeableMessageItem.tsx`](#крок-3-оптимізація-компонента-повідомлення-componentsswipeablemessageitemtsx)
6. [Крок 4: Переробка екрана чату `app/chat/[id].tsx` під Inverted FlatList](#крок-4-переробка-екрана-чату-appchatidtsx-під-inverted-flatlist)
7. [Крок 5 (Бонус): Кнопка швидкого повернення вниз (Scroll to Bottom FAB)](#крок-5-бонус-кнопка-швидкого-повернення-вниз-scroll-to-bottom-fab)
8. [Повні оновлені лістинги файлів](#повні-оновлені-лістинги-файлів)
   - [`convex/messages.ts`](#convexmessagests)
   - [`components/SwipeableMessageItem.tsx`](#componentsswipeablemessageitemtsx)
   - [`app/chat/[id].tsx`](#appchatidtsx)
9. [Чекліст перевірки та тестування](#чекліст-перевірки-та-тестування)

---

## Теорія: Чому звичайний список чату вбиває продуктивність?

У попередніх модулях (ДЗ 7–10) повідомлення кімнати завантажувалися так:

```typescript
// ❌ Старий підхід (convex/messages.ts):
export const listMessages = query({
  args: { chatRoomId: v.id("chatRooms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_chat_room", (q) => q.eq("chatRoomId", args.chatRoomId))
      .collect(); // Завантажує ВСІ повідомлення за один раз!
  },
});
```

А на клієнті екран чату використовував наступну конструкцію:

```tsx
// ❌ Старий підхід (app/chat/[id].tsx):
<FlatList
  ref={flatListRef}
  data={messages}
  onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
  ...
/>
```

### Чому ця схема не витримує реального навантаження?

1. **Неконтрольований трафік і навантаження на БД:**  
   Якщо в кімнаті 2 000 повідомлень, клієнт при кожному відкритті завантажує кілька мегабайтів JSON-даних. Сервер Convex змушений читати з диску всю історію та тримати важку реактивну підписку на гігантський масив.
2. **Падіння FPS та блокування інтерфейсу:**  
   Мобільний процесор повинен розпарсити масив з тисяч елементів, створити тисячі вузлів віртуального дерева та прорахувати їхні стилі. Екран "зависає" на 3–5 секунд.
3. **Хак `scrollToEnd` на `onContentSizeChange`:**  
   Оскільки звичайний список рендериться зверху вниз, щоб показати користувачеві свіжі повідомлення біля інпуту, розробники змушені програмно викликати `scrollToEnd()`. Це призводить до помітного «блимання» (спочатку користувач бачить верхівку чату, а через частку секунди екран смикається вниз).
4. **Стрибки скролу (Scroll Jumping):**  
   Якби ми спробували додати старі повідомлення на початок звичайного списку (`[...older, ...messages]`), індекси всіх елементів змістилися б, і поточне повідомлення, яке читає користувач, миттєво полетіло б за межі екрана.

---

## Архітектура Inverted FlatList: Як влаштований нативний чат

Щоб вирішити ці проблеми, у сучасних мобільних додатках використовується **інвертований список** (`inverted={true}`).

```
┌────────────────────────────────────────────────────────┐
│  ▲ [Старі повідомлення: індекси 40..59]                │  <-- ListFooterComponent (вгорі!)
│  │   (завантажуються при скролі вгору: onEndReached)   │
│  │                                                     │
│  │ [Попередні повідомлення: індекси 20..39]            │
│  │ [Свіжі повідомлення: індекси 0..19]                 │
│  ▼                                                     │
│  ІНДЕКС 0 (найновіше повідомлення)                     │  <-- Завжди біля інпуту без scrollToEnd!
├────────────────────────────────────────────────────────┤
│  [Індикатор друку / Панель цитування]                  │
│  [ Введіть повідомлення...                        [➤] ]│
└────────────────────────────────────────────────────────┘
```

### Принципові відмінності Inverted списку:

| Характеристика                    | Звичайний FlatList (`inverted={false}`) | Інвертований FlatList (`inverted={true}`)         |
| :-------------------------------- | :-------------------------------------- | :------------------------------------------------ |
| **Де розташований індекс 0?**     | Візуально **вгорі** екрана              | Візуально **внизу** екрана (біля інпуту)          |
| **Початкова позиція скролу**      | Вгорі (найстаріші пости)                | **Внизу (найсвіжіші повідомлення)**               |
| **Потреба у `scrollToEnd()`**     | Потрібна завжди (смикає екран)          | **Не потрібна взагалі!**                          |
| **Подія `onEndReached`**          | Спрацьовує при скролі **вниз**          | Спрацьовує при скролі **вгору (у минуле)**        |
| **Позиція `ListFooterComponent`** | Внизу списку                            | **Вгорі списку (над старими повідомленнями)**     |
| **Поведінка при довантаженні**    | Стрибок скролу без складних обчислень   | **Ідеально плавне додавання без зміщення скролу** |

> [!IMPORTANT]
> **Чому це працює ідеально з пагінацією?**  
> При серверному сортуванні `.order("desc")` перша сторінка містить 25 найновіших повідомлень. Найновіше повідомлення має індекс `0` і знаходиться внизу. Коли користувач скролить вгору, викликається `loadMore(20)`: наступна порція старіших повідомлень просто додається в **кінець масиву**. Оскільки список інвертований, вони плавно домальовуються **зверху**, не зміщуючи поточну позицію скролу користувача ані на піксель!

---

## Крок 1: Серверна пагінація у Convex (`convex/messages.ts`)

Відкрийте файл `convex/messages.ts`.

### 1. Додайте імпорт валідатора пагінації:

```typescript
// convex/messages.ts
import { paginationOptsValidator } from "convex/server";
```

### 2. Створіть функцію запиту `getPaginatedMessages`:

```typescript
// convex/messages.ts

/**
 * Отримує повідомлення чат-кімнати порціями (курсорна пагінація).
 * Сортування .order("desc") повертає повідомлення від найновіших до найстаріших,
 * що ідеально підходить для інвертованого FlatList.
 */
export const getPaginatedMessages = query({
  args: {
    chatRoomId: v.id("chatRooms"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized: Користувач не авторизований");
    }

    return await ctx.db
      .query("messages")
      .withIndex("by_chat_room", (q) => q.eq("chatRoomId", args.chatRoomId))
      .order("desc") // Від найновіших до найстаріших
      .paginate(args.paginationOpts);
  },
});
```

---

## Крок 2: Допоміжна мутація для швидкого тестування (`seedTestMessages`)

Щоб студенти могли перевірити роботу пагінації без необхідності вручну друкувати 50 повідомлень у чат, додамо у `convex/messages.ts` допоміжну функцію-генератор:

```typescript
// convex/messages.ts

/**
 * 🛠 Допоміжна функція для тестування:
 * Генерує тестові повідомлення у вказаній кімнаті з таймстемпами у минулому.
 */
export const seedTestMessages = mutation({
  args: {
    chatRoomId: v.id("chatRooms"),
    count: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const total = args.count ?? 40;
    const now = Date.now();

    const sampleTexts = [
      "Привіт усім! Як просувається оптимізація чату?",
      "Працюємо з Inverted FlatList у React Native 🚀",
      "Convex курсорна пагінація працює неймовірно швидко!",
      "Перевіряємо довантаження старіших повідомлень при скролі вгору...",
      "Плавність 60/120 FPS без блокування інтерфейсу ✨",
      "React.memo рятує від зайвих перерендерів під час набору тексту.",
      "Тестове повідомлення для перевірки списку #",
      "Сучасний мобільний месенджер рівня Telegram готовий!",
    ];

    for (let i = 0; i < total; i++) {
      const textIndex = i % sampleTexts.length;
      await ctx.db.insert("messages", {
        chatRoomId: args.chatRoomId,
        senderId: userId,
        senderName: user.name ?? user.email ?? "Студент",
        senderPhoto: user.image,
        content: `${sampleTexts[textIndex]} (${total - i})`,
        _creationTime: now - (total - i) * 60000, // Повідомлення розтягнуті по часу в минуле
      });
    }

    await ctx.db.patch(args.chatRoomId, {
      lastMessage: `${user.name ?? "Студент"}: ${sampleTexts[0]}`,
      lastMessageAt: now,
    });

    return { success: true, count: total };
  },
});
```

> [!TIP]
> Цю мутацію можна легко викликати в один клік у панелі **Convex Dashboard -> Functions -> messages:seedTestMessages**, передавши `chatRoomId` та `count: 50`.

---

## Крок 3: Оптимізація компонента повідомлення `components/SwipeableMessageItem.tsx`

Відкрийте файл `components/SwipeableMessageItem.tsx`.

### Чому без `React.memo` чат гальмує?

У батьківському компоненті `ChatRoomScreen` є стан поля вводу: `const [inputText, setInputText] = useState("")`. Коли користувач вводить навіть один символ у текстове поле, відбувається перерендер батьківського компонента. Без мемоїзації React змушений заново рендерити всі 25–100 повідомлень, що знаходяться у списку!

### Оновлення компонента:

Огорніть компонент у `React.memo`:

```tsx
// components/SwipeableMessageItem.tsx
import React, { memo } from "react";
// ... ваші інші імпорти

export interface MessageItemData {
  _id: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  content?: string;
  imageUrl?: string;
  _creationTime: number;
  isEdited?: boolean;
  replyToId?: string;
  replyToSender?: string;
  replyToText?: string;
}

interface SwipeableMessageItemProps {
  item: MessageItemData;
  isOwn: boolean;
  onLongPress: (item: MessageItemData) => void;
  onReply: (item: MessageItemData) => void;
  onImagePress: (url: string) => void;
  onAuthorPress: (authorId: string) => void;
}

const SwipeableMessageItemComponent: React.FC<SwipeableMessageItemProps> = ({
  item,
  isOwn,
  onLongPress,
  onReply,
  onImagePress,
  onAuthorPress,
}) => {
  // ... тіло компонента залишається без змін (жести Reanimated, розмітка бульбашки)
};

// ⚡ Мемоїзуємо компонент для запобігання зайвим рендерам:
export const SwipeableMessageItem = memo(
  SwipeableMessageItemComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.item._id === nextProps.item._id &&
      prevProps.item.content === nextProps.item.content &&
      prevProps.item.isEdited === nextProps.item.isEdited &&
      prevProps.item.imageUrl === nextProps.item.imageUrl &&
      prevProps.isOwn === nextProps.isOwn
    );
  },
);
```

---

## Крок 4: Переробка екрана чату `app/chat/[id].tsx` під Inverted FlatList

Відкрийте `app/chat/[id].tsx`.

### 1. Замініть `useQuery` на `usePaginatedQuery`:

```tsx
// ❌ Було:
import { useQuery, useMutation } from "convex/react";
// ...
const messages = useQuery(api.messages.listMessages, { chatRoomId });

// ✅ Стало:
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
// ...
const {
  results: messages,
  status,
  loadMore,
  isLoading,
} = usePaginatedQuery(
  api.messages.getPaginatedMessages,
  { chatRoomId },
  { initialNumItems: 25 },
);
```

### 2. Оберніть функції зворотного виклику в `useCallback`:

Щоб `React.memo` у `SwipeableMessageItem` працював ефективно, посилання на функції не повинні створюватися наново при кожному рендері.

```tsx
const handleStartReply = useCallback((msg: MessageItemData) => {
  setReplyTarget({
    messageId: msg._id,
    senderName: msg.senderName,
    text: msg.content || (msg.imageUrl ? "📷 Фотографія" : ""),
  });
  setEditingMessageId(null);
}, []);

const handleMessageLongPress = useCallback(
  (item: MessageItemData) => {
    // ... логіка діалогу дій
  },
  [currentUser?._id, editMessage, deleteMessage],
);

const handleImagePress = useCallback((url: string) => {
  setFullscreenImage(url);
}, []);

const handleAuthorPress = useCallback(
  (authorId: string) => {
    router.push(`/user/${authorId}`);
  },
  [router],
);
```

### 3. Створіть мемоїзований `renderItem`:

```tsx
const renderMessageItem = useCallback(
  ({ item }: { item: any }) => (
    <SwipeableMessageItem
      item={item as MessageItemData}
      isOwn={item.senderId === currentUser?._id}
      onLongPress={handleMessageLongPress}
      onReply={handleStartReply}
      onImagePress={handleImagePress}
      onAuthorPress={handleAuthorPress}
    />
  ),
  [
    currentUser?._id,
    handleMessageLongPress,
    handleStartReply,
    handleImagePress,
    handleAuthorPress,
  ],
);
```

### 4. Оновіть `FlatList` на `inverted={true}`:

```tsx
{
  /* ⚡ Інвертований список повідомлень із курсорною пагінацією */
}
<FlatList
  ref={flatListRef}
  data={messages}
  keyExtractor={(item) => item._id}
  inverted={true} // 🚀 Вмикаємо інвертований режим
  contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
  renderItem={renderMessageItem}

  // Довантаження старіших повідомлень при скролі вгору:
  onEndReached={() => {
    if (status === "CanLoadMore") {
      loadMore(20);
    }
  }}
  onEndReachedThreshold={0.2}

  // Індикатор завантаження історії (в інвертованому списку рендериться вгорі!):
  ListFooterComponent={
    status === "LoadingMore" ? (
      <View className="py-4 items-center justify-center">
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text className="text-textMuted text-xs mt-1">
          Завантаження старіших повідомлень...
        </Text>
      </View>
    ) : null
  }

  // Стан порожнього чату (розгортаємо назад через scale-y-[-1], оскільки список інвертований):
  ListEmptyComponent={
    status === "LoadingFirstPage" ? (
      <View className="py-20 items-center justify-center scale-y-[-1]">
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="text-textMuted text-sm mt-3">
          Завантаження бесіди...
        </Text>
      </View>
    ) : (
      <View className="py-20 items-center justify-center scale-y-[-1]">
        <Ionicons
          name="chatbubbles-outline"
          size={48}
          color={COLORS.surfaceLight}
        />
        <Text className="text-textMuted text-sm mt-3 text-center">
          Повідомлень ще немає.{"\n"}Будьте першим, хто напише в цій кімнаті!
        </Text>
      </View>
    )
  }

  // Оптимізація віртуалізації списку:
  initialNumToRender={15}
  maxToRenderPerBatch={10}
  windowSize={10}
  removeClippedSubviews={Platform.OS === "android"}
/>;
```

---

## Крок 5 (Бонус): Кнопка швидкого повернення вниз (Scroll to Bottom FAB)

Коли користувач гортає історію далеко вгору, йому зручно мати кнопку для миттєвого повернення до свіжих повідомлень.

### 1. Додайте стан видимості кнопки:

```tsx
const [showScrollBottom, setShowScrollBottom] = useState(false);
```

### 2. Додайте обробник скролу до `FlatList`:

В інвертованому списку значення `contentOffset.y` дорівнює `0` біля найновіших повідомлень (внизу) і збільшується, коли користувач скролить вгору!

```tsx
<FlatList
  // ... інші пропси
  onScroll={(event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowScrollBottom(offsetY > 400);
  }}
  scrollEventThrottle={100}
/>
```

### 3. Рендеримо кнопку поверх списку:

```tsx
{
  showScrollBottom && (
    <TouchableOpacity
      onPress={() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }}
      activeOpacity={0.85}
      className="absolute right-5 bottom-24 w-11 h-11 rounded-full bg-surface border border-surfaceLight shadow-lg items-center justify-center z-30"
    >
      <Ionicons name="chevron-down" size={24} color={COLORS.primary} />
    </TouchableOpacity>
  );
}
```

---

## Повні оновлені лістинги файлів

### `convex/messages.ts`

```typescript
// convex/messages.ts
import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Отримання повідомлень з курсорною пагінацією (для інвертованого FlatList)
 */
export const getPaginatedMessages = query({
  args: {
    chatRoomId: v.id("chatRooms"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    return await ctx.db
      .query("messages")
      .withIndex("by_chat_room", (q) => q.eq("chatRoomId", args.chatRoomId))
      .order("desc") // Від найновіших до найстаріших
      .paginate(args.paginationOpts);
  },
});

/**
 * Базовий список (для зворотної сумісності)
 */
export const listMessages = query({
  args: { chatRoomId: v.id("chatRooms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_chat_room", (q) => q.eq("chatRoomId", args.chatRoomId))
      .collect();
  },
});

/**
 * Відправка нового текстового повідомлення
 */
export const sendMessage = mutation({
  args: {
    chatRoomId: v.id("chatRooms"),
    content: v.string(),
    replyToId: v.optional(v.id("messages")),
    replyToSender: v.optional(v.string()),
    replyToText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const trimmedContent = args.content.trim();
    if (!trimmedContent) throw new Error("Content cannot be empty");

    const messageId = await ctx.db.insert("messages", {
      chatRoomId: args.chatRoomId,
      senderId: userId,
      senderName: user.name ?? user.email ?? "Користувач",
      senderPhoto: user.image,
      content: trimmedContent,
      replyToId: args.replyToId,
      replyToSender: args.replyToSender,
      replyToText: args.replyToText,
    });

    await ctx.db.patch(args.chatRoomId, {
      lastMessage: `${user.name ?? "Користувач"}: ${trimmedContent}`,
      lastMessageAt: Date.now(),
    });

    return messageId;
  },
});

/**
 * Відправка повідомлення із зображенням у Convex Storage
 */
export const sendMediaMessage = mutation({
  args: {
    chatRoomId: v.id("chatRooms"),
    storageId: v.id("_storage"),
    caption: v.optional(v.string()),
    replyToId: v.optional(v.id("messages")),
    replyToSender: v.optional(v.string()),
    replyToText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const imageUrl = await ctx.storage.getUrl(args.storageId);
    if (!imageUrl) throw new Error("Could not get image URL");

    const messageId = await ctx.db.insert("messages", {
      chatRoomId: args.chatRoomId,
      senderId: userId,
      senderName: user.name ?? user.email ?? "Користувач",
      senderPhoto: user.image,
      content: args.caption?.trim() || undefined,
      imageUrl,
      storageId: args.storageId,
      replyToId: args.replyToId,
      replyToSender: args.replyToSender,
      replyToText: args.replyToText,
    });

    await ctx.db.patch(args.chatRoomId, {
      lastMessage: `${user.name ?? "Користувач"}: 📷 Фотографія`,
      lastMessageAt: Date.now(),
    });

    return messageId;
  },
});

/**
 * Генерація одноразового посилання для завантаження фото в Convex Storage
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Редагування власного повідомлення
 */
export const editMessage = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    if (message.senderId !== userId) {
      throw new Error("Ви можете редагувати лише власні повідомлення");
    }

    await ctx.db.patch(args.messageId, {
      content: args.content.trim(),
      isEdited: true,
    });
  },
});

/**
 * Видалення повідомлення
 */
export const deleteMessage = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    if (message.senderId !== userId) {
      throw new Error("Ви можете видаляти лише власні повідомлення");
    }

    await ctx.db.delete(args.messageId);
  },
});

/**
 * Допоміжна мутація для генерації 40+ повідомлень для тестування пагінації
 */
export const seedTestMessages = mutation({
  args: {
    chatRoomId: v.id("chatRooms"),
    count: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const total = args.count ?? 40;
    const now = Date.now();

    const sampleTexts = [
      "Привіт усім! Як просувається оптимізація чату?",
      "Працюємо з Inverted FlatList у React Native 🚀",
      "Convex курсорна пагінація працює неймовірно швидко!",
      "Перевіряємо довантаження старіших повідомлень при скролі вгору...",
      "Плавність 60/120 FPS без блокування інтерфейсу ✨",
      "React.memo рятує від зайвих перерендерів під час набору тексту.",
      "Тестове повідомлення для перевірки списку #",
      "Сучасний мобільний месенджер рівня Telegram готовий!",
    ];

    for (let i = 0; i < total; i++) {
      const textIndex = i % sampleTexts.length;
      await ctx.db.insert("messages", {
        chatRoomId: args.chatRoomId,
        senderId: userId,
        senderName: user.name ?? user.email ?? "Студент",
        senderPhoto: user.image,
        content: `${sampleTexts[textIndex]} (${total - i})`,
        _creationTime: now - (total - i) * 60000,
      });
    }

    await ctx.db.patch(args.chatRoomId, {
      lastMessage: `${user.name ?? "Студент"}: ${sampleTexts[0]}`,
      lastMessageAt: now,
    });

    return { success: true, count: total };
  },
});
```

---

### `components/SwipeableMessageItem.tsx`

```tsx
// components/SwipeableMessageItem.tsx
import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { memo } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

export interface MessageItemData {
  _id: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  content?: string;
  imageUrl?: string;
  _creationTime: number;
  isEdited?: boolean;
  replyToId?: string;
  replyToSender?: string;
  replyToText?: string;
}

interface SwipeableMessageItemProps {
  item: MessageItemData;
  isOwn: boolean;
  onLongPress: (item: MessageItemData) => void;
  onReply: (item: MessageItemData) => void;
  onImagePress: (url: string) => void;
  onAuthorPress: (authorId: string) => void;
}

const SWIPE_THRESHOLD = 50;

const SwipeableMessageItemComponent: React.FC<SwipeableMessageItemProps> = ({
  item,
  isOwn,
  onLongPress,
  onReply,
  onImagePress,
  onAuthorPress,
}) => {
  const translateX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .onUpdate((event) => {
      // Дозволяємо рух лише вправо для відповіді
      if (event.translationX > 0) {
        translateX.value = Math.min(event.translationX, 90);
      }
    })
    .onEnd(() => {
      if (translateX.value > SWIPE_THRESHOLD) {
        runOnJS(onReply)(item);
      }
      translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
    });

  const animatedBubbleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const animatedReplyIconStyle = useAnimatedStyle(() => {
    const opacity = Math.min(translateX.value / SWIPE_THRESHOLD, 1);
    const scale = Math.min(translateX.value / SWIPE_THRESHOLD, 1.15);
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const formatTime = (time: number) => {
    const d = new Date(time);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <View className="my-1.5 w-full relative justify-center">
      {/* Анімована іконка швидкої відповіді */}
      <Animated.View
        style={[styles.replyIconContainer, animatedReplyIconStyle]}
      >
        <Ionicons name="arrow-undo-circle" size={32} color={COLORS.primary} />
      </Animated.View>

      {/* Бульбашка повідомлення із жестом свайпу */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[animatedBubbleStyle]}
          className={`flex-row ${isOwn ? "justify-end" : "justify-start"}`}
        >
          {/* Аватар автора для повідомлень інших учасників */}
          {!isOwn && (
            <TouchableOpacity
              onPress={() => onAuthorPress(item.senderId)}
              activeOpacity={0.8}
              className="mr-2 self-end mb-1"
            >
              <Image
                source={{
                  uri:
                    item.senderPhoto ||
                    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
                }}
                className="w-7 h-7 rounded-full border border-surfaceLight"
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onLongPress={() => onLongPress(item)}
            delayLongPress={280}
            activeOpacity={0.9}
            className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl shadow-sm ${
              isOwn
                ? "bg-primary rounded-br-xs"
                : "bg-surface border border-surfaceLight rounded-bl-xs"
            }`}
          >
            {/* Ім'я автора у групі */}
            {!isOwn && (
              <TouchableOpacity onPress={() => onAuthorPress(item.senderId)}>
                <Text className="text-primary font-bold text-xs mb-1">
                  {item.senderName}
                </Text>
              </TouchableOpacity>
            )}

            {/* Блок цитованого повідомлення (Reply Box) */}
            {item.replyToSender && (
              <View className="mb-2 p-2 rounded-lg bg-black/20 border-l-4 border-l-primary">
                <Text className="text-primary font-semibold text-[11px]">
                  {item.replyToSender}
                </Text>
                <Text
                  className="text-white/80 text-xs mt-0.5"
                  numberOfLines={1}
                >
                  {item.replyToText || "📷 Зображення"}
                </Text>
              </View>
            )}

            {/* Прикріплене зображення */}
            {item.imageUrl && (
              <TouchableOpacity
                onPress={() => onImagePress(item.imageUrl!)}
                activeOpacity={0.9}
                className="mb-1.5 rounded-xl overflow-hidden bg-black/40"
              >
                <Image
                  source={{ uri: item.imageUrl }}
                  className="w-56 h-56 rounded-xl"
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}

            {/* Текст повідомлення */}
            {item.content && (
              <Text className="text-white text-base leading-5">
                {item.content}
              </Text>
            )}

            {/* Час відправки та позначка ред. */}
            <View className="flex-row items-center justify-end gap-1 mt-1 self-end">
              {item.isEdited && (
                <Text className="text-[10px] text-white/60 italic mr-0.5">
                  (ред.)
                </Text>
              )}
              <Text
                className={`text-[10px] ${
                  isOwn ? "text-white/70" : "text-textMuted"
                }`}
              >
                {formatTime(item._creationTime)}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  replyIconContainer: {
    position: "absolute",
    left: 12,
    zIndex: 1,
  },
});

/**
 * ⚡ Мемоїзуємо компонент: запобігає перемальовуванню бульбашок
 * при кожному натисканні клавіші в інпуті або отриманні нових повідомлень.
 */
export const SwipeableMessageItem = memo(
  SwipeableMessageItemComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.item._id === nextProps.item._id &&
      prevProps.item.content === nextProps.item.content &&
      prevProps.item.isEdited === nextProps.item.isEdited &&
      prevProps.item.imageUrl === nextProps.item.imageUrl &&
      prevProps.isOwn === nextProps.isOwn
    );
  },
);
```

---

### `app/chat/[id].tsx`

```tsx
// app/chat/[id].tsx
import { ImageViewerModal } from "@/components/ImageViewerModal";
import { ReplyPreviewBar, ReplyTarget } from "@/components/ReplyPreviewBar";
import {
  MessageItemData,
  SwipeableMessageItem,
} from "@/components/SwipeableMessageItem";
import { TypingDots } from "@/components/TypingDots";
import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { File } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { fetch } from "expo/fetch";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const chatRoomId = id as Id<"chatRooms">;

  // Дані кімнати та авторизованого користувача
  const room = useQuery(api.rooms.getRoom, { roomId: chatRoomId });
  const currentUser = useQuery(api.users.currentUser);
  const typingUsers = useQuery(api.typing.getTypingUsers, { chatRoomId });

  // ⚡ Курсорна пагінація Convex (по 25 повідомлень у порції)
  const {
    results: messages,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.messages.getPaginatedMessages,
    { chatRoomId },
    { initialNumItems: 25 },
  );

  // Мутації для повідомлень
  const sendMessage = useMutation(api.messages.sendMessage);
  const sendMediaMessage = useMutation(api.messages.sendMediaMessage);
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl);
  const editMessage = useMutation(api.messages.editMessage);
  const deleteMessage = useMutation(api.messages.deleteMessage);
  const setTyping = useMutation(api.typing.setTyping);

  // Локальні стани інтерфейсу
  const [inputText, setInputText] = useState("");
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] =
    useState<Id<"messages"> | null>(null);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const lastTypingCall = useRef(0);

  // Обробник набору тексту з тротлінгом сповіщень
  const handleTextChange = (text: string) => {
    setInputText(text);
    const now = Date.now();
    if (now - lastTypingCall.current > 1500) {
      lastTypingCall.current = now;
      setTyping({ chatRoomId }).catch(() => {});
    }
  };

  // Вибір фотографії з галереї
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setSelectedImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Помилка вибору фото:", error);
      Alert.alert("Помилка", "Не вдалося відкрити галерею");
    }
  };

  // Початок відповіді на повідомлення
  const handleStartReply = useCallback((msg: MessageItemData) => {
    setReplyTarget({
      messageId: msg._id,
      senderName: msg.senderName,
      text: msg.content || (msg.imageUrl ? "📷 Фотографія" : ""),
    });
    setEditingMessageId(null);
  }, []);

  // Відправка повідомлення або збереження редагування
  const handleSend = async () => {
    const text = inputText.trim();
    if ((!text && !selectedImageUri) || isSubmitting) return;

    try {
      setIsSubmitting(true);

      if (editingMessageId) {
        // Збереження відредагованого повідомлення
        await editMessage({
          messageId: editingMessageId,
          content: text,
        });
        setEditingMessageId(null);
      } else if (selectedImageUri) {
        // Відправка фотографії у Convex Storage
        const uploadUrl = await generateUploadUrl();
        const file = new File(selectedImageUri);

        const uploadResult = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "image/jpeg" },
          body: file,
        });

        if (!uploadResult.ok)
          throw new Error("Не вдалося завантажити зображення");

        const { storageId } = await uploadResult.json();

        await sendMediaMessage({
          chatRoomId,
          storageId,
          caption: text || undefined,
          replyToId: replyTarget
            ? (replyTarget.messageId as Id<"messages">)
            : undefined,
          replyToSender: replyTarget?.senderName,
          replyToText: replyTarget?.text,
        });

        setSelectedImageUri(null);
        setReplyTarget(null);
      } else {
        // Відправка звичайного тексту
        await sendMessage({
          chatRoomId,
          content: text,
          replyToId: replyTarget
            ? (replyTarget.messageId as Id<"messages">)
            : undefined,
          replyToSender: replyTarget?.senderName,
          replyToText: replyTarget?.text,
        });

        setReplyTarget(null);
      }

      setInputText("");
    } catch (error) {
      console.error(error);
      Alert.alert("Помилка", "Не вдалося надіслати повідомлення");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Контекстне меню дій за довгим натисканням
  const handleMessageLongPress = useCallback(
    (item: MessageItemData) => {
      const isOwn = item.senderId === currentUser?._id;

      const options: any[] = [
        {
          text: "Відповісти",
          onPress: () => handleStartReply(item),
        },
      ];

      if (isOwn) {
        if (item.content) {
          options.push({
            text: "Редагувати",
            onPress: () => {
              setEditingMessageId(item._id as Id<"messages">);
              setInputText(item.content || "");
              setReplyTarget(null);
            },
          });
        }

        options.push({
          text: "Видалити",
          style: "destructive",
          onPress: () => {
            Alert.alert("Видалити повідомлення", "Ви впевнені?", [
              { text: "Скасувати", style: "cancel" },
              {
                text: "Видалити",
                style: "destructive",
                onPress: async () => {
                  try {
                    await deleteMessage({
                      messageId: item._id as Id<"messages">,
                    });
                  } catch (error) {
                    console.error(error);
                    Alert.alert("Помилка", "Не вдалося видалити повідомлення");
                  }
                },
              },
            ]);
          },
        });
      }

      options.push({ text: "Скасувати", style: "cancel" });

      Alert.alert("Дії з повідомленням", undefined, options);
    },
    [currentUser?._id, deleteMessage, handleStartReply],
  );

  const handleImagePress = useCallback((url: string) => {
    setFullscreenImage(url);
  }, []);

  const handleAuthorPress = useCallback(
    (authorId: string) => {
      router.push(`/user/${authorId}`);
    },
    [router],
  );

  // ⚡ Мемоїзований рендерер елемента списку
  const renderMessageItem = useCallback(
    ({ item }: { item: any }) => (
      <SwipeableMessageItem
        item={item as MessageItemData}
        isOwn={item.senderId === currentUser?._id}
        onLongPress={handleMessageLongPress}
        onReply={handleStartReply}
        onImagePress={handleImagePress}
        onAuthorPress={handleAuthorPress}
      />
    ),
    [
      currentUser?._id,
      handleAuthorPress,
      handleImagePress,
      handleMessageLongPress,
      handleStartReply,
    ],
  );

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View>
              <Text className="text-white font-bold text-base">
                {room?.name || "Чат"}
              </Text>
              <Text className="text-textMuted text-xs">
                {typingUsers && typingUsers.length > 0
                  ? "Хтось друкує..."
                  : "онлайн"}
              </Text>
            </View>
          ),
          headerStyle: { backgroundColor: COLORS.surface },
          headerTintColor: COLORS.white,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push(`/chat/${chatRoomId}/info` as any)}
              className="p-1"
            >
              <Ionicons
                name="information-circle-outline"
                size={24}
                color={COLORS.primary}
              />
            </TouchableOpacity>
          ),
        }}
      />

      {/* ⚡ Інвертований список повідомлень з автоматичною курсорною пагінацією */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._id}
        inverted={true} // 🚀 Інвертований режим: найновіші повідомлення внизу!
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
        renderItem={renderMessageItem}

        // Плавне довантаження історії при наближенні до верхньої межі:
        onEndReached={() => {
          if (status === "CanLoadMore") {
            loadMore(20);
          }
        }}
        onEndReachedThreshold={0.2}

        // Відстеження скролу для показу кнопки повернення вниз
        onScroll={(e) => {
          setShowScrollBottom(e.nativeEvent.contentOffset.y > 350);
        }}
        scrollEventThrottle={100}

        // Лоадер старих повідомлень (візуально знаходиться вгорі списку):
        ListFooterComponent={
          status === "LoadingMore" ? (
            <View className="py-4 items-center justify-center">
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text className="text-textMuted text-xs mt-1">
                Завантаження старіших повідомлень...
              </Text>
            </View>
          ) : null
        }

        // Порожній стан (віддзеркалюємо через scale-y-[-1]):
        ListEmptyComponent={
          status === "LoadingFirstPage" ? (
            <View className="py-20 items-center justify-center scale-y-[-1]">
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text className="text-textMuted text-sm mt-3">
                Завантаження повідомлень...
              </Text>
            </View>
          ) : (
            <View className="py-20 items-center justify-center scale-y-[-1]">
              <Ionicons
                name="chatbubbles-outline"
                size={48}
                color={COLORS.surfaceLight}
              />
              <Text className="text-textMuted text-sm mt-3 text-center">
                Повідомлень ще немає.{"\n"}Будьте першим, хто напише!
              </Text>
            </View>
          )
        }

        // Параметри високої продуктивності:
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={Platform.OS === "android"}
      />

      {/* 🚀 Плаваюча кнопка швидкого повернення до найновіших повідомлень */}
      {showScrollBottom && (
        <TouchableOpacity
          onPress={() => {
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
          }}
          activeOpacity={0.85}
          className="absolute right-4 bottom-24 w-11 h-11 rounded-full bg-surface border border-surfaceLight items-center justify-center shadow-lg z-30"
        >
          <Ionicons name="chevron-down" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      )}

      {/* Індикатор друку іншими учасниками */}
      {typingUsers && typingUsers.length > 0 && (
        <TypingDots typingUsers={typingUsers} />
      )}

      {/* Панель активного цитування (Reply Bar) */}
      {replyTarget && (
        <ReplyPreviewBar
          replyTarget={replyTarget}
          onCancel={() => setReplyTarget(null)}
        />
      )}

      {/* Панель активного редагування повідомлення */}
      {editingMessageId && (
        <View className="flex-row items-center justify-between px-4 py-2 bg-surfaceLight border-t border-surface">
          <View className="flex-row items-center flex-1 mr-2">
            <Ionicons
              name="pencil"
              size={16}
              color={COLORS.primary}
              style={{ marginRight: 6 }}
            />
            <Text className="text-white text-xs font-semibold">
              Редагування повідомлення
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setEditingMessageId(null);
              setInputText("");
            }}
          >
            <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Прев'ю обраної картинки перед відправкою */}
      {selectedImageUri && (
        <View className="flex-row items-center px-4 py-2 bg-surfaceLight border-t border-surface">
          <Image
            source={{ uri: selectedImageUri }}
            className="w-12 h-12 rounded-lg mr-3"
          />
          <Text className="text-white text-xs flex-1">Фото прикріплено</Text>
          <TouchableOpacity onPress={() => setSelectedImageUri(null)}>
            <Ionicons name="close-circle" size={22} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      )}

      {/* Нижня панель введення повідомлення */}
      <View className="flex-row items-center p-3 bg-surface border-t border-surfaceLight">
        <TouchableOpacity
          onPress={pickImage}
          disabled={isSubmitting}
          className="mr-2 p-2 rounded-full bg-surfaceLight"
        >
          <Ionicons name="image-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>

        <TextInput
          className="flex-1 bg-background text-white px-4 py-2.5 rounded-full text-base border border-surfaceLight mr-2"
          placeholder={
            editingMessageId
              ? "Змініть текст..."
              : replyTarget
                ? `Відповідь для ${replyTarget.senderName}...`
                : selectedImageUri
                  ? "Додайте підпис до фото..."
                  : "Напишіть повідомлення..."
          }
          placeholderTextColor={COLORS.textMuted}
          value={inputText}
          onChangeText={handleTextChange}
          multiline
        />

        <TouchableOpacity
          onPress={handleSend}
          disabled={(!inputText.trim() && !selectedImageUri) || isSubmitting}
          className={`w-11 h-11 rounded-full items-center justify-center bg-primary ${
            (!inputText.trim() && !selectedImageUri) || isSubmitting
              ? "opacity-50"
              : "active:opacity-80"
          }`}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Ionicons name="send" size={20} color={COLORS.white} />
          )}
        </TouchableOpacity>
      </View>

      {/* Повноекранний переглядач фото */}
      {fullscreenImage && (
        <ImageViewerModal
          visible={!!fullscreenImage}
          imageUrl={fullscreenImage}
          onClose={() => setFullscreenImage(null)}
        />
      )}
    </KeyboardAvoidingView>
  );
}
```

---

## Чекліст перевірки та тестування

1. **Генерація тестової бази повідомлень:**
   - Зайдіть у **Convex Dashboard -> Functions -> messages:seedTestMessages**.
   - Передайте `chatRoomId` вашої тестової кімнати та натисніть **Run Mutation**.
   - У кімнаті миттєво з'явиться 40 нових повідомлень.
2. **Миттєве відкриття та відсутність смикання екрана:**
   - Відкрийте кімнату. Нижні (найновіші) повідомлення мають відображатися біля поля вводу одразу, без затримки та без виклику `scrollToEnd()`.
3. **Плавне довантаження історії при скролі вгору:**
   - Проскрольте вгору.
   - Біля вершини екрана повинен з'явитися індикатор `ActivityIndicator`, після чого стара історія плавно домальовується вище, не скидаючи поточну позицію скролу.
4. **Робота плаваючої кнопки FAB:**
   - Підніміться вгору на 15+ повідомлень — внизу праворуч з'являється кругла кнопка зі стрілкою вниз.
   - Натисніть її — список плавно прокручується до найновіших реплік, і кнопка зникає.
5. **Тестування `React.memo`:**
   - Почніть швидко вводити символи в текстове поле. Бульбашки повідомлень не повинні перемальовуватися (можна перевірити через `console.log` всередині `SwipeableMessageItem`).
6. **Робота жесту відповіді:**
   - Свайпніть будь-яке повідомлення праворуч — з'являється панель `ReplyPreviewBar` над інпутом, і відправлене повідомлення успішно зберігає цитату.
