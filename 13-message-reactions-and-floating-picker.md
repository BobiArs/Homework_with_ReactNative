# Інструкція 13: Реакції на повідомлення, плаваюче вікно вибору емодзі та координатні жести у Modern Chat

У цій інструкції ми перетворимо месенджер **Modern Chat** на інтерактивний додаток рівня **Telegram**, **Slack** та **Instagram Direct**.

Ми реалізуємо:

1. **Швидкий лайк подвійним тапом (`Double-Tap Like ❤️`):** подвійний клік на повідомленні ставить або знімає сердечко з тактильним вібро-відгуком (`Haptics`).
2. **Плаваюче меню вибору емодзі (`Floating ReactionPickerModal`):** довге натискання на повідомлення визначає його абсолютні координати на екрані через `measureInWindow` і відкриває плаваючий бабл емодзі прямо над повідомленням (Telegram-стиль) із пружинною анімацією `Animated.spring`.
3. **Анімовані бейджі реакцій (`MessageReactions` & `ReactionPill`):** під текстом повідомлення з'являються інтерактивні пілюлі з лічильником, які анімуються при появі та підсвічуються кольором `primary`, якщо поточний користувач проголосував.
4. **Бекенд у Convex:** окрема таблиця `messageReactions`, мутація `toggleReaction` та агрегація емодзі-реакцій у пагінованому запиті `getPaginatedMessages`.

---

## 📚 Зміст

