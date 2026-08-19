"""AI service powered by OpenAI / LLM with deterministic smart fallbacks.

All functions operate on REAL review data passed in from the database.
On LLM failure a clearly-flagged deterministic fallback is returned so the UI
never breaks, but fallbacks are marked source="fallback".
"""
import os
import json
import re
import logging

logger = logging.getLogger(__name__)

AI_API_KEY = os.environ.get("OPENAI_API_KEY") or os.environ.get("AI_API_KEY")
MODEL_NAME = os.environ.get("AI_MODEL_NAME", "gpt-4o-mini")


def _extract_json(text: str):
    if not text:
        return None
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except Exception:
        return None


async def _chat(system_message: str, prompt: str, session_id: str) -> str:
    if not AI_API_KEY:
        raise ValueError("AI API key not configured")
    import openai
    client = openai.AsyncOpenAI(api_key=AI_API_KEY)
    resp = await client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": system_message},
            {"role": "user", "content": prompt},
        ],
        temperature=0.7,
    )
    return resp.choices[0].message.content or ""



def _brand_block(brand: dict, app_name: str) -> str:
    brand = brand or {}
    return (
        f"App name: {app_name}\n"
        f"Brand personality: {brand.get('personality', 'Friendly and professional')}\n"
        f"Preferred tone: {brand.get('tone', 'Empathetic, concise, solution-oriented')}\n"
        f"Words to use: {', '.join(brand.get('words_to_use') or []) or 'n/a'}\n"
        f"Words to avoid: {', '.join(brand.get('words_to_avoid') or []) or 'n/a'}\n"
        f"Support email: {brand.get('support_email', '')}\n"
        f"Response guidelines: {brand.get('guidelines', 'Never promise refunds unless explicitly approved.')}"
    )


MODE_HINTS = {
    "Professional": "Professional, courteous and clear.",
    "Friendly": "Warm, friendly and approachable.",
    "Empathetic": "Deeply empathetic, acknowledge the user's frustration first.",
    "Short": "Very short, one or two sentences maximum.",
    "Formal": "Formal and corporate.",
    "Casual": "Casual and relaxed but respectful.",
    "Hinglish": "Reply in Hinglish (Hindi written in Roman script mixed with English).",
}


async def generate_reply(review: dict, brand: dict, app_name: str, mode: str = "Professional",
                         custom_instruction: str = None) -> dict:
    system = (
        "You are Equinox AI, an expert app-store reputation manager writing public replies "
        "to user reviews on behalf of a brand. Replies must be contextual, human-sounding, "
        "professional and concise (2-4 sentences). Never sound like a generic template. "
        "Reference the user's specific issue. Respect brand voice strictly."
    )
    tone = MODE_HINTS.get(mode, MODE_HINTS["Professional"])
    if custom_instruction:
        tone += f" Additional instruction: {custom_instruction}"
    prompt = (
        f"{_brand_block(brand, app_name)}\n\nTone: {tone}\n\n"
        f"REVIEW (rating {review.get('rating')}/5, sentiment {review.get('sentiment')}, "
        f"topic {review.get('topic')}):\n\"{review.get('text')}\"\n\n"
        "Write only the reply text, no quotes, no preamble."
    )
    try:
        text = await _chat(system, prompt, f"reply-{review.get('id')}")
        return {"reply": text.strip().strip('"'), "source": "ai", "model": MODEL_NAME}
    except Exception as e:
        logger.error(f"generate_reply failed: {e}")
        r = review.get("rating", 3)
        if r <= 2:
            fb = (f"We're sorry about your experience with {review.get('topic', 'the app')}. "
                  "This isn't the standard we aim for. Please reach out to our support team with your "
                  "details so we can look into this and help resolve it.")
        elif r == 3:
            fb = ("Thank you for the honest feedback. We're always working to improve and would love "
                  "to hear more about how we can make your experience better.")
        else:
            fb = "Thank you so much for the kind words and support! We're thrilled you're enjoying the app."
        return {"reply": fb, "source": "fallback", "model": None,
                "error": "AI service unavailable, showing a safe fallback reply."}


