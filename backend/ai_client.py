# ─────────────────────────────────────────────
#  GammaSpot — ai_client.py
#  Single swap layer for Groq (dev) → Claude (prod).
#  The rest of the app only calls ask_ai().
# ─────────────────────────────────────────────

from config import AI_PROVIDER, GROQ_API_KEY, CLAUDE_API_KEY

# System prompt that defines GammaSpot's strategy
SYSTEM_PROMPT = """
You are GammaSpot, an expert intraday options trading scanner AI.

Your job is to validate whether a specific setup has formed based on the 
Opening Range Gamma Scalp strategy, and respond with a confidence assessment.

STRATEGY RULES (all must be met for a valid setup):
1. Opening Range breakout confirmed (price broke above the OR high)
2. RSI (14) is above 60 — confirms bullish momentum
3. Volume is at least 1.5x the 20-candle average — confirms conviction
4. Near-ATM CE (Call option) is available for entry
5. Time window: ideally between 9:20 AM and 10:30 AM IST

YOUR RESPONSE FORMAT (always respond in this exact JSON format):
{
  "valid_setup": true or false,
  "confidence": "HIGH" or "MEDIUM" or "LOW",
  "reason": "one concise sentence explaining your assessment",
  "action": "BUY [STRIKE] CE" or "WAIT" or "SKIP",
  "warning": "any risk or caveat to flag, or empty string"
}

Be concise. Never explain your reasoning outside the JSON.
Only respond with the JSON object, nothing else.
"""


def ask_ai(user_prompt: str) -> dict:
    """
    Sends condition data to the active AI provider.
    Returns a parsed dict with the AI's assessment.
    
    Swap providers by changing AI_PROVIDER in config.py.
    """
    if AI_PROVIDER == "groq":
        return _ask_groq(user_prompt)
    elif AI_PROVIDER == "claude":
        return _ask_claude(user_prompt)
    else:
        raise ValueError(f"Unknown AI_PROVIDER: {AI_PROVIDER}")


def _ask_groq(prompt: str) -> dict:
    """Groq API call using Llama 3.3 70B (free tier, fast)."""
    import json
    from groq import Groq

    client = Groq(api_key=GROQ_API_KEY)

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": prompt},
        ],
        temperature=0.1,   # low temp = more consistent, less creative
        max_tokens=300,
    )

    raw_text = response.choices[0].message.content.strip()

    try:
        return json.loads(raw_text)
    except json.JSONDecodeError:
        # Fallback if model adds text outside JSON
        import re
        match = re.search(r"\{.*\}", raw_text, re.DOTALL)
        if match:
            return json.loads(match.group())
        return _fallback_response("Groq returned unparseable response")


def _ask_claude(prompt: str) -> dict:
    """Claude API call (Anthropic) — used in production."""
    import json
    import anthropic

    client = anthropic.Anthropic(api_key=CLAUDE_API_KEY)

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=300,
        system=SYSTEM_PROMPT,
        messages=[
            {"role": "user", "content": prompt}
        ],
    )

    raw_text = response.content[0].text.strip()

    try:
        return json.loads(raw_text)
    except json.JSONDecodeError:
        import re
        match = re.search(r"\{.*\}", raw_text, re.DOTALL)
        if match:
            return json.loads(match.group())
        return _fallback_response("Claude returned unparseable response")


def _fallback_response(reason: str) -> dict:
    """Safe fallback if AI response can't be parsed."""
    return {
        "valid_setup": False,
        "confidence":  "LOW",
        "reason":      reason,
        "action":      "WAIT",
        "warning":     "AI validation failed — manual check recommended",
    }


def build_prompt(instrument: str, conditions: dict) -> str:
    """
    Builds the user prompt from live condition data.
    This is what gets sent to the AI for validation.
    """
    or_data = conditions.get("opening_range", {})
    or_high = or_data.get("high", "N/A") if or_data else "N/A"
    or_low  = or_data.get("low",  "N/A") if or_data else "N/A"

    return f"""
Instrument     : {instrument}
Current Price  : {conditions.get('current_price', 'N/A')}
Opening Range  : High={or_high}, Low={or_low}
OR Breakout    : {"YES" if conditions.get('or_breakout') else "NO"}
RSI (14)       : {conditions.get('rsi', 'N/A')} — {"ABOVE 60 ✓" if conditions.get('rsi_ok') else "BELOW 60 ✗"}
Volume Ratio   : {conditions.get('volume_ratio', 'N/A')}x — {"ELEVATED ✓" if conditions.get('volume_ok') else "NORMAL ✗"}
ATM Strike     : {conditions.get('atm_strike', 'N/A')} CE
Premium OK     : {"YES" if conditions.get('premium_ok') else "NO"}
Time           : {__import__('datetime').datetime.now().strftime('%H:%M IST')}

Based on these conditions, validate whether this is a valid Opening Range Gamma Scalp setup.
Respond ONLY with the JSON format specified.
"""