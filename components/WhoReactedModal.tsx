import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import React from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface WhoReactedModalProps {
  visible: boolean;
  messageId?: Id<"messages"> | null;
  emoji?: string | null;
  onClose: () => void;
}

export const WhoReactedModal: React.FC<WhoReactedModalProps> = ({
  visible,
  messageId,
  emoji,
  onClose,
}) => {
  const reactionUsers = useQuery(
    api.messages.getReactionUsers,
    visible && messageId && emoji ? { messageId, emoji } : "skip",
  );

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.6)" }}
        onPress={onClose}
      >
        <View className="flex-1 justify-end">
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="bg-surface rounded-t-3xl border-t border-surfaceLight p-5 max-h-[60%]"
          >
            <View className="flex-row items-center justify-between border-b border-surfaceLight pb-3 mb-4">
              <View className="flex-row items-center gap-2">
                <Text className="text-2xl">{emoji}</Text>
                <Text className="text-white font-bold text-lg">
                  Реакції ({reactionUsers?.length ?? 0})
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} className="p-1">
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {!reactionUsers ? (
              <View className="py-8 items-center">
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : reactionUsers.length === 0 ? (
              <Text className="text-textMuted text-center py-6">
                Немає реакцій
              </Text>
            ) : (
              <View className="gap-3">
                {reactionUsers.map((user: any) => (
                  <View
                    key={user._id}
                    className="flex-row items-center gap-3 p-2 rounded-xl bg-background/50 border border-surfaceLight/40"
                  >
                    <Image
                      source={{
                        uri:
                          user.image ||
                          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
                      }}
                      className="w-10 h-10 rounded-full border border-surfaceLight"
                    />
                    <Text className="text-white font-semibold text-base flex-1">
                      {user.name}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
};