1. [Архітектура та принцип роботи](#архітектура-та-принцип-роботи)
2. [Крок 1: Оновлення схеми Convex у `convex/schema.ts`](#крок-1-оновлення-схеми-convex-у-convexschemats)
3. [Крок 2: Оновлення бекенду в `convex/messages.ts`](#крок-2-оновлення-бекенду-в-convexmessagests)
   - [2.1. Мутація `toggleReaction`](#21-мутація-togglereaction)
   - [2.2. Агрегація реакцій у `getPaginatedMessages`](#22-агрегація-реакцій-у-getpaginatedmessages)
4. [Крок 3: Створення компонента `components/MessageReactions.tsx`](#крок-3-створення-компонента-componentsmessagereactionstsx)
5. [Крок 4: Створення плаваючого пікера `components/ReactionPickerModal.tsx`](#крок-4-створення-плаваючого-пікера-componentsreactionpickermodaltsx)
6. [Крок 5: Оновлення жестів у `components/SwipeableMessageItem.tsx`](#крок-5-оновлення-жестів-у-componentsswipeablemessageitemtsx)
7. [Крок 6: Інтеграція в екран чату `app/chat/[id].tsx`](#крок-6-інтеграція-в-екран-чату-appchatidtsx)
8. [Крок 7: Важливо — `GestureHandlerRootView` у кореневому `app/_layout.tsx`](#крок-7-важливо--gesturehandlerrootview-у-кореневому-app_layouttsx)
9. [Повні оновлені лістинги файлів](#повні-оновлені-лістинги-файлів)
   - [1. `components/MessageReactions.tsx`](#1-componentsmessagereactionstsx)
   - [2. `components/ReactionPickerModal.tsx`](#2-componentsreactionpickermodaltsx)
   - [3. `components/SwipeableMessageItem.tsx`](#3-componentsswipeablemessageitemtsx)
   - [4. `app/chat/[id].tsx`](#4-appchatidtsx)
   - [5. `app/_layout.tsx`](#5-app_layouttsx)
10. [Чекліст тестування](#чекліст-тестування)

---

## Архітектура та принцип роботи

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                Взаємодія жестів                                 │
│                                                                                 │
│   [ Повідомлення ] ──(Подвійний тап)──► Швидкий лайк ❤️ (Haptics + toggleReaction)│
│          │                                                                      │
│          ├──(Довге затискання)────────► measureInWindow() -> координати (x, y) │
│          │                              └──► Відкриття ReactionPickerModal над  │
│          │                                   повідомленням (Telegram-стиль)     │
│          │                                                                      │
│          └──(Свайп вправо: Pan)───────► Активація режиму відповіді (Reply Bar)  │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                             Потік даних у Convex                                │
│                                                                                 │
│   1. messageReactions: { messageId, userId, emoji }                             │
│   2. toggleReaction: додає / замінює / знімає реакцію користувача               │
│   3. getPaginatedMessages агрегує: [ { emoji, count, hasReacted } ]             │
└─────────────────────────────────────────────────────────────────────────────────┘
```

1. **Реакції**: Зберігаються в окремій таблиці `messageReactions` зв'язком `userId` + `messageId`. Якщо користувач тисне на той самий емодзі повторно — реакція знімається. Якщо обирає новий емодзі — попередня автоматично замінюється.
2. **Координати `measureInWindow`**: Замість відкриття модального вікна по центру екрана, ми викликаємо метод `measureInWindow` на `View` бульбашки, отримуємо точну позицію `(x, y, width)` на екрані та рендеримо пікер реакцій безпосередньо над повідомленням.

---

## Крок 1: Оновлення схеми Convex у `convex/schema.ts`

Відкрийте файл [`convex/schema.ts`].

Додайте нову таблицю `messageReactions` з двома індексами:

1. `"by_message"` — для швидкого отримання всіх реакцій конкретного повідомлення.
2. `"by_user_and_message"` — для миттєвої перевірки та перемикання реакції конкретного користувача.

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ... існуючі таблиці users, chatRooms, messages ...

  // 👈 НОВА ТАБЛИЦЯ: Реакції на повідомлення
  messageReactions: defineTable({
    messageId: v.id("messages"),
    userId: v.id("users"),
    emoji: v.string(), // "❤️", "👍", "😂", "😮", "😢", "🔥", "🎉", "👏"
  })
    .index("by_message", ["messageId"])
    .index("by_user_and_message", ["userId", "messageId"]),
});
```

---

## Крок 2: Оновлення бекенду в `convex/messages.ts`

Відкрийте файл [`convex/messages.ts`].

### 2.1. Мутація `toggleReaction`

Додайте мутацію, яка дозволяє користувачеві ставити новий емодзі, перемикати його або знімати:

```typescript
/**
 * Встановлює, змінює або знімає емодзі-реакцію користувача на повідомлення
 */
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

    // Шукаємо, чи поточний користувач уже ставив реакцію на це повідомлення
    const existing = await ctx.db
      .query("messageReactions")
      .withIndex("by_user_and_message", (q) =>
        q.eq("userId", userId).eq("messageId", args.messageId),
      )
      .first();

    if (existing) {
      if (existing.emoji === args.emoji) {
        // Якщо натиснули той самий емодзі повторно — видаляємо реакцію (toggle off)
        await ctx.db.delete(existing._id);
        return { action: "removed", emoji: args.emoji };
      } else {
        // Якщо натиснули інший емодзі — замінюємо його
        await ctx.db.patch(existing._id, { emoji: args.emoji });
        return { action: "updated", emoji: args.emoji };
      }
    } else {
      // Нова реакція
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

### 2.2. Агрегація реакцій у `getPaginatedMessages`

Оновіть запит `getPaginatedMessages`, щоб кожне повідомлення містило згрупований масив `reactions`:

```typescript
// convex/messages.ts
export const getPaginatedMessages = query({
  args: {
    chatRoomId: v.id("chatRooms"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);

    const paginated = await ctx.db
      .query("messages")
      .withIndex("by_chat_room", (q) => q.eq("chatRoomId", args.chatRoomId))
      .order("desc")
      .paginate(args.paginationOpts);

    const enrichedMessages = await Promise.all(
      paginated.page.map(async (msg) => {
        const sender = await ctx.db.get(msg.senderId);

        // Отримуємо всі реакції для цього повідомлення
        const reactionsRaw = await ctx.db
          .query("messageReactions")
          .withIndex("by_message", (q) => q.eq("messageId", msg._id))
          .collect();

        // Агрегуємо реакції за видами емодзі
        const reactionMap = new Map<
          string,
          { count: number; hasReacted: boolean }
        >();
        for (const r of reactionsRaw) {
          const current = reactionMap.get(r.emoji) || {
            count: 0,
            hasReacted: false,
          };
          current.count += 1;
          if (currentUserId && r.userId === currentUserId) {
            current.hasReacted = true;
          }
          reactionMap.set(r.emoji, current);
        }

        const reactions = Array.from(reactionMap.entries()).map(
          ([emoji, { count, hasReacted }]) => ({
            emoji,
            count,
            hasReacted,
          }),
        );

        let imageUrl: string | undefined = undefined;
        if (msg.imageStorageId) {
          imageUrl =
            (await ctx.storage.getUrl(msg.imageStorageId)) ?? undefined;
        }

        return {
          ...msg,
          senderName: sender?.fullname || sender?.name || "Користувач",
          senderPhoto: sender?.image || sender?.avatarUrl,
          imageUrl,
          reactions,
        };
      }),
    );

    return {
      ...paginated,
      page: enrichedMessages,
    };
  },
});
```

---

## Крок 3: Створення компонента `components/MessageReactions.tsx`

Створіть файл [`components/MessageReactions.tsx`].

Цей компонент малює рядок інтерактивних пілюль під повідомленням. Кожна пілюля з'являється з плавною **spring-анімацією** (масштаб від 0.5 до 1.0 та прозорість):

```tsx
// components/MessageReactions.tsx
import React, { useEffect, useRef } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";

export interface ReactionItem {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

interface MessageReactionsProps {
  reactions?: ReactionItem[];
  onToggleReaction: (emoji: string) => void;
  isOwn: boolean;
}

const ReactionPill: React.FC<{
  item: ReactionItem;
  onToggle: () => void;
}> = ({ item, onToggle }) => {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        damping: 12,
        stiffness: 180,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onToggle}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 20,
          borderWidth: 1,
          gap: 3,
          backgroundColor: item.hasReacted
            ? "rgba(99, 102, 241, 0.22)"
            : "rgba(255, 255, 255, 0.08)",
          borderColor: item.hasReacted
            ? "rgba(99, 102, 241, 0.7)"
            : "rgba(255, 255, 255, 0.15)",
        }}
      >
        <Text style={{ fontSize: 13 }}>{item.emoji}</Text>
        <Text
          style={{
            fontSize: 11,
            fontWeight: "700",
            color: item.hasReacted ? "#818CF8" : "#9CA3AF",
          }}
        >
          {item.count}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  reactions,
  onToggleReaction,
  isOwn,
}) => {
  if (!reactions || reactions.length === 0) return null;

  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 4,
        marginTop: 4,
        justifyContent: isOwn ? "flex-end" : "flex-start",
      }}
    >
      {reactions.map((item) => (
        <ReactionPill
          key={item.emoji}
          item={item}
          onToggle={() => onToggleReaction(item.emoji)}
        />
      ))}
    </View>
  );
};
```

---

## Крок 4: Створення плаваючого пікера `components/ReactionPickerModal.tsx`

Створіть файл [`components/ReactionPickerModal.tsx`].

Пікер використовує абсолютне позиціонування відносно координат повідомлення (`ReactionPickerPosition`), отриманих через `measureInWindow`:

```tsx
// components/ReactionPickerModal.tsx
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const POPULAR_EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "🔥", "🎉", "👏"];
const PICKER_WIDTH = POPULAR_EMOJIS.length * 44 + 16;
const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;

export interface ReactionPickerPosition {
  x: number; // координата по X (край повідомлення)
  y: number; // верхній край повідомлення по Y
  isOwn: boolean; // чи власне повідомлення (впливає на сторону розкриття)
}

interface ReactionPickerModalProps {
  visible: boolean;
  position?: ReactionPickerPosition | null;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
}

export const ReactionPickerModal: React.FC<ReactionPickerModalProps> = ({
  visible,
  position,
  onClose,
  onSelectEmoji,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 14,
          stiffness: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleSelect = (emoji: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectEmoji(emoji);
    onClose();
  };

  // Обчислюємо позицію бабла відносно повідомлення
  const getPickerStyle = () => {
    if (!position) return { top: SCREEN_HEIGHT / 2, left: 16 };

    const PICKER_HEIGHT = 58;
    const MARGIN = 8;

    // Показуємо пікер ВИЩЕ повідомлення
    let top = position.y - PICKER_HEIGHT - MARGIN;
    if (top < 60) top = position.y + MARGIN + 48; // якщо мало місця зверху — показуємо знизу

    // Горизонтальна позиція: прив'язуємо до сторони повідомлення
    let left = position.isOwn
      ? position.x - PICKER_WIDTH + 16 // моє — правий край
      : position.x - 16; // чуже — лівий край

    // Не виходимо за межі екрану
    left = Math.max(8, Math.min(left, SCREEN_WIDTH - PICKER_WIDTH - 8));

    return { top, left };
  };

  const pickerStyle = getPickerStyle();

  // Точка "хвостика" бабла (трикутник), звідки пружинно росте меню
  const transformOriginX = position?.isOwn ? "100%" : "0%";

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Напівпрозора підкладка — тап закриває пікер */}
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.35)" }}
        onPress={onClose}
      />

      {/* Picker бабл — абсолютно позиціонований */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: pickerStyle.top,
            left: pickerStyle.left,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#1C1C1E",
            borderRadius: 32,
            paddingHorizontal: 8,
            paddingVertical: 6,
            gap: 2,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.5,
            shadowRadius: 16,
            elevation: 24,
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.08)",
            transformOrigin: `${transformOriginX} 100%`,
          },
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {POPULAR_EMOJIS.map((emoji) => (
          <TouchableOpacity
            key={emoji}
            activeOpacity={0.65}
            onPress={() => handleSelect(emoji)}
            style={{
              width: 40,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 20,
            }}
          >
            <Text style={{ fontSize: 24 }}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </Animated.View>
    </Modal>
  );
};
```

---

## Крок 5: Оновлення жестів у `components/SwipeableMessageItem.tsx`

Відкрийте [`components/SwipeableMessageItem.tsx`].

Нам необхідно:

1. Додати `containerRef = useRef<View>(null)` на бульбашку повідомлення.
2. Реалізувати `doubleTapGesture`: швидкий подвійний тап викликає `onDoubleTap(item)` + вібрацію.
3. Реалізувати `longPressGesture`: затискання викликає `measureInWindow`, отримує точні екранні координати та викликає `onLongPress({ x, y, isOwn }, item)`.
4. Скомпонувати жести: `Gesture.Exclusive(doubleTapGesture, longPressGesture)` та об'єднати з `Gesture.Pan()` через `Gesture.Simultaneous(...)`.
5. Вбудувати `<MessageReactions />` всередину бульбашки.

Зверніть увагу на оновлені пропси та обробники:

```tsx
// components/SwipeableMessageItem.tsx (Фрагменти)
import * as Haptics from "expo-haptics";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { MessageReactions, ReactionItem } from "./MessageReactions";
import { ReactionPickerPosition } from "./ReactionPickerModal";

// Додаємо reactions до MessageItemData:
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
  reactions?: ReactionItem[]; // 👈 Нове поле
}

interface SwipeableMessageItemProps {
  item: MessageItemData;
  isOwn: boolean;
  onLongPress: (
    position: ReactionPickerPosition,
    item: MessageItemData,
  ) => void;
  onDoubleTap: (item: MessageItemData) => void;
  onToggleReaction: (emoji: string) => void;
  onReply: (item: MessageItemData) => void;
  onImagePress: (url: string) => void;
  onAuthorPress: (authorId: string) => void;
}
```

Всередині компонента:

```tsx
// Ref для вимірювання позиції елемента на екрані
const containerRef = useRef<View>(null);

// 1. Подвійний тап для швидкого лайка ❤️
const doubleTapGesture = Gesture.Tap()
  .numberOfTaps(2)
  .maxDuration(250)
  .onEnd(() => {
    runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    runOnJS(onDoubleTap)(item);
  });

// 2. Довге затискання з вимірюванням координат
const longPressGesture = Gesture.LongPress()
  .minDuration(350)
  .onEnd(() => {
    runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Heavy);
    runOnJS(() => {
      containerRef.current?.measureInWindow((x, y, width) => {
        onLongPress(
          {
            x: isOwn ? x + width : x,
            y,
            isOwn,
          },
          item,
        );
      });
    })();
  });

const tapGestures = Gesture.Exclusive(doubleTapGesture, longPressGesture);
const composedGesture = Gesture.Simultaneous(panGesture, tapGestures);
```

---

## Крок 6: Інтеграція в екран чату `app/chat/[id].tsx`

Відкрийте екран чату [`app/chat/[id].tsx`].

Додайте стан для керування пікером:

```tsx
// Стан для відображення пікера реакцій (ID повідомлення + координати)
const [pickerState, setPickerState] = useState<{
  messageId: Id<"messages">;
  position: ReactionPickerPosition;
} | null>(null);

const toggleReactionMutation = useMutation(api.messages.toggleReaction);

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
```

У `renderItem` списку `FlatList`:

```tsx
  renderItem={({ item }) => (
    <SwipeableMessageItem
      item={item}
      isOwn={item.senderId === currentUserId}
      onReply={handleStartReply}
      onImagePress={(url) => setFullscreenImage(url)}
      onAuthorPress={(authorId) => router.push(`/user/${authorId}` as any)}
      // Швидкий подвійний тап ставить ❤️
      onDoubleTap={(msg) => handleToggleReaction(msg._id as Id<"messages">, "❤️")}
      // Довге затискання відкриває плаваючий пікер реакцій
      onLongPress={(position, msg) =>
        setPickerState({ messageId: msg._id as Id<"messages">, position })
      }
      onToggleReaction={(emoji) => handleToggleReaction(item._id as Id<"messages">, emoji)}
    />
  )}
```

І наприкінці екрана перед закриваючим `</SafeAreaView>`:

```tsx
{
  /* Плаваючий пікер емодзі у стилі Telegram */
}
<ReactionPickerModal
  visible={!!pickerState}
  position={pickerState?.position}
  onClose={() => setPickerState(null)}
  onSelectEmoji={(emoji) => {
    if (pickerState) {
      handleToggleReaction(pickerState.messageId, emoji);
    }
  }}
/>;
```

---

## Крок 7: Важливо — `GestureHandlerRootView` у кореневому `app/_layout.tsx`

`GestureDetector` вимагає, щоб `GestureHandlerRootView` був кореневим елементом усього додатку. Якщо цього немає, виникає помилка:

```text
Error: GestureDetector must be used as a descendant of GestureHandlerRootView.
```

Переконайтеся, що файл `app/_layout.tsx` обгортає додаток у `GestureHandlerRootView style={{ flex: 1 }}`:

```tsx
// app/_layout.tsx
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ConvexAuthProvider ...>
        <SafeAreaView className="flex-1 bg-black">
          <InitialLayout />
        </SafeAreaView>
      </ConvexAuthProvider>
    </GestureHandlerRootView>
  );
}
```

> ⚠️ **НЕ** додавайте `GestureHandlerRootView` всередину окремих елементів `FlatList` — це скидає контекст жестів і блокує скрол.

---

## Повні оновлені лістинги файлів

### 1. `components/MessageReactions.tsx`

```tsx
import React, { useEffect, useRef } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";

export interface ReactionItem {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

interface MessageReactionsProps {
  reactions?: ReactionItem[];
  onToggleReaction: (emoji: string) => void;
  isOwn: boolean;
}

const ReactionPill: React.FC<{
  item: ReactionItem;
  onToggle: () => void;
}> = ({ item, onToggle }) => {
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        damping: 12,
        stiffness: 180,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onToggle}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 20,
          borderWidth: 1,
          gap: 3,
          backgroundColor: item.hasReacted
            ? "rgba(99, 102, 241, 0.22)"
            : "rgba(255, 255, 255, 0.08)",
          borderColor: item.hasReacted
            ? "rgba(99, 102, 241, 0.7)"
            : "rgba(255, 255, 255, 0.15)",
        }}
      >
        <Text style={{ fontSize: 13 }}>{item.emoji}</Text>
        <Text
          style={{
            fontSize: 11,
            fontWeight: "700",
            color: item.hasReacted ? "#818CF8" : "#9CA3AF",
          }}
        >
          {item.count}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  reactions,
  onToggleReaction,
  isOwn,
}) => {
  if (!reactions || reactions.length === 0) return null;

  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 4,
        marginTop: 4,
        justifyContent: isOwn ? "flex-end" : "flex-start",
      }}
    >
      {reactions.map((item) => (
        <ReactionPill
          key={item.emoji}
          item={item}
          onToggle={() => onToggleReaction(item.emoji)}
        />
      ))}
    </View>
  );
};
```

### 2. `components/ReactionPickerModal.tsx`

```tsx
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const POPULAR_EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "🔥", "🎉", "👏"];
const PICKER_WIDTH = POPULAR_EMOJIS.length * 44 + 16;
const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;

