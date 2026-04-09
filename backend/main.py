"""
TokenScope API - FastAPI backend for prompt token analysis.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from .utils import count_tokens, estimate_cost, compute_importance, trim_prompt

app = FastAPI(title="TokenScope API", version="1.0.0")

# CORS - allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    prompt: str
    model: str = "gpt-3.5-turbo"
    api_key: str


class AnalyzeResponse(BaseModel):
    prompt_tokens: int
    response_tokens: int
    total_tokens: int
    cost: dict
    importance: list[dict]
    response_text: str
    trimmed: dict


@app.get("/health")
def health():
    """Health check endpoint."""
    return {"status": "ok"}


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest):
    """
    Analyze a prompt: count tokens, call OpenAI, compute importance,
    and suggest a trimmed version.
    """
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty.")

    if not req.api_key.strip():
        raise HTTPException(status_code=400, detail="API key is required.")

    if req.model not in ("gpt-3.5-turbo", "gpt-4o-mini"):
        raise HTTPException(status_code=400, detail="Unsupported model.")

    # Count prompt tokens
    prompt_tokens = count_tokens(req.prompt, req.model)

    # Call OpenAI
    try:
        client = OpenAI(api_key=req.api_key)
        completion = client.chat.completions.create(
            model=req.model,
            messages=[{"role": "user", "content": req.prompt}],
            max_tokens=1024,
            temperature=0.7,
        )
    except Exception as e:
        error_msg = str(e)
        if "invalid_api_key" in error_msg.lower() or "incorrect api key" in error_msg.lower():
            raise HTTPException(status_code=401, detail="Invalid OpenAI API key.")
        if "rate_limit" in error_msg.lower():
            raise HTTPException(status_code=429, detail="Rate limited by OpenAI. Please wait and try again.")
        raise HTTPException(status_code=502, detail=f"OpenAI API error: {error_msg}")

    response_text = completion.choices[0].message.content or ""

    # Use actual usage from OpenAI response if available
    if completion.usage:
        actual_prompt_tokens = completion.usage.prompt_tokens
        actual_response_tokens = completion.usage.completion_tokens
        actual_total = completion.usage.total_tokens
    else:
        actual_prompt_tokens = prompt_tokens
        actual_response_tokens = count_tokens(response_text, req.model)
        actual_total = actual_prompt_tokens + actual_response_tokens

    # Cost estimation
    cost = estimate_cost(actual_prompt_tokens, actual_response_tokens, req.model)

    # Compute word importance via TF-IDF
    importance = compute_importance(req.prompt, response_text)

    # Generate trimmed prompt
    trimmed = trim_prompt(req.prompt, importance)
    trimmed_cost = estimate_cost(trimmed["trimmed_token_count"], actual_response_tokens, req.model)
    trimmed["savings"] = round(cost["total_cost"] - trimmed_cost["total_cost"], 6)
    trimmed["trimmed_cost"] = trimmed_cost["total_cost"]

    return AnalyzeResponse(
        prompt_tokens=actual_prompt_tokens,
        response_tokens=actual_response_tokens,
        total_tokens=actual_total,
        cost=cost,
        importance=importance,
        response_text=response_text,
        trimmed=trimmed,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
