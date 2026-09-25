# Інструкція 12: Повноекранний Zoom фотографій, Layout Animations та мікроінтеракції у Modern Chat

У цій інструкції ми перетворимо месенджер **Modern Chat** на живий, динамічний додаток із нативними жестами рівня **Telegram, Threads та Instagram**.

Ви навчитеся створювати **мультидотикові жести (Pinch, Pan, Double-Tap)**, плавні анімації появи елементів списку (**Layout Animations**) та фізичні пружинні відгуки кнопок (**Spring Micro-interactions**).

---

## Зміст

1. [Огляд архітектури жестів у Reanimated 3 & Gesture Handler v2](#огляд-архітектури-жестів-у-reanimated-3--gesture-handler-v2)
2. [Крок 1: Створення компонента `components/ImageViewerModal.tsx`](#крок-1-створення-компонента-componentsimageviewermodaltsx)
   - [1.1. Спільні значення координат і масштабу](#11-спільні-значення-координат-і-масштабу)
   - [1.2. Жест щипка двома пальцями (Pinch-to-Zoom)](#12-жест-щипка-двома-пальцями-pinch-to-zoom)
   - [1.3. Жест переміщення та свайпу закриття (Pan Gesture)](#13-жест-переміщення-та-свайпу-закриття-pan-gesture)
   - [1.4. Подвійний швидкий дотик (Double-Tap to Zoom)](#14-подвійний-швидкий-дотик-double-tap-to-zoom)
   - [1.5. Композиція жестів та динамічний бекдроп](#15-композиція-жестів-та-динамічний-бекдроп)
3. [Крок 2: Інтеграція переглядача фото у повідомлення (`components/SwipeableMessageItem.tsx`)](#крок-2-інтеграція-переглядача-фото-у-повідомлення-componentsswipeablemessageitemtsx)
4. [Крок 3: Додавання Layout Animations для бульбашок повідомлень](#крок-3-додавання-layout-animations-для-бульбашок-повідомлень)
5. [Крок 4: Анімована панель цитування (`components/ReplyPreviewBar.tsx`)](#крок-4-анімована-панель-цитування-componentsreplypreviewbartsx)
6. [Крок 5: Пружні кнопки та плаваючий FAB у `app/chat/[id].tsx`](#крок-5-пружні-кнопки-та-плаваючий-fab-у-appchatidtsx)
7. [Крок 6: Пульсуючий індикатор набору тексту `components/TypingDots.tsx`](#крок-6-пульсуючий-індикатор-набору-тексту-componentstypingdotstsx)
8. [Повні лістинги оновлених файлів](#повні-лістинги-оновлених-файлів)
   - [`components/ImageViewerModal.tsx`](#componentsimageviewermodaltsx-новий-файл)
   - [`components/SwipeableMessageItem.tsx`](#componentsswipeablemessageitemtsx)
   - [`components/ReplyPreviewBar.tsx`](#componentsreplypreviewbartsx)
   - [`components/TypingDots.tsx`](#componentstypingdotstsx)
   - [`app/chat/[id].tsx`](#appchatidtsx)
9. [Чекліст перевірки та тестування](#чекліст-перевірки-та-тестування)

---

## Огляд архітектури жестів у Reanimated 3 & Gesture Handler v2

У сучасних мобільних додатках робота із зображеннями вимагає синхронного опрацювання кількох жестів:

1. Користувач може розвести пальці для масштабування (**Pinch**).
2. Одночасно тягнути зображення вбік (**Pan**).
3. Швидко торкнутися двічі для миттєвого зуму (**Double-Tap**).
4. Потягнути вниз для закриття (**Swipe to Dismiss**).

```
                     ┌─────────────────────────────────┐
                     │      Gesture.Race / Composed    │
                     └────────────────┬────────────────┘
                                      │
            ┌─────────────────────────┴─────────────────────────┐
            ▼                                                   ▼
 ┌───────────────────────┐                           ┌─────────────────────┐
 │ Gesture.Tap (2 тапи)  │                           │ Gesture.Simultaneous│
 │ Швидкий зум 1x ↔ 2.5x │                           └──────────┬──────────┘
 └───────────────────────┘                                      │
                                      ┌─────────────────────────┴─────────────────────────┐
                                      ▼                                                   ▼
                           ┌───────────────────────┐                           ┌─────────────────────┐
                           │     Gesture.Pinch     │                           │     Gesture.Pan     │
                           │  Масштаб: 1x -> 4x    │                           │ Панорамування/Свайп │
                           └───────────────────────┘                           └─────────────────────┘
```

Для того, щоб подвійний тап не конфліктував із простим переміщенням, ми використовуємо **`Gesture.Race`** (хто перший зафіксував умову, той і перемагає), а для спільної роботи щипка та перетягування — **`Gesture.Simultaneous`**.

Усі розрахунки відбуваються **безпосередньо в нативному потоці UI (Worklets)**, забезпечуючи максимальну частоту 60/120 FPS.

---

## Крок 1: Створення компонента `components/ImageViewerModal.tsx`

Створіть файл **`components/ImageViewerModal.tsx`**.

### 1.1. Спільні значення координат і масштабу

Для збереження масштабу та координат зміщення між жестами нам потрібні пари Shared Values:

- Поточні координати: `scale`, `translateX`, `translateY`.
- Зафіксовані координати кінця попереднього жесту: `savedScale`, `savedTranslateX`, `savedTranslateY`.

```typescript
const scale = useSharedValue(1);
const savedScale = useSharedValue(1);

const translateX = useSharedValue(0);
const translateY = useSharedValue(0);
const savedTranslateX = useSharedValue(0);
const savedTranslateY = useSharedValue(0);
```

### 1.2. Жест щипка двома пальцями (Pinch-to-Zoom)

```typescript
const pinchGesture = Gesture.Pinch()
  .onUpdate((e) => {
    // Множимо попередньо зафіксований масштаб на коефіцієнт щипка
    scale.value = savedScale.value * e.scale;
  })
  .onEnd(() => {
    // Якщо зменшили менше 1x — пружно повертаємо до 1x
    if (scale.value < 1) {
      scale.value = withSpring(1);
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      savedScale.value = 1;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    } else if (scale.value > 4) {
      // Обмежуємо максимальний зум 4x
      scale.value = withSpring(4);
      savedScale.value = 4;
    } else {
      savedScale.value = scale.value;
    }
  });
```

### 1.3. Жест переміщення та свайпу закриття (Pan Gesture)

```typescript
const panGesture = Gesture.Pan()
  .onUpdate((e) => {
    if (scale.value > 1) {
      // Збільшене фото: панорамуємо в межах екрана
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    } else {
      // Звичайний розмір (1x): дозволяємо рух лише вниз для закриття
      if (e.translationY > 0) {
        translateY.value = e.translationY;
      }
    }
  })
  .onEnd((e) => {
    if (scale.value > 1) {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    } else {
      // Якщо потягнули вниз більше ніж на 120px — закриваємо модалку!
      if (e.translationY > 120) {
        runOnJS(onClose)();
      } else {
        // Інакше пружинно повертаємо фото в центр
        translateY.value = withSpring(0);
      }
    }
  });
```

### 1.4. Подвійний швидкий дотик (Double-Tap to Zoom)

```typescript
const doubleTapGesture = Gesture.Tap()
  .numberOfTaps(2)
  .onEnd(() => {
    if (scale.value > 1.2) {
      // Якщо фото вже збільшене — повертаємо до 1x
      scale.value = withSpring(1);
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      savedScale.value = 1;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    } else {
      // Швидке збільшення до 2.5x
      scale.value = withSpring(2.5);
      savedScale.value = 2.5;
    }
  });
```

### 1.5. Композиція жестів та динамічний бекдроп

Об'єднуємо жести:

```typescript
const composedGestures = Gesture.Race(
  doubleTapGesture,
  Gesture.Simultaneous(pinchGesture, panGesture),
);
```

Динамічна прозорість фону під час свайпу вниз:

```typescript
const animatedBackdropStyle = useAnimatedStyle(() => {
  if (scale.value <= 1 && translateY.value > 0) {
    const opacity = 1 - translateY.value / 350;
    return { opacity: Math.max(0.3, opacity) };
  }
  return { opacity: 1 };
});
```

---

## Крок 2: Інтеграція переглядача фото у повідомлення (`components/SwipeableMessageItem.tsx`)

Відкрийте `components/SwipeableMessageItem.tsx`.

1. Додайте стан видимості переглядача та огортайте фотографію у повідомленні клікабельним елементом:
   ```tsx
   {
     item.imageUrl && (
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
     );
   }
   ```
2. При кліку викликається `onImagePress`, яка відкриває модальне вікно `ImageViewerModal` у головному екрані чату!

---

## Крок 3: Додавання Layout Animations для бульбашок повідомлень

Reanimated надає потужний механізм **Layout Animations** — анімації появи (`entering`) та зникнення (`exiting`) компонентів при їх додаванні чи видаленні з дерева React.

У `components/SwipeableMessageItem.tsx`:

```tsx
import Animated, {
  FadeInDown,
  FadeOutLeft,
  FadeOutRight,
  // ...
} from "react-native-reanimated";

// Огортаємо зовнішній контейнер у Animated.View з параметрами входу:
<Animated.View
  entering={FadeInDown.springify().damping(15)}
  exiting={isOwn ? FadeOutRight.duration(200) : FadeOutLeft.duration(200)}
  className="my-1.5 w-full relative justify-center"
>
  {/* вміст бульбашки */}
</Animated.View>;
```

> [!TIP]
> Завдяки `FadeInDown.springify()` кожне нове повідомлення з'являється не різко, а з легким природним пружинним рухом, як у нативному додатку Telegram.

---

## Крок 4: Анімована панель цитування (`components/ReplyPreviewBar.tsx`)

Панель швидкої відповіді над інпутом не повинна з'являтися раптово. Додамо плавний виїзд знизу:

```tsx
import Animated, { SlideInDown, SlideOutDown } from "react-native-reanimated";

export const ReplyPreviewBar: React.FC<ReplyPreviewBarProps> = ({
  replyTarget,
  onCancel,
}) => {
  return (
    <Animated.View
      entering={SlideInDown.duration(220)}
      exiting={SlideOutDown.duration(180)}
      className="flex-row items-center justify-between px-4 py-2 bg-surfaceLight border-t border-surface border-l-4 border-l-primary"
    >
      {/* Інформація про цитоване повідомлення */}
    </Animated.View>
  );
};
```

---

## Крок 5: Пружні кнопки та плаваючий FAB у `app/chat/[id].tsx`

### 1. Пружний тактильний відгук кнопки відправки (`withSpring`)

Додайте Shared Value для масштабу кнопки відправки:

```tsx
const sendScale = useSharedValue(1);

const animatedSendBtnStyle = useAnimatedStyle(() => ({
  transform: [{ scale: sendScale.value }],
}));
```

Підключіть до кнопки відправки:

```tsx
<Animated.View style={animatedSendBtnStyle}>
  <TouchableOpacity
    onPressIn={() => {
      sendScale.value = withSpring(0.86, { damping: 12, stiffness: 250 });
    }}
    onPressOut={() => {
      sendScale.value = withSpring(1, { damping: 10, stiffness: 180 });
    }}
    onPress={handleSend}
    disabled={(!inputText.trim() && !selectedImageUri) || isSubmitting}
    className={`w-11 h-11 rounded-full items-center justify-center bg-primary ${
      (!inputText.trim() && !selectedImageUri) || isSubmitting
        ? "opacity-50"
        : "active:opacity-90"
    }`}
  >
    {isSubmitting ? (
      <ActivityIndicator size="small" color={COLORS.white} />
    ) : (
      <Ionicons name="send" size={20} color={COLORS.white} />
    )}
  </TouchableOpacity>
</Animated.View>
```

### 2. Плавна поява кнопки швидкого скролу вниз (Scroll to Bottom FAB)

Використовуємо `ZoomIn` та `ZoomOut`:

```tsx
import Animated, { ZoomIn, ZoomOut } from "react-native-reanimated";

{
  showScrollBottom && (
    <Animated.View
      entering={ZoomIn.springify()}
      exiting={ZoomOut.duration(150)}
      className="absolute right-4 bottom-24 z-30"
    >
      <TouchableOpacity
        onPress={() => {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        }}
        activeOpacity={0.85}
        className="w-11 h-11 rounded-full bg-surface border border-surfaceLight items-center justify-center shadow-lg"
      >
        <Ionicons name="chevron-down" size={24} color={COLORS.primary} />
      </TouchableOpacity>
    </Animated.View>
  );
}
```

---

## Крок 6: Пульсуючий індикатор набору тексту `components/TypingDots.tsx`

Оживимо три крапки набору тексту за допомогою `withRepeat` та почергової затримки:

```tsx
import React, { useEffect } from "react";
import { View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import { COLORS } from "@/constants/theme";

function AnimatedDot({ delay }: { delay: number }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-4, { duration: 300 }),
          withTiming(0, { duration: 300 }),
        ),
        -1,
        true,
      ),
    );
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={animatedStyle}
      className="w-1.5 h-1.5 rounded-full bg-primary mx-0.5"
    />
  );
}
```

---

## Повні лістинги оновлених файлів

### `components/ImageViewerModal.tsx` (новий файл)

```tsx
// components/ImageViewerModal.tsx
import React, { useEffect } from "react";
import {
  Dimensions,
  Modal,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

interface ImageViewerModalProps {
  visible: boolean;
  imageUrl: string;
  onClose: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  visible,
  imageUrl,
  onClose,
}) => {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Скидання масштабу та координат при кожному відкритті
  useEffect(() => {
    if (visible) {
      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    }
  }, [visible]);

  // 1. Жест щипка двома пальцями (Pinch-to-Zoom)
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else if (scale.value > 4) {
        scale.value = withSpring(4);
        savedScale.value = 4;
      } else {
        savedScale.value = scale.value;
      }
    });

  // 2. Жест переміщення (Pan) або свайпу вниз для закриття
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (scale.value > 1) {
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      } else {
        if (e.translationY > 0) {
          translateY.value = e.translationY;
        }
      }
    })
    .onEnd((e) => {
      if (scale.value > 1) {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      } else {
        if (e.translationY > 120) {
          runOnJS(onClose)();
        } else {
          translateY.value = withSpring(0);
        }
      }
    });

  // 3. Подвійний швидкий дотик (Double-Tap)
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1.2) {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        scale.value = withSpring(2.5);
        savedScale.value = 2.5;
      }
    });

  // Об'єднуємо жести: подвійний тап має пріоритет над одиночним
  const composedGestures = Gesture.Race(
    doubleTapGesture,
    Gesture.Simultaneous(pinchGesture, panGesture),
  );

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const animatedBackdropStyle = useAnimatedStyle(() => {
    if (scale.value <= 1 && translateY.value > 0) {
      const opacity = 1 - translateY.value / 350;
      return { opacity: Math.max(0.3, opacity) };
    }
    return { opacity: 1 };
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[styles.backdrop, animatedBackdropStyle]}>
          <GestureDetector gesture={composedGestures}>
            <Animated.View style={styles.imageContainer}>
              <Animated.Image
                source={{ uri: imageUrl }}
                style={[styles.image, animatedImageStyle]}
                resizeMode="contain"
              />
            </Animated.View>
          </GestureDetector>

          {/* Кнопка закриття */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.8}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <View style={styles.closeIconCircle}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 20,
  },
  closeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(30, 30, 30, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
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
  FadeInDown,
  FadeOutLeft,
  FadeOutRight,
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
    // ⚡ Layout Animations: плавний пружинний вхід та розчинення при видаленні
    <Animated.View
      entering={FadeInDown.springify().damping(15)}
      exiting={isOwn ? FadeOutRight.duration(200) : FadeOutLeft.duration(200)}
      className="my-1.5 w-full relative justify-center"
    >
      {/* Анімована іконка відповіді */}
      <Animated.View
        style={[styles.replyIconContainer, animatedReplyIconStyle]}
      >
        <Ionicons name="arrow-undo-circle" size={32} color={COLORS.primary} />
      </Animated.View>

      <GestureDetector gesture={panGesture}>
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

            {item.content && (
              <Text className="text-white text-base leading-5">
                {item.content}
              </Text>
            )}

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
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  replyIconContainer: {
    position: "absolute",
    left: 12,
    zIndex: 1,
  },
});

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

### `components/ReplyPreviewBar.tsx`

```tsx
// components/ReplyPreviewBar.tsx
import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Animated, { SlideInDown, SlideOutDown } from "react-native-reanimated";

export interface ReplyTarget {
  messageId: string;
  senderName: string;
  text: string;
}

interface ReplyPreviewBarProps {
  replyTarget: ReplyTarget;
  onCancel: () => void;
}

export const ReplyPreviewBar: React.FC<ReplyPreviewBarProps> = ({
  replyTarget,
  onCancel,
}) => {
  return (
    <Animated.View
      entering={SlideInDown.duration(200)}
      exiting={SlideOutDown.duration(180)}
      className="flex-row items-center justify-between px-4 py-2 bg-surfaceLight border-t border-surface border-l-4 border-l-primary"
    >
      <View className="flex-row items-center flex-1 mr-2">
        <Ionicons
          name="arrow-undo"
          size={18}
          color={COLORS.primary}
          style={{ marginRight: 8 }}
        />
        <View className="flex-1">
          <Text className="text-primary font-bold text-xs">
            Відповідь для {replyTarget.senderName}
          </Text>
          <Text className="text-white/80 text-xs mt-0.5" numberOfLines={1}>
            {replyTarget.text || "📷 Зображення"}
          </Text>
        </View>
      </View>

      <TouchableOpacity onPress={onCancel} className="p-1">
        <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
};
```

---

### `components/TypingDots.tsx`

```tsx
// components/TypingDots.tsx
import { COLORS } from "@/constants/theme";
import React, { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

function PulsingDot({ delay }: { delay: number }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-4, { duration: 280 }),
          withTiming(0, { duration: 280 }),
        ),
        -1,
        true,
      ),
    );
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={animatedStyle}
      className="w-1.5 h-1.5 rounded-full bg-primary mx-0.5"
    />
  );
}

export function TypingDots({ typingUsers }: { typingUsers: any[] }) {
  if (!typingUsers || typingUsers.length === 0) return null;

  const names = typingUsers.map((u) => u.userName).join(", ");

  return (
    <View className="flex-row items-center px-4 py-1.5 bg-surface/90 border-t border-surfaceLight/50">
      <View className="flex-row items-center mr-2">
        <PulsingDot delay={0} />
        <PulsingDot delay={150} />
        <PulsingDot delay={300} />
      </View>
      <Text className="text-textMuted text-xs" numberOfLines={1}>
        {names} друкує...
      </Text>
    </View>
  );
}
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
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  ZoomIn,
  ZoomOut,
} from "react-native-reanimated";

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const chatRoomId = id as Id<"chatRooms">;

  const room = useQuery(api.rooms.getRoom, { roomId: chatRoomId });
  const currentUser = useQuery(api.users.currentUser);
  const typingUsers = useQuery(api.typing.getTypingUsers, { chatRoomId });

  // Курсорна пагінація Convex
  const {
    results: messages,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.messages.getPaginatedMessages,
    { chatRoomId },
    { initialNumItems: 25 },
  );

  const sendMessage = useMutation(api.messages.sendMessage);
  const sendMediaMessage = useMutation(api.messages.sendMediaMessage);
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl);
  const editMessage = useMutation(api.messages.editMessage);
  const deleteMessage = useMutation(api.messages.deleteMessage);
  const setTyping = useMutation(api.typing.setTyping);

  // Стан для повноекранного модального зуму
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const [inputText, setInputText] = useState("");
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] =
    useState<Id<"messages"> | null>(null);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Пружинний масштаб для кнопки відправки
  const sendBtnScale = useSharedValue(1);

  const flatListRef = useRef<FlatList>(null);
  const lastTypingCall = useRef(0);

  const handleTextChange = (text: string) => {
    setInputText(text);
    const now = Date.now();
    if (now - lastTypingCall.current > 1500) {
      lastTypingCall.current = now;
      setTyping({ chatRoomId }).catch(() => {});
    }
  };

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
      console.error(error);
      Alert.alert("Помилка", "Не вдалося відкрити галерею");
    }
  };

  const handleStartReply = useCallback((msg: MessageItemData) => {
    setReplyTarget({
      messageId: msg._id,
      senderName: msg.senderName,
      text: msg.content || (msg.imageUrl ? "📷 Фотографія" : ""),
    });
    setEditingMessageId(null);
  }, []);

  const handleSend = async () => {
    const text = inputText.trim();
    if ((!text && !selectedImageUri) || isSubmitting) return;

    try {
      setIsSubmitting(true);

      if (editingMessageId) {
        await editMessage({
          messageId: editingMessageId,
          content: text,
        });
        setEditingMessageId(null);
      } else if (selectedImageUri) {
        const uploadUrl = await generateUploadUrl();
        const file = new File(selectedImageUri);

        const uploadResult = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "image/jpeg" },
          body: file,
        });

        if (!uploadResult.ok) throw new Error("Помилка завантаження фото");

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
                    Alert.alert("Помилка", "Не вдалося видалити");
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

  const animatedSendStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendBtnScale.value }],
  }));

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

      {/* Інвертований список з курсорною пагінацією */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._id}
        inverted={true}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
        renderItem={renderMessageItem}
        onEndReached={() => {
          if (status === "CanLoadMore") loadMore(20);
        }}
        onEndReachedThreshold={0.2}
        onScroll={(e) => {
          setShowScrollBottom(e.nativeEvent.contentOffset.y > 350);
        }}
        scrollEventThrottle={100}
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
        ListEmptyComponent={
          status === "LoadingFirstPage" ? (
            <View className="py-20 items-center justify-center scale-y-[-1]">
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text className="text-textMuted text-sm mt-3">
                Завантаження...
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
                Повідомлень ще немає.{"\n"}Напишіть першим!
              </Text>
            </View>
          )
        }
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={Platform.OS === "android"}
      />

      {/* Анімована плаваюча кнопка скролу вниз (FAB) */}
      {showScrollBottom && (
        <Animated.View
          entering={ZoomIn.springify()}
          exiting={ZoomOut.duration(150)}
          className="absolute right-4 bottom-24 z-30"
        >
          <TouchableOpacity
            onPress={() => {
              flatListRef.current?.scrollToOffset({
                offset: 0,
                animated: true,
              });
            }}
            activeOpacity={0.85}
            className="w-11 h-11 rounded-full bg-surface border border-surfaceLight items-center justify-center shadow-lg"
          >
            <Ionicons name="chevron-down" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Анімований пульсуючий індикатор набору тексту */}
      {typingUsers && typingUsers.length > 0 && (
        <TypingDots typingUsers={typingUsers} />
      )}

      {/* Панель цитування з висуванням знизу (SlideInDown) */}
      {replyTarget && (
        <ReplyPreviewBar
          replyTarget={replyTarget}
          onCancel={() => setReplyTarget(null)}
        />
      )}

      {/* Панель редагування */}
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

      {/* Прев'ю прикріпленого фото */}
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

      {/* Нижня панель вводу */}
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
                  ? "Додайте підпис..."
                  : "Напишіть повідомлення..."
          }
          placeholderTextColor={COLORS.textMuted}
          value={inputText}
          onChangeText={handleTextChange}
          multiline
        />

        {/* ⚡ Пружна кнопка відправки на withSpring */}
        <Animated.View style={animatedSendStyle}>
          <TouchableOpacity
            onPressIn={() => {
              sendBtnScale.value = withSpring(0.86, {
                damping: 12,
                stiffness: 250,
              });
            }}
            onPressOut={() => {
              sendBtnScale.value = withSpring(1, {
                damping: 10,
                stiffness: 180,
              });
            }}
            onPress={handleSend}
            disabled={(!inputText.trim() && !selectedImageUri) || isSubmitting}
            className={`w-11 h-11 rounded-full items-center justify-center bg-primary ${
              (!inputText.trim() && !selectedImageUri) || isSubmitting
                ? "opacity-50"
                : "active:opacity-90"
            }`}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Ionicons name="send" size={20} color={COLORS.white} />
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* 🚀 Повноекранний інтерактивний переглядач фото з Pinch, Pan, Double-Tap */}
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

1. **Інтерактивне масштабування фотографій (Pinch-to-Zoom):**
   - Надішліть фотографію в чат або відкрийте існуючу з картинкою.
   - Торкніться картинки — вона відкривається на весь чорний екран без обрізання.
   - Розведіть два пальці — зображення плавно збільшується в реальному часі до 4x без ривків.
   - Зведіть пальці менше 1x і відпустіть — пружинна анімація плавно повертає картинку в початковий розмір.
2. **Панорамування та подвійний тап:**
   - Двічі швидко торкніться збільшеного фото — воно миттєво плавно центрується та збільшується до 2.5x.
   - Повторний подвійний тап — плавно повертає його до 1x.
   - У збільшеному стані потягніть одним пальцем — зображення панорамується, дозволяючи оглянути будь-який кут кадру.
3. **Swipe-to-Dismiss (Свайп для виходу):**
   - У звичайному масштабі 1x потягніть фотографію вниз — фон плавно стає напівпрозорим, а модальне вікно закривається при відпусканні.
4. **Layout Animations повідомлень:**
   - Надішліть нове повідомлення — бульбашка плавно випливає знизу з м'якою пружиною.
   - Видаліть власне повідомлення — воно плавно розчиняється вліво/вправо, і список без ривків займає вільний простір.
5. **Тактильний відгук кнопок:**
   - Торкніться кнопки відправки — вона пружно зменшується під пальцем і підстрибує при відпусканні.
   - Проскрольте історію чату вгору — кнопка повернення вниз плавно виринає зі збільшенням (`ZoomIn`).
