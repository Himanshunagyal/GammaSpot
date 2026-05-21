# ─────────────────────────────────────────────
#  GammaSpot — alerts.py
#  Sends Telegram alerts to ALL registered users.
# ─────────────────────────────────────────────

import requests
from datetime import datetime
from config import TELEGRAM_BOT_TOKEN, PREMIUM_TARGET_PCT, PREMIUM_STOP_PCT


def _send_to_chat(chat_id: str, message: str) -> bool:
    """Send a message to one specific Telegram chat ID."""
    if not TELEGRAM_BOT_TOKEN or TELEGRAM_BOT_TOKEN == "your_telegram_bot_token_here":
        print(f"[ALERTS] Telegram not configured. Message:\n{message}")
        return False

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    try:
        resp = requests.post(url, json={
            "chat_id":    chat_id,
            "text":       message,
            "parse_mode": "HTML",
        }, timeout=10)

        if resp.status_code == 200:
            return True
        else:
            # Chat ID might be wrong or user hasn't started the bot
            print(f"[ALERTS] ❌ Failed to send to {chat_id}: {resp.text}")
            return False

    except Exception as e:
        print(f"[ALERTS] ❌ Error sending to {chat_id}: {e}")
        return False


def send_to_all(message: str) -> int:
    """
    Sends a message to all registered users.
    Returns the count of successful sends.
    """
    from users import get_all_chat_ids
    chat_ids = get_all_chat_ids()

    if not chat_ids:
        print("[ALERTS] No users registered yet.")
        return 0

    success = 0
    for chat_id in chat_ids:
        if _send_to_chat(chat_id, message):
            success += 1

    print(f"[ALERTS] ✅ Sent to {success}/{len(chat_ids)} users.")
    return success


def build_alert_message(
    instrument:    str,
    conditions:    dict,
    ai_result:     dict,
    entry_premium: float,
) -> str:
    """Builds the full formatted Telegram alert message."""
    strike     = conditions.get("atm_strike", "N/A")
    rsi        = conditions.get("rsi", "N/A")
    vol_ratio  = conditions.get("volume_ratio", "N/A")
    or_data    = conditions.get("opening_range", {})
    or_high    = or_data.get("high", "N/A") if or_data else "N/A"
    confidence = ai_result.get("confidence", "—")
    ai_action  = ai_result.get("action", "—")
    ai_reason  = ai_result.get("reason", "")
    ai_warning = ai_result.get("warning", "")

    target_prem = round(entry_premium * (1 + PREMIUM_TARGET_PCT / 100), 2)
    stop_prem   = round(entry_premium * (1 - PREMIUM_STOP_PCT   / 100), 2)
    now         = datetime.now().strftime("%I:%M %p IST")

    msg = f"""
⚡ <b>GAMMASPOT — SETUP ACTIVE</b>

📊 <b>Instrument</b>  : {instrument}
🕐 <b>Time</b>        : {now}
📈 <b>OR High</b>     : {or_high}
✅ <b>OR Breakout</b> : Confirmed
✅ <b>RSI (14)</b>    : {rsi}
✅ <b>Volume</b>      : {vol_ratio}x average

📌 <b>ACTION</b> : {ai_action}
   Entry Premium : ₹{entry_premium}
   Target        : ₹{target_prem} (+{PREMIUM_TARGET_PCT}%)
   Stop Loss     : ₹{stop_prem} (-{PREMIUM_STOP_PCT}%)

🤖 <b>AI Confidence</b> : {confidence}
💬 {ai_reason}
""".strip()

    if ai_warning:
        msg += f"\n\n⚠️ <i>{ai_warning}</i>"

    return msg


def send_setup_alert(
    instrument:    str,
    conditions:    dict,
    ai_result:     dict,
    entry_premium: float,
) -> int:
    """Builds alert and sends to all registered users."""
    message = build_alert_message(instrument, conditions, ai_result, entry_premium)
    return send_to_all(message)


def send_status_message(text: str) -> int:
    """Send a simple status message to all users."""
    return send_to_all(f"🤖 <b>GammaSpot</b> — {text}")


def send_welcome_message(chat_id: str, name: str = "") -> bool:
    """Send a welcome message to a newly registered user."""
    msg = f"""
👋 <b>Welcome to GammaSpot{', ' + name if name else ''}!</b>

You're now registered to receive live trading alerts.

⚡ <b>Strategy:</b> Opening Range Gamma Scalp
📊 <b>Indices:</b> BANKNIFTY, NIFTY, FINNIFTY, MIDCPNIFTY, SENSEX
🕐 <b>Window:</b> 9:20 AM – 10:30 AM IST

You'll receive an alert the moment a setup fires. 🚀
""".strip()
    return _send_to_chat(chat_id, msg)