import { COLORS } from "@/constants/theme";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { memo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

export interface ReactionItem {
  emoji: string;
  userId: Id<"users">;
}

export interface MessageItemData {
  _id: Id<"messages">;
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
  currentUserId?: string;
  onLongPress: (item: MessageItemData) => void;
  onReply: (item: MessageItemData) => void;
  onToggleReaction?: (messageId: Id<"messages">, emoji: string) => void;
  onImagePress: (url: string) => void;
  onAuthorPress: (authorId: string) => void;
}

const SWIPE_THRESHOLD = 50;
const QUICK_EMOJIS = [
  "😂",
  "❤️",
  "😍",
  "👍",
  "✨",
  "😢",
  "🙏",
  "🔥",
  "🤔",
  "😎",
  "👏",
  "🎉",
  "🚀",
  "⚠️",
  "💡",
];

const SwipeableMessageItemComponent: React.FC<SwipeableMessageItemProps> = ({
  item,
  isOwn,
  currentUserId,
  onLongPress,
  onReply,
  onToggleReaction,
  onImagePress,
  onAuthorPress,
}) => {
  const translateX = useSharedValue(0);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };

  const triggerReply = () => {
    triggerHaptic();
    onReply(item);
  };

  const handleDoubleTap = () => {
    triggerHaptic();
    if (onToggleReaction) {
      onToggleReaction(item._id, "❤️");
    }
  };

  // Сполучення жестів: свайп (Pan) та подвійний тап (Tap)
  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      if (event.translationX > 0) {
        translateX.value = Math.min(event.translationX, 80);
      }
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        runOnJS(triggerReply)();
      }
      translateX.value = withSpring(0, { damping: 16, stiffness: 200 });
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      runOnJS(handleDoubleTap)();
    });

  const composedGesture = Gesture.Exclusive(panGesture, doubleTapGesture);

  const animatedBubbleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const animatedIconStyle = useAnimatedStyle(() => {
    const progress = Math.min(translateX.value / SWIPE_THRESHOLD, 1);
    return {
      opacity: progress,
      transform: [{ scale: 0.5 + progress * 0.5 }],
    };
  });

  // Групування реакцій за емодзі
  const reactionCounts: {
    [emoji: string]: { count: number; hasUser: boolean };
  } = {};
  if (item.reactions) {
    for (const r of item.reactions) {
      if (!reactionCounts[r.emoji]) {
        reactionCounts[r.emoji] = { count: 0, hasUser: false };
      }
      reactionCounts[r.emoji].count += 1;
      if (r.userId === currentUserId) {
        reactionCounts[r.emoji].hasUser = true;
      }
    }
  }

  return (
    <View className="relative justify-center my-1">
      {/* Прихована іконка відповіді зліва */}
      <Animated.View
        style={animatedIconStyle}
        className="absolute left-2 z-0 items-center justify-center w-8 h-8 rounded-full bg-primary/30"
      >
        <Ionicons name="arrow-undo" size={18} color={COLORS.primary} />
      </Animated.View>

      {/* Панель вибору швидких реакцій (якщо активована) */}
      {showReactionPicker && (
        <View
          className={`flex-row bg-secondary/95 border border-surfaceLight rounded-full px-3 py-1.5 mb-1.5 shadow-lg gap-2 z-20 ${
            isOwn ? "self-end" : "self-start"
          }`}
        >
          {QUICK_EMOJIS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              onPress={() => {
                triggerHaptic();
                onToggleReaction?.(item._id, emoji);
                setShowReactionPicker(false);
              }}
              className="p-1 active:scale-125"
            >
              <Text className="text-xl">{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Бульбашка повідомлення із підтримкою жестів */}
      <GestureDetector gesture={composedGesture}>
        <Animated.View
          style={animatedBubbleStyle}
          className={`flex-row ${isOwn ? "justify-end" : "justify-start"}`}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onLongPress={() => {
              triggerHaptic();
              setShowReactionPicker(!showReactionPicker);
              onLongPress(item);
            }}
            className={`max-w-[82%] rounded-2xl p-3 ${
              isOwn ? "bg-primary rounded-br-xs" : "bg-secondary rounded-bl-xs"
            }`}
          >
            {/* Автор повідомлення (клікабельний для переходу в профіль) */}
            {!isOwn && (
              <TouchableOpacity
                onPress={() => onAuthorPress?.(item.senderId)}
                activeOpacity={0.7}
                className="mb-1"
              >
                <Text className="text-primary font-bold text-xs">
                  {item.senderName}
                </Text>
              </TouchableOpacity>
            )}

            {/* Блок цитованого повідомлення (Reply Box) */}
            {item.replyToSender && (
              <View className="mb-2 p-2 rounded-lg bg-surface/50 border-l-2 border-primary">
                <Text className="text-primary font-semibold text-[11px]">
                  {item.replyToSender}
                </Text>
                <Text
                  className="text-white/70 text-xs mt-0.5"
                  numberOfLines={2}
                >
                  {item.replyToText || "📷 Фотографія"}
                </Text>
              </View>
            )}

            {/* Фотографія (якщо прикріплена) */}
            {item.imageUrl && (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => onImagePress?.(item.imageUrl!)}
              >
                <Image
                  source={{ uri: item.imageUrl }}
                  className="w-56 h-56 rounded-xl mb-1.5 bg-surface"
                  contentFit="cover"
                  cachePolicy="disk"
                  transition={200}
                />
              </TouchableOpacity>
            )}

            {/* Текст повідомлення */}
            {item.content ? (
              <Text className="text-white text-base leading-5">
                {item.content}
              </Text>
            ) : null}

            {/* Блок реакцій на повідомленні */}
            {Object.keys(reactionCounts).length > 0 && (
              <View className="flex-row flex-wrap gap-1 mt-2">
                {Object.entries(reactionCounts).map(([emoji, data]) => (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => {
                      triggerHaptic();
                      onToggleReaction?.(item._id, emoji);
                    }}
                    className={`flex-row items-center px-2 py-0.5 rounded-full border ${
                      data.hasUser
                        ? "bg-primary/30 border-primary"
                        : "bg-surface/60 border-surfaceLight"
                    }`}
                  >
                    <Text className="text-xs mr-1">{emoji}</Text>
                    <Text className="text-white text-[11px] font-bold">
                      {data.count}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Час та статус редагування */}
            <View className="flex-row items-center justify-end mt-1 gap-1">
              {item.isEdited && (
                <Text className="text-white/60 text-[10px] italic">(ред.)</Text>
              )}
              <Text className="text-white/60 text-[10px]">
                {new Date(item._creationTime).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </View>
  );
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
      prevProps.isOwn === nextProps.isOwn &&
      prevProps.currentUserId === nextProps.currentUserId &&
      JSON.stringify(prevProps.item.reactions) ===
        JSON.stringify(nextProps.item.reactions)
    );
  },
);
