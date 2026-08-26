import type { Todo } from "@/types";
import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string, completed: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEdit: (id: string, text: string) => Promise<void>;
}

export function TodoItem({ todo, onToggle, onDelete, onEdit }: TodoItemProps) {
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
        todo.completed && styles.todoItemCompleted,
        isUpdating && styles.updating,
      ]}
    >
      <TouchableOpacity
        style={[styles.checkbox, todo.completed && styles.checkboxChecked]}
        onPress={() => onToggle(todo.id, !todo.completed)}
        disabled={isUpdating}
        activeOpacity={0.7}
      >
        {todo.completed && <Text style={styles.checkmarkIcon}>✓</Text>}
      </TouchableOpacity>

      {isEditing ? (
        <TextInput
          style={styles.todoEditInput}
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
          style={[styles.todoText, todo.completed && styles.todoTextCompleted]}
          numberOfLines={3}
        >
          {todo.text}
        </Text>
      )}

      <View style={styles.todoActions}>
        {!isEditing && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.editBtn]}
            onPress={() => setIsEditing(true)}
            disabled={isUpdating}
            activeOpacity={0.7}
          >
            <Text style={styles.actionBtnText}>✏️</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={() => onDelete(todo.id)}
          disabled={isUpdating}
          activeOpacity={0.7}
        >
          <Text style={styles.actionBtnText}>🗑️</Text>
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
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 8,
    gap: 12,
  },
  todoItemCompleted: {
    backgroundColor: "#f1f5f9",
    borderColor: "#cbd5e1",
  },
  updating: {
    opacity: 0.6,
  },
  checkbox: {
    height: 20,
    width: 20,
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#10b981",
    borderColor: "#10b981",
  },
  checkmarkIcon: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
    lineHeight: 14,
  },
  todoText: {
    flex: 1,
    fontSize: 15,
    color: "#1e293b",
    fontWeight: "500",
  },
  todoTextCompleted: {
    color: "#94a3b8",
    textDecorationLine: "line-through",
  },
  todoEditInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderColor: "#6366f1",
    borderRadius: 6,
    backgroundColor: "#ffffff",
    color: "#1e293b",
  },
  todoActions: {
    flexDirection: "row",
    gap: 6,
  },
  actionBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  editBtn: {
    backgroundColor: "#f1f5f9",
  },
  deleteBtn: {
    backgroundColor: "#fee2e2",
  },
  actionBtnText: {
    fontSize: 14,
  },
});
