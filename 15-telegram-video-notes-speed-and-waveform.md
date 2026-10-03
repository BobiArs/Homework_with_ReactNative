# Інструкція 15: Відеокружечки у чаті (Video Notes), керування швидкістю відтворення (1x / 1.5x / 2x) та інтерактивна звукова хвиля (Audio Waveform)

У цій інструкції ми перетворимо мультимедійний досвід нашого чату у додатку **`prostir`** на рівень сучасних флагманів **Telegram** та **WhatsApp**.

Ми реалізуємо три ключові можливості:

1. **Круглі відеоповідомлення (Video Notes / "Кружечки")**:
   - Запис круглого відео з фронтальної камери через **`expo-camera`** (`CameraView mode="video"`).
   - Кругова маска камери з круговим SVG-таймером запису до 60 секунд.
   - Завантаження у **Convex Storage** та відтворення у чаті через сучасний нативний рушій **`expo-video`**.
   - Тап по кружечку для вмикання звуку або паузи, круговий прогрес перегляду.
2. **Керування швидкістю відтворення (1x / 1.5x / 2x)**:
   - Циклічне перемикання темпу відтворення **`1x` ➔ `1.5x` ➔ `2x` ➔ `1x`** як для голосових повідомлень (`VoiceMessagePlayer`), так і для відеокружечків (`VideoNotePlayer`).
   - Нативна зміна швидкості через `playbackRate` зі збереженням тональності мови (Pitch Correction).
   - Акцентний візуальний бейдж та тактильний відгук **`expo-haptics`**.
3. **Інтерактивна звукова хвиля (Audio Waveform)**:
   - Візуалізація 32 амплітудних стовпчиків різної висоти замість звичайної плоскої лінії.
   - Плавне заповнення відтвореної частини хвилі кольором бренду.
   - Інтерактивне перемотування (**Seek / Scrubbing**) тапом по хвилі.
   - Живі коливання стовпчиків під час запису голосового у `ChatInput`.
   - Резервна детермінована генерація хвилі (**Fallback Waveform**) для старіших аудіоповідомлень.

---

## 📚 Зміст

