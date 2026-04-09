"""
TokenScope utility functions.
Handles token counting, importance scoring (TF-IDF), and prompt trimming.
"""

import re
import tiktoken
from sklearn.feature_extraction.text import TfidfVectorizer

# --- OpenAI Pricing (USD per 1K tokens) ---
PRICING = {
    "gpt-3.5-turbo": {"input": 0.0005, "output": 0.0015},
    "gpt-4o-mini":   {"input": 0.00015, "output": 0.0006},
}


def count_tokens(text: str, model: str = "gpt-3.5-turbo") -> int:
    """Count tokens using tiktoken for the given model."""
    try:
        encoding = tiktoken.encoding_for_model(model)
    except KeyError:
        encoding = tiktoken.get_encoding("cl100k_base")
    return len(encoding.encode(text))


def estimate_cost(prompt_tokens: int, response_tokens: int, model: str) -> dict:
    """Estimate USD cost based on token counts and model pricing."""
    pricing = PRICING.get(model, PRICING["gpt-3.5-turbo"])
    input_cost = (prompt_tokens / 1000) * pricing["input"]
    output_cost = (response_tokens / 1000) * pricing["output"]
    total_cost = input_cost + output_cost
    return {
        "input_cost": round(input_cost, 6),
        "output_cost": round(output_cost, 6),
        "total_cost": round(total_cost, 6),
    }


def compute_importance(prompt: str, response: str) -> list[dict]:
    """
    Compute per-word importance scores using TF-IDF.
    Uses the prompt and response as a two-document corpus.
    Returns a list of {word, score, startIndex} objects.
    """
    # Tokenize prompt into words preserving position
    word_pattern = re.compile(r'\S+')
    matches = list(word_pattern.finditer(prompt))

    if not matches:
        return []

    # Build TF-IDF on two-document corpus
    vectorizer = TfidfVectorizer(
        lowercase=True,
        token_pattern=r'(?u)\b\w+\b',
    )

    try:
        tfidf_matrix = vectorizer.fit_transform([prompt, response])
    except ValueError:
        # If vectorizer fails (empty vocabulary), return zero scores
        return [
            {"word": m.group(), "score": 0.0, "startIndex": m.start()}
            for m in matches
        ]

    feature_names = vectorizer.get_feature_names_out()
    prompt_vector = tfidf_matrix[0].toarray().flatten()

    # Build word -> score lookup
    score_map = {}
    for idx, fname in enumerate(feature_names):
        score_map[fname] = float(prompt_vector[idx])

    # Find max score for normalization
    max_score = max(score_map.values()) if score_map else 1.0
    if max_score == 0:
        max_score = 1.0

    results = []
    for m in matches:
        raw_word = m.group()
        # Clean word for lookup (lowercase, strip punctuation)
        clean = re.sub(r'[^\w]', '', raw_word.lower())
        raw_score = score_map.get(clean, 0.0)
        normalized = raw_score / max_score
        results.append({
            "word": raw_word,
            "score": round(normalized, 4),
            "startIndex": m.start(),
        })

    return results


def trim_prompt(prompt: str, importance: list[dict], threshold: float = 0.35) -> dict:
    """
    Trim low-importance words from the prompt.
    Preserves sentence structure by keeping punctuation and structural words.
    Returns trimmed text, token count, and savings info.
    """
    # Words to always keep (structural)
    keep_words = {
        "the", "a", "an", "is", "are", "was", "were", "be", "been",
        "being", "have", "has", "had", "do", "does", "did", "will",
        "would", "could", "should", "may", "might", "can", "shall",
        "i", "you", "he", "she", "it", "we", "they", "me", "him",
        "her", "us", "them", "my", "your", "his", "its", "our",
        "their", "this", "that", "these", "those", "what", "which",
        "who", "whom", "where", "when", "how", "why", "if", "then",
        "and", "or", "but", "not", "no", "so", "as", "at", "by",
        "for", "from", "in", "into", "of", "on", "to", "with",
        "please", "write", "create", "make", "explain", "describe",
        "list", "give", "tell", "show", "help", "generate", "provide",
        "about", "using", "use",
    }

    trimmed_words = []
    for item in importance:
        word = item["word"]
        clean = re.sub(r'[^\w]', '', word.lower())

        # Keep if above threshold, structural, or very short
        if (
            item["score"] >= threshold
            or clean in keep_words
            or len(clean) <= 2
            or not clean  # punctuation-only tokens
        ):
            trimmed_words.append(word)

    trimmed_text = " ".join(trimmed_words)

    # Clean up extra spaces
    trimmed_text = re.sub(r'\s+', ' ', trimmed_text).strip()

    return {
        "trimmed_prompt": trimmed_text,
        "original_token_count": count_tokens(prompt),
        "trimmed_token_count": count_tokens(trimmed_text),
    }
