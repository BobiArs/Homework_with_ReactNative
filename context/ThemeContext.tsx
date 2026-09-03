import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import type { ThemeColors, ThemeMode } from "../types";

export const lightColors: ThemeColors = {
  bg: "#f5f7fb",
  surface: "#ffffff",
  text: "#1e293b",
  textMuted: "#64748b",
  border: "#e2e8f0",
  primary: "#6366f1",
  success: "#10b981",
  danger: "#ef4444",
  cardBg: "#f8fafc",
  statusBarStyle: "dark",
};

export const darkColors: ThemeColors = {
  bg: "#0f172a",
  surface: "#1e293b",
  text: "#f8fafc",
  textMuted: "#94a3b8",
  border: "#334155",
  primary: "#818cf8",
  success: "#34d399",
  danger: "#f87171",
  cardBg: "#334155",
  statusBarStyle: "light",
};

interface ThemeContextType {
  theme: ThemeMode;
  isDarkMode: boolean;
  colors: ThemeColors;
  toggleTheme: () => Promise<void>;
}

const STORAGE_KEY = "@todo_theme_mode";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val === "dark" || val === "light") setTheme(val);
    });
  }, []);

  const toggleTheme = async () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    await AsyncStorage.setItem(STORAGE_KEY, next);
  };

  const isDarkMode = theme === "dark";
  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
