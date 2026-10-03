import { COLORS } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
} from "react-native";

const POPULAR_EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "🔥", "🎉", "👏", "😍", "✨", "🙏", "🚀"];
const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const PICKER_WIDTH = Math.min(SCREEN_WIDTH - 24, POPULAR_EMOJIS.length * 44 + 16);

export interface ReactionPickerPosition {
  x: number; // координата по X (край повідомлення)
  y: number; // верхній край повідомлення по Y
  isOwn: boolean; // чи власне повідомлення (впливає на сторону розкриття)
}

interface ReactionPickerModalProps {
  visible: boolean;
  position?: ReactionPickerPosition | null;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
}

export const ReactionPickerModal: React.FC<ReactionPickerModalProps> = ({
  visible,
  position,
  onClose,
  onSelectEmoji,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 14,
          stiffness: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleSelect = (emoji: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectEmoji(emoji);
    onClose();
  };

  // Обчислюємо позицію бабла відносно повідомлення
  const getPickerStyle = () => {
    if (!position) return { top: SCREEN_HEIGHT / 2, left: 12 };

    const PICKER_HEIGHT = 58;
    const MARGIN = 8;

    // Показуємо пікер ВИЩЕ повідомлення
    let top = position.y - PICKER_HEIGHT - MARGIN;
    if (top < 60) top = position.y + MARGIN + 48; // якщо мало місця зверху — показуємо знизу

    // Горизонтальна позиція: прив'язуємо до сторони повідомлення
    let left = position.isOwn
      ? position.x - PICKER_WIDTH + 16 // моє — правий край
      : position.x - 16; // чуже — лівий край

    // Не виходимо за межі екрану
    left = Math.max(12, Math.min(left, SCREEN_WIDTH - PICKER_WIDTH - 12));

    return { top, left };
  };

  const pickerStyle = getPickerStyle();

  // Точка "хвостика" бабла (трикутник), звідки пружинно росте меню
  const transformOriginX = position?.isOwn ? "100%" : "0%";

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Напівпрозора підкладка — тап закриває пікер */}
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.35)" }}
        onPress={onClose}
      />

      {/* Picker бабл — абсолютно позиціонований */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: pickerStyle.top,
            left: pickerStyle.left,
            maxWidth: PICKER_WIDTH,
            backgroundColor: COLORS.secondary,
            borderRadius: 32,
            paddingHorizontal: 8,
            paddingVertical: 6,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.5,
            shadowRadius: 16,
            elevation: 24,
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.08)",
            transformOrigin: `${transformOriginX} 100%`,
          },
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexDirection: "row", alignItems: "center", gap: 2 }}
        >
          {POPULAR_EMOJIS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              activeOpacity={0.65}
              onPress={() => handleSelect(emoji)}
              style={{
                width: 40,
                height: 40,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 20,
              }}
            >
              <Text style={{ fontSize: 24 }}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
};
