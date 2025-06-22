"""FastAPI application exposing CoachAI and MarketAI endpoints.

This module defines two main POST endpoints that proxy to external AI providers
(Groq API and Perplexity/Claude) to assist founders during customer
and market validation. Replace the stubbed `call_groq` and `call_perplexity`
functions with real HTTP calls and add your API keys via environment
variables or a secrets manager.
"""

from __future__ import annotations

import os
from typing import List, Dict, Any

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field
import httpx

from dotenv import load_dotenv
load_dotenv()

app = FastAPI(title="Startup Validation AI", version="0.1.0")


# ────────────────────────────▼  Pydantic schemas  ▼─────────────────────────────
class CoachAIRequest(BaseModel):
    idea: str = Field(..., description="One‑sentence or paragraph startup idea.")
    conversation: List[str] = Field(
        ..., description="Ordered list of dialogue turns between founder and persona AI."
    )


class BiasInsight(BaseModel):
    question: str
    bias_type: str  # e.g. leading, loaded, double‑barreled
    why: str
    better_question: str


class CoachAIResponse(BaseModel):
    key_insights: List[str]
    question_biases: List[BiasInsight]


class MarketAIRequest(BaseModel):
    idea: str = Field(..., description="Startup idea to analyse.")


class HeatmapEntry(BaseModel):
    competitor: str
    strength: str
    weakness: str
    differentiation_score: float  # 0‑1


class MarketAIResponse(BaseModel):
    competitor_heatmap: List[HeatmapEntry]
    trends: List[str]
    value_propositions: List[str]


# ────────────────────────────▼  Helper functions  ▼─────────────────────────────
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY")


async def call_groq(prompt: str) -> str:
    """Proxy call to Groq API; replace with real implementation."""
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY not configured")

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "llama3-8b-8192",  # or "mixtral-8x7b-32768" or "gemma-7b-it"
        "messages": [
            {"role": "system", "content": "You are CoachAI..."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.3,
    }

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(url, json=payload, headers=headers)
        if resp.status_code != 200:
            raise HTTPException(
                status.HTTP_502_BAD_GATEWAY,
                detail=f"Groq API error: {resp.text}",
            )
        data: Dict[str, Any] = resp.json()
        return data["choices"][0]["message"]["content"].strip()


async def call_perplexity(query: str) -> Dict[str, Any]:
    """Proxy call to Perplexity/Claude research API; replace with real implementation."""
    if not PERPLEXITY_API_KEY:
        raise RuntimeError("PERPLEXITY_API_KEY not configured")

    url = "https://api.perplexity.ai/v1/research"
    headers = {
        "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {"query": query, "model": "claude-3-opus"}

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(url, json=payload, headers=headers)
        if resp.status_code != 200:
            raise HTTPException(
                status.HTTP_502_BAD_GATEWAY, detail=f"Perplexity error: {resp.text}"
            )
        return resp.json()


# ────────────────────────────▼  Endpoint handlers  ▼────────────────────────────
@app.post("/coach-ai", response_model=CoachAIResponse, tags=["CoachAI"])
async def coach_ai(request: CoachAIRequest):
    """Analyse conversation, surface insights, and detect question bias."""

    # Compose prompt for Groq API
    prompt = (
        """You are CoachAI, an expert customer‑interview coach.\n\n"
        "Startup idea: {idea}\n\n"
        "Conversation transcript: \n{transcript}\n\n"
        "Tasks: 1) List 3‑5 key insights about the persona's needs."
        " 2) Identify any biased/leading questions asked by the founder."
        " 3) Suggest an unbiased rewrite for each."
        "Return JSON with schema: {key_insights:[], question_biases:[{question,bias_type,why,better_question}]}"""
    ).format(
        idea=request.idea, transcript="\n".join(request.conversation)
    )

    try:
        raw_json = await call_groq(prompt)
    except RuntimeError as e:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    # Note: trust Groq to return correct JSON. In production validate/parse.
    try:
        parsed = CoachAIResponse.parse_raw(raw_json)
    except Exception as err:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(err))

    return parsed


@app.post("/market-ai", response_model=MarketAIResponse, tags=["MarketAI"])
async def market_ai(request: MarketAIRequest):
    """Run market research and return competitor heatmap, trends, and value props."""

    try:
        result = await call_perplexity(
            f"Market research for startup idea: {request.idea}. Return competitor heatmap, trends, and value propositions as JSON."
        )
    except RuntimeError as e:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    # Assume result already matches schema
    try:
        parsed = MarketAIResponse.parse_obj(result)
    except Exception as err:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(err))

    return parsed


# ────────────────────────────▼  Run locally  ▼──────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("startup_ai_endpoints:app", host="0.0.0.0", port=8000, reload=True)