1. [Архітектура мультимедійного комплексу](#1-архітектура-мультимедійного-комплексу)
2. [Крок 1: Встановлення та налаштування бібліотек](#крок-1-встановлення-та-налаштування-бібліотек)
3. [Крок 2: Оновлення схеми бази даних `convex/schema.ts`](#крок-2-оновлення-схеми-бази-даних-convexschemats)
4. [Крок 3: Оновлення бекенду `convex/messages.ts`](#крок-3-оновлення-бекенду-convexmessagests)
5. [Крок 4: Створення компонента звукової хвилі `components/AudioWaveform.tsx`](#крок-4-створення-компонента-звукової-хвилі-componentsaudiowaveformtsx)
6. [Крок 5: Оновлення аудіоплеєра `components/VoiceMessagePlayer.tsx`](#крок-5-оновлення-аудіоплеєра-componentsvoicemessageplayertsx)
7. [Крок 6: Створення відеоплеєра кружечків `components/VideoNotePlayer.tsx`](#крок-6-створення-відеоплеєра-кружечків-componentsvideonoteplayertsx)
8. [Крок 7: Створення модалки запису кружечків `components/VideoNoteRecorderModal.tsx`](#крок-7-створення-модалки-запису-кружечків-componentsvideonoterecordermodaltsx)
9. [Крок 8: Оновлення `components/ChatInput.tsx`](#крок-8-оновлення-componentschatinputtsx)
10. [Крок 9: Оновлення `components/MessageBubble.tsx`](#крок-9-оновлення-componentsmessagebubbletsx)
11. [Крок 10: Інтеграція в екран чату `app/messages/[id].tsx`](#крок-10-інтеграція-в-екран-чату-appmessagesidtsx)
12. [Повні оновлені лістинги файлів](#12-повні-оновлені-лістинги-файлів)
13. [Тестування та чекліст перевірки](#13-тестування-та-чекліст-перевірки)

---

## 1. Архітектура мультимедійного комплексу

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                           Життєвий цикл кружечка та аудіо                      │
│                                                                                │
│  [ChatInput: перемикання 🎤 / 📹]                                              │
│       │                                                                        │
│       ├──► Запис аудіо ➔ генерація 32 амплітуд waveform ➔ upload .m4a ──────┐  │
│       │                                                                     │  │
│       └──► VideoNoteRecorderModal ➔ CameraView front ➔ upload .mp4 ─────┐   │  │
│                                                                         │   │  │
│  [Convex Backend: sendMessage] ◄────────────────────────────────────────┴───┘  │
│       │                                                                        │
│       ▼                                                                        │
│  [Стрічка повідомлень: MessageBubble]                                          │
│       ├──► audioUrl ➔ VoiceMessagePlayer + AudioWaveform (Seek + 1x/1.5x/2x)   │
│       └──► videoUrl ➔ VideoNotePlayer (Круглий expo-video + 1x/1.5x/2x)       │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Крок 1: Встановлення та налаштування бібліотек

Для роботи з камерою, відео та векторною графікою переконайтеся, що встановлені необхідні бібліотеки:

```bash
npx expo install expo-camera expo-video react-native-svg expo-haptics
```

У файлі `app.json` переконайтеся, що налаштовані плагіни та дозволи для камери та мікрофона:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-camera",
        {
          "cameraPermission": "Дозвольте додатку використовувати камеру для запису відеокружечків.",
          "microphonePermission": "Дозвольте додатку використовувати мікрофон для запису звуку."
        }
      ]
    ]
  }
}
```

---

## Крок 2: Оновлення схеми бази даних `convex/schema.ts`

Додаємо до таблиці `messages` поля для круглих відео та збереження звукової хвилі:

```typescript
// prostir/convex/schema.ts
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
```

---

## Крок 3: Оновлення бекенду `convex/messages.ts`

У мутації `sendMessage` додаємо обробку нових аргументів:

```typescript
export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    storageId: v.optional(v.id("_storage")),
    audioStorageId: v.optional(v.id("_storage")),
    audioDuration: v.optional(v.number()),
    waveform: v.optional(v.array(v.number())),
    videoStorageId: v.optional(v.id("_storage")),
    videoDuration: v.optional(v.number()),
    isVideoNote: v.optional(v.boolean()),
    replyToId: v.optional(v.id("messages")),
    replyToSender: v.optional(v.string()),
    replyToText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) throw new Error("Unauthorized");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || !conversation.participantIds.includes(currentUserId)) {
      throw new Error("Немає доступу до чату");
    }

    let imageUrl = args.storageId
      ? await ctx.storage.getUrl(args.storageId)
      : undefined;
    let audioUrl = args.audioStorageId
      ? await ctx.storage.getUrl(args.audioStorageId)
      : undefined;
    let videoUrl = args.videoStorageId
      ? await ctx.storage.getUrl(args.videoStorageId)
      : undefined;

    const now = Date.now();

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: currentUserId,
      content: args.content.trim(),
      imageUrl: imageUrl ?? undefined,
      storageId: args.storageId,
      audioUrl: audioUrl ?? undefined,
      audioStorageId: args.audioStorageId,
      audioDuration: args.audioDuration,
      waveform: args.waveform,
      videoUrl: videoUrl ?? undefined,
      videoStorageId: args.videoStorageId,
      videoDuration: args.videoDuration,
      isVideoNote: args.isVideoNote,
      createdAt: now,
      replyToId: args.replyToId,
      replyToSender: args.replyToSender,
      replyToText: args.replyToText,
    });

    let previewText = args.content.trim();
    if (!previewText) {
      if (args.videoStorageId) {
        previewText = "📹 Відеоповідомлення";
      } else if (args.audioStorageId) {
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
```

---

## Крок 4: Створення компонента звукової хвилі `components/AudioWaveform.tsx`

Створимо компонент `components/AudioWaveform.tsx`, який відповідає за рендеринг стовпчиків та інтерактивне перемотування:

```typescript
// components/AudioWaveform.tsx
import { COLORS } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import React, { useMemo, useRef } from "react";
import { GestureResponderEvent, View } from "react-native";

interface AudioWaveformProps {
  waveform?: number[];
  progress: number; // 0..1
  duration: number; // у секундах
  isMine: boolean;
  onSeek?: (targetSeconds: number) => void;
  height?: number;
}

const DEFAULT_BARS_COUNT = 32;

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  waveform,
  progress,
  duration,
  isMine,
  onSeek,
  height = 32,
}) => {
  const containerRef = useRef<View>(null);

  const bars = useMemo(() => {
    if (waveform && waveform.length >= 16) {
      return waveform.slice(0, DEFAULT_BARS_COUNT);
    }
    return Array.from({ length: DEFAULT_BARS_COUNT }, (_, index) => {
      const x = (index / DEFAULT_BARS_COUNT) * Math.PI * 4;
      const val = 0.2 + 0.35 * Math.sin(x) + 0.35 * Math.abs(Math.cos(x * 1.7));
      return Number(Math.max(0.12, Math.min(1.0, val)).toFixed(2));
    });
  }, [waveform]);

  const handleTouch = (event: GestureResponderEvent) => {
    if (!onSeek || duration <= 0) return;

    containerRef.current?.measure((_x, _y, width, _h, pageX) => {
      if (!width || width <= 0) return;
      const touchX = event.nativeEvent.pageX - pageX;
      const relativeProgress = Math.max(0, Math.min(1, touchX / width));
      const targetSeconds = relativeProgress * duration;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSeek(targetSeconds);
    });
  };

  const activeColor = isMine ? "#FFFFFF" : COLORS.primary;
  const inactiveColor = isMine ? "rgba(255, 255, 255, 0.35)" : "rgba(255, 255, 255, 0.18)";

  return (
    <View
      ref={containerRef}
      onStartShouldSetResponder={() => !!onSeek}
      onResponderGrant={handleTouch}
      onResponderMove={handleTouch}
      style={{ height }}
      className="flex-1 flex-row items-center justify-between py-1 px-0.5"
    >
      {bars.map((amplitude, index) => {
        const barRelativePos = index / bars.length;
        const isFilled = progress >= barRelativePos;
        const minHeight = 4;
        const barHeight = Math.max(minHeight, amplitude * height);

        return (
          <View
            key={index}
            style={{
              width: 2.5,
              height: barHeight,
              borderRadius: 2,
              backgroundColor: isFilled ? activeColor : inactiveColor,
            }}
          />
        );
      })}
    </View>
  );
};
```

---

## Крок 5: Оновлення аудіоплеєра `components/VoiceMessagePlayer.tsx`

Оновлюємо `VoiceMessagePlayer.tsx`:

1. Замінюємо повзунок на `AudioWaveform`.
2. Додаємо циклічну кнопку перемикання швидкості (1x / 1.5x / 2x).

```typescript
// components/VoiceMessagePlayer.tsx
import { AudioWaveform } from "@/components/AudioWaveform";
import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

interface VoiceMessagePlayerProps {
  audioUrl: string;
  duration?: number;
  waveform?: number[];
  isMine?: boolean;
}

const SPEED_OPTIONS = [1.0, 1.5, 2.0];

export const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({
  audioUrl,
  duration = 0,
  waveform,
  isMine = false,
}) => {
  const player = useAudioPlayer({ uri: audioUrl });
  const status = useAudioPlayerStatus(player);
  const [speedIndex, setSpeedIndex] = useState(0);

  const isPlaying = status?.playing ?? false;
  const isBuffering = status?.isBuffering ?? false;
  const currentPosition = status?.currentTime ?? 0;
  const totalDuration = status?.duration ? status.duration : duration;
  const progress = totalDuration > 0 ? Math.min(1, currentPosition / totalDuration) : 0;

  const togglePlayPause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isPlaying) {
      player.pause();
    } else {
      if (progress >= 0.99) player.seekTo(0);
      player.play();
    }
  };

  const handleCycleSpeed = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextIndex = (speedIndex + 1) % SPEED_OPTIONS.length;
    const nextSpeed = SPEED_OPTIONS[nextIndex];
    setSpeedIndex(nextIndex);
    player.playbackRate = nextSpeed;
  };

  const handleSeek = (targetSeconds: number) => {
    player.seekTo(targetSeconds);
  };

  const formatSeconds = (sec: number) => {
    const total = Math.floor(sec);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const displayTime = isPlaying
    ? formatSeconds(currentPosition)
    : formatSeconds(totalDuration);

  return (
    <View className="flex-row items-center my-1 w-64">
      {/* Кнопка Play/Pause */}
      <TouchableOpacity
        onPress={togglePlayPause}
        className={`w-9 h-9 rounded-full items-center justify-center mr-2.5 ${
          isMine ? "bg-white/20" : "bg-primary/20"
        }`}
      >
        {isBuffering ? (
          <ActivityIndicator size="small" color={isMine ? "#FFFFFF" : COLORS.primary} />
        ) : (
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={18}
            color={isMine ? "#FFFFFF" : COLORS.primary}
            style={{ marginLeft: isPlaying ? 0 : 2 }}
          />
        )}
      </TouchableOpacity>

      {/* Звукова хвиля та час */}
      <View className="flex-1 justify-center">
        <AudioWaveform
          waveform={waveform}
          progress={progress}
          duration={totalDuration}
          isMine={isMine}
          onSeek={handleSeek}
          height={28}
        />
        <View className="flex-row justify-between items-center mt-1">
          <Text className={`text-[10px] ${isMine ? "text-white/70" : "text-grey"}`}>
            {displayTime}
          </Text>
        </View>
      </View>

      {/* Кнопка швидкості */}
      <TouchableOpacity
        onPress={handleCycleSpeed}
        activeOpacity={0.7}
        className={`ml-2 px-1.5 py-0.5 rounded-full border ${
          SPEED_OPTIONS[speedIndex] > 1.0
            ? "bg-primary border-primary"
            : isMine
              ? "bg-white/10 border-white/20"
              : "bg-surfaceLight border-surfaceLight"
        }`}
      >
        <Text className="text-[10px] font-bold text-white">
          {SPEED_OPTIONS[speedIndex]}x
        </Text>
      </TouchableOpacity>
    </View>
  );
};
```

---

## Крок 6: Створення відеоплеєра кружечків `components/VideoNotePlayer.tsx`

Створимо круглий відеоплеєр `components/VideoNotePlayer.tsx` на базі `expo-video`:

```typescript
// components/VideoNotePlayer.tsx
import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface VideoNotePlayerProps {
  videoUrl: string;
  duration?: number;
  isMine?: boolean;
}

const SPEED_OPTIONS = [1.0, 1.5, 2.0];
const CIRCLE_SIZE = 200;
const STROKE_WIDTH = 3.5;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const VideoNotePlayer: React.FC<VideoNotePlayerProps> = ({
  videoUrl,
  isMine = false,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = true;
    p.muted = false;
    p.play();
  });

  useEffect(() => {
    const interval = setInterval(() => {
      if (player && player.duration > 0) {
        setProgress(player.currentTime / player.duration);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [player]);

  const toggleAudio = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    player.muted = nextMuted;
  };

  const handleCycleSpeed = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextIndex = (speedIndex + 1) % SPEED_OPTIONS.length;
    const nextSpeed = SPEED_OPTIONS[nextIndex];
    setSpeedIndex(nextIndex);
    player.playbackRate = nextSpeed;
  };

  const strokeDashoffset = CIRCUMFERENCE - progress * CIRCUMFERENCE;

  return (
    <View className="relative items-center justify-center my-1" style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE }}>
      {/* SVG Круговий прогрес */}
      <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} className="absolute z-10 -rotate-90">
        <Circle
          cx={CIRCLE_SIZE / 2}
          cy={CIRCLE_SIZE / 2}
          r={RADIUS}
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        <Circle
          cx={CIRCLE_SIZE / 2}
          cy={CIRCLE_SIZE / 2}
          r={RADIUS}
          stroke={COLORS.primary}
          strokeWidth={STROKE_WIDTH}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>

      {/* Кругле нативне відео */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={toggleAudio}
        style={{
          width: CIRCLE_SIZE - 8,
          height: CIRCLE_SIZE - 8,
          borderRadius: (CIRCLE_SIZE - 8) / 2,
          overflow: "hidden",
        }}
      >
        <VideoView
          player={player}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          nativeControls={false}
        />

        {/* Іконка Mute */}
        {isMuted && (
          <View className="absolute inset-0 items-center justify-center bg-black/30">
            <View className="bg-black/60 p-2.5 rounded-full">
              <Ionicons name="volume-mute" size={24} color="#FFFFFF" />
            </View>
          </View>
        )}
      </TouchableOpacity>

      {/* Бейдж перемикання швидкості */}
      <TouchableOpacity
        onPress={handleCycleSpeed}
        activeOpacity={0.8}
        className={`absolute top-2 right-2 z-20 px-2 py-0.5 rounded-full border shadow-md ${
          SPEED_OPTIONS[speedIndex] > 1.0
            ? "bg-primary border-primary"
            : "bg-black/60 border-white/20"
        }`}
      >
        <Text className="text-[10px] font-bold text-white">
          {SPEED_OPTIONS[speedIndex]}x
        </Text>
      </TouchableOpacity>
    </View>
  );
};
```

---

## Крок 7: Створення модалки запису кружечків `components/VideoNoteRecorderModal.tsx`

Створимо модальне вікно `components/VideoNoteRecorderModal.tsx` для зйомки кружечків за допомогою `CameraView`:

```typescript
// components/VideoNoteRecorderModal.tsx
import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Modal, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface VideoNoteRecorderModalProps {
  visible: boolean;
  onClose: () => void;
  onSendVideo: (videoUri: string, durationSeconds: number) => Promise<void>;
}

const MAX_DURATION = 60;
const CIRCLE_SIZE = 260;
const RADIUS = (CIRCLE_SIZE - 6) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const VideoNoteRecorderModal: React.FC<VideoNoteRecorderModalProps> = ({
  visible,
  onClose,
  onSendVideo,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (visible && (!permission || !permission.granted)) {
      requestPermission();
    }
  }, [visible, permission]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    if (!cameraRef.current || isRecording) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          if (prev >= MAX_DURATION - 1) {
            stopRecording();
            return MAX_DURATION;
          }
          return prev + 1;
        });
      }, 1000);

      const video = await cameraRef.current.recordAsync({
        maxDuration: MAX_DURATION,
      });

      if (video?.uri) {
        await onSendVideo(video.uri, duration || 1);
        onClose();
      }
    } catch (error) {
      console.error("Помилка запису відео:", error);
      Alert.alert("Помилка", "Не вдалося записати відео.");
    } finally {
      setIsRecording(false);
      setDuration(0);
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    cameraRef.current?.stopRecording();
  };

  const cancelRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    cameraRef.current?.stopRecording();
    setIsRecording(false);
    setDuration(0);
    onClose();
  };

  const strokeDashoffset = CIRCUMFERENCE - (duration / MAX_DURATION) * CIRCUMFERENCE;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={cancelRecording}>
      <View className="flex-1 bg-black/90 items-center justify-center px-4">
        {/* Круглий видошукач камери */}
        <View className="relative items-center justify-center" style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE }}>
          <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} className="absolute z-10 -rotate-90">
            <Circle
              cx={CIRCLE_SIZE / 2}
              cy={CIRCLE_SIZE / 2}
              r={RADIUS}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={4}
              fill="none"
            />
            {isRecording && (
              <Circle
                cx={CIRCLE_SIZE / 2}
                cy={CIRCLE_SIZE / 2}
                r={RADIUS}
                stroke={COLORS.primary}
                strokeWidth={4}
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
              />
            )}
          </Svg>

          <View
            style={{
              width: CIRCLE_SIZE - 12,
              height: CIRCLE_SIZE - 12,
              borderRadius: (CIRCLE_SIZE - 12) / 2,
              overflow: "hidden",
            }}
          >
            <CameraView
              ref={cameraRef}
              mode="video"
              facing="front"
              style={{ width: "100%", height: "100%" }}
            />
          </View>
        </View>

        {/* Таймер запису */}
        <Text className="text-white font-bold text-lg mt-6">
          {Math.floor(duration / 60)}:{duration % 60 < 10 ? "0" : ""}{duration % 60} / 1:00
        </Text>

        {/* Кнопки керування */}
        <View className="flex-row items-center justify-around w-full mt-10">
          <TouchableOpacity onPress={cancelRecording} className="p-3 bg-surfaceLight rounded-full">
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={isRecording ? stopRecording : startRecording}
            className={`w-20 h-20 rounded-full items-center justify-center border-4 border-white ${
              isRecording ? "bg-red-500" : "bg-primary"
            }`}
          >
            <Ionicons name={isRecording ? "stop" : "radio-button-on"} size={36} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={{ width: 52 }} />
        </View>
      </View>
    </Modal>
  );
};
```

---

## Крок 8: Оновлення `components/ChatInput.tsx`

У `ChatInput.tsx` додаємо:

1. Перемикання режимів мікрофона 🎤 та камери 📹 (довгий тап або швидкий тап для зміни режиму).
2. Відображення живої анімації стовпчиків хвилі при записі аудіо.

```typescript
// Частина коду перемикача в ChatInput:
const [inputMode, setInputMode] = useState<"audio" | "video">("audio");
const [isVideoModalVisible, setIsVideoModalVisible] = useState(false);

