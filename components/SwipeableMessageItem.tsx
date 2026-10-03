import { COLORS } from "@/constants/theme";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import React, { memo, useRef } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  FadeInDown,
  FadeOutLeft,
  FadeOutRight,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { MessageReactions, ReactionItem } from "./MessageReactions";
import { ReactionPickerPosition } from "./ReactionPickerModal";

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
  children?: React.ReactNode;
  isMine?: boolean;
  item?: MessageItemData;
  isOwn?: boolean;
  currentUserId?: string;
  onLongPress?: (
    position: ReactionPickerPosition,
    item: MessageItemData
  ) => void;
  onDoubleTap?: (item: MessageItemData) => void;
  onToggleReaction?: (emoji: string) => void;
  onLongPressReaction?: (emoji: string, item: MessageItemData) => void;
  onReply?: (item: MessageItemData) => void;
  onImagePress?: (url: string) => void;
  onAuthorPress?: (authorId: string) => void;
}

const SWIPE_THRESHOLD = 50;

const SwipeableMessageItemComponent: React.FC<SwipeableMessageItemProps> = ({
  children,
  isMine,
  item,
  isOwn,
  onLongPress,
  onDoubleTap,
  onToggleReaction,
  onLongPressReaction,
  onReply,
  onImagePress,
  onAuthorPress,
}) => {
  const effectiveIsOwn = isMine ?? isOwn ?? false;
  const translateX = useSharedValue(0);
  const containerRef = useRef<View>(null);

  const heartScale = useSharedValue(0);
  const heartOffsetY = useSharedValue(0);
  const heartOpacity = useSharedValue(0);

  const triggerHeartBurst = () => {
    heartScale.value = 0.5;
    heartOffsetY.value = 0;
    heartOpacity.value = 1;

    heartScale.value = withSpring(1.4, { damping: 10, stiffness: 180 });
    heartOffsetY.value = withTiming(-40, { duration: 600 });
    heartOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(0, { duration: 400 })
    );
  };

  const handleDoubleTapAction = () => {
    triggerHeartBurst();
    if (item) onDoubleTap?.(item);
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .onUpdate((event) => {
      if (event.translationX > 0) {
        translateX.value = Math.min(event.translationX, 90);
      }
    })
    .onEnd(() => {
      if (translateX.value > SWIPE_THRESHOLD && onReply && item) {
        runOnJS(onReply)(item);
      }
      translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd(() => {
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      runOnJS(handleDoubleTapAction)();
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(350)
    .onEnd(() => {
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Heavy);
      runOnJS(() => {
        containerRef.current?.measureInWindow((x, y, width) => {
          if (item) {
            onLongPress?.(
              {
                x: effectiveIsOwn ? x + width : x,
                y,
                isOwn: effectiveIsOwn,
              },
              item
            );
          }
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

  const animatedHeartStyle = useAnimatedStyle(() => ({
    opacity: heartOpacity.value,
    transform: [
      { scale: heartScale.value },
      { translateY: heartOffsetY.value },
    ],
  }));

  const formatTime = (time: number) => {
    const d = new Date(time);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(15)}
      exiting={
        effectiveIsOwn ? FadeOutRight.duration(200) : FadeOutLeft.duration(200)
      }
      className="my-1.5 w-full relative justify-center"
    >
      <Animated.View
        style={[styles.replyIconContainer, animatedReplyIconStyle]}
      >
        <Ionicons name="arrow-undo-circle" size={32} color={COLORS.primary} />
      </Animated.View>

      <GestureDetector gesture={composedGesture}>
        <Animated.View
          style={[animatedBubbleStyle]}
          className={`flex-row ${effectiveIsOwn ? "justify-end" : "justify-start"}`}
        >
          {children ? (
            <View ref={containerRef} className="w-full">
              <Animated.View
                pointerEvents="none"
                style={[
                  {
                    position: "absolute",
                    alignSelf: "center",
                    top: "20%",
                    zIndex: 50,
                  },
                  animatedHeartStyle,
                ]}
              >
                <Text style={{ fontSize: 48 }}>❤️</Text>
              </Animated.View>
              {children}
            </View>
          ) : (
            <>
              {!effectiveIsOwn && item && (
                <TouchableOpacity
                  onPress={() => onAuthorPress?.(item.senderId)}
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

              {item && (
                <View
                  ref={containerRef}
                  className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl shadow-sm relative ${
                    effectiveIsOwn
                      ? "bg-primary rounded-br-xs"
                      : "bg-surface border border-surfaceLight rounded-bl-xs"
                  }`}
                >
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      {
                        position: "absolute",
                        alignSelf: "center",
                        top: "20%",
                        zIndex: 50,
                      },
                      animatedHeartStyle,
                    ]}
                  >
                    <Text style={{ fontSize: 48 }}>❤️</Text>
                  </Animated.View>

                  {!effectiveIsOwn && (
                    <TouchableOpacity onPress={() => onAuthorPress?.(item.senderId)}>
                      <Text className="text-primary font-bold text-xs mb-1">
                        {item.senderName}
                      </Text>
                    </TouchableOpacity>
                  )}

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

                  {item.imageUrl && (
                    <TouchableOpacity
                      onPress={() => onImagePress?.(item.imageUrl!)}
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

                  {item.content ? (
                    <Text className="text-white text-base leading-5">
                      {item.content}
                    </Text>
                  ) : null}

                  <View className="flex-row items-center justify-end mt-1 space-x-1">
                    {item.isEdited && (
                      <Text className="text-[10px] text-white/50 italic mr-1">
                        (ред.)
                      </Text>
                    )}
                    <Text
                      className={`text-[10px] ${
                        effectiveIsOwn ? "text-white/70" : "text-textMuted"
                      }`}
                    >
                      {formatTime(item._creationTime)}
                    </Text>
                  </View>

                  {onToggleReaction && (
                    <MessageReactions
                      reactions={item.reactions}
                      onToggleReaction={onToggleReaction}
                      onLongPressReaction={(emoji) =>
                        onLongPressReaction?.(emoji, item)
                      }
                      isOwn={effectiveIsOwn}
                    />
                  )}
                </View>
              )}
            </>
          )}
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

export const SwipeableMessageItem = memo(
  SwipeableMessageItemComponent
);
