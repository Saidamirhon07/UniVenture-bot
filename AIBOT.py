# AIBOT.py
# UniVentureAI — Telegram bot with GLOBAL per-topic RAG + metadata separation (qa/evaluation)
# + eval follow-ups (apply feedback) + embedded tools + Application Plan & School Finder
# + analytics + admin locks + backup + health + robust command parsing + UUID doc IDs (no reteach bugs)
#
# ✅ Fixes applied (requested):
# 1) Teach/teachfile/etc reliably learns again on BOTH old and new OpenAI SDK versions
#    (custom embedding function, no more OpenAIEmbeddingFunction SDK mismatch).
# 2) Evaluation follow-up can answer ANY question about the last evaluated text (no trigger required).
#    - If user asks to rewrite/apply feedback -> rewrites the text.
#    - Otherwise -> answers the question using the saved text + feedback.
# 3) Restored friendly “Got it / thinking…” style messages (kept your UX).
# 4) Kept your existing features and structure (no aggressive deletions/shortening).

from telegram import Update, KeyboardButton, ReplyKeyboardMarkup
from telegram.constants import ChatAction
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    MessageHandler,
    ContextTypes,
    filters,
)
from dotenv import load_dotenv
import chromadb
import os, io, nest_asyncio, logging, json, base64, uuid, re, time

# -------- File extraction deps --------
from pdfminer.high_level import extract_text
from docx import Document as DocxDocument

# -------- Web page extraction (for teachlink) --------
import trafilatura

import threading
from http.server import HTTPServer, BaseHTTPRequestHandler

logging.basicConfig(level=logging.INFO)
load_dotenv()
nest_asyncio.apply()

TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# =========================
# OpenAI SDK compatibility
# =========================
USE_NEW_OPENAI = False
_client = None
try:
    # openai>=1.x
    from openai import OpenAI

    _client = OpenAI(api_key=OPENAI_API_KEY)
    USE_NEW_OPENAI = True
except Exception:
    # openai<=0.28.x
    import openai

    openai.api_key = OPENAI_API_KEY
    USE_NEW_OPENAI = False


def openai_chat(model: str, messages: list, temperature: float = 0.4, max_tokens: int | None = None) -> str:
    """Unified chat completion across old/new OpenAI python SDKs."""
    try:
        if USE_NEW_OPENAI:
            resp = _client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return (resp.choices[0].message.content or "").strip()
        else:
            import openai as _openai  # type: ignore

            resp = _openai.ChatCompletion.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return (resp["choices"][0]["message"]["content"] or "").strip()
    except Exception as e:
        return f"Error: {e}"


def openai_embed(model: str, texts: list[str]) -> list[list[float]]:
    """
    Unified embeddings across old/new OpenAI python SDKs.
    IMPORTANT: This is used by Chroma. If embeddings break, /teach will "look like it worked" but won't store.
    """
    texts = [t if isinstance(t, str) else str(t) for t in (texts or [])]
    if not texts:
        return []

    # Chroma sometimes calls the embedding function with very long text.
    # We keep your chunking already, so this is mostly safe.
    # Add tiny retry for transient errors.
    last_err = None
    for attempt in range(3):
        try:
            if USE_NEW_OPENAI:
                resp = _client.embeddings.create(model=model, input=texts)
                # resp.data is list with .embedding
                return [d.embedding for d in resp.data]
            else:
                import openai as _openai  # type: ignore

                resp = _openai.Embedding.create(model=model, input=texts)
                data = resp.get("data", [])
                return [d.get("embedding", []) for d in data]
        except Exception as e:
            last_err = e
            time.sleep(0.6 * (attempt + 1))

    raise RuntimeError(f"Embedding error after retries: {last_err}")


class UniversalOpenAIEmbeddingFunction:
    """Chroma-compatible embedding function that works on both OpenAI SDK branches."""
    def __init__(self, api_key: str, model_name: str = "text-embedding-3-small"):
        self.api_key = api_key
        self.model_name = model_name

    def __call__(self, input: list[str]) -> list[list[float]]:
        return openai_embed(self.model_name, input)


# -------- Admin config --------
ADMIN_IDS = {
    886181760,  # TODO: replace with YOUR Telegram user ID (from @userinfobot)
}


def require_admin(update: Update) -> bool:
    user = update.effective_user
    return bool(user and user.id in ADMIN_IDS)


# -------- Data / storage config (for Railway/Render volume etc.) --------
DATA_DIR = os.getenv("DATA_DIR", "./data")
os.makedirs(DATA_DIR, exist_ok=True)

CHROMA_PATH = os.getenv("CHROMA_PATH", os.path.join(DATA_DIR, "chroma_store"))
COLLECTION_PREFIX = os.getenv("CHROMA_COLLECTION_PREFIX", "global")

# -------- Persistent Chroma (GLOBAL per-topic collections) --------
chroma = chromadb.PersistentClient(path=CHROMA_PATH)
emb_fn = UniversalOpenAIEmbeddingFunction(
    api_key=OPENAI_API_KEY,
    model_name="text-embedding-3-small",
)

# -------- Analytics storage --------
STATS_FILE = os.path.join(DATA_DIR, "analytics.json")


def _default_stats():
    return {
        "users": [],
        "messages_total": 0,
        "messages_per_user": {},
        "topic_counts": {},
        "eval_counts": {},
    }


