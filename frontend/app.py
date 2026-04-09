import html
import re
import time
from typing import Any, Dict, List

import requests
import streamlit as st


API_URL = "http://localhost:8000/analyze"


def init_state() -> None:
    defaults = {
        "prompt_text": "",
        "response_text": "",
        "analysis": None,
        "used_mock_data": False,
        "backend_error": "",
        "live_prompt_tokens": 0,
        "live_response_tokens": 0,
        "live_total_tokens": 0,
        "live_estimated_cost": 0.0,
        "trigger_analysis": False,
        "last_cost_saved_pct": 0.0,
    }
    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value


def safe_float(value: Any, fallback: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def safe_int(value: Any, fallback: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return fallback


def estimate_live_usage(prompt: str, response_text: str) -> Dict[str, Any]:
    prompt_tokens = len(prompt.split()) if prompt.strip() else 0
    response_tokens = len(response_text.split()) if response_text.strip() else 0
    total_tokens = prompt_tokens + response_tokens
    estimated_cost = total_tokens * 0.000002
    return {
        "prompt_tokens": prompt_tokens,
        "response_tokens": response_tokens,
        "total_tokens": total_tokens,
        "cost_usd": estimated_cost,
    }


def refresh_live_usage() -> None:
    usage = estimate_live_usage(st.session_state.get("prompt_text", ""), st.session_state.get("response_text", ""))
    st.session_state.live_prompt_tokens = usage["prompt_tokens"]
    st.session_state.live_response_tokens = usage["response_tokens"]
    st.session_state.live_total_tokens = usage["total_tokens"]
    st.session_state.live_estimated_cost = usage["cost_usd"]


def apply_example(prompt: str, response_text: str) -> None:
    st.session_state.prompt_text = prompt
    st.session_state.response_text = response_text
    refresh_live_usage()
    st.session_state.trigger_analysis = True


def normalize_importance(raw_importance: Any, prompt: str) -> List[Dict[str, Any]]:
    prompt_words = re.findall(r"\S+", prompt)

    if isinstance(raw_importance, dict):
        return [{"word": str(word), "score": safe_float(score)} for word, score in raw_importance.items()]

    if isinstance(raw_importance, list) and raw_importance:
        if isinstance(raw_importance[0], dict):
            items: List[Dict[str, Any]] = []
            for item in raw_importance:
                word = str(item.get("word", "")).strip()
                score = safe_float(item.get("score", 0.0))
                if word:
                    items.append({"word": word, "score": score})
            if items:
                return items

        if isinstance(raw_importance[0], (float, int)):
            items = []
            for i, score in enumerate(raw_importance):
                if i >= len(prompt_words):
                    break
                items.append({"word": prompt_words[i], "score": safe_float(score)})
            if items:
                return items

    return [{"word": word, "score": 0.1} for word in prompt_words]


def normalize_analysis(payload: Dict[str, Any], prompt: str, response_text: str) -> Dict[str, Any]:
    token_usage = payload.get("token_usage", {})
    prompt_tokens = token_usage.get("prompt_tokens", payload.get("prompt_tokens", 0))
    response_tokens = token_usage.get("response_tokens", payload.get("response_tokens", 0))
    total_tokens = token_usage.get("total_tokens", payload.get("total_tokens", 0))
    cost_usd = token_usage.get("cost_usd", payload.get("cost_usd", 0.0))

    if safe_int(total_tokens) <= 0:
        total_tokens = safe_int(prompt_tokens) + safe_int(response_tokens)

    raw_importance = (
        payload.get("importance_heatmap")
        or payload.get("importance")
        or payload.get("importance_scores")
        or []
    )
    importance_items = normalize_importance(raw_importance, prompt)

    waste_tokens = payload.get("waste_tokens")
    if not isinstance(waste_tokens, list):
        waste_tokens = [item["word"] for item in importance_items if safe_float(item.get("score", 0.0)) < 0.2]

    optimized_prompt = payload.get("optimized_prompt") or prompt
    cost_saved_pct = payload.get("cost_saved_pct", payload.get("cost_saved_percent", 0.0))

    quality_risk = payload.get("quality_risk", "medium")
    if isinstance(quality_risk, dict):
        quality_risk = quality_risk.get("level", "medium")

    return {
        "token_usage": {
            "prompt_tokens": safe_int(prompt_tokens),
            "response_tokens": safe_int(response_tokens),
            "total_tokens": safe_int(total_tokens),
            "cost_usd": safe_float(cost_usd),
        },
        "importance_heatmap": importance_items,
        "waste_tokens": [str(token).strip() for token in waste_tokens if str(token).strip()],
        "optimized_prompt": str(optimized_prompt),
        "cost_saved_pct": safe_float(cost_saved_pct),
        "quality_risk": str(quality_risk).lower(),
        "source_prompt": prompt,
        "source_response": response_text,
    }


def build_mock_analysis(prompt: str, response_text: str) -> Dict[str, Any]:
    prompt_words = re.findall(r"\S+", prompt)
    response_words = re.findall(r"\S+", response_text)
    stop_words = {"the", "a", "an", "to", "of", "in", "for", "and", "is", "are", "with", "on", "at"}

    importance_items: List[Dict[str, Any]] = []
    for word in prompt_words:
        cleaned = re.sub(r"[^\w\-]", "", word.lower())
        score = 0.12
        if len(cleaned) >= 8:
            score = 0.7
        elif len(cleaned) >= 5:
            score = 0.45
        if cleaned in stop_words:
            score = 0.08
        importance_items.append({"word": word, "score": score})

    waste_tokens = [item["word"] for item in importance_items if item["score"] < 0.2]
    optimized_words = [w for w in prompt_words if re.sub(r"[^\w\-]", "", w.lower()) not in stop_words]
    optimized_prompt = " ".join(optimized_words[:80]).strip() or prompt

    prompt_tokens = max(1, int(len(prompt_words) * 1.2))
    response_tokens = max(1, int(len(response_words) * 1.2))
    total_tokens = prompt_tokens + response_tokens
    cost_usd = round(total_tokens * 0.000002, 6)

    return {
        "token_usage": {
            "prompt_tokens": prompt_tokens,
            "response_tokens": response_tokens,
            "total_tokens": total_tokens,
            "cost_usd": cost_usd,
        },
        "importance_heatmap": importance_items,
        "waste_tokens": waste_tokens,
        "optimized_prompt": optimized_prompt,
        "cost_saved_pct": 18.5,
        "quality_risk": "medium",
        "source_prompt": prompt,
        "source_response": response_text,
    }


def fetch_analysis(prompt: str, response_text: str) -> Dict[str, Any]:
    payload = {"prompt": prompt, "response": response_text}
    try:
        resp = requests.post(API_URL, json=payload, timeout=12)
        resp.raise_for_status()
        data = resp.json()
        st.session_state.used_mock_data = False
        st.session_state.backend_error = ""
        return normalize_analysis(data, prompt, response_text)
    except Exception as exc:
        st.session_state.used_mock_data = True
        st.session_state.backend_error = str(exc)
        return build_mock_analysis(prompt, response_text)


def color_for_score(score: float) -> str:
    if score >= 0.6:
        return "#ef4444"
    if score >= 0.3:
        return "#f59e0b"
    return "#9ca3af"


def render_heatmap(items: List[Dict[str, Any]]) -> None:
    if not items:
        st.info("No importance data available.")
        return

    spans = []
    for item in items:
        word = html.escape(str(item.get("word", "")))
        score = safe_float(item.get("score", 0.0))
        bg = color_for_score(score)
        spans.append(
            f"<span style='display:inline-block;margin:4px 6px 4px 0;padding:6px 10px;"
            f"border-radius:8px;background:{bg};color:white;font-size:0.95rem;'>"
            f"{word} <b>({score:.2f})</b></span>"
        )

    st.markdown(f"<div>{''.join(spans)}</div>", unsafe_allow_html=True)


def render_quality_badge(risk: str) -> None:
    risk = (risk or "medium").lower()
    colors = {
        "low": "#22c55e",
        "medium": "#eab308",
        "high": "#ef4444",
    }
    bg = colors.get(risk, "#6b7280")
    st.markdown(
        (
            "<div style='display:inline-block;padding:8px 14px;border-radius:999px;"
            f"background:{bg};color:black;font-weight:700;text-transform:uppercase;'>"
            f"{html.escape(risk)}</div>"
        ),
        unsafe_allow_html=True,
    )


def animate_cost_saved_metric(target_pct: float) -> None:
    metric_slot = st.empty()
    start_pct = safe_float(st.session_state.get("last_cost_saved_pct", 0.0), 0.0)

    if abs(target_pct - start_pct) < 0.1:
        metric_slot.metric("Cost Saved %", f"{target_pct:.1f}%", delta="0.0%")
        st.session_state.last_cost_saved_pct = target_pct
        return

    steps = 10
    for step in range(1, steps + 1):
        current = start_pct + ((target_pct - start_pct) * step / steps)
        metric_slot.metric(
            "Cost Saved %",
            f"{current:.1f}%",
            delta=f"{(current - start_pct):+.1f}%",
        )
        time.sleep(0.03)

    st.session_state.last_cost_saved_pct = target_pct


st.set_page_config(page_title="TokenScope Pro", layout="wide")
st.markdown(
    """
<style>
    .block-container {padding-top: 1.5rem; padding-bottom: 2.5rem;}
    h1, h2, h3 {letter-spacing: -0.02em;}
    .section-card {
        border: 1px solid #e5e7eb;
        border-radius: 14px;
        padding: 16px;
        margin-bottom: 14px;
        background: #fafafa;
    }
    .big-metric {
        font-size: 3rem;
        font-weight: 800;
        line-height: 1;
    }
</style>
""",
    unsafe_allow_html=True,
)

init_state()
refresh_live_usage()

st.title("TokenScope Pro")
st.caption("Analyze prompt/response token usage, quality risk, and optimization opportunities.")

example_data = {
    "urgent_email": {
        "prompt": "Write an urgent but professional email to the vendor asking for a delivery status update today.",
        "response": "Subject: Immediate Update Required on Delivery Status\n\nHello Team,\n\nCould you please share the current delivery status by end of day today? This shipment is tied to a time-sensitive client commitment, so a prompt update will help us align next steps.\n\nThank you,\nOperations Manager",
    },
    "summarize_article": {
        "prompt": "Summarize this article into 5 clear bullet points focusing on main arguments, key data, and final takeaway.",
        "response": "The article explores how small businesses adopt AI tools in phased cycles. It explains that initial adoption often starts with customer support automation and later expands to forecasting and internal analytics. A multi-country survey cited in the piece reports productivity gains between 11% and 27%, but outcomes vary based on employee training quality. The author argues that governance and transparent usage policies are essential to avoid reputational risk and inaccurate outputs. The conclusion recommends a practical roadmap: begin with one measurable workflow, define review checkpoints, train teams continuously, and scale only after impact metrics stabilize.",
    },
    "max_savings": {
        "prompt": "Hey, actually, can you basically please, thanks, maybe kind of help me, actually, write a product launch update that is super clear, basically short, and thanks very much.",
        "response": "Hey team, actually, thanks for waiting, basically here is the update: we are launching next Monday, actually at 9 AM, and thanks again for support. Basically the features include faster checkout, cleaner dashboard navigation, and better alerts. Thanks, and actually please share feedback by Friday.",
    },
}

st.markdown("<div class='section-card'>", unsafe_allow_html=True)
st.subheader("Quick Examples")
e1, e2, e3 = st.columns(3)
with e1:
    if st.button("📧 Urgent email", use_container_width=True):
        apply_example(example_data["urgent_email"]["prompt"], example_data["urgent_email"]["response"])
with e2:
    if st.button("📝 Summarize article", use_container_width=True):
        apply_example(example_data["summarize_article"]["prompt"], example_data["summarize_article"]["response"])
with e3:
    if st.button("💸 Max savings", use_container_width=True):
        apply_example(example_data["max_savings"]["prompt"], example_data["max_savings"]["response"])
st.markdown("</div>", unsafe_allow_html=True)

st.markdown("<div class='section-card'>", unsafe_allow_html=True)
st.subheader("Input")
st.text_area(
    "Prompt",
    key="prompt_text",
    height=220,
    placeholder="Paste or type the prompt...",
    on_change=refresh_live_usage,
)
st.text_area(
    "AI Response",
    key="response_text",
    height=220,
    placeholder="Paste or type the AI response...",
    on_change=refresh_live_usage,
)
live1, live2, live3, live4 = st.columns(4)
live1.metric("Live Prompt Tokens", f"{st.session_state.live_prompt_tokens:,}")
live2.metric("Live Response Tokens", f"{st.session_state.live_response_tokens:,}")
live3.metric("Live Total Tokens", f"{st.session_state.live_total_tokens:,}")
live4.metric("Live Est. Cost", f"${st.session_state.live_estimated_cost:.6f}")
analyze_clicked = st.button("Analyze", type="primary", use_container_width=True)
st.markdown("</div>", unsafe_allow_html=True)

should_analyze = analyze_clicked or st.session_state.trigger_analysis
st.session_state.trigger_analysis = False

if should_analyze:
    with st.spinner("Analyzing..."):
        st.session_state.analysis = fetch_analysis(st.session_state.prompt_text, st.session_state.response_text)

analysis = st.session_state.get("analysis")

if analysis:
    if st.session_state.used_mock_data:
        error_msg = st.session_state.backend_error or "Unknown backend error."
        st.warning(f"Backend unavailable, showing mock data. Error: {error_msg}")

    st.markdown("<div class='section-card'>", unsafe_allow_html=True)
    st.subheader("Token Usage")
    usage = analysis["token_usage"]
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Prompt Tokens", f"{usage['prompt_tokens']:,}")
    col2.metric("Response Tokens", f"{usage['response_tokens']:,}")
    col3.metric("Total Tokens", f"{usage['total_tokens']:,}")
    col4.metric("Cost (USD)", f"${usage['cost_usd']:.6f}")
    st.markdown("</div>", unsafe_allow_html=True)

    st.markdown("<div class='section-card'>", unsafe_allow_html=True)
    st.subheader("Importance Heatmap")
    render_heatmap(analysis.get("importance_heatmap", []))
    st.markdown("</div>", unsafe_allow_html=True)

    st.markdown("<div class='section-card'>", unsafe_allow_html=True)
    st.subheader("Waste Tokens")
    waste_tokens = analysis.get("waste_tokens", [])
    if waste_tokens:
        st.markdown(", ".join([f"`{html.escape(token)}`" for token in waste_tokens]))
    else:
        st.success("No low-importance tokens found (score < 0.2).")
    st.markdown("</div>", unsafe_allow_html=True)

    st.markdown("<div class='section-card'>", unsafe_allow_html=True)
    st.subheader("Optimized Prompt")
    st.text_area(
        "Optimized Prompt",
        value=analysis.get("optimized_prompt", ""),
        height=170,
        disabled=True,
        label_visibility="collapsed",
    )
    st.markdown("</div>", unsafe_allow_html=True)

    st.markdown("<div class='section-card'>", unsafe_allow_html=True)
    left, right = st.columns([1, 1])
    with left:
        cost_saved_pct = safe_float(analysis.get("cost_saved_pct", 0.0))
        animate_cost_saved_metric(cost_saved_pct)
    with right:
        st.subheader("Quality Risk")
        render_quality_badge(analysis.get("quality_risk", "medium"))
    st.markdown("</div>", unsafe_allow_html=True)
    # ================= PHASE 4 ADDITION =================

    st.markdown("<div class='section-card'>", unsafe_allow_html=True)
    st.subheader("🔍 Prompt Comparison")

    col1, col2 = st.columns(2)

    with col1:
        st.markdown("### 🧾 Original Prompt")
        render_heatmap(analysis.get("importance_heatmap", []))

    with col2:
        st.markdown("### ✨ Optimized Prompt")
        st.text_area(
        "Optimized",
        value=analysis.get("optimized_prompt", ""),
        height=200,
        disabled=True,
        label_visibility="collapsed",
    )
# ...existing code...
st.markdown("</div>", unsafe_allow_html=True)


# ================= RISK GAUGE =================
if analysis:

    # ================= RISK GAUGE =================

    st.markdown("<div class='section-card'>", unsafe_allow_html=True)
    st.subheader("⚠️ Quality Risk Gauge")

    risk = analysis.get("quality_risk", "medium")

    if risk == "low":
        val = 95
        color = "green"
    elif risk == "medium":
        val = 75
        color = "orange"
    else:
        val = 40
        color = "red"

    st.progress(val / 100)
    st.markdown(f"**Risk Level:** :{color}[{risk.upper()}]")

    st.markdown("</div>", unsafe_allow_html=True)

else:
    st.info("Enter prompt and click Analyze")
# ================= EXPORT REPORT =================

st.markdown("<div class='section-card'>", unsafe_allow_html=True)
st.subheader("📄 Export Report")

if analysis:
    token_usage = analysis.get("token_usage", {})
    total_tokens = token_usage.get("total_tokens", 0)
    cost_usd = token_usage.get("cost_usd", 0.0)

    report = f"""
TokenScope Report

Original Prompt:
{analysis.get("source_prompt", "")}

Optimized Prompt:
{analysis.get("optimized_prompt", "")}

Total Tokens: {total_tokens}
Cost: ${cost_usd}

Cost Saved: {analysis.get("cost_saved_pct", 0):.2f}%
Quality Risk: {analysis.get("quality_risk", "")}

Waste Tokens:
{", ".join(analysis.get("waste_tokens", []))}
"""
    st.download_button(
        "⬇️ Download Report",
        report,
        file_name="tokenscope_report.txt"
    )
else:
    st.info("Run an analysis to enable report export.")

st.markdown("</div>", unsafe_allow_html=True)
# ...existing code...
