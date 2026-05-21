# ─────────────────────────────────────────────
#  GammaSpot — scanner.py
#  DEV_MODE=true  → simulated data
#  DEV_MODE=false → real NSE data via nsepython
# ─────────────────────────────────────────────

import random
import asyncio
from datetime import datetime, timedelta, date

from config import (
    DEV_MODE,
    WATCHLIST,
    SCAN_INTERVAL_SECONDS,
    PREMIUM_TARGET_PCT,
    PREMIUM_STOP_PCT,
)
from indicators import evaluate_all_conditions, is_market_hours
from ai_client  import ask_ai, build_prompt
from alerts     import send_setup_alert


# ── NSE symbol map ─────────────────────────────
NSE_SYMBOL_MAP = {
    "NSE:NIFTY 50":          "NIFTY 50",
    "NSE:NIFTY BANK":        "NIFTY BANK",
    "NSE:NIFTY FIN SERVICE": "NIFTY FIN SERVICE",
    "NSE:NIFTY MID SELECT":  "NIFTY MIDCAP SELECT",
    "BSE:SENSEX":            "SENSEX",
}

DISPLAY_NAMES = {
    "NSE:NIFTY 50":          "NIFTY 50",
    "NSE:NIFTY BANK":        "BANKNIFTY",
    "NSE:NIFTY FIN SERVICE": "FINNIFTY",
    "NSE:NIFTY MID SELECT":  "MIDCPNIFTY",
    "BSE:SENSEX":            "SENSEX",
}

STRIKE_STEPS = {
    "NSE:NIFTY 50":          50,
    "NSE:NIFTY BANK":        100,
    "NSE:NIFTY FIN SERVICE": 50,
    "NSE:NIFTY MID SELECT":  50,
    "BSE:SENSEX":            100,
}


# ── NSE live data fetchers ─────────────────────
def _fetch_nse_quote(symbol: str) -> float:
    try:
        from nsepython import nse_index_quote
        nse_name = NSE_SYMBOL_MAP.get(symbol, "NIFTY 50")
        data     = nse_index_quote(nse_name)
        return float(data.get("last", data.get("previousClose", 0)))
    except Exception as e:
        print(f"[NSE] Failed to fetch quote for {symbol}: {e}")
        return 0.0


def _fetch_nse_history(symbol: str, days: int = 5) -> list:
    try:
        from nsepython import index_history
        nse_name   = NSE_SYMBOL_MAP.get(symbol, "NIFTY 50")
        end_date   = date.today()
        start_date = end_date - timedelta(days=days)

        df = index_history(
            nse_name,
            start_date.strftime("%d-%m-%Y"),
            end_date.strftime("%d-%m-%Y"),
        )

        candles = []
        for _, row in df.iterrows():
            try:
                candles.append({
                    "date":   datetime.strptime(str(row["HistoricalDate"]).strip(), "%d %b %Y"),
                    "open":   float(str(row["OPEN"]).replace(",", "")),
                    "high":   float(str(row["HIGH"]).replace(",", "")),
                    "low":    float(str(row["LOW"]).replace(",", "")),
                    "close":  float(str(row["CLOSE"]).replace(",", "")),
                    "volume": float(str(row.get("VOLUME", 1000000)).replace(",", "")),
                })
            except Exception:
                continue

        candles.sort(key=lambda x: x["date"])
        return candles

    except Exception as e:
        print(f"[NSE] Failed to fetch history for {symbol}: {e}")
        return []


def _fetch_option_premium(symbol: str, strike: int) -> float:
    try:
        from nsepython import nse_optionchain_scrapper
        chain_map = {
            "NSE:NIFTY 50":          "NIFTY",
            "NSE:NIFTY BANK":        "BANKNIFTY",
            "NSE:NIFTY FIN SERVICE": "FINNIFTY",
            "NSE:NIFTY MID SELECT":  "MIDCPNIFTY",
        }
        chain_symbol = chain_map.get(symbol)
        if not chain_symbol:
            return 0.0

        data    = nse_optionchain_scrapper(chain_symbol)
        records = data["records"]["data"]

        for record in records:
            if record.get("strikePrice") == strike and "CE" in record:
                return float(record["CE"].get("lastPrice", 0))
        return 0.0

    except Exception as e:
        print(f"[NSE] Failed to fetch option premium for {strike} CE: {e}")
        return 0.0


# ── Mock data (DEV_MODE) ───────────────────────
def _mock_candles(symbol: str, n: int = 50) -> list:
    base_prices = {
        "NSE:NIFTY 50":          24500,
        "NSE:NIFTY BANK":        55700,
        "NSE:NIFTY FIN SERVICE": 23100,
        "NSE:NIFTY MID SELECT":  11800,
        "BSE:SENSEX":            80300,
    }
    base    = base_prices.get(symbol, 50000)
    candles = []
    now     = datetime.now().replace(hour=9, minute=15, second=0, microsecond=0)
    price   = base

    for i in range(n):
        change = random.uniform(-0.003, 0.003)
        open_  = price
        close_ = round(price * (1 + change), 2)
        high_  = round(max(open_, close_) * (1 + random.uniform(0, 0.001)), 2)
        low_   = round(min(open_, close_) * (1 - random.uniform(0, 0.001)), 2)
        vol    = random.randint(50000, 200000)

        if i >= 35:
            vol = int(vol * random.uniform(1.5, 3.0))

        candles.append({
            "date":   now + timedelta(minutes=i),
            "open":   open_,
            "high":   high_,
            "low":    low_,
            "close":  close_,
            "volume": vol,
        })
        price = close_

    return candles


