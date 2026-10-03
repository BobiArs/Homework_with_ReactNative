# Домашнє Завдання 18: Авторизація через Google (Google OAuth 2.0), Convex Auth, expo-web-browser та Deep Linking 🔐🌐

Це домашнє завдання є важливим етапом практичного треку з розробки мобільних застосунків на React Native та Expo:

- **ДЗ 7** ([`lesson-07-module-05/docs-home-work-modern-chat`](../../lesson-07-module-05/docs-home-work-modern-chat)) — базовий чат, кімнати листування та авторизація Convex Auth.
- **ДЗ 8** ([`lesson-08-module-05/home-work-08`](../../lesson-08-module-05/home-work-08)) — редагування/видалення повідомлень, медіафайли у Convex Storage та індикатор набору тексту.
- **ДЗ 9** ([`lesson-09-module-06/home-work-09`](../../lesson-09-module-06/home-work-09)) — свайп-жести Reanimated, швидкі відповіді із цитуванням та екосистема профілів користувачів.
- **ДЗ 10** ([`lesson-10-module-06/home-work-10`](../../lesson-10-module-06/home-work-10)) — конфігурація середовищ, EAS Build (APK), OTA оновлення та Production деплой.
- **ДЗ 11** ([`lesson-11-module-06/home-work-11`](../../lesson-11-module-06/home-work-11)) — оптимізація продуктивності, Inverted FlatList та курсорна пагінація Convex.
- **ДЗ 12** ([`lesson-12-module-07/home-work-12`](../../lesson-12-module-07/home-work-12)) — повноекранний Pinch-to-Zoom переглядач зображень, Layout Animations та пружні мікроінтеракції.
- **ДЗ 13** ([`lesson-13-module-07/home-work-13`](../../lesson-13-module-07/home-work-13)) — реакції на повідомлення у стилі Telegram, плаваючий пікер емодзі та тактильний відгук Haptics.
- **ДЗ 14** ([`lesson-14-module-07/home-work-14`](../../lesson-14-module-07/home-work-14)) — керування груповим чатом: ролі (👑 Creator, 🛡️ Admin, 👤 Member), додавання учасників та каскадне видалення чату.
- **ДЗ 15** ([`lesson-15-module-07/home-work-15`](../../lesson-15-module-07/home-work-15)) — мультимедійний чат: круглі відеоповідомлення у стилі Telegram (Video Notes / Кружечки), прискорення відтворення (1x / 1.5x / 2x) та інтерактивна звукова хвиля (Audio Waveform).
- **ДЗ 16** ([`lesson-16-module-08/home-work-16`](../../lesson-16-module-08/home-work-16)) — локальна збірка та деплой Android додатку (Standalone APK / Continuous Native Generation).
- **ДЗ 17** ([`lesson-17-module-09/home-work-17`](../../lesson-17-module-09/home-work-17)) — Push-сповіщення (Push Notifications), Expo Push Service, Firebase Cloud Messaging (FCM v1) та Deep Linking.

У **ДЗ 18** ми переходимо до однієї з найбільш затребуваних функцій у сучасній мобільній розробці — **входу через соціальні мережі (Social Login)** за допомогою протоколу **Google OAuth 2.0**!

Ми реалізуємо безпечну авторизацію користувачів в один клік без необхідності вводити пошту та пароль, автоматичне підтягування аватара та імені гравця безпосередньо з облікового запису Google, налаштування системного браузера `expo-web-browser` та обробку зворотних переходів через механізм **Deep Linking**.

---

## 💥 Проблема, яку ми вирішуємо

До цього моменту в додатку підтримувалася лише класична авторизація за паролем:

1. **Високе тертя при вході (Sign-in Friction):** Введення паролів на сенсорній клавіатурі смартфона незручне й часто призводить до помилок (друкарські помилки, розкладка, забуті паролі). Багато користувачів залишають застосунок, не завершивши реєстрацію.
2. **Відсутність персоналізації:** При реєстрації за паролем профіль користувача залишається порожнім — без фотографії та справжнього імені.
3. **Безпека облікових даних:** Зберігання та керування паролями потребує систем скидання, підтвердження пошти тощо. Завдяки **OAuth 2.0** безпеку автентифікації бере на себе Google.
4. **Специфіка мобільного OAuth:** У нативних мобільних застосунках не можна просто виконати звичайний веб-редирект `window.location.href`. Необхідно відкривати ізольовану системну браузерну сесію (`expo-web-browser`), коректно налаштувати зворотну схему (`Deep Link Scheme`), налаштувати Callback URL на бекенді Convex та безпечно передати код авторизації назад у застосунок.

---

## 📚 Покрокова інструкція

Для швидкого та якісного виконання завдання створено вичерпний посібник із кодом, покроковими скріншотами налаштування Google Cloud Console, архітектурними схемами та чеклістом перевірки:

👉 **[Інструкція 18: Авторизація через Google (OAuth 2.0, Convex Auth, expo-web-browser & Deep Linking)](./18-google-oauth-authentication.md)**

