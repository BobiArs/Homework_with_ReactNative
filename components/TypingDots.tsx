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
  }, [delay, translateY]);

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

interface TypingDotsProps {
  typingUsers: any[];
}

export function TypingDots({ typingUsers }: TypingDotsProps) {
  if (!typingUsers || typingUsers.length === 0) return null;

  const names = typingUsers
    .map((u) => (typeof u === "string" ? u : u.userName || "Користувач"))
    .join(", ");

  const textLabel =
    typingUsers.length === 1 ? `${names} друкує...` : `${names} друкують...`;

  return (
    <View className="flex-row items-center px-4 py-1.5 bg-surface/90 border-t border-surfaceLight/50">
      <View className="flex-row items-center mr-2">
        <PulsingDot delay={0} />
        <PulsingDot delay={150} />
        <PulsingDot delay={300} />
      </View>
      <Text className="text-textMuted text-xs" numberOfLines={1}>
        {textLabel}
      </Text>
    </View>
  );
}