async def refine_reply(current_reply: str, action: str, review: dict, target_language: str = "Hindi") -> dict:
    system = "You refine app-store reply drafts. Return only the refined reply text."
    actions = {
        "shorten": "Make this reply shorter and more concise while keeping the meaning.",
        "more_empathetic": "Rewrite to be more empathetic and understanding.",
        "more_professional": "Rewrite to be more professional and polished.",
        "translate": f"Translate this reply into {target_language}, keeping it natural.",
    }
    instr = actions.get(action, actions["shorten"])
    prompt = f"{instr}\n\nReply draft:\n\"{current_reply}\""
    try:
        text = await _chat(system, prompt, f"refine-{review.get('id')}")
        return {"reply": text.strip().strip('"'), "source": "ai"}
    except Exception as e:
        logger.error(f"refine_reply failed: {e}")
        return {"reply": current_reply, "source": "fallback", "error": "AI service unavailable."}


async def executive_summary(stats: dict, app_name: str) -> dict:
    system = (
        "You are Equinox AI generating an executive reputation summary for an app team. "
        "Return STRICT JSON with keys: insights (array of {level:'positive'|'negative'|'neutral', text}), "
        "recommended_action (string). Base everything ONLY on the provided data. 3-5 insights."
    )
    prompt = f"App: {app_name}\nData:\n{json.dumps(stats, indent=2)}\n\nReturn JSON only."
    try:
        text = await _chat(system, prompt, f"summary-{app_name}")
        data = _extract_json(text)
        if data and "insights" in data:
            data["source"] = "ai"
            return data
        raise ValueError("bad json")
    except Exception as e:
        logger.error(f"executive_summary failed: {e}")
        insights = []
        rc = stats.get("rating_change", 0)
        insights.append({"level": "positive" if rc >= 0 else "negative",
                         "text": f"Rating {'improved' if rc >= 0 else 'declined'} by {abs(rc):.2f} in the selected period."})
        neg = stats.get("sentiment", {}).get("negative_pct", 0)
        top_topic = stats.get("top_negative_topic")
        if top_topic:
            insights.append({"level": "negative", "text": f"'{top_topic}' is the leading complaint driver."})
        insights.append({"level": "neutral", "text": f"{stats.get('unreplied', 0)} reviews are currently unanswered."})
        insights.append({"level": "positive", "text": f"Positive sentiment is at {stats.get('sentiment', {}).get('positive_pct', 0)}%."})
        return {
            "insights": insights,
            "recommended_action": "Prioritize high-impact 1-2 star reviews, especially the top complaint topic.",
            "source": "fallback",
            "error": "AI service unavailable, showing a computed summary.",
        }


async def ai_search(question: str, context: dict) -> dict:
    system = (
        "You are Equinox AI, a reputation analyst. Answer the user's question using ONLY the provided "
        "review analytics context. Be specific, cite numbers. 2-4 sentences. If data is insufficient, say so."
    )
    prompt = f"Context:\n{json.dumps(context, indent=2)}\n\nQuestion: {question}"
    try:
        text = await _chat(system, prompt, "ai-search")
        return {"answer": text.strip(), "source": "ai"}
    except Exception as e:
        logger.error(f"ai_search failed: {e}")
        return {"answer": "The AI analyst is temporarily unavailable. Please try again shortly.",
                "source": "fallback", "error": str(e)}


async def competitor_insights(comparison: dict) -> dict:
    system = (
        "You are Equinox AI. Given competitor benchmarking data, produce STRICT JSON: "
        "{insights: [string]}. 3 concise, specific, data-grounded insights comparing the user's app to competitors."
    )
    prompt = f"Data:\n{json.dumps(comparison, indent=2)}\n\nReturn JSON only."
    try:
        text = await _chat(system, prompt, "competitor-insights")
        data = _extract_json(text)
        if data and "insights" in data:
            data["source"] = "ai"
            return data
        raise ValueError("bad json")
    except Exception as e:
        logger.error(f"competitor_insights failed: {e}")
        insights = []
        me = comparison.get("your_app", {})
        comps = comparison.get("competitors", [])
        if comps:
            best = max(comps + [me], key=lambda x: x.get("rating", 0))
            insights.append(f"{best.get('name')} currently has the highest rating at {best.get('rating')}.")
            better = sum(1 for c in comps if me.get("rating", 0) > c.get("rating", 0))
            insights.append(f"Your app has a higher rating than {better} of {len(comps)} tracked competitors.")
            insights.append("Review velocity and sentiment vary across competitors; monitor the fastest-growing one.")
        return {"insights": insights, "source": "fallback", "error": "AI service unavailable."}
