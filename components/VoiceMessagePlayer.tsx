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
  const progress =
    totalDuration > 0 ? Math.min(1, currentPosition / totalDuration) : 0;

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
          <ActivityIndicator
            size="small"
            color={isMine ? "#FFFFFF" : COLORS.primary}
          />
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
          <Text
            className={`text-[10px] ${isMine ? "text-white/70" : "text-grey"}`}
          >
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
