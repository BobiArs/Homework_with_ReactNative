import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AddMembersModal } from "./AddMembersModal";

interface ParticipantItem {
  _id: Id<"users">;
  username: string;
  fullname: string;
  image?: string;
  role: "creator" | "admin" | "member";
}

interface GroupInfoModalProps {
  visible: boolean;
  onClose: () => void;
  conversationId: Id<"conversations">;
  groupName: string;
  creatorId: Id<"users">;
  participants: ParticipantItem[];
  currentUserRole: "creator" | "admin" | "member";
  canManageMembers: boolean;
  canDeleteChat: boolean;
  onConversationDeleted: () => void;
}

export const GroupInfoModal: React.FC<GroupInfoModalProps> = ({
  visible,
  onClose,
  conversationId,
  groupName,
  creatorId,
  participants,
  currentUserRole,
  canManageMembers,
  canDeleteChat,
  onConversationDeleted,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const currentUser = useQuery(api.users.currentUser);

  const updateRoleMutation = useMutation(
    api.conversations.updateParticipantRole,
  );
  const removeParticipantMutation = useMutation(
    api.conversations.removeParticipant,
  );
  const deleteConversationMutation = useMutation(
    api.conversations.deleteConversation,
  );

  // Знаходимо творця чату
  const creator = participants.find((p) => p._id === creatorId);

  // Обробка зміни ролі учасника
  const handleToggleAdmin = (participant: ParticipantItem) => {
    const isCurrentlyAdmin = participant.role === "admin";
    const nextRole = isCurrentlyAdmin ? "member" : "admin";

    Alert.alert(
      isCurrentlyAdmin ? "Зняти адміністратора" : "Призначити адміністратором",
      `Ви впевнені, що хочете ${
        isCurrentlyAdmin ? "зняти права адміна у" : "зробити адміном"
      } ${participant.username}?`,
      [
        { text: "Скасувати", style: "cancel" },
        {
          text: "Підтвердити",
          onPress: async () => {
            try {
              setIsActionLoading(true);
              await updateRoleMutation({
                conversationId,
                targetUserId: participant._id,
                newRole: nextRole,
              });
            } catch (err: any) {
              Alert.alert("Помилка", err?.message || "Не вдалося змінити роль");
            } finally {
              setIsActionLoading(false);
            }
          },
        },
      ],
    );
  };

  // Обробка вилучення учасника
  const handleKickParticipant = (participant: ParticipantItem) => {
    Alert.alert(
      "Вилучити з групи",
      `Ви впевнені, що хочете вилучити ${participant.username} з групи?`,
      [
        { text: "Скасувати", style: "cancel" },
        {
          text: "Вилучити",
          style: "destructive",
          onPress: async () => {
            try {
              setIsActionLoading(true);
              await removeParticipantMutation({
                conversationId,
                targetUserId: participant._id,
              });
            } catch (err: any) {
              Alert.alert("Помилка", err?.message || "Не вдалося вилучити");
            } finally {
              setIsActionLoading(false);
            }
          },
        },
      ],
    );
  };

  // Вихід із групи
  const handleLeaveGroup = () => {
    Alert.alert(
      "Покинути групу",
      "Ви більше не отримуватимете повідомлення з цього чату.",
      [
        { text: "Скасувати", style: "cancel" },
        {
          text: "Покинути",
          style: "destructive",
          onPress: async () => {
            try {
              if (!currentUser?._id) return;
              setIsActionLoading(true);

              await removeParticipantMutation({
                conversationId,
                targetUserId: currentUser._id,
              });
              onClose();
              onConversationDeleted();
            } catch (err: any) {
              Alert.alert("Помилка", err?.message || "Не вдалося покинути чат");
            } finally {
              setIsActionLoading(false);
            }
          },
        },
      ],
    );
  };

  // Повне видалення чату
  const handleDeleteGroup = () => {
    Alert.alert(
      "Видалити групу назавжди?",
      "Усі повідомлення, файли та історію буде безповоротно видалено для всіх учасників.",
      [
        { text: "Скасувати", style: "cancel" },
        {
          text: "Видалити",
          style: "destructive",
          onPress: async () => {
            try {
              setIsActionLoading(true);
              await deleteConversationMutation({ conversationId });
              onClose();
              onConversationDeleted();
            } catch (err: any) {
              Alert.alert("Помилка", err?.message || "Не вдалося видалити чат");
            } finally {
              setIsActionLoading(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/70 justify-end">
        <View className="bg-surface rounded-t-3xl h-[85%] border-t border-surfaceLight p-4">
          {/* Хедер модалки */}
          <View className="flex-row items-center justify-between pb-3 border-b border-surfaceLight">
            <TouchableOpacity onPress={onClose} className="p-1">
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text className="text-white font-bold text-lg">Деталі групи</Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Інформація про групу */}
          <View className="items-center py-4 border-b border-surfaceLight">
            <View className="w-16 h-16 rounded-full bg-surfaceLight border border-surface items-center justify-center mb-2">
              <Ionicons name="people" size={32} color={COLORS.primary} />
            </View>
            <Text className="text-white font-bold text-lg">{groupName}</Text>
            <Text className="text-grey text-xs mt-0.5">
              {participants.length} учасників • Творець: @
              {creator?.username ?? "user"}
            </Text>
          </View>

          {/* Кнопка додавання нових людей */}
          {canManageMembers && (
            <TouchableOpacity
              onPress={() => setIsAddModalOpen(true)}
              className="flex-row items-center bg-surfaceLight/80 p-3 rounded-xl my-3 border border-surfaceLight"
            >
              <View className="w-8 h-8 rounded-full bg-primary/20 items-center justify-center mr-3">
                <Ionicons name="person-add" size={18} color={COLORS.primary} />
              </View>
              <Text className="text-white font-semibold text-sm flex-1">
                Додати нових учасників
              </Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.grey} />
            </TouchableOpacity>
          )}

          {/* Список учасників */}
          <Text className="text-grey font-semibold text-xs uppercase tracking-wider mb-2 px-1">
            Учасники ({participants.length})
          </Text>

          <FlatList
            data={participants}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isItemCreator = item.role === "creator";
              const isItemAdmin = item.role === "admin";

              return (
                <View className="flex-row items-center justify-between py-2.5 px-2 border-b border-surfaceLight/40">
                  <View className="flex-row items-center flex-1 mr-2">
                    <Image
                      source={{
                        uri:
                          item.image ||
                          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
                      }}
                      style={{ width: 40, height: 40, borderRadius: 20 }}
                      contentFit="cover"
                    />
                    <View className="ml-3 flex-1">
                      <View className="flex-row items-center gap-1.5">
                        <Text
                          numberOfLines={1}
                          className="text-white font-semibold text-sm"
                        >
                          {item.fullname || item.username}
                        </Text>
                        {isItemCreator && (
                          <View className="bg-yellow-500/20 px-1.5 py-0.5 rounded">
                            <Text className="text-yellow-400 text-[10px] font-bold">
                              👑 Власник
                            </Text>
                          </View>
                        )}
                        {!isItemCreator && isItemAdmin && (
                          <View className="bg-primary/20 px-1.5 py-0.5 rounded">
                            <Text className="text-primary text-[10px] font-bold">
                              🛡️ Адмін
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-grey text-xs">
                        @{item.username}
                      </Text>
                    </View>
                  </View>

                  {/* Меню дій над учасником */}
                  {currentUserRole === "creator" && !isItemCreator && (
                    <View className="flex-row items-center gap-2">
                      <TouchableOpacity
                        onPress={() => handleToggleAdmin(item)}
                        className="p-1.5 bg-surfaceLight rounded-lg"
                      >
                        <Ionicons
                          name={isItemAdmin ? "shield" : "shield-outline"}
                          size={18}
                          color={isItemAdmin ? COLORS.primary : COLORS.grey}
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleKickParticipant(item)}
                        className="p-1.5 bg-red-500/10 rounded-lg"
                      >
                        <Ionicons
                          name="person-remove-outline"
                          size={18}
                          color="#EF4444"
                        />
                      </TouchableOpacity>
                    </View>
                  )}

                  {currentUserRole === "admin" &&
                    !isItemCreator &&
                    !isItemAdmin && (
                      <TouchableOpacity
                        onPress={() => handleKickParticipant(item)}
                        className="p-1.5 bg-red-500/10 rounded-lg"
                      >
                        <Ionicons
                          name="person-remove-outline"
                          size={18}
                          color="#EF4444"
                        />
                      </TouchableOpacity>
                    )}
                </View>
              );
            }}
          />

          {/* Нижні кнопки дій */}
          <View className="pt-3 border-t border-surfaceLight gap-2">
            {canDeleteChat ? (
              <TouchableOpacity
                onPress={handleDeleteGroup}
                disabled={isActionLoading}
                className="flex-row items-center justify-center bg-red-500/15 py-3 rounded-xl border border-red-500/30 active:opacity-70"
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color="#EF4444"
                  style={{ marginRight: 6 }}
                />
                <Text className="text-red-500 font-semibold text-sm">
                  Видалити групу для всіх
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleLeaveGroup}
                disabled={isActionLoading}
                className="flex-row items-center justify-center bg-red-500/15 py-3 rounded-xl border border-red-500/30 active:opacity-70"
              >
                <Ionicons
                  name="log-out-outline"
                  size={18}
                  color="#EF4444"
                  style={{ marginRight: 6 }}
                />
                <Text className="text-red-500 font-semibold text-sm">
                  Покинути групу
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Модальне вікно вибору нових людей */}
      <AddMembersModal
        visible={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        conversationId={conversationId}
        currentParticipantIds={participants.map((p) => p._id)}
      />
    </Modal>
  );
};