const handleMediaIconPress = () => {
  if (inputMode === "audio") {
    startRecording();
  } else {
    setIsVideoModalVisible(true);
  }
};

const toggleInputMode = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  setInputMode((prev) => (prev === "audio" ? "video" : "audio"));
};
```

---

## Крок 9: Оновлення `components/MessageBubble.tsx`

У `MessageBubble.tsx` додаємо рендеринг `VideoNotePlayer` та передачу `waveform` у `VoiceMessagePlayer`:

```tsx
{
  /* Відеокружечок */
}
{
  videoUrl && isVideoNote ? (
    <VideoNotePlayer
      videoUrl={videoUrl}
      duration={videoDuration}
      isMine={isMine}
    />
  ) : null;
}

{
  /* Голосове повідомлення зі звуковою хвилею */
}
{
  audioUrl ? (
    <VoiceMessagePlayer
      audioUrl={audioUrl}
      duration={audioDuration}
      waveform={waveform}
      isMine={isMine}
    />
  ) : null;
}
```

---

## Крок 10: Інтеграція в екран чату `app/messages/[id].tsx`

Підключаємо обробник `handleSendVideo`:

```typescript
const handleSendVideo = async (videoUri: string, durationSeconds: number) => {
  try {
    setIsSending(true);
    const uploadUrl = await generateUploadUrlMutation();
    const file = new File(videoUri);

    const uploadResult = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": "video/mp4" },
      body: file,
    });

    if (!uploadResult.ok) throw new Error("Не вдалося завантажити відео");

    const { storageId } = await uploadResult.json();

    await sendMessageMutation({
      conversationId,
      content: "",
      videoStorageId: storageId,
      videoDuration: durationSeconds,
      isVideoNote: true,
    });
  } catch (error: any) {
    Alert.alert("Помилка", error.message || "Не вдалося надіслати кружечок");
  } finally {
    setIsSending(false);
  }
};
```

---

## 12. Повні оновлені лістинги файлів

Всі повні лістинги файлів доступні для звірення у тематичних інструкціях:

- 📄 [26-chat-video-notes.md](../docs/26-chat-video-notes.md)
- 📄 [27-playback-speed-voice-and-video-notes.md](../docs/27-playback-speed-voice-and-video-notes.md)
- 📄 [28-audio-waveform-visualization.md](../docs/28-audio-waveform-visualization.md)

---

## 13. Тестування та чекліст перевірки

| №   | Перевірка                      | Очікуваний результат                                                                                 |
| --- | ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| 1   | **Перемикання аудіо / відео**  | Тап або лонг-прес по іконці перемикає між мікрофоном 🎤 та камерою 📹 з тактильним відгуком.         |
| 2   | **Зйомка кружечка**            | Відкривається `VideoNoteRecorderModal` із круглою маскою камери та круговим відліком таймера.        |
| 3   | **Відображення кружечка**      | Відео публікується у формі ідеального кола (200x200), круговий прогрес показує хід перегляду.        |
| 4   | **Звук та пауза в кружечку**   | Тап по відео перемикає звук або паузу.                                                               |
| 5   | **Звукова хвиля у голосових**  | Замість повзунка відображаються стовпчики амплітуд, заповнення відповідає прогресу.                  |
| 6   | **Seek по хвилі**              | Дотик по будь-якому стовпчику хвилі миттєво переносить відтворення на цю секунду.                    |
| 7   | **Швидкість (1x / 1.5x / 2x)** | Кнопка швидкості циклічно прискорює аудіо та відео з чітким звучанням без спотворення висоти голосу. |
| 8   | **Живий візуалізатор запису**  | Під час запису голосового повідомлення в `ChatInput` стовпчики хвилі динамічно коливаються.          |
