# Exact `AIBOT.py` integration

The delivered `AIBOT.py` already contains these changes. They are listed here so the same edits can be applied to a newer production copy if the bot changes before deployment.

## 1. Telegram imports

Add `WebAppInfo` and `MenuButtonWebApp`:

```python
from telegram import (
    Update,
    KeyboardButton,
    ReplyKeyboardMarkup,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    WebAppInfo,
    MenuButtonWebApp,
)
```

## 2. Mini App configuration

Immediately after the bot and OpenAI environment variables:

```python
MINI_APP_URL = os.getenv("MINI_APP_URL", "").strip().rstrip("/")
```

Add the button constant:

```python
BTN_HUB = "🚀 Open Admissions Hub"
```

## 3. Main keyboard

Replace `main_menu_keyboard()` with:

```python
def main_menu_keyboard():
    rows = []
    if MINI_APP_URL:
        rows.append(
            [KeyboardButton(BTN_HUB, web_app=WebAppInfo(url=MINI_APP_URL))]
        )
    rows.extend(
        [
            [KeyboardButton(BTN_ESSAY), KeyboardButton(BTN_EC), KeyboardButton(BTN_REC)],
            [KeyboardButton(BTN_SAT), KeyboardButton(BTN_IELTS), KeyboardButton(BTN_PORT)],
            [KeyboardButton(BTN_PLAN_MAIN), KeyboardButton(BTN_SF_MAIN), KeyboardButton(BTN_TOOLS)],
        ]
    )
    return ReplyKeyboardMarkup(rows, resize_keyboard=True, one_time_keyboard=False)
```

This is additive. Every old menu button stays available.

## 4. Persistent Telegram menu button

Add before application construction:

```python
async def telegram_post_init(application):
    if not MINI_APP_URL:
        logging.warning("MINI_APP_URL is not set; Admissions Hub buttons are disabled.")
        return
    try:
        await application.bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(
                text="Admissions Hub",
                web_app=WebAppInfo(url=MINI_APP_URL),
            )
        )
    except Exception:
        logging.exception("Failed to configure the Telegram Mini App menu button.")
```

Register it without changing handlers:

```python
app = (
    ApplicationBuilder()
    .token(TELEGRAM_TOKEN)
    .concurrent_updates(True)
    .post_init(telegram_post_init)
    .build()
)
```

## 5. Shared FastAPI process

`backend/legacy.py` imports this same module and manually runs:

```python
await app.initialize()
await app.post_init(app)
await app.start()
await app.updater.start_polling()
```

The standalone `if __name__ == "__main__": app.run_polling()` path is preserved, so the bot can still be run exactly as before. Railway uses FastAPI so the website and bot share one process and one volume.

## 6. Safe async OpenAI compatibility

The original wrapper awaited the synchronous OpenAI v1 client. The delivered file changes `OpenAI` to `AsyncOpenAI` and adds an optional `response_format` argument. Existing bot calls are unchanged; Mini App calls can request JSON objects for reliable card rendering.

## 7. Safer shared JSON writes

The delivered file changes the paid lock to `threading.RLock`, adds a memory `RLock`, and writes memory/payment JSON through a temporary file followed by `os.replace`. This prevents partial JSON files when Telegram handlers and FastAPI requests finish at the same time.

