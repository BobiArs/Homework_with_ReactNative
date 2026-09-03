import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import type { Todo } from "../types";

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEdit: (id: string, text: string) => Promise<void>;
}

export function TodoItem({ todo, onToggle, onDelete, onEdit }: TodoItemProps) {
  const { colors } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSave = async () => {
    const trimmed = editText.trim();
    if (!trimmed) {
      setEditText(todo.text);
      setIsEditing(false);
      return;
    }
    if (trimmed !== todo.text) {
      try {
        setIsUpdating(true);
        await onEdit(todo.id, trimmed);
      } finally {
        setIsUpdating(false);
        setIsEditing(false);
      }
    } else {
      setIsEditing(false);
    }
  };

  return (
    <View
      style={[
        styles.todoItem,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        todo.completed && {
          backgroundColor: colors.cardBg,
        },
        isUpdating && styles.updating,
      ]}
    >
      <TouchableOpacity
        style={styles.checkboxTouch}
        onPress={() => onToggle(todo.id)}
        disabled={isUpdating}
        activeOpacity={0.7}
      >
        <Ionicons
          name={todo.completed ? "checkmark-circle" : "ellipse-outline"}
          size={24}
          color={todo.completed ? colors.success : colors.textMuted}
        />
      </TouchableOpacity>

      {isEditing ? (
        <TextInput
          style={[
            styles.todoEditInput,
            {
              backgroundColor: colors.bg,
              borderColor: colors.primary,
              color: colors.text,
            },
          ]}
          value={editText}
          onChangeText={setEditText}
          onBlur={handleSave}
          onSubmitEditing={handleSave}
          autoFocus
          maxLength={120}
          returnKeyType="done"
        />
      ) : (
        <Text
          style={[
            styles.todoText,
            { color: colors.text },
            todo.completed && [
              styles.todoTextCompleted,
              { color: colors.textMuted },
            ],
          ]}
          numberOfLines={3}
        >
          {todo.text}
        </Text>
      )}

      <View style={styles.todoActions}>
        {!isEditing && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.cardBg }]}
            onPress={() => setIsEditing(true)}
            disabled={isUpdating}
            activeOpacity={0.7}
          >
            <Ionicons name="pencil-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.cardBg }]}
          onPress={() => onDelete(todo.id)}
          disabled={isUpdating}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  todoItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  updating: {
    opacity: 0.6,
  },
  checkboxTouch: {
    padding: 2,
  },
  todoText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  todoTextCompleted: {
    textDecorationLine: "line-through",
  },
  todoEditInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1.5,
    borderRadius: 8,
  },
  todoActions: {
    flexDirection: "row",
    gap: 6,
  },
  actionBtn: {
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
