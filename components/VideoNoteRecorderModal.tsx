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

  const strokeDashoffset =
    CIRCUMFERENCE - (duration / MAX_DURATION) * CIRCUMFERENCE;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={cancelRecording}
    >
      <View className="flex-1 bg-black/90 items-center justify-center px-4">
        {/* Круглий видошукач камери */}
        <View
          className="relative items-center justify-center"
          style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE }}
        >
          <Svg
            width={CIRCLE_SIZE}
            height={CIRCLE_SIZE}
            className="absolute z-10 -rotate-90"
          >
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
          {Math.floor(duration / 60)}:{duration % 60 < 10 ? "0" : ""}
          {duration % 60} / 1:00
        </Text>

        {/* Кнопки керування */}
        <View className="flex-row items-center justify-around w-full mt-10">
          <TouchableOpacity
            onPress={cancelRecording}
            className="p-3 bg-surfaceLight rounded-full"
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={isRecording ? stopRecording : startRecording}
            className={`w-20 h-20 rounded-full items-center justify-center border-4 border-white ${
              isRecording ? "bg-red-500" : "bg-primary"
            }`}
          >
            <Ionicons
              name={isRecording ? "stop" : "radio-button-on"}
              size={36}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <View style={{ width: 52 }} />
        </View>
      </View>
    </Modal>
  );
};
