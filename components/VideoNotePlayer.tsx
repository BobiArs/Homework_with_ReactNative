import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
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
    <View
      className="relative items-center justify-center my-1"
      style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE }}
    >
      {/* SVG Круговий прогрес */}
      <Svg
        width={CIRCLE_SIZE}
        height={CIRCLE_SIZE}
        className="absolute z-10 -rotate-90"
      >
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