def load_stats():
    if not os.path.exists(STATS_FILE):
        return _default_stats()
    try:
        with open(STATS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        return _default_stats()

    base = _default_stats()
    base.update({k: data.get(k, v) for k, v in base.items()})
    return base


def save_stats(stats):
    try:
        with open(STATS_FILE, "w", encoding="utf-8") as f:
            json.dump(stats, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logging.warning(f"Could not save analytics: {e}")


def record_event(user_id, topic: str, kind: str = "message"):
    stats = load_stats()
    uid = str(user_id)

    if uid not in stats["users"]:
        stats["users"].append(uid)

    stats["messages_total"] = stats.get("messages_total", 0) + 1

    mpu = stats.setdefault("messages_per_user", {})
    mpu[uid] = mpu.get(uid, 0) + 1

    if topic:
        tc = stats.setdefault("topic_counts", {})
        tc[topic] = tc.get(topic, 0) + 1

    if kind == "eval" and topic:
        ec = stats.setdefault("eval_counts", {})
        ec[topic] = ec.get(topic, 0) + 1

    save_stats(stats)


# -------- Main menu buttons --------
BTN_ESSAY = "📝 Essays"
BTN_EC = "🎯 Extracurricular activities"
BTN_REC = "✉️ Recommendation Letters"
BTN_SAT = "📈 SAT"
BTN_IELTS = "🗣️ IELTS"
BTN_PORT = "🖼️ Portfolio Check"
BTN_PLAN_MAIN = "📅 Application Plan"
BTN_SF_MAIN = "🏫 School Finder"

# Evaluation sub-buttons
BTN_PS_EVAL = "✅ Personal Statement Evaluation"
BTN_SUPP_EVAL = "✅ Supplemental Essay Evaluation"
BTN_EC_EVAL = "✅ Extracurricular Evaluation"
BTN_REC_EVAL = "✅ Rec Letter Evaluation"
BTN_IW_EVAL = "✅ Writing Evaluation"
BTN_PORT_EVAL = "✅ Portfolio Evaluation"

# Essays sub-buttons
BTN_ESSAY_PS = "📝 Personal Statement"
BTN_ESSAY_SUPP = "📝 Supplemental Essays"

# Extra tools (as buttons inside menus)
BTN_EC_PROGRAMS = "🌍 Top Programs & Opportunities"
BTN_BRAINSTORM = "🧠 Brainstorm ideas"
BTN_REWRITE = "✍️ Rewrite my text"
BTN_REC_PACKET = "📄 Rec Letter Packet"
BTN_PORTFOLIO_IDEAS = "💡 Portfolio Ideas"

# SAT sub-buttons
BTN_SAT_MATH = "📐 SAT Math"
BTN_SAT_ENGLISH = "📚 SAT English"

# IELTS sub-buttons
BTN_IELTS_READING = "📖 IELTS Reading"
BTN_IELTS_LISTENING = "👂 IELTS Listening"
BTN_IELTS_WRITING = "✍️ IELTS Writing"
BTN_IELTS_SPEAKING = "🗣️ IELTS Speaking"

# Back button
BTN_BACK = "⬅️ Back"


# -------- Keyboards --------
def main_menu_keyboard():
    return ReplyKeyboardMarkup(
        [
            [KeyboardButton(BTN_ESSAY), KeyboardButton(BTN_EC)],
            [KeyboardButton(BTN_REC), KeyboardButton(BTN_SAT)],
            [KeyboardButton(BTN_IELTS), KeyboardButton(BTN_PORT)],
            [KeyboardButton(BTN_PLAN_MAIN), KeyboardButton(BTN_SF_MAIN)],
        ],
        resize_keyboard=True,
        one_time_keyboard=False,
    )


def essay_main_keyboard():
    return ReplyKeyboardMarkup(
        [
            [KeyboardButton(BTN_ESSAY_PS), KeyboardButton(BTN_ESSAY_SUPP)],
            [KeyboardButton(BTN_BACK)],
        ],
        resize_keyboard=True,
        one_time_keyboard=False,
    )


def essay_ps_keyboard():
    return ReplyKeyboardMarkup(
        [
            [KeyboardButton(BTN_PS_EVAL)],
            [KeyboardButton(BTN_BRAINSTORM)],
            [KeyboardButton(BTN_REWRITE)],
            [KeyboardButton(BTN_BACK)],
        ],
        resize_keyboard=True,
        one_time_keyboard=False,
    )


def essay_supp_keyboard():
    return ReplyKeyboardMarkup(
        [
            [KeyboardButton(BTN_SUPP_EVAL)],
            [KeyboardButton(BTN_BRAINSTORM)],
            [KeyboardButton(BTN_REWRITE)],
            [KeyboardButton(BTN_BACK)],
        ],
        resize_keyboard=True,
        one_time_keyboard=False,
    )


def ec_keyboard():
    return ReplyKeyboardMarkup(
        [
            [KeyboardButton(BTN_EC_EVAL)],
            [KeyboardButton(BTN_EC_PROGRAMS)],
            [KeyboardButton(BTN_BACK)],
        ],
        resize_keyboard=True,
        one_time_keyboard=False,
    )


def rec_keyboard():
    return ReplyKeyboardMarkup(
        [
            [KeyboardButton(BTN_REC_EVAL)],
            [KeyboardButton(BTN_REC_PACKET)],
            [KeyboardButton(BTN_BACK)],
        ],
        resize_keyboard=True,
        one_time_keyboard=False,
    )


def sat_menu_keyboard():
    return ReplyKeyboardMarkup(
        [
            [KeyboardButton(BTN_SAT_MATH), KeyboardButton(BTN_SAT_ENGLISH)],
            [KeyboardButton(BTN_BACK)],
        ],
        resize_keyboard=True,
        one_time_keyboard=False,
    )


def ielts_main_keyboard():
    return ReplyKeyboardMarkup(
        [
            [KeyboardButton(BTN_IELTS_READING), KeyboardButton(BTN_IELTS_LISTENING)],
            [KeyboardButton(BTN_IELTS_WRITING), KeyboardButton(BTN_IELTS_SPEAKING)],
            [KeyboardButton(BTN_BACK)],
        ],
        resize_keyboard=True,
        one_time_keyboard=False,
    )


def ielts_writing_keyboard():
    return ReplyKeyboardMarkup(
        [
            [KeyboardButton(BTN_IW_EVAL)],
            [KeyboardButton(BTN_BACK)],
        ],
        resize_keyboard=True,
        one_time_keyboard=False,
    )


def portfolio_keyboard():
    return ReplyKeyboardMarkup(
        [
            [KeyboardButton(BTN_PORT_EVAL)],
            [KeyboardButton(BTN_PORTFOLIO_IDEAS)],
            [KeyboardButton(BTN_BACK)],
        ],
        resize_keyboard=True,
        one_time_keyboard=False,
    )


def plan_keyboard():
    return ReplyKeyboardMarkup(
        [[KeyboardButton(BTN_BACK)]],
        resize_keyboard=True,
        one_time_keyboard=False,
    )


def schoolfinder_keyboard():
    return ReplyKeyboardMarkup(
        [[KeyboardButton(BTN_BACK)]],
        resize_keyboard=True,
        one_time_keyboard=False,
    )


def is_back_message(text: str) -> bool:
    t = (text or "").strip()
    return t == BTN_BACK or t.lower() == "back"


# -------- Topic mapping & helpers --------
TOPIC_KEYS = {
    BTN_ESSAY_PS: "essays_personal",
    BTN_ESSAY_SUPP: "essays_supplemental",
    BTN_EC: "extracurriculars",
    BTN_REC: "recommendations",
    BTN_PORT: "portfolio",
    BTN_SAT_MATH: "sat_math",
    BTN_SAT_ENGLISH: "sat_english",
    BTN_IELTS_READING: "ielts_reading",
    BTN_IELTS_LISTENING: "ielts_listening",
    BTN_IELTS_WRITING: "ielts_writing",
    BTN_IELTS_SPEAKING: "ielts_speaking",
}

EVAL_TOPICS = {
    "essays_personal",
    "essays_supplemental",
    "recommendations",
    "portfolio",
    "extracurriculars",
}

FRIENDLY_TOPIC_NAMES = {
    "essays_personal": "Personal Statement",
    "essays_supplemental": "Supplemental Essays",
    "extracurriculars": "Extracurricular Activities",
    "recommendations": "Recommendation Letters",
    "portfolio": "Portfolio",
    "sat_math": "SAT Math",
    "sat_english": "SAT English",
    "ielts_reading": "IELTS Reading",
    "ielts_listening": "IELTS Listening",
    "ielts_writing": "IELTS Writing",
    "ielts_speaking": "IELTS Speaking",
    "application_plan": "Application Plan",
    "school_finder": "School Finder",
    "general": "General admissions help",
}

DEFAULT_TOPIC = "general"

# -------- Image mapping --------
IMAGE_FILES = {
    "welcome": "images/welcome.png",
    "essays_main": "images/essays_main.png",
    "essays_personal": "images/essays_personal.png",
    "essays_supplemental": "images/essays_supplemental.png",
    "extracurriculars": "images/extracurriculars.png",
    "recommendations": "images/recommendations.png",
    "portfolio": "images/portfolio.png",
    "sat_main": "images/sat_main.png",
    "sat_math": "images/sat_math.png",
    "sat_english": "images/sat_english.png",
    "ielts_main": "images/ielts_main.png",
    "ielts_reading": "images/ielts_reading.png",
    "ielts_listening": "images/ielts_listening.png",
    "ielts_writing": "images/ielts_writing.png",
    "ielts_speaking": "images/ielts_speaking.png",
    "plan_main": "images/plan_main.png",
    "schoolfinder_main": "images/schoolfinder_main.png",
}


def get_current_topic(context: ContextTypes.DEFAULT_TYPE) -> str:
    return context.user_data.get("topic", DEFAULT_TOPIC)


def get_collection(chat_id: int, topic: str):
    # GLOBAL per-topic collections shared by all users.
    # chat_id kept for backwards compatibility but ignored.
    return chroma.get_or_create_collection(
        name=f"{COLLECTION_PREFIX}_{topic}",
        embedding_function=emb_fn,
    )


def new_doc_id(topic: str, tag: str = "") -> str:
    """Always-generate unique IDs for Chroma (prevents unlearn→reteach collisions)."""
    u = uuid.uuid4().hex
    return f"{topic}_{tag}_{u}" if tag else f"{topic}_{u}"


def _chunk(text: str, max_chars=1000, overlap=150):
    text = text or ""
    if not text.strip():
        return []
    chunks, i = [], 0
    while i < len(text):
        end = min(len(text), i + max_chars)
        chunks.append(text[i:end])
        if end == len(text):
            break
        i = max(0, end - overlap)
    return chunks


def extract_command_text(update: Update) -> str:
    msg = update.message
    if not msg:
        return ""
    if msg.text:
        return msg.text.strip()
    if msg.caption:
        return msg.caption.strip()
    return ""


def strip_command(text: str, command: str) -> str:
    """
    Remove the first token (/command or /command@BotName) and return the rest.
    Fixes bugs where titles accidentally include '@BotName'.
    """
    t = (text or "").strip()
    if not t:
        return ""
    first, *rest = t.split(maxsplit=1)
    if first.startswith(f"/{command}"):
        return rest[0].strip() if rest else ""
    return t


def is_caption_command(caption: str, cmd: str) -> bool:
    cap = (caption or "").strip()
    if not cap:
        return False
    first = cap.split(maxsplit=1)[0]
    return first.startswith(f"/{cmd}")


async def show_typing(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    await context.bot.send_chat_action(chat_id=chat_id, action=ChatAction.TYPING)


def sanitize_output(text: str) -> str:
    if not text:
        return text
    return text.replace("—", " - ")


def safe_text_for_embedding(text: str) -> str:
    if not text:
        return text
    return text.encode("utf-8", "ignore").decode("utf-8")


def _truncate_for_storage(text: str, max_chars: int = 12000) -> str:
    if not text:
        return ""
    t = text.strip()
    return t[:max_chars]


async def send_long(update: Update, text: str):
    MAX_LEN = 4000
    if not text:
        return
    text = sanitize_output(text)
    for i in range(0, len(text), MAX_LEN):
        await update.message.reply_text(text[i : i + MAX_LEN])


async def send_with_image(
    update: Update,
    caption: str,
    reply_markup=None,
    image_key: str | None = None,
):
    if image_key and image_key in IMAGE_FILES:
        path = IMAGE_FILES[image_key]
        if os.path.exists(path):
            try:
                with open(path, "rb") as f:
                    await update.message.reply_photo(
                        photo=f,
                        caption=caption,
                        reply_markup=reply_markup,
                    )
                return
            except Exception as e:
                logging.warning(f"Failed to send image {path}: {e}")

    await update.message.reply_text(caption, reply_markup=reply_markup)


# -------- Vision helper --------
def extract_text_from_image_bytes(image_bytes: bytes) -> str:
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    data_url = f"data:image/jpeg;base64,{b64}"

    messages = [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": (
                        "Extract all readable text from this image. "
                        "Return ONLY the plain text, no extra comments."
                    ),
                },
                {"type": "image_url", "image_url": {"url": data_url}},
            ],
        }
    ]

    out = openai_chat(model="gpt-4o-mini", messages=messages, temperature=0.0)
    return out or ""


# ---------- EVAL FOLLOW-UP HELPERS ----------
# Kept your original triggers list, but follow-up Q&A no longer depends on triggers.
# Triggers are now only used to decide whether the user is requesting a rewrite vs asking a question.
FOLLOWUP_TRIGGERS = [
    "next step",
    "do it",
    "do this",
    "apply",
    "apply this",
    "apply the feedback",
    "rewrite",
    "rewrite the ending",
    "rewrite the conclusion",
    "improve the ending",
    "revise",
    "expand",
    "continue",
    "make it smoother",
    "make transitions",
    "stronger conclusion",
    "deeper reflection",
    "polish",
]

QUESTION_KEYWORDS = [
    "what", "why", "how", "which", "where", "when", "is it", "are there", "can you",
    "grammar", "grammatical", "mistake", "mistakes", "punctuation", "typo", "tense",
    "clarity", "confusing", "transition", "flow", "hook", "ending", "conclusion"
]


def is_followup_intent(q: str) -> bool:
    s = (q or "").lower()
    return any(t in s for t in FOLLOWUP_TRIGGERS)


def looks_like_submission(q: str) -> bool:
    t = (q or "").strip()
    if len(t) >= 600:
        return True
    if len(t) >= 250 and t.count("\n") >= 6:
        return True
    return False


def looks_like_question(q: str) -> bool:
    s = (q or "").lower().strip()
    if not s:
        return False
    if "?" in s:
        return True
    return any(k in s for k in QUESTION_KEYWORDS)


def should_rewrite_from_followup(q: str) -> bool:
    """
    Decide whether a follow-up message should trigger a rewrite.
    Goal: answer questions like "what grammar mistakes?" without rewriting the whole essay,
    BUT if they say "rewrite/apply feedback" then rewrite.
    """
    s = (q or "").lower().strip()
    if not s:
        return False

    # strong rewrite phrases
    strong = [
        "rewrite", "revise", "apply the feedback", "apply feedback",
        "rewrite the ending", "rewrite the conclusion", "stronger conclusion",
        "make it smoother", "fix the transitions", "do the next step", "polish"
    ]
    if any(p in s for p in strong):
        return True

    # weaker: "fix/edit/improve" only if it doesn't look like a question
    weak = ["fix", "edit", "improve", "make it better", "clean up"]
    if any(p in s for p in weak) and not looks_like_question(s):
        return True

    return False


def clear_eval_context(context: ContextTypes.DEFAULT_TYPE):
    for k in [
        "last_eval_topic",
        "last_eval_text",
        "last_eval_text_original",
        "last_eval_feedback",
    ]:
        context.user_data.pop(k, None)
    context.user_data["eval_active"] = False


def set_eval_context(
    context: ContextTypes.DEFAULT_TYPE,
    topic: str,
    student_text: str,
    feedback: str,
):
    context.user_data["last_eval_topic"] = topic
    context.user_data["last_eval_text_original"] = student_text
    context.user_data["last_eval_text"] = student_text
    context.user_data["last_eval_feedback"] = feedback
    context.user_data["eval_active"] = True


def _pretty_topic_for_eval(topic: str) -> str:
    return {
        "essays_personal": "Personal Statement essay",
        "essays_supplemental": "Supplemental essay",
        "recommendations": "Recommendation letter",
        "portfolio": "Portfolio description",
        "extracurriculars": "Extracurricular activities description",
        "ielts_writing": "IELTS Writing answer",
    }.get(topic, "document")


