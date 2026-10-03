import { useAuthActions } from "@convex-dev/auth/react";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../../constants/theme";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { signIn } = useAuthActions();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);

      const redirectTo = Linking.createURL("");
      const { redirect } = await signIn("google", { redirectTo });
      if (!redirect) return;

      const result = await WebBrowser.openAuthSessionAsync(
        redirect.toString(),
        redirectTo,
      );

      if (result.type === "success" && result.url) {
        const code = new URL(result.url).searchParams.get("code");
        if (code) {
          await signIn("google", { code });
        }
      }
    } catch (error) {
      console.error("Google Auth Error:", error);
      Alert.alert(
        "Помилка входу",
        "Не вдалося виконати авторизацію через Google. Спробуйте ще раз.",
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Помилка", "Будь ласка, заповніть усі поля.");
      return;
    }

    if (isSignUp && !name.trim()) {
      Alert.alert("Помилка", "Будь ласка, вкажіть ваше ім'я.");
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        await signIn("password", {
          email: email.trim(),
          password: password.trim(),
          name: name.trim(),
          flow: "signUp",
        });
        Alert.alert("Успіх", "Акаунт створено!");
      } else {
        await signIn("password", {
          email: email.trim(),
          password: password.trim(),
          flow: "signIn",
        });
      }
    } catch (err) {
      console.error("Auth Error", err);
      Alert.alert(
        "Помилка",
        isSignUp
          ? "Не вдалося зареєструватися. Можливо, пошта вже зайнята."
          : "Неправильний email або пароль.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-surface"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Логотип додатку */}
        <View className="items-center mt-20">
          <View className="w-20 h-20 rounded-3xl bg-primary/20 items-center justify-center border border-primary/30">
            <Ionicons name="chatbubbles" size={38} color={COLORS.primary} />
          </View>
          <Text className="text-3xl font-bold text-white mt-5 tracking-tight">
            Modern Chat
          </Text>
          <Text className="text-sm text-textMuted mt-2 text-center px-6">
            {isSignUp
              ? "Створіть акаунт для спілкування в кімнатах"
              : "Увійдіть, щоб продовжити спілкування"}
          </Text>
        </View>

        {/* Форма введення */}
        <View className="px-6 mt-12 w-full items-center gap-4">
          {isSignUp && (
            <View className="flex-row items-center bg-secondary border border-surfaceLight rounded-2xl px-4 w-full max-w-sm">
              <Ionicons
                name="person-outline"
                size={20}
                color={COLORS.textMuted}
                style={{ marginRight: 12 }}
              />
              <TextInput
                className="flex-1 py-3.5 text-base text-white"
                placeholder="Ваше ім'я"
                placeholderTextColor={COLORS.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          )}

          <View className="flex-row items-center bg-secondary border border-surfaceLight rounded-2xl px-4 w-full max-w-sm">
            <Ionicons
              name="mail-outline"
              size={20}
              color={COLORS.textMuted}
              style={{ marginRight: 12 }}
            />
            <TextInput
              className="flex-1 py-3.5 text-base text-white"
              placeholder="Email"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View className="flex-row items-center bg-secondary border border-surfaceLight rounded-2xl px-4 w-full max-w-sm">
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={COLORS.textMuted}
              style={{ marginRight: 12 }}
            />
            <TextInput
              className="flex-1 py-3.5 text-base text-white"
              placeholder="Пароль"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          {/* Кнопка входу/реєстрації */}
          <TouchableOpacity
            className={`flex-row items-center justify-center bg-primary rounded-2xl py-4 w-full max-w-sm mt-3 active:bg-primaryDark ${
              isLoading || isGoogleLoading ? "opacity-60" : ""
            }`}
            activeOpacity={0.85}
            onPress={handleAuth}
            disabled={isLoading || isGoogleLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text className="text-white text-base font-bold">
                {isSignUp ? "Зареєструватися" : "Увійти"}
              </Text>
            )}
          </TouchableOpacity>

          {/* Візуальний розділювач "АБО" */}
          <View className="flex-row items-center my-2 w-full max-w-sm">
            <View className="flex-1 h-[1px] bg-surfaceLight" />
            <Text className="text-xs font-bold text-textMuted px-3 uppercase tracking-wider">
              АБО
            </Text>
            <View className="flex-1 h-[1px] bg-surfaceLight" />
          </View>

          {/* Кнопка входу через Google */}
          <TouchableOpacity
            className={`flex-row items-center justify-center bg-secondary border border-surfaceLight rounded-2xl py-3.5 w-full max-w-sm active:opacity-80 ${
              isLoading || isGoogleLoading ? "opacity-60" : ""
            }`}
            activeOpacity={0.85}
            onPress={handleGoogleSignIn}
            disabled={isLoading || isGoogleLoading}
          >
            {isGoogleLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons
                  name="logo-google"
                  size={20}
                  color="#EA4335"
                  style={{ marginRight: 10 }}
                />
                <Text className="text-white text-base font-bold">
                  Продовжити з Google
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Перемикач */}
          <TouchableOpacity
            onPress={() => setIsSignUp(!isSignUp)}
            className="mt-3 py-2"
          >
            <Text className="text-primary text-sm font-medium">
              {isSignUp
                ? "Вже є акаунт? Увійти"
                : "Немає акаунту? Створити новий"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