Також ви можете звернутися до інструкції проєкту:

- [Інструкція 06: Авторизація через Google у проєкті](../docs-project/06-google-auth.md)

---

## 🏗️ Архітектура та життєвий цикл входу через Google

```
[Мобільний застосунок: app/sign-in.tsx]
                 │
                 ├──► Натискання: "Продовжити з Google"
                 │
                 ▼
    const redirectTo = Linking.createURL(""); // tictactoe-dev:// або tictactoe://
    const { redirect } = await signIn("google", { redirectTo });
                 │
                 ▼
[Відкривається системне вікно WebBrowser.openAuthSessionAsync(redirect, redirectTo)]
                 │
                 ▼ (Користувач обирає свій Google акаунт)
[Google перевіряє користувача і надсилає код на Convex Callback URL]
  https://<deployment-name>.convex.site/api/auth/callback/google
                 │
                 ▼
[Convex обробляє відповідь, створює або оновлює гравця в таблиці users]
  і повертає браузеру 302 Redirect на Deep Link додатку:
  tictactoe-dev://?code=...
                 │
                 ▼
[WebBrowser автоматично закривається, повертаючи { type: "success", url }]
                 │
                 ▼
    const code = new URL(url).searchParams.get("code");
    await signIn("google", { code });
                 │
                 ▼
[Токени зберігаються у SecureStore ➔ ConvexAuthProvider оновлює стан]
  InitialLayout (_layout.tsx) автоматично перемикає на головні екрани (tabs)
```

---

## 🎯 Мета та задачі завдання

### 1. Налаштування проекту в Google Cloud Console