def _sys_role_for_eval(topic: str) -> str:
    if topic in {"essays_personal", "essays_supplemental"}:
        return (
            "You are an expert college admissions essay coach. "
            "Improve the student's essay using the prior feedback. "
            "Focus on clarity, structure, voice, authenticity, reflection, and impact."
        )
    if topic == "recommendations":
        return (
            "You are an expert on college recommendation letters. "
            "Improve the letter using the prior feedback. "
            "Focus on specificity, credibility, depth of insight, and support for the student."
        )
    if topic == "extracurriculars":
        return (
            "You are an expert on extracurricular strategy for college applications. "
            "Improve the EC descriptions using the prior feedback. "
            "Focus on impact, leadership, continuity, clarity, and strong phrasing."
        )
    if topic == "ielts_writing":
        return (
            "You are an experienced IELTS Writing examiner. "
            "Improve the student's writing using the prior feedback. "
            "Focus on Task Response, Coherence and Cohesion, Lexical Resource, and Grammar."
        )
    return (
        "You are an expert college portfolio reviewer. "
        "Improve the portfolio description using the prior feedback. "
        "Focus on coherence, originality, technical quality, and fit for selective colleges."
    )


def _sys_role_for_eval_qna(topic: str) -> str:
    if topic in {"essays_personal", "essays_supplemental"}:
        return (
            "You are an expert college admissions essay coach. "
            "The user is asking a follow-up question about the student's essay. "
            "Answer the question using the essay text and prior feedback. "
            "Do NOT rewrite the entire essay unless explicitly asked."
        )
    if topic == "recommendations":
        return (
            "You are an expert on college recommendation letters. "
            "The user is asking a follow-up question about the letter draft. "
            "Answer the question using the letter text and prior feedback. "
            "Do NOT rewrite the entire letter unless explicitly asked."
        )
    if topic == "extracurriculars":
        return (
            "You are an expert on extracurricular strategy for college applications. "
            "The user is asking a follow-up question about their EC descriptions. "
            "Answer the question using the text and prior feedback. "
            "Do NOT rewrite everything unless explicitly asked."
        )
    if topic == "ielts_writing":
        return (
            "You are an IELTS Writing examiner. "
            "The user is asking a follow-up question about their writing answer. "
            "Answer the question using the student's text and prior feedback. "
            "Do NOT rewrite the entire answer unless explicitly asked."
        )
    return (
        "You are an expert college portfolio reviewer. "
        "The user is asking a follow-up question about their portfolio description. "
        "Answer the question using the text and prior feedback. "
        "Do NOT rewrite the entire description unless explicitly asked."
    )


# ---------- Handlers ----------
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    clear_eval_context(context)
    context.user_data["topic"] = DEFAULT_TOPIC
    context.user_data["pending_feature"] = None
    user = update.effective_user
    record_event(user.id, "start", kind="start")

    await send_with_image(
        update,
        "Hi! I'm your coached AI 🤖\nChoose a topic or ask a question.",
        reply_markup=main_menu_keyboard(),
        image_key="welcome",
    )


# ---------- TEACH (Q&A sources) ----------
async def teach(update: Update, context: ContextTypes.DEFAULT_TYPE):
    logging.info("🔥 /teach RECEIVED")

    if not require_admin(update):
        await update.message.reply_text("⛔ You are not allowed to teach global sources.")
        return

    await show_typing(update, context)
    chat_id = update.effective_chat.id
    user = update.effective_user
    topic = get_current_topic(context)
    record_event(user.id, topic, kind="teach")

    raw = strip_command(extract_command_text(update), "teach")
    if "|" not in raw:
        await update.message.reply_text(
            "Use format:\n/teach <title> | <content>\n\n" f"Current topic: {topic}"
        )
        return

    title, content = [p.strip() for p in raw.split("|", 1)]
    col = get_collection(chat_id, topic)

    existing = col.get(where={"title": title, "type": "qa"})
    if existing and existing.get("ids"):
        await update.message.reply_text(
            f"'{title}' already exists in topic: {topic}. "
            "Use /unlearn '<title>' first if you want to replace it."
        )
        return

    try:
        doc_id = new_doc_id(topic, "qa")
        col.add(
            ids=[doc_id],
            metadatas=[{"title": title, "topic": topic, "type": "qa", "source": "manual"}],
            documents=[safe_text_for_embedding(content)],
        )
    except Exception as e:
        await update.message.reply_text(
            "❌ Teach failed while saving/embedding.\n"
            f"Error: {e}\n\n"
            "Tip: make sure OPENAI_API_KEY is correct and your server has internet access."
        )
        return

    await update.message.reply_text(
        f"Learned '{title}' ✅ (topic: {topic}, mode: Q&A, scope: GLOBAL)"
    )


