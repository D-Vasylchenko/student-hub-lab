# Архітектура проекту "Student Hub"

Цей документ описує структуру, модулі та потоки даних веб-застосунку Student Hub.
Виконується в рамках Лабораторної роботи №2.

## 1. Компоненти та Модулі

Додаток побудований за архітектурою **Client-Server** (Serverless). Весь код виконується у браузері клієнта (SPA), а для зберігання даних використовуються хмарні сервіси.

### Основні модулі:

1.  **Auth Manager:** Відповідає за реєстрацію, вхід та збереження сесії (`localStorage`).
2.  **Chat System:** Керує відправкою повідомлень (`push`), перемиканням кімнат та рендерингом (`renderMessage`).
3.  **Weather Widget:** Отримує дані від OpenWeatherMap та Nominatim API.
4.  **Profile Manager:** Керує аватарами та завантаженням файлів у Firebase Storage.

### Діаграма компонентів (Component Diagram)

```mermaid
graph TD
    subgraph Client [Веб-браузер Клієнта]
        UI[Інтерфейс HTML/CSS]

        subgraph Logic [JavaScript Modules]
            Auth[Auth Manager]
            Chat[Chat System]
            Weather[Weather Widget]
            Profile[Profile Manager]
        end

        Storage[Local Storage]
    end

    subgraph Cloud [Хмарні сервіси]
        DB[(Firebase Realtime DB)]
        FileStore[(Firebase Storage)]
        WeatherAPI[OpenWeatherMap API]
    end

    %% Зв'язки
    UI <--> Auth
    UI <--> Chat
    UI <--> Weather
    UI <--> Profile

    Auth <--> Storage
    Auth --> DB

    Chat <--> DB

    Profile --> FileStore
    Profile <--> DB

    Weather --> WeatherAPI
2. Дані та їх зв’язки (ER Діаграма)
Використовується NoSQL база даних. Дані організовані у вигляді JSON-дерева.

Сутності:
User: Зберігає нікнейм, пароль, посилання на аватар та біографію.

Message: Зберігає текст, автора та час відправки.

Chat Room: Віртуальна сутність, що групує повідомлення (публічні або приватні).

ER Діаграма
Фрагмент коду

erDiagram
    USER {
        string username PK
        string password
        string avatar_url
        string about_text
    }

    MESSAGE {
        string id PK
        string text
        timestamp time
        string sender_username FK
    }

    CHAT_ROOM {
        string room_id PK
        string type "public/private"
    }

    USER ||--o{ MESSAGE : writes
    CHAT_ROOM ||--|{ MESSAGE : contains
    USER }|--|| CHAT_ROOM : participates_in
3. Сценарії оновлення даних (Data Flow)
Сценарій 1: Відправка повідомлення
Користувач натискає "Send".

JS відправляє об'єкт {user, text, time} у Firebase Database.

Firebase миттєво розсилає оновлення всім підключеним клієнтам (подія child_added).

Інтерфейс отримує дані та малює нове повідомлення.

Сценарій 2: Завантаження аватара
Користувач обирає файл.

JS перевіряє формат (не HEIC) і розмір (<2MB).

Файл вантажиться у Firebase Storage.

Storage повертає посилання (URL).

JS оновлює поле avatar у профілі користувача в базі даних.

Сценарій 3: Прогноз погоди
Користувач вводить місто.

JS робить запит до Nominatim API (координати).

JS робить запит до OpenWeatherMap (прогноз).

Дані агрегуються (групуються по днях) і відображаються у модальному вікні.
```
