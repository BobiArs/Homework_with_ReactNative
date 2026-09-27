import { ReplyPreviewBar } from "@/components/ReplyPreviewBar";
import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
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
  onSendAudio?: (audioUri: string, duration: number) => void;
  isSending?: boolean;
  replyingTo?: { messageId: string; senderName: string; text: string } | null;
  onCancelReply?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onSendAudio,
  isSending = false,
  replyingTo,
  onCancelReply,
}) => {
  const [text, setText] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handlePickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(
        "Дозвіл відхилено",
        "Потрібен дозвіл на доступ до галереї для вибору фотографій."
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

  return (
    <View className="bg-surface border-t border-surfaceLight">
      {replyingTo && onCancelReply && (
        <ReplyPreviewBar
          replyTarget={replyingTo}
          onCancel={onCancelReply}
        />
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

        <TouchableOpacity
          onPress={handleSend}
          disabled={isSending || (!text.trim() && !selectedImage)}
          className={`w-10 h-10 rounded-full items-center justify-center ${
            text.trim() || selectedImage
              ? "bg-primary"
              : "bg-surfaceLight/40 opacity-50"
          }`}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={18} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};
