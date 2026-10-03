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
  onLongPressReaction?: (emoji: string) => void;
  isOwn: boolean;
}

const ReactionPill: React.FC<{
  item: ReactionItem;
  onToggle: () => void;
  onLongPress?: () => void;
}> = ({ item, onToggle, onLongPress }) => {
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
        onLongPress={onLongPress}
        delayLongPress={300}
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
  onLongPressReaction,
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
          onLongPress={() => onLongPressReaction?.(item.emoji)}
        />
      ))}
    </View>
  );
};
