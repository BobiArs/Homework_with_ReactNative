import { ChatInput } from "@/components/ChatInput";
import { GroupInfoModal } from "@/components/GroupInfoModal";
import { MessageBubble } from "@/components/MessageBubble";
import {
  ReactionPickerModal,
  ReactionPickerPosition,
} from "@/components/ReactionPickerModal";
import { SwipeableMessageItem } from "@/components/SwipeableMessageItem";
import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = id as Id<"conversations">;

  const [isSending, setIsSending] = useState(false);
  const [isGroupInfoVisible, setIsGroupInfoVisible] = useState(false);

  const conversation = useQuery(api.conversations.getConversation, {
    conversationId,
  });

  const {
    results: messages,
    status,
    loadMore,
    isLoading,
  } = usePaginatedQuery(
    api.messages.getPaginatedMessages,
    { conversationId },
    { initialNumItems: 25 }
  );

  const sendMessageMutation = useMutation(api.messages.sendMessage);
  const generateUploadUrlMutation = useMutation(api.messages.generateUploadUrl);
  const toggleReactionMutation = useMutation(api.messages.toggleReaction);

  const [replyingTo, setReplyingTo] = useState<{
    messageId: string;
    senderName: string;
    text: string;
  } | null>(null);

  const [pickerState, setPickerState] = useState<{
    messageId: Id<"messages">;
    position: ReactionPickerPosition;
  } | null>(null);

  const handleToggleReaction = async (
    messageId: Id<"messages">,
    emoji: string
  ) => {
    try {
      await toggleReactionMutation({ messageId, emoji });
    } catch (error) {
      console.error("Помилка зміни реакції:", error);
    }
  };

  const handleSendMessage = async (text: string, selectedImageUri?: string) => {
    try {
      setIsSending(true);
      let storageId: Id<"_storage"> | undefined;

      if (selectedImageUri) {
        const uploadUrl = await generateUploadUrlMutation();
        const response = await fetch(selectedImageUri);
        const blob = await response.blob();
        const uploadResult = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "image/jpeg" },
          body: blob,
        });
        const { storageId: uploadedId } = await uploadResult.json();
        storageId = uploadedId;
      }

      await sendMessageMutation({
        conversationId,
        content: text,
        storageId,
        replyToId: replyingTo?.messageId as Id<"messages"> | undefined,
        replyToSender: replyingTo?.senderName,
        replyToText: replyingTo?.text,
      });

      setReplyingTo(null);
    } catch (error: any) {
      Alert.alert(
        "Помилка",
        error?.message || "Не вдалося надіслати повідомлення"
      );
    } finally {
      setIsSending(false);
    }
  };

  if (conversation === undefined || (isLoading && messages.length === 0)) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!conversation) {
    return (
      <View className="flex-1 bg-black justify-center items-center px-4">
        <Text className="text-white text-base mb-4">Бесіду не знайдено</Text>
        <TouchableOpacity
          onPress={() => router.replace("/messages" as any)}
          className="bg-primary px-4 py-2 rounded-xl"
        >
          <Text className="text-white font-semibold">Повернутися</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const headerTitle = conversation.isGroup
    ? (conversation.name ?? "Груповий чат")
    : conversation.otherUser?.fullname ||
      conversation.otherUser?.username ||
      "Користувач";

  const headerAvatar = conversation.isGroup
    ? null
    : conversation.otherUser?.image;

  return (
    <View className="flex-1 bg-black">
      {/* Хедер чату */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-surface">
        <View className="flex-row items-center flex-1 mr-2">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => conversation.isGroup && setIsGroupInfoVisible(true)}
            disabled={!conversation.isGroup}
            className="flex-row items-center flex-1"
          >
            {conversation.isGroup ? (
              <View className="w-10 h-10 rounded-full bg-surfaceLight border border-surface items-center justify-center mr-3">
                <Ionicons name="people" size={20} color={COLORS.primary} />
              </View>
            ) : (
              <Image
                source={{
                  uri:
                    headerAvatar ??
                    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
                }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  marginRight: 12,
                }}
                contentFit="cover"
              />
            )}

            <View className="flex-1 justify-center">
              <Text
                numberOfLines={1}
                className="text-white font-bold text-base"
              >
                {headerTitle}
              </Text>

              <Text className="text-grey text-xs">
                {conversation.isGroup
                  ? `${conversation.participants.length} учасників • Деталі ℹ️`
                  : `@${conversation.otherUser?.username ?? "user"}`}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {conversation.isGroup && (
          <TouchableOpacity
            onPress={() => setIsGroupInfoVisible(true)}
            className="p-1 active:opacity-70"
          >
            <Ionicons
              name="information-circle-outline"
              size={24}
              color={COLORS.primary}
            />
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 50}
      >
        <FlatList
          data={messages}
          inverted
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
          onEndReached={() => {
            if (status === "CanLoadMore") {
              loadMore(20);
            }
          }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            status === "LoadingMore" ? (
              <View className="py-4 items-center justify-center">
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <SwipeableMessageItem
              isMine={item.isMine}
              onReply={() => {
                if (item.isSystem) return;
                setReplyingTo({
                  messageId: item._id,
                  senderName: item.senderName,
                  text:
                    item.content ||
                    (item.imageUrl ? "📷 Фотографія" : "🎤 Голосове"),
                });
              }}
              onDoubleTap={() => {
                if (!item.isSystem) {
                  handleToggleReaction(item._id, "❤️");
                }
              }}
              onLongPress={(position) => {
                if (!item.isSystem) {
                  setPickerState({ messageId: item._id, position });
                }
              }}
            >
              <MessageBubble
                content={item.content}
                imageUrl={item.imageUrl}
                createdAt={item.createdAt}
                isMine={item.isMine}
                senderName={item.senderName}
                isGroup={conversation.isGroup}
                senderAvatar={item.senderAvatar}
                senderId={item.senderId}
                audioUrl={item.audioUrl}
                audioDuration={item.audioDuration}
                replyToSender={item.replyToSender}
                replyToText={item.replyToText}
                reactions={item.reactions}
                onToggleReaction={(emoji) =>
                  handleToggleReaction(item._id, emoji)
                }
                isSystem={item.isSystem}
              />
            </SwipeableMessageItem>
          )}
          ListEmptyComponent={
            isLoading ? null : (
              <View className="items-center justify-center py-16 scale-y-[-1]">
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={44}
                  color={COLORS.grey}
                  style={{ marginBottom: 8 }}
                />
                <Text className="text-grey text-sm text-center">
                  Повідомлень ще немає. Напишіть першим!
                </Text>
              </View>
            )
          }
        />

        <ChatInput
          onSendMessage={handleSendMessage}
          isSending={isSending}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
        />
      </KeyboardAvoidingView>

      <ReactionPickerModal
        visible={!!pickerState}
        position={pickerState?.position}
        onClose={() => setPickerState(null)}
        onSelectEmoji={(emoji) => {
          if (pickerState) {
            handleToggleReaction(pickerState.messageId, emoji);
          }
        }}
      />

      {conversation.isGroup && (
        <GroupInfoModal
          visible={isGroupInfoVisible}
          onClose={() => setIsGroupInfoVisible(false)}
          conversationId={conversationId}
          groupName={conversation.name ?? "Груповий чат"}
          creatorId={conversation.creatorId}
          participants={conversation.participants}
          currentUserRole={conversation.currentUserRole}
          canManageMembers={conversation.canManageMembers}
          canDeleteChat={conversation.canDeleteChat}
          onConversationDeleted={() => router.replace("/messages" as any)}
        />
      )}
    </View>
  );
}
