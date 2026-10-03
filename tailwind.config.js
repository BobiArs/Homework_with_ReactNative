/** @type {import('tailwindcss').Config} */
module.exports = {
  // Шляхи до всіх директорій з компонентами та екранами
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#FF6600", // Електричний помаранчевий акцент
        primaryDark: "#D95B00",
        secondary: "#18181B", // Глибока темна картка (Zinc-900)
        surface: "#09090B", // Насичений чорний фон
        surfaceLight: "#27272A", // Елегантні межі та розділювачі (Zinc-800)
        textMuted: "#A1A1AA", // Виразний приглушений текст
      },
    },
  },
  plugins: [],
};
