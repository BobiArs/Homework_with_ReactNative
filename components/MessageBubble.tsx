import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { memo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { MessageReactions, ReactionItem } from "./MessageReactions";

interface MessageBubbleProps {
  content: string;
  imageUrl?: string;
  createdAt: number;
  isMine: boolean;
  senderName: string;
  isGroup: boolean;
  senderAvatar?: string;
  senderId: string;
  audioUrl?: string;
  audioDuration?: number;
  replyToSender?: string;
  replyToText?: string;
  reactions?: ReactionItem[];
  onToggleReaction: (emoji: string) => void;
  isSystem?: boolean;
}

const MessageBubbleComponent: React.FC<MessageBubbleProps> = ({
  content,
  imageUrl,
  createdAt,
  isMine,
  senderName,
  isGroup,
  senderAvatar,
  senderId,
  audioUrl,
  audioDuration,
  replyToSender,
  replyToText,
  reactions,
  onToggleReaction,
  isSystem = false,
}) => {
  const router = useRouter();

  if (isSystem) {
    return (
      <View className="my-2.5 items-center justify-center px-6">
        <View className="bg-surfaceLight/80 px-3.5 py-1.5 rounded-full border border-surface flex-row items-center gap-1.5">
          <Text className="text-grey text-[11px] font-medium text-center">
            {content}
          </Text>
        </View>
      </View>
    );
  }

  const timeString = new Date(createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View
      className={`my-1 max-w-[82%] ${
        isMine ? "self-end items-end" : "self-start items-start"
      }`}
    >
      <TouchableOpacity onPress={() => router.push(`/user/${senderId}`)}>
        <View className="flex-row items-center gap-1 mb-1">
          <Image
            source={{
              uri:
                senderAvatar ||
                "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
            }}
            style={{ width: 22, height: 22, borderRadius: 50 }}
            contentFit="cover"
          />
          {!isMine && isGroup && (
            <Text className="text-grey text-[11px] ml-1 font-medium">
              {senderName}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      <View
        className={`px-3 py-2 rounded-2xl ${
          isMine
            ? "bg-primary rounded-tr-xs"
            : "bg-surface border border-surfaceLight rounded-tl-xs"
        }`}
      >
        {replyToSender && (
          <View className="mb-2 p-2 rounded-lg bg-black/25 border-l-2 border-white/80">
            <Text className="text-white/90 font-bold text-[11px] mb-0.5">
              {replyToSender}
            </Text>
            <Text numberOfLines={2} className="text-white/70 text-[12px]">
              {replyToText || "Вкладення"}
            </Text>
          </View>
        )}

        {imageUrl && (
          <View className="mb-2 rounded-xl overflow-hidden">
            <Image
              source={{ uri: imageUrl }}
              style={{ width: 220, height: 220, borderRadius: 12 }}
              contentFit="cover"
              transition={200}
            />
          </View>
        )}

        {audioUrl && (
          <View className="flex-row items-center gap-2 py-1.5 px-1">
            <Ionicons name="play-circle" size={26} color="#FFFFFF" />
            <Text className="text-white text-xs font-medium">
              Голосове ({audioDuration ? `${audioDuration}с` : "0:05"})
            </Text>
          </View>
        )}

        {content ? (
          <Text className="text-white text-base leading-5">{content}</Text>
        ) : null}

        <Text
          className={`text-[10px] mt-1 self-end ${
            isMine ? "text-white/70" : "text-grey"
          }`}
        >
          {timeString}
        </Text>

        <MessageReactions
          reactions={reactions}
          onToggleReaction={onToggleReaction}
          isOwn={isMine}
        />
      </View>
    </View>
  );
};

export const MessageBubble = memo(MessageBubbleComponent);
