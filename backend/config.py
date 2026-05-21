# ─────────────────────────────────────────────
#  GammaSpot — config.py
# ─────────────────────────────────────────────

import os
from dotenv import load_dotenv

load_dotenv()

# ── AI Provider ───────────────────────────────
AI_PROVIDER    = os.getenv("AI_PROVIDER", "groq")
GROQ_API_KEY   = os.getenv("GROQ_API_KEY", "")
CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY", "")

# ── Telegram ──────────────────────────────────
# Bot token only — chat IDs are now stored in users.json
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")

# ── Scanner Settings ──────────────────────────
WATCHLIST = [
    "NSE:NIFTY 50",
    "NSE:NIFTY BANK",
    "NSE:NIFTY FIN SERVICE",
    "NSE:NIFTY MID SELECT",
    "BSE:SENSEX",
]

OPENING_RANGE_MINUTES = 15
SCAN_INTERVAL_SECONDS = 60

# ── Indicator Thresholds ──────────────────────
RSI_THRESHOLD      = 60.0
VOLUME_MULTIPLIER  = 1.5
RSI_PERIOD         = 14
VOLUME_AVG_PERIOD  = 20

# ── Option Settings ───────────────────────────
PREMIUM_TARGET_PCT = 30
PREMIUM_STOP_PCT   = 25

# ── Mode ──────────────────────────────────────
DEV_MODE = os.getenv("DEV_MODE", "true").lower() == "true"