# ─────────────────────────────────────────────
#  GammaSpot — users.py
#  Stores and manages user Telegram chat IDs.
#  Uses a simple JSON file — no database needed.
# ─────────────────────────────────────────────

import json
import os
from datetime import datetime

USERS_FILE = "users.json"


def _load() -> dict:
    """Load users from JSON file."""
    if not os.path.exists(USERS_FILE):
        return {}
    try:
        with open(USERS_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return {}


def _save(data: dict):
    """Save users to JSON file."""
    with open(USERS_FILE, "w") as f:
        json.dump(data, f, indent=2)


def register_user(chat_id: str, name: str = "") -> dict:
    """
    Register a new user with their Telegram chat ID.
    If already exists, updates their name and last_seen.
    Returns the user record.
    """
    users = _load()
    chat_id = str(chat_id).strip()

    if chat_id in users:
        users[chat_id]["last_seen"] = datetime.now().isoformat()
        if name:
            users[chat_id]["name"] = name
    else:
        users[chat_id] = {
            "chat_id":   chat_id,
            "name":      name or f"User_{chat_id[-4:]}",
            "joined":    datetime.now().isoformat(),
            "last_seen": datetime.now().isoformat(),
            "active":    True,
        }
        print(f"[USERS] ✅ New user registered: {chat_id}")

    _save(users)
    return users[chat_id]


def remove_user(chat_id: str) -> bool:
    """Remove a user from alerts."""
    users = _load()
    chat_id = str(chat_id).strip()
    if chat_id in users:
        del users[chat_id]
        _save(users)
        print(f"[USERS] ❌ User removed: {chat_id}")
        return True
    return False


def get_all_chat_ids() -> list:
    """Returns list of all active user chat IDs."""
    users = _load()
    return [
        uid for uid, u in users.items()
        if u.get("active", True)
    ]


def get_all_users() -> list:
    """Returns full user list for admin view."""
    users = _load()
    return list(users.values())


def user_exists(chat_id: str) -> bool:
    """Check if a chat ID is already registered."""
    users = _load()
    return str(chat_id).strip() in users


def get_user_count() -> int:
    return len(_load())