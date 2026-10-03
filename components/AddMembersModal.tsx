import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface AddMembersModalProps {
  visible: boolean;
  onClose: () => void;
  conversationId: Id<"conversations">;
  currentParticipantIds: Id<"users">[];
}

export const AddMembersModal: React.FC<AddMembersModalProps> = ({
  visible,
  onClose,
  conversationId,
  currentParticipantIds,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<Id<"users">[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const users = useQuery(api.users.searchUsers, { queryText: searchQuery });
  const addParticipantsMutation = useMutation(
    api.conversations.addParticipantsToConversation,
  );

  // Фільтруємо користувачів, які вже є в чаті
  const availableUsers = (users ?? []).filter(
    (u) => !currentParticipantIds.includes(u._id),
  );

  const toggleSelect = (userId: Id<"users">) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter((id) => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  const handleAdd = async () => {
    if (selectedUserIds.length === 0) return;

    try {
      setIsSubmitting(true);
      await addParticipantsMutation({
        conversationId,
        newParticipantIds: selectedUserIds,
      });
      setSelectedUserIds([]);
      setSearchQuery("");
      onClose();
    } catch (error: any) {
      Alert.alert(
        "Помилка",
        error?.message || "Не вдалося додати нових учасників",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/70 justify-end">
        <View className="bg-surface rounded-t-3xl h-[80%] border-t border-surfaceLight p-4">
          {/* Верхня панель */}
          <View className="flex-row items-center justify-between pb-3 border-b border-surfaceLight">
            <TouchableOpacity onPress={onClose} className="p-1">
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <Text className="text-white font-bold text-lg">
              Додати учасників
            </Text>

            <TouchableOpacity
              onPress={handleAdd}
              disabled={selectedUserIds.length === 0 || isSubmitting}
              className={`px-3 py-1.5 rounded-full ${
                selectedUserIds.length > 0 && !isSubmitting
                  ? "bg-primary"
                  : "opacity-40"
              }`}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-white font-semibold text-xs">
                  Додати ({selectedUserIds.length})
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Пошук */}
          <View className="flex-row items-center bg-surfaceLight rounded-xl px-3 py-2 my-3">
            <Ionicons name="search" size={18} color={COLORS.grey} />
            <TextInput
              placeholder="Пошук за іменем або нікнеймом..."
              placeholderTextColor={COLORS.grey}
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 text-white ml-2 text-sm"
              autoCapitalize="none"
            />
          </View>

          {/* Список користувачів */}
          {users === undefined ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : availableUsers.length === 0 ? (
            <View className="flex-1 justify-center items-center px-4">
              <Ionicons
                name="people-outline"
                size={44}
                color={COLORS.grey}
                style={{ marginBottom: 8 }}
              />
              <Text className="text-grey text-sm text-center">
                {searchQuery
                  ? "Користувачів не знайдено"
                  : "Усі доступні користувачі вже є в цьому чаті"}
              </Text>
            </View>
          ) : (
            <FlatList
              data={availableUsers}
              keyExtractor={(item) => item._id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = selectedUserIds.includes(item._id);

                return (
                  <TouchableOpacity
                    onPress={() => toggleSelect(item._id)}
                    className="flex-row items-center justify-between py-2.5 px-2 border-b border-surfaceLight/50"
                  >
                    <View className="flex-row items-center flex-1 mr-2">
                      <Image
                        source={{
                          uri:
                            item.image ||
                            "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
                        }}
                        style={{ width: 44, height: 44, borderRadius: 22 }}
                        contentFit="cover"
                      />
                      <View className="ml-3 flex-1">
                        <Text
                          numberOfLines={1}
                          className="text-white font-semibold text-sm"
                        >
                          {item.name || item.username || "Користувач"}
                        </Text>
                        <Text className="text-grey text-xs">
                          @{item.username}
                        </Text>
                      </View>
                    </View>

                    <View
                      className={`w-6 h-6 rounded-full border items-center justify-center ${
                        isSelected
                          ? "bg-primary border-primary"
                          : "border-grey/50"
                      }`}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};
