# ─────────────────────────────────────────────
#  GammaSpot — indicators.py
#  Pure calculation logic. No API calls here.
#  No pandas-ta dependency — RSI calculated manually.
# ─────────────────────────────────────────────

from datetime import datetime, time
from config import RSI_PERIOD, VOLUME_AVG_PERIOD, OPENING_RANGE_MINUTES


def calculate_rsi(closes, period=RSI_PERIOD):
    """
    Calculates RSI using Wilder's smoothing method.
    No external library needed — pure Python.
    Returns the latest RSI value (0–100).
    """
    if len(closes) < period + 1:
        return 50.0  # not enough data, return neutral

    # Calculate price changes
    deltas = [closes[i] - closes[i - 1] for i in range(1, len(closes))]

    # Separate gains and losses
    gains  = [d if d > 0 else 0.0 for d in deltas]
    losses = [-d if d < 0 else 0.0 for d in deltas]

    # Initial averages (simple average of first `period` values)
    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period

    # Wilder's smoothing for remaining values
    for i in range(period, len(gains)):
        avg_gain = (avg_gain * (period - 1) + gains[i])  / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period

    if avg_loss == 0:
        return 100.0

    rs  = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))

    return round(rsi, 2)


def calculate_volume_ratio(volumes, avg_period=VOLUME_AVG_PERIOD):
    """
    Returns current volume as a multiple of the recent average.
    e.g. 2.1 means current candle has 2.1x the average volume.
    """
    if len(volumes) < avg_period + 1:
        return 1.0

    current = volumes[-1]
    avg     = sum(volumes[-(avg_period + 1):-1]) / avg_period

    if avg == 0:
        return 1.0

    return round(current / avg, 2)


def get_opening_range(candles, market_open=time(9, 15)):
    """
    Calculates the Opening Range (high/low) from the first N minutes.
    Each candle dict: { date, open, high, low, close, volume }
    Returns: { high, low, range_size } or None
    """
    if not candles:
        return None

    or_candles = []
    for candle in candles:
        dt = candle["date"]
        candle_time = dt.time() if isinstance(dt, datetime) else dt

        minutes_from_open = (
            candle_time.hour * 60 + candle_time.minute
        ) - (market_open.hour * 60 + market_open.minute)

        if 0 <= minutes_from_open < OPENING_RANGE_MINUTES:
            or_candles.append(candle)

    if not or_candles:
        return None

    or_high = max(c["high"] for c in or_candles)
    or_low  = min(c["low"]  for c in or_candles)

    return {
        "high":       round(or_high, 2),
        "low":        round(or_low,  2),
        "range_size": round(or_high - or_low, 2),
    }


def check_or_breakout(current_price, opening_range):
    """True if price has broken above the opening range high."""
    if opening_range is None:
        return False
    return current_price > opening_range["high"]


def check_or_breakdown(current_price, opening_range):
    """True if price has broken below the opening range low."""
    if opening_range is None:
        return False
    return current_price < opening_range["low"]


def find_atm_strike(spot_price, strike_step=100):
    """
    Finds the nearest ATM strike.
    BankNifty uses 100-point steps. Nifty uses 50-point steps.
    """
    return int(round(spot_price / strike_step) * strike_step)


def calculate_targets(entry_premium, target_pct, stop_pct):
    """Returns target and stop-loss premium values from percentages."""
    return {
        "target": round(entry_premium * (1 + target_pct / 100), 2),
        "stop":   round(entry_premium * (1 - stop_pct  / 100), 2),
    }


def is_market_hours():
    """True if current time is within NSE market hours (9:15–15:30)."""
    now = datetime.now().time()
    return time(9, 15) <= now <= time(15, 30)


def is_scanning_window():
    """
    True during the active OR Gamma Scalp window.
    Best entries are between 9:20 AM and 10:30 AM IST.
    """
    now = datetime.now().time()
    return time(9, 20) <= now <= time(10, 30)


def evaluate_all_conditions(data):
    """
    Master evaluator. Takes a data dict, returns a full condition report.

    Expected keys in data:
        closes          list of floats   - closing prices
        volumes         list of floats   - volume per candle
        candles         list of dicts    - full OHLCV candles
        current_price   float
        current_premium float
    """
    closes          = data.get("closes", [])
    volumes         = data.get("volumes", [])
    candles         = data.get("candles", [])
    current_price   = data.get("current_price", 0)
    current_premium = data.get("current_premium", 0)

    # ── Calculate indicators ──────────────────
    rsi           = calculate_rsi(closes)
    volume_ratio  = calculate_volume_ratio(volumes)
    opening_range = get_opening_range(candles)
    or_breakout   = check_or_breakout(current_price, opening_range)
    atm_strike    = find_atm_strike(current_price)

    # ── Individual condition flags ────────────
    rsi_ok     = rsi > 60
    volume_ok  = volume_ratio > 1.5
    or_ok      = or_breakout
    premium_ok = current_premium > 0

    # ── FIX: proper boolean expression ───────
    all_conditions = rsi_ok and volume_ok and or_ok and premium_ok

    # ── Signal ────────────────────────────────
    if all_conditions:
        signal = "FIRE"
    elif or_ok or rsi_ok:
        signal = "WATCH"
    else:
        signal = "COLD"

    return {
        "rsi":            rsi,
        "rsi_ok":         rsi_ok,
        "volume_ratio":   volume_ratio,
        "volume_ok":      volume_ok,
        "opening_range":  opening_range,
        "or_breakout":    or_ok,
        "atm_strike":     atm_strike,
        "premium_ok":     premium_ok,
        "all_conditions": all_conditions,
        "signal":         signal,
    }