def _mock_premium(spot_price: float) -> float:
    return round(spot_price * random.uniform(0.004, 0.009), 2)


# ── Core scan function ─────────────────────────
async def scan_instrument(symbol: str) -> dict:
    print(f"[SCANNER] Scanning {symbol}...")
    display = DISPLAY_NAMES.get(symbol, symbol)

    # ── 1. Fetch data ────────────────────────────
    if DEV_MODE:
        candles       = _mock_candles(symbol)
        current_price = candles[-1]["close"]
        entry_premium = _mock_premium(current_price)
    else:
        candles       = _fetch_nse_history(symbol)
        current_price = _fetch_nse_quote(symbol) or (candles[-1]["close"] if candles else 0)
        entry_premium = 0.0

        if not candles or current_price == 0:
            print(f"[SCANNER] ⚠️  No data for {symbol}, skipping.")
            return _empty_result(symbol, display, "No NSE data available")

    # ── 2. Run indicators ────────────────────────
    closes  = [c["close"]  for c in candles]
    volumes = [c["volume"] for c in candles]

    data = {
        "closes":          closes,
        "volumes":         volumes,
        "candles":         candles,
        "current_price":   current_price,
        "current_premium": entry_premium,
    }

    conditions                  = evaluate_all_conditions(data)
    conditions["current_price"] = current_price
    signal                      = conditions["signal"]

    # ── 3. AI validation ─────────────────────────
    ai_result = {
        "valid_setup": False,
        "confidence":  "—",
        "action":      "WAIT",
        "reason":      "",
        "warning":     "",
    }

    if signal == "FIRE":
        if not DEV_MODE:
            strike        = conditions.get("atm_strike", 0)
            entry_premium = _fetch_option_premium(symbol, strike)
            if entry_premium == 0:
                entry_premium = _mock_premium(current_price)

        prompt    = build_prompt(display, conditions)
        ai_result = ask_ai(prompt)
        print(f"[AI] {display} → {ai_result.get('confidence')} | {ai_result.get('action')}")

        # ── 4. Send Telegram alert ────────────────
        # Fires directly on FIRE signal — no AI gate
        send_setup_alert(display, conditions, ai_result, entry_premium)
        print(f"[SCANNER] 🚨 ALERT FIRED → {display}")

    # ── 5. Build result for frontend ─────────────
    atm    = conditions.get("atm_strike", 0)
    target = round(entry_premium * (1 + PREMIUM_TARGET_PCT / 100), 2)
    stop   = round(entry_premium * (1 - PREMIUM_STOP_PCT   / 100), 2)

    return {
        "symbol":        symbol,
        "display_name":  display,
        "spot":          round(current_price, 2),
        "rsi":           conditions.get("rsi", 0),
        "rsi_ok":        conditions.get("rsi_ok", False),
        "volume_ratio":  conditions.get("volume_ratio", 0),
        "volume_ok":     conditions.get("volume_ok", False),
        "or_breakout":   conditions.get("or_breakout", False),
        "premium_ok":    conditions.get("premium_ok", False),
        "signal":        signal,
        "atm_strike":    atm,
        "entry_premium": entry_premium,
        "target":        target,
        "stop":          stop,
        "ai_confidence": ai_result.get("confidence", ""),
        "ai_action":     ai_result.get("action", ""),
        "ai_reason":     ai_result.get("reason", ""),
        "scanned_at":    datetime.now().strftime("%H:%M:%S"),
    }


async def scan_all() -> list:
    tasks   = [scan_instrument(s) for s in WATCHLIST]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    clean = []
    for r in results:
        if isinstance(r, Exception):
            print(f"[SCANNER] ❌ Error: {r}")
        else:
            clean.append(r)

    return clean


def init_kite():
    if DEV_MODE:
        print("[SCANNER] DEV_MODE=true — using mock data.")
    else:
        print("[SCANNER] LIVE MODE — using nsepython for real NSE data.")
        try:
            import nsepython
            print("[SCANNER] ✅ nsepython loaded successfully.")
        except ImportError:
            print("[SCANNER] ❌ nsepython not installed. Run: pip install nsepython")


def _empty_result(symbol: str, display: str, reason: str) -> dict:
    return {
        "symbol":       symbol,
        "display_name": display,
        "spot":         0,
        "rsi":          0,
        "rsi_ok":       False,
        "volume_ratio": 0,
        "volume_ok":    False,
        "or_breakout":  False,
        "premium_ok":   False,
        "signal":       "COLD",
        "error":        reason,
        "scanned_at":   datetime.now().strftime("%H:%M:%S"),
    }