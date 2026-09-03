import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../context/ThemeContext";

interface TodoFormProps {
  onAdd: (text: string) => Promise<void>;
  loading?: boolean;
}

export function TodoForm({ onAdd, loading = false }: TodoFormProps) {
  const { colors } = useTheme();
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || loading || isSubmitting) return;

    try {
      setIsSubmitting(true);
      Keyboard.dismiss();
      await onAdd(trimmed);
      setText("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = !text.trim() || loading || isSubmitting;

  return (
    <View style={styles.form}>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.cardBg,
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
        placeholder="Що потрібно зробити?"
        placeholderTextColor={colors.textMuted}
        value={text}
        onChangeText={setText}
        editable={!loading && !isSubmitting}
        maxLength={120}
      />
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: colors.primary },
          isDisabled && styles.buttonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={isDisabled}
      >
        <Ionicons name="add" size={20} color="#ffffff" style={styles.addIcon} />
        <Text style={styles.buttonText}>
          {isSubmitting ? "..." : "Додати"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
    width: "100%",
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1.5,
    borderRadius: 10,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  addIcon: {
    marginRight: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 15,
  },
});
