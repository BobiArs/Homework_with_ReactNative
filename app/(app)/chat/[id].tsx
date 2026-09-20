import { ImageViewerModal } from "@/components/ImageViewerModal";
import { ReplyPreviewBar, ReplyTarget } from "@/components/ReplyPreviewBar";
import {
  MessageItemData,
  SwipeableMessageItem,
} from "@/components/SwipeableMessageItem";
import { TypingDots } from "@/components/TypingDots";
import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // Дані з Convex
  const chatRoomId = id as Id<"chatRooms">;
  const room = useQuery(api.rooms.getRoom, { roomId: chatRoomId });
  const {
    results: messages,
    status,
    loadMore,
    isLoading,
  } = usePaginatedQuery(
    api.messages.getPaginatedMessages,
    { chatRoomId },
    { initialNumItems: 25 },
  );
  const currentUser = useQuery(api.users.currentUser);
  const typingUsers = useQuery(api.typing.getTypingUsers, { chatRoomId });

  // Мутації
  const sendMessage = useMutation(api.messages.sendMessage);
  const sendMediaMessage = useMutation(api.messages.sendMediaMessage);
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl);
  const editMessage = useMutation(api.messages.editMessage);
  const deleteMessage = useMutation(api.messages.deleteMessage);
  const toggleReaction = useMutation(api.messages.toggleReaction);
  const setTyping = useMutation(api.typing.setTyping);

  // Локальний стан
  const [inputText, setInputText] = useState("");
  const [editingMessageId, setEditingMessageId] =
    useState<Id<"messages"> | null>(null);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const lastTypingSentRef = useRef<number>(0);
  const prevLatestMsgIdRef = useRef<string | null>(null);

  // Відстежуємо появу нових повідомлень, коли користувач проскролив список вгору
  useEffect(() => {
    if (!messages || messages.length === 0) return;
    const latestId = messages[0]._id;
    if (prevLatestMsgIdRef.current && prevLatestMsgIdRef.current !== latestId) {
      if (showScrollBottom) {
        setHasNewMessages(true);
      }
    }
    prevLatestMsgIdRef.current = latestId;
  }, [messages, showScrollBottom]);

  // Обробка набору тексту з тротлінгом (1.5 с)
  const handleTextChange = (text: string) => {
    setInputText(text);

    const now = Date.now();
    if (now - lastTypingSentRef.current > 1500) {
      lastTypingSentRef.current = now;
      setTyping({ chatRoomId }).catch(console.error);
    }
  };

  // Вибір фото з медіатеки
  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Дозвіл потрібен",
          "Надайте доступ до медіатеки для надсилання фотографій.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setSelectedImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Помилка", "Не вдалося вибрати зображення");
    }
  };

  // Початок відповіді на повідомлення
  const handleStartReply = useCallback((msg: MessageItemData) => {
    setReplyTarget({
      messageId: msg._id,
      senderName: msg.senderName,
      text: msg.content || (msg.imageUrl ? "📷 Фотографія" : ""),
    });
    // Скасовуємо режим редагування, якщо він був відкритий
    setEditingMessageId(null);
  }, []);

  // Меню дій над повідомленням (тільки для власних)
  const handleMessageLongPress = useCallback(
    (item: MessageItemData) => {
      const isOwn = item.senderId === currentUser?._id;

      const options: any[] = [
        {
          text: "Відповісти",
          onPress: () => handleStartReply(item),
        },
      ];

      if (isOwn) {
        if (item.content) {
          options.push({
            text: "Редагувати",
            onPress: () => {
              setEditingMessageId(item._id);
              setInputText(item.content || "");
              setReplyTarget(null);
            },
          });
        }

        options.push({
          text: "Видалити",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Видалити повідомлення?",
              "Ви впевнені, що хочете видалити повідомлення?",
              [
                { text: "Скасувати", style: "cancel" },
                {
                  text: "Так, видалити",
                  style: "destructive",
                  onPress: () => deleteMessage({ messageId: item._id }),
                },
              ],
            );
          },
        });
      }

      options.push({ text: "Скасувати", style: "cancel" });

      Alert.alert("Дії з повідомленням", undefined, options);
    },
    [currentUser?._id, deleteMessage, handleStartReply],
  );

  const handleToggleReaction = useCallback(
    (messageId: Id<"messages">, emoji: string) => {
      toggleReaction({ messageId, emoji }).catch(console.error);
    },
    [toggleReaction],
  );

  const handleImagePress = useCallback((url: string) => {
    setFullscreenImage(url);
  }, []);

  const handleAuthorPress = useCallback(
    (authorId: string) => {
      router.push(`/user/${authorId}` as any);
    },
    [router],
  );

  const renderMessageItem = useCallback(
    ({ item }: { item: any }) => (
      <SwipeableMessageItem
        item={item as MessageItemData}
        isOwn={item.senderId === currentUser?._id}
        currentUserId={currentUser?._id}
        onLongPress={handleMessageLongPress}
        onReply={handleStartReply}
        onToggleReaction={handleToggleReaction}
        onImagePress={handleImagePress}
        onAuthorPress={handleAuthorPress}
      />
    ),
    [
      currentUser?._id,
      handleMessageLongPress,
      handleStartReply,
      handleToggleReaction,
      handleImagePress,
      handleAuthorPress,
    ],
  );

  // Відправка повідомлення або збереження редагування
  const handleSend = async () => {
    const text = inputText.trim();
    if ((!text && !selectedImageUri) || isSubmitting) return;

    try {
      setIsSubmitting(true);

      if (editingMessageId) {
        // Режим збереження редагування
        await editMessage({
          messageId: editingMessageId,
          content: text,
        });
        setEditingMessageId(null);
      } else if (selectedImageUri) {
        // Відправка фотографії у Convex Storage
        const uploadUrl = await generateUploadUrl();
        const response = await fetch(selectedImageUri);
        const blob = await response.blob();

        const uploadResult = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": blob.type || "image/jpeg" },
          body: blob,
        });

        const { storageId } = await uploadResult.json();

        await sendMediaMessage({
          chatRoomId,
          storageId,
          caption: text || undefined,
          replyToId: replyTarget
            ? (replyTarget.messageId as Id<"messages">)
            : undefined,
          replyToSender: replyTarget?.senderName,
          replyToText: replyTarget?.text,
        });

        setSelectedImageUri(null);
        setReplyTarget(null);
      } else {
        // Відправка звичайного тексту з відповіддю (якщо задано)
        await sendMessage({
          chatRoomId,
          content: text,
          replyToId: replyTarget
            ? (replyTarget.messageId as Id<"messages">)
            : undefined,
          replyToSender: replyTarget?.senderName,
          replyToText: replyTarget?.text,
        });

        setReplyTarget(null);
      }

      setInputText("");
    } catch (error) {
      console.error(error);
      Alert.alert("Помилка", "Не вдалося надіслати повідомлення");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-surface"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <Stack.Screen
        options={{
          title: room?.title ?? "Чат",
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push(`/settings/${chatRoomId}` as any)}
              className="p-1"
            >
              <Ionicons
                name="information-circle-outline"
                size={24}
                color={COLORS.primary}
              />
            </TouchableOpacity>
          ),
        }}
      />

      {/* ⚡ Інвертований список повідомлень із курсорною пагінацією */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._id}
        inverted={true}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
        renderItem={renderMessageItem}

        // Довантаження старіших повідомлень при скролі вгору:
        onEndReached={() => {
          if (status === "CanLoadMore") {
            loadMore(20);
          }
        }}
        onEndReachedThreshold={0.2}

        // Індикатор завантаження історії (в інвертованому списку рендериться вгорі!):
        ListFooterComponent={
          status === "LoadingMore" ? (
            <View className="py-4 items-center justify-center">
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text className="text-textMuted text-xs mt-1">
                Завантаження старіших повідомлень...
              </Text>
            </View>
          ) : null
        }

        // Стан порожнього чату або завантаження першої сторінки
        ListEmptyComponent={
          status === "LoadingFirstPage" ? (
            <View className="py-20 items-center justify-center scale-y-[-1]">
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text className="text-textMuted text-sm mt-3">
                Завантаження бесіди...
              </Text>
            </View>
          ) : (
            <View className="py-20 items-center justify-center scale-y-[-1]">
              <Ionicons
                name="chatbubbles-outline"
                size={48}
                color={COLORS.surfaceLight}
              />
              <Text className="text-textMuted text-sm mt-3 text-center">
                Повідомлень ще немає.{"\n"}Будьте першим, хто напише в цій
                кімнаті!
              </Text>
            </View>
          )
        }

        // Оптимізація віртуалізації списку:
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={Platform.OS === "android"}

        onScroll={(event) => {
          const offsetY = event.nativeEvent.contentOffset.y;
          const isFar = offsetY > 350;
          setShowScrollBottom(isFar);
          if (!isFar) {
            setHasNewMessages(false);
          }
        }}
        scrollEventThrottle={100}
      />

      {/* Кнопка швидкого повернення до найновіших повідомлень (FAB) */}
      {showScrollBottom && (
        <TouchableOpacity
          onPress={() => {
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
            setHasNewMessages(false);
          }}
          activeOpacity={0.85}
          className="absolute right-5 bottom-24 w-11 h-11 rounded-full bg-surface border border-surfaceLight shadow-lg items-center justify-center z-30"
        >
          <Ionicons name="chevron-down" size={24} color={COLORS.primary} />
          {hasNewMessages && (
            <View className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-danger border-2 border-surface" />
          )}
        </TouchableOpacity>
      )}

      {/* Індикатор набору тексту іншими учасниками */}
      {typingUsers && typingUsers.length > 0 && (
        <TypingDots typingUsers={typingUsers} />
      )}

      {/* Панель активного цитування (Reply Bar) */}
      {replyTarget && (
        <ReplyPreviewBar
          replyTarget={replyTarget}
          onCancel={() => setReplyTarget(null)}
        />
      )}

      {/* Панель активного редагування власного повідомлення */}
      {editingMessageId && (
        <View className="flex-row items-center justify-between px-4 py-2 bg-surfaceLight border-t border-surface">
          <View className="flex-row items-center flex-1 mr-2">
            <Ionicons
              name="pencil"
              size={16}
              color={COLORS.primary}
              style={{ marginRight: 6 }}
            />
            <Text className="text-white text-xs font-semibold">
              Редагування повідомлення
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setEditingMessageId(null);
              setInputText("");
            }}
          >
            <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Прев'ю обраної картинки перед відправкою */}
      {selectedImageUri && (
        <View className="flex-row items-center px-4 py-2 bg-surfaceLight border-t border-surface">
          <Image
            source={{ uri: selectedImageUri }}
            className="w-12 h-12 rounded-lg mr-3"
          />
          <Text className="text-white text-xs flex-1">Фото прикріплено</Text>
          <TouchableOpacity onPress={() => setSelectedImageUri(null)}>
            <Ionicons name="close-circle" size={22} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      )}

      {/* Панель введення тексту */}
      <View className="flex-row items-center p-3 bg-surface border-t border-surfaceLight">
        <TouchableOpacity
          onPress={pickImage}
          disabled={isSubmitting}
          className="mr-2 p-2 rounded-full bg-surfaceLight"
        >
          <Ionicons name="image-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>

        <TextInput
          className="flex-1 bg-background text-white px-4 py-2.5 rounded-full text-base border border-surfaceLight mr-2"
          placeholder={
            editingMessageId
              ? "Змініть текст..."
              : replyTarget
                ? `Відповідь для ${replyTarget.senderName}...`
                : selectedImageUri
                  ? "Додайте підпис до фото..."
                  : "Напишіть повідомлення..."
          }
          placeholderTextColor={COLORS.textMuted}
          value={inputText}
          onChangeText={handleTextChange}
          multiline
        />

        <TouchableOpacity
          onPress={handleSend}
          disabled={(!inputText.trim() && !selectedImageUri) || isSubmitting}
          className={`w-11 h-11 rounded-full items-center justify-center bg-primary ${
            (!inputText.trim() && !selectedImageUri) || isSubmitting
              ? "opacity-50"
              : "active:opacity-80"
          }`}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons
              name={editingMessageId ? "checkmark" : "send"}
              size={20}
              color="#FFFFFF"
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Модальне вікно перегляду зображення */}
      <ImageViewerModal
        visible={!!fullscreenImage}
        imageUrl={fullscreenImage}
        onClose={() => setFullscreenImage(null)}
      />
    </KeyboardAvoidingView>
  );
}