export interface ReactionPickerPosition {
  x: number; // координата по X (край повідомлення)
  y: number; // верхній край повідомлення по Y
  isOwn: boolean; // чи власне повідомлення (впливає на сторону розкриття)
}

interface ReactionPickerModalProps {
  visible: boolean;
  position?: ReactionPickerPosition | null;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
}

export const ReactionPickerModal: React.FC<ReactionPickerModalProps> = ({
  visible,
  position,
  onClose,
  onSelectEmoji,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 14,
          stiffness: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleSelect = (emoji: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectEmoji(emoji);
    onClose();
  };

  const getPickerStyle = () => {
    if (!position) return { top: SCREEN_HEIGHT / 2, left: 16 };

    const PICKER_HEIGHT = 58;
    const MARGIN = 8;

    let top = position.y - PICKER_HEIGHT - MARGIN;
    if (top < 60) top = position.y + MARGIN + 48;

    let left = position.isOwn
      ? position.x - PICKER_WIDTH + 16
      : position.x - 16;

    left = Math.max(8, Math.min(left, SCREEN_WIDTH - PICKER_WIDTH - 8));

    return { top, left };
  };

  const pickerStyle = getPickerStyle();
  const transformOriginX = position?.isOwn ? "100%" : "0%";

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.35)" }}
        onPress={onClose}
      />

      <Animated.View
        style={[
          {
            position: "absolute",
            top: pickerStyle.top,
            left: pickerStyle.left,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#1C1C1E",
            borderRadius: 32,
            paddingHorizontal: 8,
            paddingVertical: 6,
            gap: 2,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.5,
            shadowRadius: 16,
            elevation: 24,
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.08)",
            transformOrigin: `${transformOriginX} 100%`,
          },
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {POPULAR_EMOJIS.map((emoji) => (
          <TouchableOpacity
            key={emoji}
            activeOpacity={0.65}
            onPress={() => handleSelect(emoji)}
            style={{
              width: 40,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 20,
            }}
          >
            <Text style={{ fontSize: 24 }}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </Animated.View>
    </Modal>
  );
};
```

### 3. `components/SwipeableMessageItem.tsx`

```tsx
import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { memo, useRef } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  FadeInDown,
  FadeOutLeft,
  FadeOutRight,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { MessageReactions, ReactionItem } from "./MessageReactions";
import { ReactionPickerPosition } from "./ReactionPickerModal";

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
  reactions?: ReactionItem[];
}

interface SwipeableMessageItemProps {
  item: MessageItemData;
  isOwn: boolean;
  onLongPress: (
    position: ReactionPickerPosition,
    item: MessageItemData,
  ) => void;
  onDoubleTap: (item: MessageItemData) => void;
  onToggleReaction: (emoji: string) => void;
  onReply: (item: MessageItemData) => void;
  onImagePress: (url: string) => void;
  onAuthorPress: (authorId: string) => void;
}

const SWIPE_THRESHOLD = 50;

const SwipeableMessageItemComponent: React.FC<SwipeableMessageItemProps> = ({
  item,
  isOwn,
  onLongPress,
  onDoubleTap,
  onToggleReaction,
  onReply,
  onImagePress,
  onAuthorPress,
}) => {
  const translateX = useSharedValue(0);
  const containerRef = useRef<View>(null);

  // 1. Свайп вправо для швидкої відповіді (Swipe-to-Reply)
  const panGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .onUpdate((event) => {
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

  // 2. Подвійний тап для швидкого лайка ❤️
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd(() => {
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      runOnJS(onDoubleTap)(item);
    });

  // 3. Довге затискання для виклику плаваючого меню реакцій
  const longPressGesture = Gesture.LongPress()
    .minDuration(350)
    .onEnd(() => {
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Heavy);
      runOnJS(() => {
        containerRef.current?.measureInWindow((x, y, width) => {
          onLongPress(
            {
              x: isOwn ? x + width : x,
              y,
              isOwn,
            },
            item,
          );
        });
      })();
    });

  const tapGestures = Gesture.Exclusive(doubleTapGesture, longPressGesture);
  const composedGesture = Gesture.Simultaneous(panGesture, tapGestures);

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
    <Animated.View
      entering={FadeInDown.springify().damping(15)}
      exiting={isOwn ? FadeOutRight.duration(200) : FadeOutLeft.duration(200)}
      className="my-1.5 w-full relative justify-center"
    >
      {/* Анімована іконка відповіді ліворуч */}
      <Animated.View
        style={[styles.replyIconContainer, animatedReplyIconStyle]}
      >
        <Ionicons name="arrow-undo-circle" size={32} color={COLORS.primary} />
      </Animated.View>

      <GestureDetector gesture={composedGesture}>
        <Animated.View
          style={[animatedBubbleStyle]}
          className={`flex-row ${isOwn ? "justify-end" : "justify-start"}`}
        >
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

          <View
            ref={containerRef}
            className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl shadow-sm ${
              isOwn
                ? "bg-primary rounded-br-xs"
                : "bg-surface border border-surfaceLight rounded-bl-xs"
            }`}
          >
            {!isOwn && (
              <TouchableOpacity onPress={() => onAuthorPress(item.senderId)}>
                <Text className="text-primary font-bold text-xs mb-1">
                  {item.senderName}
                </Text>
              </TouchableOpacity>
            )}

            {/* Блок цитати */}
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

            {/* Зображення з кліком для повноекранного зуму */}
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
            {item.content ? (
              <Text className="text-white text-base leading-5">
                {item.content}
              </Text>
            ) : null}

            {/* Час та позначка редагування */}
            <View className="flex-row items-center justify-end mt-1 space-x-1">
              {item.isEdited && (
                <Text className="text-[10px] text-white/50 italic mr-1">
                  (ред.)
                </Text>
              )}
              <Text
                className={`text-[10px] ${
                  isOwn ? "text-white/70" : "text-grey"
                }`}
              >
                {formatTime(item._creationTime)}
              </Text>
            </View>

            {/* ❤️ Анімовані пілюлі реакцій всередині бульбашки */}
            <MessageReactions
              reactions={item.reactions}
              onToggleReaction={onToggleReaction}
              isOwn={isOwn}
            />
          </View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  replyIconContainer: {
    position: "absolute",
    left: 10,
    zIndex: -1,
  },
});

export const SwipeableMessageItem = memo(SwipeableMessageItemComponent);
```

### 4. `app/chat/[id].tsx`

```tsx
import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ImageViewerModal } from "@/components/ImageViewerModal";
import {
  ReactionPickerModal,
  ReactionPickerPosition,
} from "@/components/ReactionPickerModal";
import { ReplyPreviewBar } from "@/components/ReplyPreviewBar";
import {
  MessageItemData,
  SwipeableMessageItem,
} from "@/components/SwipeableMessageItem";
import { TypingDots } from "@/components/TypingDots";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const chatRoomId = id as Id<"chatRooms">;

  const room = useQuery(api.rooms.getRoom, { roomId: chatRoomId });
  const currentUser = useQuery(api.users.getCurrentUser);
  const typingUsers = useQuery(api.typing.getTypingUsers, { chatRoomId });

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

  const sendMessage = useMutation(api.messages.sendMessage);
  const setTyping = useMutation(api.typing.setTyping);
  const toggleReactionMutation = useMutation(api.messages.toggleReaction);

  const [inputText, setInputText] = useState("");
  const [replyingMessage, setReplyingMessage] =
    useState<MessageItemData | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Стан плаваючого пікера реакцій
  const [pickerState, setPickerState] = useState<{
    messageId: Id<"messages">;
    position: ReactionPickerPosition;
  } | null>(null);

  const handleToggleReaction = useCallback(
    async (messageId: Id<"messages">, emoji: string) => {
      try {
        await toggleReactionMutation({ messageId, emoji });
      } catch (error) {
        console.error("Помилка зміни реакції:", error);
      }
    },
    [toggleReactionMutation],
  );

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const textToSend = inputText.trim();
    setInputText("");

    try {
      await sendMessage({
        chatRoomId,
        content: textToSend,
        replyToId: replyingMessage?._id as Id<"messages"> | undefined,
        replyToSender: replyingMessage?.senderName,
        replyToText: replyingMessage?.content,
      });
      setReplyingMessage(null);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Хедер кімнати */}
      <View className="px-4 py-3 border-b border-surface flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text className="text-white font-bold text-lg">
          {room?.name || "Чат"}
        </Text>
        <View className="w-8" />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <FlatList
          data={messages}
          inverted
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}
          onEndReached={() => {
            if (status === "CanLoadMore") loadMore(20);
          }}
          onEndReachedThreshold={0.3}
          renderItem={({ item }) => (
            <SwipeableMessageItem
              item={item as any}
              isOwn={item.senderId === currentUser?._id}
              onReply={(msg) => setReplyingMessage(msg)}
              onImagePress={(url) => setFullscreenImage(url)}
              onAuthorPress={(authorId) =>
                router.push(`/user/${authorId}` as any)
              }
              onDoubleTap={(msg) =>
                handleToggleReaction(msg._id as Id<"messages">, "❤️")
              }
              onLongPress={(position, msg) =>
                setPickerState({
                  messageId: msg._id as Id<"messages">,
                  position,
                })
              }
              onToggleReaction={(emoji) =>
                handleToggleReaction(item._id as Id<"messages">, emoji)
              }
            />
          )}
        />

        {/* Панель цитування */}
        {replyingMessage && (
          <ReplyPreviewBar
            senderName={replyingMessage.senderName}
            text={replyingMessage.content || "📷 Зображення"}
            onCancel={() => setReplyingMessage(null)}
          />
        )}

        {/* Інпут */}
        <View className="px-3 py-2 bg-surface border-t border-surfaceLight flex-row items-center gap-2">
          <TextInput
            value={inputText}
            onChangeText={(text) => {
              setInputText(text);
              setTyping({ chatRoomId }).catch(() => {});
            }}
            placeholder="Напишіть повідомлення..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 bg-background text-white px-4 py-2.5 rounded-full text-base"
          />
          <TouchableOpacity
            onPress={handleSend}
            className="w-10 h-10 rounded-full bg-primary items-center justify-center"
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Повноекранний перегляд фото */}
      {fullscreenImage && (
        <ImageViewerModal
          visible={!!fullscreenImage}
          imageUrl={fullscreenImage}
          onClose={() => setFullscreenImage(null)}
        />
      )}

      {/* Плаваючий пікер емодзі-реакцій (Telegram-стиль) */}
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
    </SafeAreaView>
  );
}
```

### 5. `app/_layout.tsx`

```tsx
import "../global.css";
import InitialLayout from "@/components/InitialLayout";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ConvexAuthProvider client={convex}>
        <SafeAreaView className="flex-1 bg-black">
          <StatusBar style="light" />
          <InitialLayout />
        </SafeAreaView>
      </ConvexAuthProvider>
    </GestureHandlerRootView>
  );
}
```

---

## Чекліст тестування

Після виконання запустіть `npx expo start` та перевірте сценарії:

- [ ] **Подвійний тап:** Швидко торкніться повідомлення двічі. Має з'явитися пілюля `❤️ 1` з вібрацією. Повторний тап знімає реакцію.
- [ ] **Довге затискання:** Затисніть бульбашку на 350 мс. Прямо над нею відкриється плаваючий бабл емодзі.
- [ ] **Позиціонування бабла:** Для власного повідомлення бабл вирівнюється праворуч, для чужого — ліворуч.
- [ ] **Зміна реакції:** Оберіть інший емодзі з пікера — попередня реакція змінюється на нову.
- [ ] **Свайп-відповідь:** Горизонтальний свайп вправо продовжує викликати режим відповіді без конфліктів із тапами.
- [ ] **Скрол списку:** Скрол чату плавний, жести не блокують вертикальний рух.
