export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

export type ThemeMode = "light" | "dark";

export interface ThemeColors {
  bg: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  success: string;
  danger: string;
  cardBg: string;
  statusBarStyle: "light" | "dark";
}