- Створення або вибір проекту в [Google Cloud Console](https://console.cloud.google.com/).
- Налаштування екрана згоди OAuth (**OAuth consent screen**) із базовими доступами (`.../auth/userinfo.email`, `.../auth/userinfo.profile`, `openid`).
- Створення облікових даних **OAuth client ID** з типом **Web application** (_саме Web application, оскільки зворотний виклик авторизації приймає бекенд Convex_).
- Налаштування дозволених джерел JavaScript (**Authorized JavaScript origins**):
  `https://<YOUR_CONVEX_SITE_URL>` (наприклад, `https://woozy-ant-227.eu-west-1.convex.site`).
- Налаштування дозволених URI перенаправлення (**Authorized redirect URIs**):
  `https://<YOUR_CONVEX_SITE_URL>/api/auth/callback/google`.
- Отримання **Client ID** та **Client Secret**.

### 2. Конфігурація середовища бекенду Convex

- Встановлення змінних середовища у бекенді Convex через термінал:
  ```bash
  npx convex env set AUTH_GOOGLE_ID <ВАШ_CLIENT_ID>
  npx convex env set AUTH_GOOGLE_SECRET <ВАШ_CLIENT_SECRET>
  npx convex env set SITE_URL https://<YOUR_CONVEX_SITE_URL>
  ```
- Перевірка коректності запису через `npx convex env list`.

### 3. Підключення провайдера Google у `convex/auth.ts`

- Імпорт провайдера `Google` з бібліотеки `@auth/core/providers/google`.
- Налаштування функції `profile(params)`, що зчитує `id` (`params.sub`), `email`, `name` та аватарку `image` (`params.picture`).
- Налаштування `callbacks: { async redirect({ redirectTo }) { return redirectTo; } }`, що дозволяє повернення у мобільний застосунок за Deep Link схемою.

### 4. Налаштування Deep Linking у мобільному застосунку (`app.config.ts`)

- Перевірка наявності схеми `scheme` у конфігурації Expo (`tictactoe-dev` для розробки та `tictactoe` для релізу).
- Використання `Linking.createURL("")` для динамічного формування зворотного шляху без хардкоду.

### 5. Інтерфейс та логіка входу (`app/sign-in.tsx`, `app/sign-up.tsx`)

- Додавання виклику `WebBrowser.maybeCompleteAuthSession();` на верхньому рівні модуля.
- Створення фірмової кнопки **«Продовжити з Google»** з офіційною іконкою Google (`Ionicons name="logo-google"`).
- Адаптація кнопки під світлу та темну теми оформлення проекту (`ThemeContext`).
- Реалізація повного двокрокового циклу авторизації:
  1. Отримання `redirect` URL від Convex.
  2. Відкриття `WebBrowser.openAuthSessionAsync`.
  3. Отримання параметра `code` зі зворотного URL.
  4. Завершення входу викликом `signIn("google", { code })`.
- Обробка стану завантаження (`ActivityIndicator`) та деактивація кнопки під час запиту.

### 6. Відображення профілю Google у додатку

- Оновлення картки гравця на екрані статистики (`app/(tabs)/statistics.tsx`):
  - Відображення реальної аватарки Google (`Image source={{ uri: user.image }}`).
  - Відображення реального імені користувача або пошти.
  - Надійна заглушка (Placeholder) при відсутності фото.

### 7. Безпека облікових даних

- Додавання файлів секретів Google (`client_secret_*.json`) у файл [`.gitignore`](file:///home/skmelyuk/Documents/react-native/Lessons-pv521/rn-tictactoe-pv521/.gitignore), щоб запобігти випадковому витоку ключів у публічний репозиторій.

---

## 🏛️ Порівняння способів автентифікації

| Характеристика                          |             Email + Password 📧             |            Google OAuth 2.0 🌐             |
| :-------------------------------------- | :-----------------------------------------: | :----------------------------------------: |
| **Кількість кліків для входу**          | 4-5 (введення пошти, пароля, підтвердження) |                 1-2 кліки                  |
| **Необхідність запам'ятовувати пароль** |       Так (потрібен надійний пароль)        |      Ні (безпечний вхід через Google)      |
| **Отримання фотографії профілю**        |        Потрібне окреме завантаження         |        Автоматично з Google акаунта        |
| **Отримання імені користувача**         |               Ручне введення                |        Автоматично з Google акаунта        |
| **Безпека від витоку пароля**           |          Залежить від користувача           | Висока (двофакторна автентифікація Google) |
| **Потреба у відновленні пароля**        |        Так (окрема логіка скидання)         |       Ні (керується сервісом Google)       |

---

## 📁 Очікувана структура файлів

```text
rn-tictactoe-pv521/ (або ваш проєкт)
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx                   # Головне ігрове поле
│   │   └── statistics.tsx              # Оновлено: відображення аватара та імені Google
│   ├── sign-in.tsx                     # Оновлено: кнопка та логіка входу через Google
│   └── sign-up.tsx                     # Оновлено: кнопка реєстрації через Google
├── app.config.ts                       # Перевірено: схема deep link (scheme)
├── convex/
│   ├── auth.ts                         # Оновлено: провайдер Google, profile(), redirect()
│   ├── schema.ts                       # authTables (users з name, email, image)
│   └── users.ts                        # Запит currentUser для отримання профілю
└── .gitignore                          # Додано: client_secret_*.json
```

---

## 💯 Критерії оцінювання (100 балів)

| Критерій                                         |  Бали  | Опис                                                                                                                                                                                                     |
| :----------------------------------------------- | :----: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Налаштування Google Cloud Console та Convex**  | **25** | Створено Web OAuth Client ID, вказано коректні Authorized Origins та Redirect URIs сайту Convex. У Convex збережені змінні `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `SITE_URL`.                           |
| **Бекенд Convex Auth (`convex/auth.ts`)**        | **20** | Підключено провайдер `Google` з пакета `@auth/core/providers/google`. Налаштовано збереження `name`, `email` та `image`. Реалізовано callback `redirect`.                                                |
| **Клієнтський потік входу (`expo-web-browser`)** | **25** | Додано виклик `WebBrowser.maybeCompleteAuthSession()`. Реалізовано функцію `handleGoogleSignIn` із запуском `openAuthSessionAsync`, перехопленням Deep Link, вилученням `code` та авторизацією в Convex. |
| **Дизайн та адаптація інтерфейсу**               | **15** | Кнопка «Продовжити з Google» оформлена за гайдлайнами платформи, підтримує світлу та темну теми, має стан завантаження (`ActivityIndicator`).                                                            |
| **Персоналізація профілю та статистика**         | **10** | Аватарка та ім'я користувача з Google підтягуються через `api.users.currentUser` та відображаються у застосунку (наприклад, на екрані статистики).                                                       |
| **Безпека та якість коду**                       | **5**  | Файли `client_secret_*.json` додані у `.gitignore`. Команда `npx tsc --noEmit` проходить без помилок компіляції.                                                                                         |

---

## 🧪 Чекліст для самоперевірки

- [ ] У Google Cloud Console створено OAuth 2.0 Client ID типу **Web application**.
- [ ] У Authorized Redirect URIs додано `https://<YOUR_CONVEX_SITE_URL>/api/auth/callback/google`.
- [ ] Команда `npx convex env list` показує наявність `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` та `SITE_URL`.
- [ ] У файлі `convex/auth.ts` підключено провайдер Google з функцією збереження аватара `image: params.picture`.
- [ ] У `app.config.ts` вказано `scheme` для повернення в додаток (`tictactoe-dev` / `tictactoe`).
- [ ] На екрані входу `app/sign-in.tsx` присутня стильна кнопка «Продовжити з Google».
- [ ] При натисканні на кнопку відкривається системний браузер із вибором Google-акаунта.
- [ ] Після вибору акаунта браузер закривається, і додаток автоматично перенаправляє на головний екран гри.
- [ ] На екрані статистики (`statistics.tsx`) відображається аватарка профілю Google та ім'я користувача.
- [ ] Якщо вийти з акаунта (`Sign Out`) і знову увійти через Google, дані та статистика ігор зберігаються.
- [ ] Файли секретів додано в `.gitignore`, перевірка `npx tsc --noEmit` не видає помилок.

Були проведіні перші роботи по підготовці до здачі як проект
