import { AudioWaveform } from "@/components/AudioWaveform";
import { ReplyPreviewBar } from "@/components/ReplyPreviewBar";
import { VideoNoteRecorderModal } from "@/components/VideoNoteRecorderModal";
import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  useAudioRecorder,
} from "expo-audio";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface ChatInputProps {
  onSendMessage: (text: string, imageUri?: string) => void;
  onSendAudio?: (
    audioUri: string,
    duration: number,
    waveform?: number[],
  ) => void;
  onSendVideo?: (videoUri: string, duration: number) => Promise<void>;
  isSending?: boolean;
  replyingTo?: { messageId: string; senderName: string; text: string } | null;
  onCancelReply?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onSendAudio,
  onSendVideo,
  isSending = false,
  replyingTo,
  onCancelReply,
}) => {
  const [text, setText] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<"audio" | "video">("audio");
  const [isVideoModalVisible, setIsVideoModalVisible] = useState(false);

  // Audio recording states
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [liveWaveform, setLiveWaveform] = useState<number[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  const handlePickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(
        "Дозвіл відхилено",
        "Потрібен дозвіл на доступ до галереї для вибору фотографій.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleSend = () => {
    if (!text.trim() && !selectedImage) return;
    onSendMessage(text, selectedImage || undefined);
    setText("");
    setSelectedImage(null);
  };

  const startAudioRecording = async () => {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert(
          "Дозвіл відхилено",
          "Потрібен дозвіл на доступ до мікрофона для запису аудіо.",
        );
        return;
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecordingAudio(true);
      setRecordingDuration(0);

      const generatedWaveform: number[] = [];
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          const nextTime = prev + 1;
          const amp = Number(
            (0.2 + 0.35 * Math.sin(nextTime) + 0.35 * Math.random()).toFixed(2),
          );
          if (generatedWaveform.length < 32) {
            generatedWaveform.push(Math.max(0.12, Math.min(1.0, amp)));
          }
          setLiveWaveform([...generatedWaveform]);
          return nextTime;
        });
      }, 1000);
    } catch (error) {
      console.error("Помилка початку запису аудіо:", error);
      Alert.alert("Помилка", "Не вдалося розпочати запис аудіо.");
    }
  };

  const stopAudioRecording = async () => {
    if (!isRecordingAudio) return;
    try {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await audioRecorder.stop();
      setIsRecordingAudio(false);

      const uri = audioRecorder.uri;
      const finalDuration = recordingDuration || 1;

      // Забезпечує наявність 32 тактів хвильових форм
      let finalWaveform = liveWaveform;
      if (finalWaveform.length < 32) {
        const padding = Array.from(
          { length: 32 - finalWaveform.length },
          (_, i) =>
            Number(
              (0.2 + 0.3 * Math.sin(i * 0.5) + 0.2 * Math.random()).toFixed(2),
            ),
        );
        finalWaveform = [...finalWaveform, ...padding];
      }

      if (uri && onSendAudio) {
        onSendAudio(uri, finalDuration, finalWaveform);
      }
    } catch (error) {
      console.error("Помилка зупинки запису аудіо:", error);
    } finally {
      setRecordingDuration(0);
      setLiveWaveform([]);
    }
  };

  const cancelAudioRecording = async () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    try {
      await audioRecorder.stop();
    } catch (e) {}
    setIsRecordingAudio(false);
    setRecordingDuration(0);
    setLiveWaveform([]);
  };

  const toggleInputMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputMode((prev) => (prev === "audio" ? "video" : "audio"));
  };

  const handleMediaIconPress = () => {
    if (inputMode === "audio") {
      startAudioRecording();
    } else {
      setIsVideoModalVisible(true);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <View className="bg-surface border-t border-surfaceLight">
      {replyingTo && onCancelReply && (
        <ReplyPreviewBar replyTarget={replyingTo} onCancel={onCancelReply} />
      )}

      {selectedImage && (
        <View className="p-3 flex-row items-center border-b border-surfaceLight">
          <View className="relative">
            <Image
              source={{ uri: selectedImage }}
              style={{ width: 60, height: 60, borderRadius: 10 }}
            />
            <TouchableOpacity
              onPress={() => setSelectedImage(null)}
              className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
            >
              <Ionicons name="close" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text className="text-grey text-xs ml-3 flex-1">
            Зображення підготовлено до відправки
          </Text>
        </View>
      )}

      {isRecordingAudio ? (
        /* Режим запису аудіо з хвилею та таймером */
        <View className="flex-row items-center px-3 py-2.5 gap-2">
          <TouchableOpacity
            onPress={cancelAudioRecording}
            className="p-2 rounded-full bg-red-500/20 active:opacity-70"
          >
            <Ionicons name="trash-outline" size={22} color="#EF4444" />
          </TouchableOpacity>

          <View className="flex-1 flex-row items-center bg-secondary px-3 py-1.5 rounded-2xl border border-surfaceLight/60">
            <Text className="text-red-500 font-bold text-xs mr-2">
              {formatTimer(recordingDuration)}
            </Text>
            <AudioWaveform
              waveform={liveWaveform}
              progress={1}
              duration={recordingDuration}
              isMine={true}
              height={24}
            />
          </View>

          <TouchableOpacity
            onPress={stopAudioRecording}
            className="w-10 h-10 rounded-full bg-primary items-center justify-center"
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      ) : (
        /* Звичайний режим вводу */
        <View className="flex-row items-center px-3 py-2.5 gap-2">
          <TouchableOpacity
            onPress={handlePickImage}
            className="p-2 rounded-full bg-surfaceLight/60 active:opacity-70"
          >
            <Ionicons name="image-outline" size={22} color={COLORS.primary} />
          </TouchableOpacity>

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Написати повідомлення..."
            placeholderTextColor={COLORS.grey}
            multiline
            className="flex-1 bg-secondary text-white px-4 py-2.5 rounded-2xl max-h-24 text-base border border-surfaceLight/60"
          />

          {text.trim() || selectedImage ? (
            <TouchableOpacity
              onPress={handleSend}
              disabled={isSending}
              className="w-10 h-10 rounded-full items-center justify-center bg-primary"
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleMediaIconPress}
              onLongPress={toggleInputMode}
              activeOpacity={0.7}
              className="w-10 h-10 rounded-full items-center justify-center bg-primary"
            >
              <Ionicons
                name={inputMode === "audio" ? "mic" : "videocam"}
                size={20}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          )}
        </View>
      )}

      {onSendVideo && (
        <VideoNoteRecorderModal
          visible={isVideoModalVisible}
          onClose={() => setIsVideoModalVisible(false)}
          onSendVideo={onSendVideo}
        />
      )}
    </View>
  );
};
