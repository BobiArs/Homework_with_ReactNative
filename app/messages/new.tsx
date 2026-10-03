import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function NewConversationScreen() {
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<Id<"users">[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const users = useQuery(api.users.searchUsers, { queryText: searchQuery });
  const getOrCreateConversation = useMutation(
    api.conversations.getOrCreateConversation
  );
  const createGroupConversation = useMutation(
    api.conversations.createGroupConversation
  );

  const handleStartDirectChat = async (userId: Id<"users">) => {
    try {
      setIsSubmitting(true);
      const conversationId = await getOrCreateConversation({
        participantId: userId,
      });
      router.replace(`/messages/${conversationId}` as any);
    } catch (error: any) {
      Alert.alert(
        "Помилка",
        error?.message || "Не вдалося розпочати діалог"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateGroup = async () => {
    const name = groupName.trim();
    if (!name) {
      Alert.alert("Вкажіть назву", "Будь ласка, введіть назву групи.");
      return;
    }
    if (selectedUserIds.length === 0) {
      Alert.alert("Оберіть учасників", "Оберіть щонайменше 1 учасника.");
      return;
    }

    try {
      setIsSubmitting(true);
      const conversationId = await createGroupConversation({
        name,
        participantIds: selectedUserIds,
      });
      router.replace(`/messages/${conversationId}` as any);
    } catch (error: any) {
      Alert.alert(
        "Помилка",
        error?.message || "Не вдалося створити груповий чат"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSelectUser = (userId: Id<"users">) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter((id) => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  return (
    <View className="flex-1 bg-black">
      {/* Верхня панель */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-surface">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-white">
            {isGroupMode ? "Новий груповий чат" : "Нова бесіда"}
          </Text>
        </View>

        {isGroupMode && (
          <TouchableOpacity
            onPress={handleCreateGroup}
            disabled={isSubmitting || !groupName.trim() || selectedUserIds.length === 0}
            className={`px-3 py-1.5 rounded-full ${
              groupName.trim() && selectedUserIds.length > 0 && !isSubmitting
                ? "bg-primary"
                : "opacity-40 bg-surfaceLight"
            }`}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-white font-bold text-sm">Створити</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Перемикач типу чату */}
      <View className="flex-row p-2 mx-4 my-3 bg-surface rounded-2xl border border-surfaceLight">
        <TouchableOpacity
          onPress={() => setIsGroupMode(false)}
          className={`flex-1 py-2 rounded-xl items-center ${
            !isGroupMode ? "bg-primary" : ""
          }`}
        >
          <Text className="text-white font-semibold text-xs">
            👤 Особистий діалог
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setIsGroupMode(true)}
          className={`flex-1 py-2 rounded-xl items-center ${
            isGroupMode ? "bg-primary" : ""
          }`}
        >
          <Text className="text-white font-semibold text-xs">
            👥 Груповий чат
          </Text>
        </TouchableOpacity>
      </View>

      {/* Форма назви групи у режимі групи */}
      {isGroupMode && (
        <View className="px-4 mb-3">
          <TextInput
            value={groupName}
            onChangeText={setGroupName}
            placeholder="Назва групи (наприклад: Розробники React Native)"
            placeholderTextColor={COLORS.grey}
            className="bg-secondary text-white px-4 py-3 rounded-2xl border border-surfaceLight text-sm"
          />
        </View>
      )}

      {/* Поле пошуку користувачів */}
      <View className="px-4 mb-3">
        <View className="flex-row items-center bg-surface px-3 py-2.5 rounded-2xl border border-surfaceLight">
          <Ionicons name="search" size={18} color={COLORS.grey} style={{ marginRight: 8 }} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Пошук за ім'ям або @username..."
            placeholderTextColor={COLORS.grey}
            className="flex-1 text-white text-sm"
          />
        </View>
      </View>

      {/* Список користувачів */}
      {users === undefined ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : users.length === 0 ? (
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="people-outline" size={48} color={COLORS.grey} style={{ marginBottom: 12 }} />
          <Text className="text-white font-semibold text-base text-center">
            Користувачів не знайдено
          </Text>
          <Text className="text-grey text-xs text-center mt-1">
            Спробуйте змінити пошуковий запит
          </Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => {
            const isSelected = selectedUserIds.includes(item._id);

            return (
              <TouchableOpacity
                onPress={() =>
                  isGroupMode
                    ? toggleSelectUser(item._id)
                    : handleStartDirectChat(item._id)
                }
                className="flex-row items-center px-4 py-3 border-b border-surface/40 active:bg-surface"
              >
                <Image
                  source={{
                    uri:
                      item.image ||
                      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
                  }}
                  style={{ width: 44, height: 44, borderRadius: 22, marginRight: 12 }}
                  contentFit="cover"
                />

                <View className="flex-1">
                  <Text className="text-white font-semibold text-base">
                    {item.name || item.username || "Користувач"}
                  </Text>
                  {item.username && (
                    <Text className="text-grey text-xs">@{item.username}</Text>
                  )}
                </View>

                {isGroupMode && (
                  <View
                    className={`w-6 h-6 rounded-full border items-center justify-center ${
                      isSelected
                        ? "bg-primary border-primary"
                        : "border-grey/50"
                    }`}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}