# ---------- TEACH RUBRIC (EVALUATION sources) ----------
async def teachrubric(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not require_admin(update):
        await update.message.reply_text("⛔ You are not allowed to teach global rubrics.")
        return

    await show_typing(update, context)
    chat_id = update.effective_chat.id
    user = update.effective_user

    raw = strip_command(extract_command_text(update), "teachrubric")
    if "|" not in raw:
        await update.message.reply_text(
            "Use format:\n/teachrubric <title> | <rubric / evaluation criteria>"
        )
        return

    title, content = [p.strip() for p in raw.split("|", 1)]
    topic = get_current_topic(context)
    record_event(user.id, topic, kind="teachrubric")

    col = get_collection(chat_id, topic)

    existing = col.get(where={"title": title, "type": "evaluation"})
    if existing and existing.get("ids"):
        await update.message.reply_text(
            f"'{title}' already exists in topic: {topic}. "
            "Use /unlearn '<title>' first if you want to replace it."
        )
        return

    try:
        col.add(
            ids=[new_doc_id(topic, "eval")],
            metadatas=[
                {"title": title, "topic": topic, "type": "evaluation", "source": "manual"}
            ],
            documents=[safe_text_for_embedding(content)],
        )
    except Exception as e:
        await update.message.reply_text(
            "❌ Failed to save rubric.\n"
            f"Error: {e}\n\n"
            "Tip: this is usually an embeddings/API issue - check OPENAI_API_KEY + logs."
        )
        return

    await update.message.reply_text(
        f"Learned evaluation rubric '{title}' ✅ (topic: {topic}, scope: GLOBAL)"
    )


# ---------- TEACH FILE (Q&A sources) ----------
async def teachfile(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not require_admin(update):
        await update.message.reply_text("⛔ You are not allowed to teach from files.")
        return

    await show_typing(update, context)
    chat_id = update.effective_chat.id
    user = update.effective_user
    topic = get_current_topic(context)
    record_event(user.id, topic, kind="teachfile")

    await update.message.reply_text(
        "Got it ✅ Reading your file and extracting text to learn from it (Q&A)…"
    )
    doc = update.message.document
    if not doc:
        await update.message.reply_text(
            "Attach a PDF or DOCX and write /teachfile in the caption to train me from it."
        )
        return

    tgfile = await doc.get_file()
    file_bytes = await tgfile.download_as_bytearray()
    name = (doc.file_name or "upload").lower()

    try:
        if name.endswith(".pdf"):
            text = extract_text(io.BytesIO(file_bytes))
        elif name.endswith(".docx"):
            d = DocxDocument(io.BytesIO(file_bytes))
            text = "\n".join(p.text for p in d.paragraphs)
        else:
            await update.message.reply_text("Only PDF or DOCX are supported for /teachfile.")
            return
    except Exception as e:
        await update.message.reply_text(f"Could not read file: {e}")
        return

    parts = _chunk(text)
    if not parts:
        await update.message.reply_text("I couldn’t find any readable text in that file.")
        return

    col = get_collection(chat_id, topic)
    existing = col.get(where={"title": name, "type": "qa"})
    if existing and existing.get("ids"):
        await update.message.reply_text(
            f"'{name}' is already learned in topic: {topic}.\n"
            "Use /unlearn <title> to remove it first."
        )
        return

    try:
        ids = [new_doc_id(topic, "qa") for _ in range(len(parts))]
        metas = [
            {"title": name, "topic": topic, "part": i, "source": "file", "type": "qa"}
            for i in range(len(parts))
        ]
        col.add(ids=ids, metadatas=metas, documents=[safe_text_for_embedding(p) for p in parts])
    except Exception as e:
        await update.message.reply_text(
            "❌ Failed to learn from file (embedding/save error).\n"
            f"Error: {e}"
        )
        return

    await update.message.reply_text(
        f"Learned from file ✅ ({len(parts)} parts) in topic: {topic} (Q&A, scope: GLOBAL)"
    )


# ---------- TEACH FILE EVAL (EVALUATION sources) ----------
async def teachfile_eval(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not require_admin(update):
        await update.message.reply_text(
            "⛔ You are not allowed to teach evaluation rubrics from files."
        )
        return

    await show_typing(update, context)
    chat_id = update.effective_chat.id
    user = update.effective_user
    topic = get_current_topic(context)
    record_event(user.id, topic, kind="teachfile_eval")

    await update.message.reply_text(
        "Got it ✅ Reading your rubric file and extracting evaluation criteria…"
    )
    doc = update.message.document
    if not doc:
        await update.message.reply_text(
            "Attach a PDF or DOCX and write /teachfile_eval in the caption to teach an evaluation rubric."
        )
        return

    tgfile = await doc.get_file()
    file_bytes = await tgfile.download_as_bytearray()
    name = (doc.file_name or "upload").lower()

    try:
        if name.endswith(".pdf"):
            text = extract_text(io.BytesIO(file_bytes))
        elif name.endswith(".docx"):
            d = DocxDocument(io.BytesIO(file_bytes))
            text = "\n".join(p.text for p in d.paragraphs)
        else:
            await update.message.reply_text("Only PDF or DOCX are supported for /teachfile_eval.")
            return
    except Exception as e:
        await update.message.reply_text(f"Could not read file: {e}")
        return

    parts = _chunk(text)
    if not parts:
        await update.message.reply_text("I couldn’t find any readable text in that file.")
        return

    col = get_collection(chat_id, topic)
    existing = col.get(where={"title": name, "type": "evaluation"})
    if existing and existing.get("ids"):
        await update.message.reply_text(
            f"'{name}' is already learned in topic: {topic}.\n"
            "Use /unlearn <title> to remove it first."
        )
        return

    try:
        ids = [new_doc_id(topic, "eval") for _ in range(len(parts))]
        metas = [
            {"title": name, "topic": topic, "part": i, "source": "file", "type": "evaluation"}
            for i in range(len(parts))
        ]
        col.add(ids=ids, metadatas=metas, documents=[safe_text_for_embedding(p) for p in parts])
    except Exception as e:
        await update.message.reply_text(
            "❌ Failed to learn rubric from file (embedding/save error).\n"
            f"Error: {e}"
        )
        return

    await update.message.reply_text(
        f"Learned evaluation rubric from file ✅ ({len(parts)} parts) in topic: {topic} (scope: GLOBAL)"
    )


# ---------- TEACH LINK (Q&A) ----------
async def teachlink(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not require_admin(update):
        await update.message.reply_text("⛔ You are not allowed to teach from links.")
        return

    await show_typing(update, context)
    chat_id = update.effective_chat.id
    user = update.effective_user
    topic = get_current_topic(context)
    record_event(user.id, topic, kind="teachlink")

    msg_text = extract_command_text(update)
    rest = strip_command(msg_text, "teachlink")
    if not rest:
        await update.message.reply_text("Use: /teachlink <url>")
        return

    url = rest.strip()
    await update.message.reply_text("Got it ✅ Fetching content from link and learning from it (Q&A)…")

    try:
        downloaded = trafilatura.fetch_url(url)
        text = trafilatura.extract(downloaded)
    except Exception as e:
        await update.message.reply_text(f"Error while fetching the URL: {e}")
        return

    if not text:
        await update.message.reply_text("Couldn't extract readable text from that link.")
        return

    chunks = _chunk(text)
    if not chunks:
        await update.message.reply_text("The page did not contain enough text to learn from.")
        return

    col = get_collection(chat_id, topic)
    existing = col.get(where={"title": url, "type": "qa"})
    if existing and existing.get("ids"):
        await update.message.reply_text(
            f"This link is already learned in topic: {topic}.\nUse /unlearn <url> to remove it first."
        )
        return

    try:
        ids = [new_doc_id(topic, "qa") for _ in range(len(chunks))]
        metas = [
            {"title": url, "topic": topic, "part": i, "source": "link", "type": "qa"}
            for i in range(len(chunks))
        ]
        col.add(ids=ids, metadatas=metas, documents=[safe_text_for_embedding(c) for c in chunks])
    except Exception as e:
        await update.message.reply_text(f"❌ Failed to learn from link: {e}")
        return

    await update.message.reply_text(
        f"Learned from link ✅ ({len(chunks)} parts) in topic: {topic} (Q&A, scope: GLOBAL)"
    )


# ---------- TEACH LINK EVAL (EVALUATION sources) ----------
async def teachlink_eval(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not require_admin(update):
        await update.message.reply_text(
            "⛔ You are not allowed to teach evaluation material from links."
        )
        return

    await show_typing(update, context)
    chat_id = update.effective_chat.id
    user = update.effective_user
    topic = get_current_topic(context)
    record_event(user.id, topic, kind="teachlink_eval")

    msg_text = extract_command_text(update)
    rest = strip_command(msg_text, "teachlink_eval")
    if not rest:
        await update.message.reply_text("Use: /teachlink_eval <url>")
        return

    url = rest.strip()
    await update.message.reply_text(
        "Got it ✅ Fetching content from link and learning it as evaluation / rubric material…"
    )

    try:
        downloaded = trafilatura.fetch_url(url)
        text = trafilatura.extract(downloaded)
    except Exception as e:
        await update.message.reply_text(f"Error while fetching the URL: {e}")
        return

    if not text:
        await update.message.reply_text("Couldn't extract readable text from that link.")
        return

    chunks = _chunk(text)
    if not chunks:
        await update.message.reply_text("The page did not contain enough text to learn from.")
        return

    col = get_collection(chat_id, topic)
    existing = col.get(where={"title": url, "type": "evaluation"})
    if existing and existing.get("ids"):
        await update.message.reply_text(
            f"This link is already learned in topic: {topic}.\nUse /unlearn <url> to remove it first."
        )
        return

    try:
        ids = [new_doc_id(topic, "eval") for _ in range(len(chunks))]
        metas = [
            {"title": url, "topic": topic, "part": i, "source": "link", "type": "evaluation"}
            for i in range(len(chunks))
        ]
        col.add(ids=ids, metadatas=metas, documents=[safe_text_for_embedding(c) for c in chunks])
    except Exception as e:
        await update.message.reply_text(f"❌ Failed to learn evaluation material from link: {e}")
        return

    await update.message.reply_text(
        f"Learned evaluation material from link ✅ ({len(chunks)} parts) in topic: {topic} (scope: GLOBAL)"
    )


# ---------- TEACH IMAGE (Q&A) ----------
async def teachimage(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not require_admin(update):
        await update.message.reply_text("⛔ You are not allowed to teach from images.")
        return

    await show_typing(update, context)
    chat_id = update.effective_chat.id
    user = update.effective_user
    topic = get_current_topic(context)
    record_event(user.id, topic, kind="teachimage")

    photos = update.message.photo or []
    if not photos:
        await update.message.reply_text("Please send a clear image with caption:\n/teachimage <title>")
        return

    caption = (update.message.caption or "").strip()
    title = None
    if is_caption_command(caption, "teachimage"):
        rest = strip_command(caption, "teachimage")
        title = rest.strip() if rest.strip() else None

    largest = photos[-1]
    tgfile = await largest.get_file()
    if not title:
        title = f"image_{tgfile.file_unique_id}"

    await update.message.reply_text(
        f"Got it ✅ Reading your image for topic '{topic}' and extracting text to learn from it…"
    )

    img_bytes = await tgfile.download_as_bytearray()

    try:
        extracted = extract_text_from_image_bytes(img_bytes)
    except Exception as e:
        await update.message.reply_text(f"Could not extract text from image: {e}")
        return

    if not extracted.strip():
        await update.message.reply_text("I couldn't read any text from that image.")
        return

    parts = _chunk(extracted)
    if not parts:
        await update.message.reply_text("The extracted text was too short to learn from.")
        return

    col = get_collection(chat_id, topic)
    existing = col.get(where={"title": title, "type": "qa"})
    if existing and existing.get("ids"):
        await update.message.reply_text(
            f"'{title}' is already learned in topic: {topic}.\nUse /unlearn <title> to remove it first if needed."
        )
        return

    try:
        ids = [new_doc_id(topic, "qa") for _ in range(len(parts))]
        metas = [
            {"title": title, "topic": topic, "part": i, "source": "image", "type": "qa"}
            for i in range(len(parts))
        ]
        col.add(ids=ids, metadatas=metas, documents=[safe_text_for_embedding(p) for p in parts])
    except Exception as e:
        await update.message.reply_text(f"❌ Failed to learn from image: {e}")
        return

    await update.message.reply_text(
        f"Learned from image '{title}' ✅ ({len(parts)} parts) in topic: {topic} (Q&A, scope: GLOBAL)"
    )


# ---------- SOURCES ----------
async def sources_all(update: Update, context: ContextTypes.DEFAULT_TYPE):
    logging.info("🔥 /sources_all handler hit")
    client = chroma
    collections = client.list_collections()

    if not collections:
        await update.message.reply_text("No sources stored yet.")
        return

    source_stats = {}
    total_bytes = 0
    total_chunks = 0

    for col_info in collections:
        col_name = col_info.name if hasattr(col_info, "name") else col_info.get("name")
        if not col_name:
            continue
        col = client.get_collection(col_name)
        data = col.get(include=["documents", "metadatas"])

        docs = data.get("documents", [])
        metas = data.get("metadatas", [])

        for doc, meta in zip(docs, metas):
            title = (meta or {}).get("title", "Untitled")
            size_bytes = len((doc or "").encode("utf-8"))

            if title not in source_stats:
                source_stats[title] = {"chunks": 0, "bytes": 0}

            source_stats[title]["chunks"] += 1
            source_stats[title]["bytes"] += size_bytes

            total_chunks += 1
            total_bytes += size_bytes

    lines = []
    for title, stats in sorted(source_stats.items(), key=lambda x: x[1]["bytes"], reverse=True):
        mb = stats["bytes"] / (1024 * 1024)
        lines.append(f"• {title}: {stats['chunks']} chunks, {mb:.2f} MB")

    total_mb = total_bytes / (1024 * 1024)
    msg = (
        "📚 ALL BOT SOURCES (ALL TOPICS, GLOBAL)\n\n"
        f"Total chunks: {total_chunks}\n"
        f"Total text size: {total_mb:.2f} MB\n\n"
        + "\n".join(lines)
    )
    await send_long(update, msg)


async def sources(update: Update, context: ContextTypes.DEFAULT_TYPE):
    logging.info("🔥 /sources handler hit")
    chat_id = update.effective_chat.id
    topic = get_current_topic(context)
    col = get_collection(chat_id, topic)

    data = col.get(include=["metadatas"])
    metas = data.get("metadatas") or []

    if not metas:
        await update.message.reply_text(
            f"📌 Active topic: {topic}\nNo sources yet. (Global collection is empty.)"
        )
        return

    qa_titles = []
    eval_titles = []
    for m in metas:
        title = (m or {}).get("title", "Untitled")
        source_type = (m or {}).get("type", "qa")
        if source_type == "evaluation":
            eval_titles.append(title)
        else:
            qa_titles.append(title)

    qa_titles = list(dict.fromkeys(qa_titles))
    eval_titles = list(dict.fromkeys(eval_titles))

    lines = [f"📌 Active topic: {topic} (GLOBAL)\n"]
    if eval_titles:
        lines.append("📘 Evaluation Rubrics:")
        for t in eval_titles:
            lines.append(f"• {t}")
        lines.append("")
    if qa_titles:
        lines.append("📗 Q&A Sources:")
        for t in qa_titles:
            lines.append(f"• {t}")

    await update.message.reply_text("\n".join(lines))


# ---------- UNLEARN ----------
async def unlearn(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not require_admin(update):
        await update.message.reply_text("⛔ You are not allowed to remove global sources.")
        return

    await show_typing(update, context)
    chat_id = update.effective_chat.id
    user = update.effective_user
    topic = get_current_topic(context)
    record_event(user.id, topic, kind="unlearn")

    text = extract_command_text(update)
    rest = strip_command(text, "unlearn")
    if not rest:
        await update.message.reply_text("Usage: /unlearn <exact title shown in /sources>")
        return

    title = rest.strip()
    col = get_collection(chat_id, topic)
    to_delete = col.get(where={"title": title})
    removed = len((to_delete or {}).get("ids") or [])

    if removed == 0:
        await update.message.reply_text(
            f"No source titled '{title}' found in topic: {topic} (GLOBAL)."
        )
        return

    col.delete(where={"title": title})
    await update.message.reply_text(
        f"Removed '{title}' ✅ ({removed} parts) from topic: {topic} (GLOBAL)"
    )


# ---------- CLEAR ----------
async def clear(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not require_admin(update):
        await update.message.reply_text("⛔ You are not allowed to clear global knowledge.")
        return

    await show_typing(update, context)
    user = update.effective_user
    topic = get_current_topic(context)
    record_event(user.id, topic, kind="clear")

    collection_name = f"{COLLECTION_PREFIX}_{topic}"
    try:
        chroma.delete_collection(collection_name)
        await update.message.reply_text(f"Forgot everything 🧹 (topic: {topic}, scope: GLOBAL)")
    except Exception as e:
        logging.warning(f"Could not delete collection {collection_name}: {e}")
        await update.message.reply_text(
            f"Didn't find any stored sources to clear for topic: {topic} (GLOBAL)."
        )


# ---------- EVALUATION HELPERS ----------
def _eval_context_from_collection(col, extra_query: str = ""):
    eval_docs = []
    qa_docs = []
    try:
        res_eval = col.query(
            query_texts=["evaluation criteria", "guidelines", "rubric", extra_query],
            where={"type": "evaluation"},
            n_results=6,
        )
        eval_docs = res_eval.get("documents", [[]])[0]
    except Exception:
        eval_docs = []

    try:
        res_qa = col.query(
            query_texts=["tips", "examples", "advice", extra_query],
            where={"type": "qa"},
            n_results=6,
        )
        qa_docs = res_qa.get("documents", [[]])[0]
    except Exception:
        qa_docs = []

    docs = (eval_docs or []) + (qa_docs or [])
    return "\n\n---\n\n".join(docs) if docs else ""


async def run_eval_followup(update: Update, context: ContextTypes.DEFAULT_TYPE, user_request: str):
    """
    REWRITE MODE (apply feedback) — returns ONLY revised text (no commentary).
    """
    await show_typing(update, context)
    chat_id = update.effective_chat.id
    user = update.effective_user

    topic = context.user_data.get("last_eval_topic") or get_current_topic(context)
    pretty_topic = _pretty_topic_for_eval(topic)

    student_text = (context.user_data.get("last_eval_text") or "").strip()
    prior_feedback = (context.user_data.get("last_eval_feedback") or "").strip()

    if not student_text:
        await update.message.reply_text(
            "✅ Evaluation follow-up is ON, but I don’t have your last text saved.\n\n"
            "Please paste the full text again (or upload PDF/DOCX), then I’ll apply feedback."
        )
        return

    record_event(user.id, topic, kind="eval_followup")

    col = get_collection(chat_id, topic)
    context_block = _eval_context_from_collection(col, extra_query=pretty_topic)
    sys_role = _sys_role_for_eval(topic)

    messages = [
        {
            "role": "system",
            "content": (
                sys_role
                + "\n\nRules:\n"
                "- Apply the prior feedback to revise the text.\n"
                "- If the request is vague (e.g., 'do the next step'), default to: "
                "smoother transitions + deeper reflection + stronger conclusion tied to the opening.\n"
                "- Keep the student's voice.\n"
                "- Output ONLY the revised text (no commentary)."
            ),
        },
        {"role": "system", "content": f"Guidelines + examples (may be empty):\n{context_block}"},
        {"role": "system", "content": f"Prior feedback to apply:\n{prior_feedback}"},
        {"role": "system", "content": f"Text to revise:\n{student_text}"},
        {"role": "user", "content": f"User request:\n{user_request}"},
    ]

    revised = openai_chat(model="gpt-4.1-mini", messages=messages, temperature=0.35)

    if revised and not revised.lower().startswith("error"):
        context.user_data["last_eval_text"] = revised

    await send_long(update, revised)


async def run_eval_question(update: Update, context: ContextTypes.DEFAULT_TYPE, user_question: str):
    """
    Q&A MODE (no triggers needed): answer ANY question about the last evaluated text.
    """
    await show_typing(update, context)
    chat_id = update.effective_chat.id
    user = update.effective_user

    topic = context.user_data.get("last_eval_topic") or get_current_topic(context)
    pretty_topic = _pretty_topic_for_eval(topic)

    student_text = (context.user_data.get("last_eval_text") or "").strip()
    prior_feedback = (context.user_data.get("last_eval_feedback") or "").strip()

    if not student_text:
        await update.message.reply_text(
            "✅ Evaluation follow-up is ON, but I don’t have your last text saved.\n\n"
            "Please paste the full text again (or upload PDF/DOCX), then ask your question."
        )
        return

    record_event(user.id, topic, kind="eval_qna")

    col = get_collection(chat_id, topic)
    context_block = _eval_context_from_collection(col, extra_query=pretty_topic)
    sys_role = _sys_role_for_eval_qna(topic)

    await update.message.reply_text("Got it ✅ Let me look at your last text and answer that…")

    messages = [
        {
            "role": "system",
            "content": (
                sys_role
                + "\n\nRules:\n"
                "- Answer the user's question directly.\n"
                "- If they ask about grammar, point out the most important issues and show corrected examples.\n"
                "- If they ask about structure, suggest specific fixes tied to their text.\n"
                "- Be concise (usually 6-12 sentences or short bullets).\n"
                "- Do NOT rewrite the entire document unless asked."
            ),
        },
        {"role": "system", "content": f"Guidelines + examples (may be empty):\n{context_block}"},
        {"role": "system", "content": f"Prior evaluation feedback (context):\n{prior_feedback}"},
        {"role": "system", "content": f"Student text:\n{student_text}"},
        {"role": "user", "content": f"Question:\n{user_question}"},
    ]

    a = openai_chat(model="gpt-4.1-mini", messages=messages, temperature=0.35)
    await send_long(update, a)


async def evaluate_file_for_topic(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await show_typing(update, context)
    chat_id = update.effective_chat.id
    user = update.effective_user
    topic = get_current_topic(context)
    record_event(user.id, topic, kind="eval")

    allowed = set(EVAL_TOPICS) | {"ielts_writing"}
    if topic not in allowed:
        await update.message.reply_text(
            "To evaluate an essay, recommendation, EC description, portfolio, or IELTS Writing, "
            "choose the correct menu first, then send the file."
        )
        return

    doc = update.message.document
    if not doc:
        await update.message.reply_text("Please attach a PDF or DOCX file.")
        return

    pretty_topic = _pretty_topic_for_eval(topic)
    await update.message.reply_text(f"Got it ✅ Reading your {pretty_topic} file…")

    tgfile = await doc.get_file()
    file_bytes = await tgfile.download_as_bytearray()
    name = (doc.file_name or "document").lower()

    try:
        if name.endswith(".pdf"):
            full_text = extract_text(io.BytesIO(file_bytes))
        elif name.endswith(".docx"):
            d = DocxDocument(io.BytesIO(file_bytes))
            full_text = "\n".join(p.text for p in d.paragraphs)
        else:
            await update.message.reply_text("Only PDF or DOCX are supported for evaluation.")
            return
    except Exception as e:
        await update.message.reply_text(f"Could not read file: {e}")
        return

    if not (full_text or "").strip():
        await update.message.reply_text("I couldn't read enough text from that file to evaluate.")
        return

    # For evaluation prompt (keep concise)
    parts = _chunk(full_text, max_chars=1500)
    student_text_for_eval = "\n\n---\n\n".join(parts[:5]) if parts else _truncate_for_storage(full_text, 4000)

    # For follow-up rewrites (store more)
    student_text_for_followup = _truncate_for_storage(full_text, 12000)

    await update.message.reply_text(f"Analyzing your {pretty_topic} against my guidelines…")

    col = get_collection(chat_id, topic)
    context_block = _eval_context_from_collection(col, extra_query=pretty_topic)

    if topic in {"essays_personal", "essays_supplemental"}:
        sys_role = (
            "You are an expert college admissions essay coach. "
            "Evaluate the student's essay. Focus on clarity, structure, voice, authenticity, and impact. "
            "Give specific, actionable feedback and suggestions."
        )
    elif topic == "recommendations":
        sys_role = (
            "You are an expert on college recommendation letters. "
            "Evaluate the letter in terms of specificity, credibility, depth of insight, and support for the student. "
            "Give constructive feedback and suggestions for improvement."
        )
    elif topic == "extracurriculars":
        sys_role = (
            "You are an expert on extracurricular strategy for college applications. "
            "Evaluate how well the activities are presented in terms of impact, leadership, continuity, and uniqueness. "
            "Give specific, practical suggestions to make the activities stand out."
        )
    elif topic == "ielts_writing":
        sys_role = (
            "You are an experienced IELTS Writing examiner. "
            "Evaluate the student's writing according to IELTS band descriptors. "
            "Comment on Task Response, Coherence and Cohesion, Lexical Resource, and Grammatical Range and Accuracy. "
            "Give an approximate band score and clear, actionable feedback."
        )
    else:  # portfolio
        sys_role = (
            "You are an expert college portfolio reviewer. "
            "Evaluate the portfolio in terms of coherence, originality, technical quality, and fit for selective colleges. "
            "Give specific, constructive feedback, not generic advice."
        )

    messages = [
        {"role": "system", "content": sys_role + " Use the guidelines and examples in the context when relevant."},
        {"role": "system", "content": f"Guidelines + examples (may be empty):\n{context_block}"},
        {"role": "user", "content": f"Here is the student's {pretty_topic}. Please evaluate it:\n\n{student_text_for_eval}"},
    ]

    a = openai_chat(model="gpt-4.1-mini", messages=messages, temperature=0.3)
    set_eval_context(context, topic, student_text_for_followup, a)
    await send_long(update, a)


async def evaluate_ielts_writing_image(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await show_typing(update, context)
    chat_id = update.effective_chat.id
    user = update.effective_user
    topic = "ielts_writing"
    record_event(user.id, topic, kind="eval")

    photos = update.message.photo or []
    if not photos:
        await update.message.reply_text("Please send a clear photo of your IELTS Writing answer.")
        return

    largest = photos[-1]
    tgfile = await largest.get_file()
    await update.message.reply_text("Got it ✅ Reading your IELTS Writing answer from the image…")
    img_bytes = await tgfile.download_as_bytearray()

    try:
        extracted = extract_text_from_image_bytes(img_bytes)
    except Exception as e:
        await update.message.reply_text(f"Could not extract text from image: {e}")
        return

    if not extracted.strip():
        await update.message.reply_text(
            "I couldn't read enough text from that image. Please try a clearer photo."
        )
        return

    student_text_for_followup = _truncate_for_storage(extracted, 12000)
    parts = _chunk(extracted, max_chars=1500)
    student_text_for_eval = "\n\n---\n\n".join(parts[:5]) if parts else _truncate_for_storage(extracted, 4000)

    await update.message.reply_text("Analyzing your IELTS Writing answer…")

    col = get_collection(chat_id, topic)
    context_block = _eval_context_from_collection(col, extra_query="IELTS Writing")

    sys_role = (
        "You are an experienced IELTS Writing examiner. "
        "Evaluate the student's writing according to IELTS Academic/General Writing band descriptors. "
        "Comment on Task Response, Coherence and Cohesion, Lexical Resource, and Grammatical Range and Accuracy. "
        "Give an approximate band score (like 6.0, 6.5, 7.0) and then clear, actionable feedback."
    )

    messages = [
        {"role": "system", "content": sys_role},
        {"role": "system", "content": f"IELTS writing rubrics and notes (may be empty):\n{context_block}"},
        {"role": "user", "content": f"Here is the student's IELTS Writing answer (from an image):\n\n{student_text_for_eval}"},
    ]

    a = openai_chat(model="gpt-4.1-mini", messages=messages, temperature=0.3)
    set_eval_context(context, topic, student_text_for_followup, a)
    await send_long(update, a)


async def evaluate_text_for_topic(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await show_typing(update, context)
    chat_id = update.effective_chat.id
    user = update.effective_user
    topic = get_current_topic(context)
    record_event(user.id, topic, kind="eval")

    allowed = set(EVAL_TOPICS) | {"ielts_writing"}
    if topic not in allowed:
        await update.message.reply_text(
            "Text evaluation is only available for Personal Statement, Supplemental Essays, "
            "Extracurriculars, Recommendation Letters, Portfolio, and IELTS Writing.\n\n"
            "Choose the correct topic first, then tap the Evaluation button again."
        )
        return

    raw = (update.message.text or "").strip()
    for marker in [BTN_PS_EVAL, BTN_SUPP_EVAL, BTN_EC_EVAL, BTN_REC_EVAL, BTN_IW_EVAL, BTN_PORT_EVAL]:
        raw = raw.replace(marker, "").strip()

    if len(raw) < 100:
        await update.message.reply_text(
            "The text is too short to evaluate. Please paste the full essay/letter/description."
        )
        return

    pretty_topic = _pretty_topic_for_eval(topic)

    student_text_for_followup = _truncate_for_storage(raw, 12000)
    parts = _chunk(raw, max_chars=1500)
    student_text_for_eval = "\n\n---\n\n".join(parts[:5])

    await update.message.reply_text(f"Got it ✅ Evaluating your {pretty_topic}…")

    col = get_collection(chat_id, topic)
    context_block = _eval_context_from_collection(col, extra_query=pretty_topic)

    if topic in {"essays_personal", "essays_supplemental"}:
        sys_role = (
            "You are an expert college admissions essay coach. "
            "Evaluate the student's essay. Focus on clarity, structure, voice, authenticity, and impact. "
            "Give specific, actionable feedback and suggestions."
        )
    elif topic == "recommendations":
        sys_role = (
            "You are an expert on college recommendation letters. "
            "Evaluate the letter in terms of specificity, credibility, depth of insight, and support for the student. "
            "Give constructive feedback and suggestions for improvement."
        )
    elif topic == "extracurriculars":
        sys_role = (
            "You are an expert on extracurricular strategy for college applications. "
            "Evaluate how well the activities are presented in terms of impact, leadership, continuity, and uniqueness. "
            "Give specific, practical suggestions to make the activities stand out."
        )
    elif topic == "ielts_writing":
        sys_role = (
            "You are an experienced IELTS Writing examiner. "
            "Evaluate the student's writing according to IELTS band descriptors. "
            "Comment on Task Response, Coherence and Cohesion, Lexical Resource, and Grammatical Range and Accuracy. "
            "Give an approximate band score and clear, actionable feedback."
        )
    else:  # portfolio
        sys_role = (
            "You are an expert college portfolio reviewer. "
            "Evaluate the portfolio description in terms of coherence, originality, technical quality, and fit for selective colleges. "
            "Give specific, constructive feedback, not generic advice."
        )

    messages = [
        {"role": "system", "content": sys_role + " Use the guidelines and examples in the context when available."},
        {"role": "system", "content": f"Guidelines + examples (may be empty):\n{context_block}"},
        {"role": "user", "content": f"Here is the student's {pretty_topic}. Please evaluate it:\n\n{student_text_for_eval}"},
    ]

    a = openai_chat(model="gpt-4.1-mini", messages=messages, temperature=0.3)
    set_eval_context(context, topic, student_text_for_followup, a)
    await send_long(update, a)


# ---------- DOCUMENT & PHOTO ROUTERS ----------
async def document_router(update: Update, context: ContextTypes.DEFAULT_TYPE):
    caption = (update.message.caption or "").strip()
    topic = get_current_topic(context)

    if is_caption_command(caption, "teachfile_eval"):
        await teachfile_eval(update, context)
        return
    if is_caption_command(caption, "teachfile"):
        await teachfile(update, context)
        return
    if is_caption_command(caption, "teachlink_eval"):
        await teachlink_eval(update, context)
        return
    if is_caption_command(caption, "teachlink"):
        await teachlink(update, context)
        return
    if is_caption_command(caption, "teachrubric"):
        await teachrubric(update, context)
        return

    if topic in (set(EVAL_TOPICS) | {"ielts_writing"}):
        await evaluate_file_for_topic(update, context)
        return

    await update.message.reply_text(
        "If you want me to LEARN from this file, send it again and write /teachfile, "
        "/teachfile_eval, /teachlink, or /teachlink_eval in the caption.\n\n"
        "If this is an essay, recommendation, EC description, portfolio, or IELTS Writing for feedback, "
        "choose the correct topic and tap its Evaluation button."
    )


async def photo_router(update: Update, context: ContextTypes.DEFAULT_TYPE):
    caption = (update.message.caption or "").strip()
    topic = get_current_topic(context)
    user = update.effective_user
    record_event(user.id, topic, kind="photo")

    if is_caption_command(caption, "teachimage"):
        await teachimage(update, context)
        return

    if topic == "ielts_writing":
        await evaluate_ielts_writing_image(update, context)
        return

    await update.message.reply_text(
        "I can learn from images too 🤖🖼\n\n"
        "If you want me to *learn* from this image (e.g., essay screenshot, rubric), "
        "send it again with caption:\n\n"
        "/teachimage <title>\n\n"
        "For IELTS Writing evaluation from an image, switch to IELTS Writing first."
    )


# ---------- STATS ----------
async def stats_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    stats = load_stats()
    total_users = len(stats.get("users", []))
    total_msgs = stats.get("messages_total", 0)
    topic_counts = stats.get("topic_counts", {})
    eval_counts = stats.get("eval_counts", {})

    if topic_counts:
        top_topics = sorted(topic_counts.items(), key=lambda kv: kv[1], reverse=True)[:5]
        topics_str = "\n".join(f"- {t}: {c} msgs" for t, c in top_topics)
    else:
        topics_str = "No topic data yet."

    total_evals = sum(eval_counts.values()) if eval_counts else 0

    msg = (
        f"📊 Bot analytics\n"
        f"- Unique users: {total_users}\n"
        f"- Total interactions (events): {total_msgs}\n"
        f"- Total evaluations: {total_evals}\n\n"
        f"Top topics:\n{topics_str}"
    )
    await update.message.reply_text(msg)


# ---------- BACKUP SOURCES ----------
async def backup_sources(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not require_admin(update):
        await update.message.reply_text("⛔ Admin only.")
        return

    await update.message.reply_text("📦 Backing up all sources…")

    data = {}
    client = chroma
    collections = client.list_collections()

    for col_info in collections:
        col_name = col_info.name if hasattr(col_info, "name") else col_info.get("name")
        if not col_name:
            continue
        col = client.get_collection(col_name)
        payload = col.get(include=["documents", "metadatas", "ids"])
        data[col_name] = payload

    path = os.path.join(DATA_DIR, "backup_sources.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    await update.message.reply_text(
        f"✅ Backup completed.\nSaved to:\n{path}\n\nYou can download it from your server volume."
    )


# ---------- HEALTH CHECK ----------
async def health(update: Update, context: ContextTypes.DEFAULT_TYPE):
    checks = []

    try:
        _ = openai_chat(
            model="gpt-4.1-mini",
            messages=[{"role": "user", "content": "ping"}],
            temperature=0.0,
            max_tokens=5,
        )
        checks.append("✅ OpenAI: OK")
    except Exception as e:
        checks.append(f"❌ OpenAI: {e}")

    try:
        test_col = chroma.get_or_create_collection("health_check", embedding_function=emb_fn)
        # add + delete to avoid infinite growth
        test_id = uuid.uuid4().hex
        test_col.add(ids=[test_id], documents=["pong"], metadatas=[{"type": "health"}])
        try:
            test_col.delete(ids=[test_id])
        except Exception:
            pass
        checks.append("✅ Chroma: writable")
    except Exception as e:
        checks.append(f"❌ Chroma: {e}")

    try:
        test_path = os.path.join(DATA_DIR, "health.txt")
        with open(test_path, "w", encoding="utf-8") as f:
            f.write("ok")
        os.remove(test_path)
        checks.append(f"✅ Volume: writable ({DATA_DIR})")
    except Exception as e:
        checks.append(f"❌ Volume: {e}")

    await update.message.reply_text("🧪 Health Check\n\n" + "\n".join(checks))


# ---------- NEW FEATURE HELPERS ----------
def set_pending_feature(context: ContextTypes.DEFAULT_TYPE, feature: str | None):
    context.user_data["pending_feature"] = feature


async def run_brainstorm(update: Update, context: ContextTypes.DEFAULT_TYPE, description: str):
    await show_typing(update, context)
    topic = get_current_topic(context)
    user = update.effective_user
    chat_id = update.effective_chat.id
    record_event(user.id, topic, kind="brainstorm")

    nice_topic = FRIENDLY_TOPIC_NAMES.get(topic, topic)

    col = get_collection(chat_id, topic)
    try:
        res = col.query(query_texts=[description], n_results=6)
        docs = res.get("documents", [[]])[0]
    except Exception:
        docs = []
    context_block = "\n\n---\n\n".join(docs) if docs else ""

    sys = (
        f"You are an admissions mentor helping a student brainstorm ideas for {nice_topic}.\n"
        "- Give 3-5 short bullet ideas or angles.\n"
        "- Each bullet should be 1-2 concise sentences.\n"
        "- Focus on realistic, personal, and application-relevant ideas.\n"
        "- Keep the tone friendly, specific, and not generic."
    )

    messages = [{"role": "system", "content": sys}]
    if context_block:
        messages.append(
            {"role": "system", "content": f"Program-specific notes and examples (may be empty):\n{context_block}"}
        )
    messages.append({"role": "user", "content": "Here is the student's situation:\n\n" + description})

    a = openai_chat(model="gpt-4.1-mini", messages=messages, temperature=0.5)
    await send_long(update, a)


async def brainstorm_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = (update.message.text or "").strip()
    parts = text.split(maxsplit=1)
    if len(parts) < 2:
        set_pending_feature(context, "brainstorm")
        await update.message.reply_text(
            "🧠 Brainstorm mode ON.\n\nBriefly tell me about yourself, your target major, and what you want to write about."
        )
        return
    await run_brainstorm(update, context, parts[1].strip())


async def run_rewrite(update: Update, context: ContextTypes.DEFAULT_TYPE, text_to_fix: str):
    await show_typing(update, context)
    topic = get_current_topic(context)
    user = update.effective_user
    chat_id = update.effective_chat.id
    record_event(user.id, topic, kind="rewrite")

    nice_topic = FRIENDLY_TOPIC_NAMES.get(topic, topic)

    col = get_collection(chat_id, topic)
    try:
        res = col.query(query_texts=[text_to_fix], n_results=6)
        docs = res.get("documents", [[]])[0]
    except Exception:
        docs = []
    context_block = "\n\n---\n\n".join(docs) if docs else ""

    sys = (
        f"You are an admissions writing coach helping improve a student's {nice_topic} text.\n"
        "- Rewrite the text to be clearer, more natural, and slightly more mature.\n"
        "- Preserve the student's original meaning and main ideas.\n"
        "- Keep roughly similar length (do not double it).\n"
        "- Use a human, conversational but polished tone.\n"
        "- Reply ONLY with the revised text, no explanations."
    )

    messages = [{"role": "system", "content": sys}]
    if context_block:
        messages.append(
            {"role": "system", "content": f"Program-specific notes and examples (may be empty):\n{context_block}"}
        )
    messages.append({"role": "user", "content": text_to_fix})

    a = openai_chat(model="gpt-4.1-mini", messages=messages, temperature=0.4)
    await send_long(update, a)


async def rewrite_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = (update.message.text or "").strip()
    parts = text.split(maxsplit=1)
    if len(parts) < 2:
        set_pending_feature(context, "rewrite")
        await update.message.reply_text("✍️ Rewrite mode ON.\n\nSend me the paragraph or essay you want me to improve.")
        return
    await run_rewrite(update, context, parts[1].strip())


async def run_plan(update: Update, context: ContextTypes.DEFAULT_TYPE, description: str):
    await show_typing(update, context)
    user = update.effective_user
    topic = get_current_topic(context)
    chat_id = update.effective_chat.id
    record_event(user.id, topic, kind="plan")

    col = get_collection(chat_id, topic)
    try:
        res = col.query(query_texts=[description], n_results=6)
        docs = res.get("documents", [[]])[0]
    except Exception:
        docs = []
    context_block = "\n\n---\n\n".join(docs) if docs else ""

    sys = (
        "You are an admissions strategy mentor.\n"
        "- Based on the student's situation, create a concise application plan.\n"
        "- Organize it into short bullet points under 3 headings: Academics & Testing, Essays & Recs, Activities & Extras.\n"
        "- Keep total response around 120-200 words.\n"
        "- Focus on practical next steps, not theory."
    )

    messages = [{"role": "system", "content": sys}]
    if context_block:
        messages.append({"role": "system", "content": f"Program-specific planning notes (may be empty):\n{context_block}"})
    messages.append({"role": "user", "content": "Here is my situation:\n\n" + description})

    a = openai_chat(model="gpt-4.1-mini", messages=messages, temperature=0.5)
    await send_long(update, a)


async def plan_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["topic"] = "application_plan"
    text = (update.message.text or "").strip()
    parts = text.split(maxsplit=1)
    if len(parts) < 2:
        set_pending_feature(context, "plan")
        await update.message.reply_text(
            "📅 Application Plan mode ON.\n\nTell me your grade, target countries, intended major, test scores (if any), and your rough deadlines.",
            reply_markup=plan_keyboard(),
        )
        return
    await run_plan(update, context, parts[1].strip())


async def run_recpacket(update: Update, context: ContextTypes.DEFAULT_TYPE, description: str):
    await show_typing(update, context)
    user = update.effective_user
    topic = get_current_topic(context)
    record_event(user.id, topic, kind="recpacket")

    sys = (
        "You are creating a recommendation letter 'brag sheet' for a teacher.\n"
        "- Output in 3 short sections:\n"
        "  1) 3-5 sentence summary the student can give the teacher.\n"
        "  2) Bullet list of key achievements/impacts.\n"
        "  3) Bullet list of personal qualities and 2-3 specific story ideas.\n"
        "- Keep it concise and realistic for competitive admissions."
    )

    messages = [{"role": "system", "content": sys}, {"role": "user", "content": description}]
    a = openai_chat(model="gpt-4.1-mini", messages=messages, temperature=0.5)
    await send_long(update, a)


async def recpacket_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = (update.message.text or "").strip()
    parts = text.split(maxsplit=1)
    if len(parts) < 2:
        set_pending_feature(context, "recpacket")
        await update.message.reply_text(
            "✉️ Rec Letter Packet mode ON.\n\nTell me which teacher will write your rec, what classes you took with them, your achievements, and what you want them to highlight."
        )
        return
    await run_recpacket(update, context, parts[1].strip())


async def run_schoolfinder(update: Update, context: ContextTypes.DEFAULT_TYPE, description: str):
    await show_typing(update, context)
    user = update.effective_user
    topic = get_current_topic(context)
    chat_id = update.effective_chat.id
    record_event(user.id, topic, kind="schoolfinder")

    col = get_collection(chat_id, topic)
    try:
        res = col.query(query_texts=[description], n_results=6)
        docs = res.get("documents", [[]])[0]
    except Exception:
        docs = []
    context_block = "\n\n---\n\n".join(docs) if docs else ""

    sys = (
        "You are a university match advisor.\n"
        "- Based on the student's stats and preferences, suggest Reach, Match, and Safety school types and a few example universities.\n"
        "- For each category, give 2-4 example schools and 1-2 bullets about why they fit.\n"
        "- Keep total response concise (around 150-220 words).\n"
        "- Make it clear this is an approximate starting point and they must research details themselves."
    )

    messages = [{"role": "system", "content": sys}]
    if context_block:
        messages.append(
            {"role": "system", "content": f"Program-specific school lists/notes (may be empty):\n{context_block}"}
        )
    messages.append({"role": "user", "content": description})

    a = openai_chat(model="gpt-4.1-mini", messages=messages, temperature=0.6)
    await send_long(update, a)


async def schoolfinder_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data["topic"] = "school_finder"
    text = (update.message.text or "").strip()
    parts = text.split(maxsplit=1)
    if len(parts) < 2:
        set_pending_feature(context, "schoolfinder")
        await update.message.reply_text(
            "🏫 School Finder mode ON.\n\nSend me your GPA, tests, budget, target countries, intended major, and constraints (e.g. need scholarship).",
            reply_markup=schoolfinder_keyboard(),
        )
        return
    await run_schoolfinder(update, context, parts[1].strip())


async def run_portfolioideas(update: Update, context: ContextTypes.DEFAULT_TYPE, description: str):
    await show_typing(update, context)
    user = update.effective_user
    topic = get_current_topic(context)
    record_event(user.id, topic, kind="portfolioideas")

    sys = (
        "You are a portfolio mentor for university applications.\n"
        "- Based on the student's field (e.g. CS, design, art, film, business) and interests, suggest 3-6 concrete project ideas.\n"
        "- Each idea should be 1-2 sentences, focused on impact and what it shows about the student.\n"
        "- Make ideas realistic for a high school student, but impressive."
    )

    messages = [{"role": "system", "content": sys}, {"role": "user", "content": description}]
    a = openai_chat(model="gpt-4.1-mini", messages=messages, temperature=0.6)
    await send_long(update, a)


async def portfolioideas_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = (update.message.text or "").strip()
    parts = text.split(maxsplit=1)
    if len(parts) < 2:
        set_pending_feature(context, "portfolioideas")
        await update.message.reply_text(
            "🖼️ Portfolio Ideas mode ON.\n\nTell me your field (CS, design, art, film, etc.), your skills, and the kind of programs you are targeting."
        )
        return
    await run_portfolioideas(update, context, parts[1].strip())


# ---------- MAIN ANSWER ----------
async def answer(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = (update.message.text or "").strip()
    if text.startswith("/"):
        return

    logging.info(f"💬 TEXT RECEIVED: {update.message.text}")

    chat_id = update.effective_chat.id
    user = update.effective_user
    q = text

    topic_before = get_current_topic(context)
    record_event(user.id, topic_before, kind="message")

    # ---- BACK ----
    if is_back_message(q):
        clear_eval_context(context)
        context.user_data["pending_feature"] = None
        context.user_data["topic"] = DEFAULT_TOPIC
        await update.message.reply_text(
            "Back to main menu. You're now in general mode - you can just ask questions or choose a section again.",
            reply_markup=main_menu_keyboard(),
        )
        return

    # quick cancel (optional)
    if q.lower() in {"cancel", "stop", "exit"} and context.user_data.get("eval_active", False):
        clear_eval_context(context)
        await update.message.reply_text("✅ Stopped evaluation follow-up mode.")
        return

    # --- pending feature input ---
    pending = context.user_data.get("pending_feature")
    if pending:
        context.user_data["pending_feature"] = None
        if pending == "brainstorm":
            await run_brainstorm(update, context, q)
            return
        if pending == "rewrite":
            await run_rewrite(update, context, q)
            return
        if pending == "plan":
            await run_plan(update, context, q)
            return
        if pending == "recpacket":
            await run_recpacket(update, context, q)
            return
        if pending == "schoolfinder":
            await run_schoolfinder(update, context, q)
            return
        if pending == "portfolioideas":
            await run_portfolioideas(update, context, q)
            return

    # ---- MAIN MENUS ----
    if q == BTN_ESSAY:
        clear_eval_context(context)
        await send_with_image(
            update,
            "Essays selected.\nChoose Personal Statement or Supplemental Essays.",
            reply_markup=essay_main_keyboard(),
            image_key="essays_main",
        )
        return

    if q == BTN_SAT:
        clear_eval_context(context)
        await send_with_image(
            update,
            "SAT selected. Choose a section:",
            reply_markup=sat_menu_keyboard(),
            image_key="sat_main",
        )
        return

    if q == BTN_IELTS:
        clear_eval_context(context)
        await send_with_image(
            update,
            "IELTS selected. Choose a section.",
            reply_markup=ielts_main_keyboard(),
            image_key="ielts_main",
        )
        return

    if q == BTN_PLAN_MAIN:
        clear_eval_context(context)
        context.user_data["topic"] = "application_plan"
        set_pending_feature(context, "plan")
        await send_with_image(
            update,
            "📅 Application Plan mode ON.\n\nTell me your grade, target countries, intended major, test scores (if any), and your rough deadlines.",
            reply_markup=plan_keyboard(),
            image_key="plan_main",
        )
        return

    if q == BTN_SF_MAIN:
        clear_eval_context(context)
        context.user_data["topic"] = "school_finder"
        set_pending_feature(context, "schoolfinder")
        await send_with_image(
            update,
            "🏫 School Finder mode ON.\n\nSend me your GPA (or approximate), test scores (if any), budget, target countries, intended major, and constraints (e.g. need scholarship).",
            reply_markup=schoolfinder_keyboard(),
            image_key="schoolfinder_main",
        )
        return

    # ---- TOPIC BUTTONS ----
    if q == BTN_ESSAY_PS:
        clear_eval_context(context)
        topic = TOPIC_KEYS[q]
        context.user_data["topic"] = topic
        await send_with_image(
            update,
            "Great, let's work on your Personal Statement.\nAsk about structure, voice, and storytelling.",
            reply_markup=essay_ps_keyboard(),
            image_key="essays_personal",
        )
        await update.message.reply_text(
            "For detailed feedback, tap '✅ Personal Statement Evaluation' and then upload PDF/DOCX or paste the text.\n\n"
            "After I evaluate, you can ask *any* follow-up question about your essay — or say: "
            "'apply this feedback', 'rewrite the conclusion', or 'do the next step'."
        )
        return

    if q == BTN_ESSAY_SUPP:
        clear_eval_context(context)
        topic = TOPIC_KEYS[q]
        context.user_data["topic"] = topic
        await send_with_image(
            update,
            "Great, let's work on your Supplemental Essays.\nAsk about 'Why us', community essays, and short prompts.",
            reply_markup=essay_supp_keyboard(),
            image_key="essays_supplemental",
        )
        await update.message.reply_text(
            "For detailed feedback, tap '✅ Supplemental Essay Evaluation' and then upload PDF/DOCX or paste the text.\n\n"
            "After I evaluate, you can ask *any* follow-up question about your essay — or say: "
            "'apply this feedback' or 'rewrite the ending'."
        )
        return

    if q == BTN_EC:
        clear_eval_context(context)
        context.user_data["topic"] = "extracurriculars"
        await send_with_image(
            update,
            "Great, let's talk about your Extracurricular activities.\nAsk how to present impact, leadership, and long-term involvement.",
            reply_markup=ec_keyboard(),
            image_key="extracurriculars",
        )
        await update.message.reply_text(
            "For feedback, click '✅ Extracurricular Evaluation' and then upload PDF/DOCX or paste your EC descriptions.\n"
            "After I evaluate, you can ask any follow-up questions about your EC text."
        )
        return

    if q == BTN_EC_PROGRAMS:
        await update.message.reply_text(
            "🌍 Here is a list of top extracurricular programs and opportunities:\n\n"
            "https://docs.google.com/spreadsheets/d/1D-UlJGrg32Ib-9Rvm9y7lKkE6jkx3EK-Kb_qJ6G3tos/edit?usp=sharing\n"
        )
        return

    if q == BTN_REC:
        clear_eval_context(context)
        context.user_data["topic"] = "recommendations"
        await send_with_image(
            update,
            "Great, let's work on Recommendation Letters.\nAsk how to request them and what makes a strong letter.",
            reply_markup=rec_keyboard(),
            image_key="recommendations",
        )
        await update.message.reply_text(
            "You can:\n- Tap '✅ Rec Letter Evaluation' to get feedback on a draft.\n- Tap '📄 Rec Letter Packet' to build a brag sheet."
        )
        return

    if q == BTN_PORT:
        clear_eval_context(context)
        context.user_data["topic"] = "portfolio"
        await send_with_image(
            update,
            "You're now in Portfolio Check.\nAsk about structure and how to present your work.",
            reply_markup=portfolio_keyboard(),
            image_key="portfolio",
        )
        await update.message.reply_text(
            "You can upload PDF/DOCX for detailed feedback (✅ Portfolio Evaluation), or tap '💡 Portfolio Ideas'."
        )
        return

    if q in {BTN_SAT_MATH, BTN_SAT_ENGLISH}:
        clear_eval_context(context)
        topic = TOPIC_KEYS[q]
        context.user_data["topic"] = topic
        nice_name = "SAT Math" if topic == "sat_math" else "SAT English"
        image_key = "sat_math" if topic == "sat_math" else "sat_english"
        await send_with_image(
            update,
            f"You're now in {nice_name}. Ask anything.",
            reply_markup=sat_menu_keyboard(),
            image_key=image_key,
        )
        return

    if q in {BTN_IELTS_READING, BTN_IELTS_LISTENING, BTN_IELTS_SPEAKING}:
        clear_eval_context(context)
        topic = TOPIC_KEYS[q]
        context.user_data["topic"] = topic
        await send_with_image(
            update,
            f"You're now in {FRIENDLY_TOPIC_NAMES.get(topic, topic)}. Ask anything.",
            reply_markup=ielts_main_keyboard(),
            image_key=topic,
        )
        return

    if q == BTN_IELTS_WRITING:
        clear_eval_context(context)
        context.user_data["topic"] = "ielts_writing"
        await send_with_image(
            update,
            "You're now in IELTS Writing.\nAsk about Task 1/2, band 7+ strategies, or send your answer for feedback.",
            reply_markup=ielts_writing_keyboard(),
            image_key="ielts_writing",
        )
        await update.message.reply_text(
            "For evaluation, click '✅ Writing Evaluation' then send your answer as text, PDF/DOCX, or a clear photo.\n"
            "After I evaluate, you can ask any follow-up question about your answer."
        )
        return

    # ---- FEATURE BUTTONS ----
    if q == BTN_BRAINSTORM:
        set_pending_feature(context, "brainstorm")
        await update.message.reply_text(
            "🧠 Brainstorm mode ON.\n\nBriefly tell me about yourself, your target major, and what you want to write about."
        )
        return

    if q == BTN_REWRITE:
        set_pending_feature(context, "rewrite")
        await update.message.reply_text("✍️ Rewrite mode ON.\n\nSend me the paragraph or essay you want me to improve.")
        return

    if q == BTN_REC_PACKET:
        set_pending_feature(context, "recpacket")
        await update.message.reply_text(
            "✉️ Rec Letter Packet mode ON.\n\nTell me which teacher will write your rec, what classes you took, your achievements, and what you want highlighted."
        )
        return

    if q == BTN_PORTFOLIO_IDEAS:
        set_pending_feature(context, "portfolioideas")
        await update.message.reply_text(
            "💡 Portfolio Ideas mode ON.\n\nTell me your field (CS, design, art, film, etc.), your skills, and target programs."
        )
        return

    # ---- EVALUATION BUTTONS ----
    if q == BTN_PS_EVAL:
        clear_eval_context(context)
        context.user_data["topic"] = "essays_personal"
        context.user_data["eval_active"] = True
        context.user_data["last_eval_topic"] = "essays_personal"
        await update.message.reply_text(
            "Personal Statement Evaluation mode ON ✅\n\nNow paste your Personal Statement (100+ words) or upload PDF/DOCX.\n"
            "After I evaluate, you can ask any follow-up question — or say: 'apply this feedback', 'rewrite the conclusion', or 'do the next step'."
        )
        return

    if q == BTN_SUPP_EVAL:
        clear_eval_context(context)
        context.user_data["topic"] = "essays_supplemental"
        context.user_data["eval_active"] = True
        context.user_data["last_eval_topic"] = "essays_supplemental"
        await update.message.reply_text(
            "Supplemental Essay Evaluation mode ON ✅\n\nNow paste your essay (100+ words) or upload PDF/DOCX.\n"
            "After I evaluate, you can ask any follow-up question — or say: 'apply this feedback' or 'rewrite the ending'."
        )
        return

    if q == BTN_EC_EVAL:
        clear_eval_context(context)
        context.user_data["topic"] = "extracurriculars"
        context.user_data["eval_active"] = True
        context.user_data["last_eval_topic"] = "extracurriculars"
        await update.message.reply_text(
            "Extracurricular Evaluation mode ON ✅\n\nNow paste your EC descriptions or upload PDF/DOCX."
        )
        return

    if q == BTN_REC_EVAL:
        clear_eval_context(context)
        context.user_data["topic"] = "recommendations"
        context.user_data["eval_active"] = True
        context.user_data["last_eval_topic"] = "recommendations"
        await update.message.reply_text(
            "Rec Letter Evaluation mode ON ✅\n\nNow paste the draft letter or upload PDF/DOCX."
        )
        return

    if q == BTN_IW_EVAL:
        clear_eval_context(context)
        context.user_data["topic"] = "ielts_writing"
        context.user_data["eval_active"] = True
        context.user_data["last_eval_topic"] = "ielts_writing"
        await update.message.reply_text(
            "IELTS Writing Evaluation mode ON ✅\n\nSend your answer as text, PDF/DOCX, or a clear photo."
        )
        return

    if q == BTN_PORT_EVAL:
        clear_eval_context(context)
        context.user_data["topic"] = "portfolio"
        context.user_data["eval_active"] = True
        context.user_data["last_eval_topic"] = "portfolio"
        await update.message.reply_text(
            "Portfolio Evaluation mode ON ✅\n\nNow paste your portfolio description or upload PDF/DOCX."
        )
        return

    # ---- EVALUATION FLOW (supports follow-ups WITHOUT triggers) ----
    if context.user_data.get("eval_active", False):
        last_text = (context.user_data.get("last_eval_text") or "").strip()

        # pasted a new submission while eval mode is ON
        if looks_like_submission(q):
            await evaluate_text_for_topic(update, context)
            return

        # if we already evaluated something, ANY message is treated as follow-up about that text:
        if last_text:
            if should_rewrite_from_followup(q):
                await run_eval_followup(update, context, q)
                return
            else:
                await run_eval_question(update, context, q)
                return

        # eval mode ON but no submission yet
        await update.message.reply_text(
            "✅ Evaluation mode is ON.\n\n"
            "Paste your full text here (100+ words) or upload a PDF/DOCX.\n"
            "After I evaluate, you can ask follow-up questions or ask for a rewrite."
        )
        return

    # ---- NORMAL Q&A WITH RAG ----
    # (Restored your friendly UX message)
    await update.message.reply_text("Got it ✅ Thinking about your question…")
    await show_typing(update, context)

    topic = get_current_topic(context)
    col = get_collection(chat_id, topic)

    try:
        results = col.query(query_texts=[q], where={"type": "qa"}, n_results=4)
        docs = results.get("documents", [[]])[0]
    except Exception:
        docs = []

    if not docs:
        try:
            results = col.query(query_texts=[q], n_results=4)
            docs = results.get("documents", [[]])[0]
        except Exception:
            docs = []

    context_block = "\n\n---\n\n".join(docs or [])
    nice_topic = FRIENDLY_TOPIC_NAMES.get(topic, topic)

    sys = (
        "You are UniVenture, a focused university admissions mentor.\n"
        f"Current topic: {nice_topic}.\n"
        "- Give short, clear, high-value answers (3-7 sentences max).\n"
        "- Speak in a natural, human tone, like a friendly but direct older student mentor.\n"
        "- Prioritize practical, actionable advice over theory.\n"
        "- Use the provided context (if any) as trusted program material and do not contradict it."
    )

    messages = [
        {"role": "system", "content": sys},
        {"role": "system", "content": f"Context (may be empty):\n{context_block}"},
        {"role": "user", "content": q},
    ]

    a = openai_chat(model="gpt-4.1-mini", messages=messages, temperature=0.4)
    await send_long(update, a)


# -------- Dummy HTTP server for Render/Railway --------
def start_dummy_server():
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            self.send_response(200)
            self.send_header("Content-type", "text/plain")
            self.end_headers()
            self.wfile.write(b"OK")

        def log_message(self, format, *args):
            return

    port = int(os.environ.get("PORT", 10000))
    server = HTTPServer(("0.0.0.0", port), Handler)
    server.serve_forever()


app = ApplicationBuilder().token(TELEGRAM_TOKEN).build()

# ===== GROUP 0: COMMANDS ONLY =====
app.add_handler(CommandHandler("start", start), group=0)
app.add_handler(CommandHandler("teach", teach), group=0)
app.add_handler(CommandHandler("teachrubric", teachrubric), group=0)
app.add_handler(CommandHandler("teachfile", teachfile), group=0)
app.add_handler(CommandHandler("teachfile_eval", teachfile_eval), group=0)
app.add_handler(CommandHandler("teachlink", teachlink), group=0)
app.add_handler(CommandHandler("teachlink_eval", teachlink_eval), group=0)
app.add_handler(CommandHandler("teachimage", teachimage), group=0)
app.add_handler(CommandHandler("sources", sources), group=0)
app.add_handler(CommandHandler("sources_all", sources_all), group=0)
app.add_handler(CommandHandler("unlearn", unlearn), group=0)
app.add_handler(CommandHandler("clear", clear), group=0)
app.add_handler(CommandHandler("stats", stats_cmd), group=0)
app.add_handler(CommandHandler("brainstorm", brainstorm_cmd), group=0)
app.add_handler(CommandHandler("rewrite", rewrite_cmd), group=0)
app.add_handler(CommandHandler("plan", plan_cmd), group=0)
app.add_handler(CommandHandler("recpacket", recpacket_cmd), group=0)
app.add_handler(CommandHandler("schoolfinder", schoolfinder_cmd), group=0)
app.add_handler(CommandHandler("portfolioideas", portfolioideas_cmd), group=0)
app.add_handler(CommandHandler("backup_sources", backup_sources), group=0)
app.add_handler(CommandHandler("health", health), group=0)

# ===== GROUP 1: FILES / PHOTOS =====
app.add_handler(MessageHandler(filters.Document.ALL, document_router), group=1)
app.add_handler(MessageHandler(filters.PHOTO, photo_router), group=1)

# ===== GROUP 1: NORMAL TEXT (ABSOLUTELY LAST) =====
app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, answer), group=1)

print(
    "Bot is running with GLOBAL per-topic RAG + metadata separation (qa/evaluation) + submenus "
    "+ eval follow-ups (Q&A + rewrite) + embedded tools + Application Plan & School Finder "
    "+ analytics + admin locks + backup + health + UUID IDs + robust command parsing…"
)

if __name__ == "__main__":
    threading.Thread(target=start_dummy_server, daemon=True).start()
    app.run_polling()
