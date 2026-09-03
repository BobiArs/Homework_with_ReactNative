import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "../context/ThemeContext";
import { TodoProvider } from "../context/TodoContext";

// Втносимо StatusBar та Stack в окрему функцію щоб React Native не видавав помилку контексту
function MainLayout() {
  const { isDarkMode, colors } = useTheme();

  return (
    <>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <TodoProvider>
          <MainLayout />
        </TodoProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
