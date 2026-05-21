# ─────────────────────────────────────────────
#  GammaSpot — main.py
#  Run: uvicorn main:app --reload --port 8000
# ─────────────────────────────────────────────

import asyncio
import json
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config  import SCAN_INTERVAL_SECONDS, DEV_MODE
from scanner import scan_all, init_kite
from alerts  import send_status_message, send_welcome_message
from users   import register_user, remove_user, get_all_users, user_exists, get_user_count


# ── State ──────────────────────────────────────
class BotState:
    running:      bool  = False
    last_results: list  = []
    scan_count:   int   = 0
    alert_count:  int   = 0
    provider:     str   = "groq"
    clients:      list  = []

state = BotState()


# ── Request models ─────────────────────────────
class RegisterRequest(BaseModel):
    chat_id: str
    name:    str = ""


# ── WebSocket broadcaster ──────────────────────
async def broadcast(payload: dict):
    message = json.dumps(payload)
    dead = []
    for ws in state.clients:
        try:
            await ws.send_text(message)
        except Exception:
            dead.append(ws)
    for ws in dead:
        state.clients.remove(ws)


# ── Scanner loop ───────────────────────────────
async def scanner_loop():
    print("[BOT] 🟢 Scanner started.")
    send_status_message("GammaSpot started — scanning markets. 🚀")

    while state.running:
        try:
            print(f"[BOT] Running scan #{state.scan_count + 1}...")
            results = await scan_all()

            state.scan_count  += 1
            state.last_results = results

            fired = [r for r in results if r.get("signal") == "FIRE"]
            state.alert_count += len(fired)

            await broadcast({
                "type":        "scan_update",
                "scan_count":  state.scan_count,
                "alert_count": state.alert_count,
                "provider":    state.provider,
                "scanned_at":  datetime.now().strftime("%H:%M:%S"),
                "instruments": results,
                "user_count":  get_user_count(),
            })

            print(f"[BOT] ✅ Scan #{state.scan_count} done. {len(fired)} alert(s) fired.")

        except Exception as e:
            print(f"[BOT] ❌ Error: {e}")
            await broadcast({"type": "error", "message": str(e)})

        await asyncio.sleep(SCAN_INTERVAL_SECONDS)

    print("[BOT] 🔴 Scanner stopped.")
    send_status_message("GammaSpot stopped. 🔴")


# ── Lifespan ───────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_kite()
    print(f"[BOT] GammaSpot started. DEV_MODE={DEV_MODE} | Users: {get_user_count()}")
    yield
    state.running = False


app = FastAPI(title="GammaSpot API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── User registration endpoints ────────────────
@app.post("/user/register")
def register(req: RegisterRequest):
    """Register a user's Telegram chat ID."""
    chat_id = req.chat_id.strip()

    if not chat_id:
        return {"ok": False, "message": "Chat ID cannot be empty."}

    already_exists = user_exists(chat_id)
    user = register_user(chat_id, req.name)

    # Send welcome message only on first registration
    if not already_exists:
        send_welcome_message(chat_id, req.name)

    return {
        "ok":      True,
        "message": "Already registered!" if already_exists else "Registered successfully! Check Telegram for a welcome message.",
        "user":    user,
    }


@app.delete("/user/{chat_id}")
def unregister(chat_id: str):
    """Remove a user from alerts."""
    removed = remove_user(chat_id)
    return {
        "ok":      removed,
        "message": "Removed successfully." if removed else "User not found.",
    }


@app.get("/user/check/{chat_id}")
def check_user(chat_id: str):
    """Check if a chat ID is already registered."""
    return {"registered": user_exists(chat_id)}


@app.get("/users")
def list_users():
    """Admin endpoint — list all registered users."""
    return {"users": get_all_users(), "count": get_user_count()}


# ── Bot control endpoints ──────────────────────
@app.get("/")
def root():
    return {
        "status":     "GammaSpot running",
        "dev_mode":   DEV_MODE,
        "users":      get_user_count(),
    }

@app.get("/status")
def get_status():
    return {
        "running":     state.running,
        "scan_count":  state.scan_count,
        "alert_count": state.alert_count,
        "provider":    state.provider,
        "user_count":  get_user_count(),
        "dev_mode":    DEV_MODE,
    }

@app.post("/start")
async def start_bot(body: dict = {}):
    if state.running:
        return {"ok": False, "message": "Already running."}
    state.provider = body.get("provider", "groq")
    state.running  = True
    asyncio.create_task(scanner_loop())
    return {"ok": True, "message": f"Started. Provider: {state.provider}"}

@app.post("/stop")
def stop_bot():
    state.running = False
    return {"ok": True, "message": "Stopped."}

@app.get("/results")
def get_results():
    return {
        "scan_count":  state.scan_count,
        "alert_count": state.alert_count,
        "instruments": state.last_results,
    }

@app.post("/provider/{name}")
def set_provider(name: str):
    if name not in ("groq", "claude"):
        return {"ok": False, "message": "Use groq or claude"}
    state.provider = name
    import config
    config.AI_PROVIDER = name
    return {"ok": True, "message": f"Provider → {name}"}


# ── Dashboard WebSocket ────────────────────────
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    state.clients.append(websocket)
    print(f"[WS] Client connected. Total: {len(state.clients)}")

    await websocket.send_text(json.dumps({
        "type":        "connected",
        "running":     state.running,
        "scan_count":  state.scan_count,
        "alert_count": state.alert_count,
        "instruments": state.last_results,
        "user_count":  get_user_count(),
    }))

    try:
        while True:
            data = await websocket.receive_text()
            msg  = json.loads(data)

            if msg.get("action") == "start":
                if not state.running:
                    state.provider = msg.get("provider", "groq")
                    state.running  = True
                    asyncio.create_task(scanner_loop())

            elif msg.get("action") == "stop":
                state.running = False

            elif msg.get("action") == "set_provider":
                state.provider = msg.get("provider", "groq")
                import config
                config.AI_PROVIDER = state.provider

    except WebSocketDisconnect:
        state.clients.remove(websocket)
        print(f"[WS] Disconnected. Remaining: {len(state.clients)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)