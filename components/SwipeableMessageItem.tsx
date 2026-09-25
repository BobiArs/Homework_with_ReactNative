import { COLORS } from "@/constants/theme";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import React, { memo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
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

  // Жест свайпу (Pan) та подвійний тап (Tap)
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

  const animatedReplyIconStyle = useAnimatedStyle(() => {
    const opacity = Math.min(translateX.value / SWIPE_THRESHOLD, 1);
    const scale = Math.min(translateX.value / SWIPE_THRESHOLD, 1.15);
    return {
      opacity,
      transform: [{ scale }],
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
      {/* Анімована іконка відповіді зліва */}
      <Animated.View
        style={[styles.replyIconContainer, animatedReplyIconStyle]}
      >
        <Ionicons name="arrow-undo-circle" size={32} color={COLORS.primary} />
      </Animated.View>

      {/* Панель вибору швидких реакцій */}
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
            activeOpacity={0.9}
            onLongPress={() => {
              triggerHaptic();
              setShowReactionPicker(!showReactionPicker);
              onLongPress(item);
            }}
            delayLongPress={280}
            className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl shadow-sm ${
              isOwn
                ? "bg-primary rounded-br-xs"
                : "bg-surface border border-surfaceLight rounded-bl-xs"
            }`}
          >
            {/* Автор повідомлення */}
            {!isOwn && (
              <TouchableOpacity
                onPress={() => onAuthorPress(item.senderId)}
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
                  contentFit="cover"
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
      prevProps.isOwn === nextProps.isOwn &&
      prevProps.currentUserId === nextProps.currentUserId &&
      JSON.stringify(prevProps.item.reactions) ===
        JSON.stringify(nextProps.item.reactions)
    );
  },
);
