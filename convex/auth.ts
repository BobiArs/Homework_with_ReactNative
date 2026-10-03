import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    // 1. Стандартна авторизація через Email та Пароль
    Password,

    // 2. Авторизація через Google OAuth 2.0
    Google({
      profile(params) {
        return {
          id: params.sub,
          email: params.email,
          name: params.name,
          image: params.picture, // Google передає URL аватарки у полі picture
        };
      },
    }),
  ],
  callbacks: {
    async redirect({ redirectTo }) {
      // Дозволяємо повернення у мобільний застосунок через Deep Link (tictactoe-dev://, tictactoe://)
      return redirectTo;
    },
  },
});
