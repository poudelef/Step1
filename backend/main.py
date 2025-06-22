"""FastAPI application exposing CoachAI and MarketAI endpoints.

This module defines two main POST endpoints that proxy to external AI providers
(Groq API and Perplexity/Claude) to assist founders during customer
and market validation. Replace the stubbed `call_groq` and `call_perplexity`
functions with real HTTP calls and add your API keys via environment
variables or a secrets manager.
"""

from __future__ import annotations

import os
from typing import List, Dict, Any, Union, Optional
import json

from fastapi import FastAPI, HTTPException, status, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
import httpx

from dotenv import load_dotenv
import tempfile
try:
    import whisper
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False
    whisper = None
load_dotenv()

app = FastAPI(title="ValidateAI Backend", version="0.1.0")

# Add CORS middleware for frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"],  # Next.js frontend
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

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

class PersonaAIRequest(BaseModel):
    idea: str = Field(..., description="Startup idea to generate personas for.")
    target_segment: str = Field(default="", description="Optional target segment.")


class Persona(BaseModel):
    name: str
    role: str
    demographics: Union[str, Dict[str, Any]]  # accept either a string or an object
    pain_points: List[str] = Field(default_factory=list)
    goals: List[str] = Field(default_factory=list)
    personality_traits: List[str] = Field(default_factory=list)
    communication_style: Union[str, None] = None  # Use Union instead of | for Python 3.9

    # ▸ Ensure demographics is always returned as a single string
    @field_validator("demographics", mode="before")
    @classmethod
    def _demographics_to_str(cls, v):
        if isinstance(v, dict):
            # Flatten dict into comma-separated key:value pairs
            return ", ".join(f"{k}: {val}" for k, val in v.items())
        return v


class PersonaAIResponse(BaseModel):
    personas: List[Persona]


class InterviewAIRequest(BaseModel):
    idea: str
    persona: Persona
    conversation_history: List[str] = Field(default_factory=list)
    user_message: str


class InterviewAIResponse(BaseModel):
    persona_response: str
    suggested_questions: List[str]
    conversation_status: str  # "ongoing", "completed"


class OrchestratorRequest(BaseModel):
    idea: str
    step: str  # "personas", "interview", "coach", "market"
    data: Dict[str, Any] = Field(default_factory=dict)


class OrchestratorResponse(BaseModel):
    step: str
    result: Dict[str, Any]
    next_step: str
    progress: float  # 0-1


# Add new Pydantic models for voice interviews
class VoiceInterviewRequest(BaseModel):
    persona: Persona
    audio_url: Optional[str] = None
    conversation_history: List[Dict[str, str]] = Field(default_factory=list)

class VoiceInterviewResponse(BaseModel):
    persona_response: str
    persona_audio_url: Optional[str] = None  # URL to synthesized speech response
    transcribed_user_message: Optional[str] = None
    suggested_questions: List[str]
    conversation_status: str

# ────────────────────────────▼  Helper functions  ▼────────────────────────────
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")


async def call_groq(prompt: str, system_prompt: str = "You are a helpful AI assistant.") -> str:
    """Call Groq API for fast, reliable completions."""
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY not configured")

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "llama3-8b-8192",  # Updated model name
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.1,
        "max_tokens": 1000
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            print(f"Sending request to Groq...")
            resp = await client.post(url, json=payload, headers=headers)
            print(f"Groq response status: {resp.status_code}")
            
            if resp.status_code != 200:
                error_detail = f"Groq API error {resp.status_code}: {resp.text}"
                print(f"Groq Error: {error_detail}")
                raise HTTPException(
                    status.HTTP_502_BAD_GATEWAY,
                    detail=error_detail,
                )
            
            data = resp.json()
            response_text = data["choices"][0]["message"]["content"].strip()
            print(f"Groq response: {response_text[:200]}...")
            return response_text
            
    except httpx.TimeoutException:
        print("Groq API timeout")
        raise HTTPException(
            status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Groq API timeout"
        )
    except Exception as e:
        print(f"Groq API Error: {str(e)}")
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            detail=f"Groq API error: {str(e)}"
        )


# ────────────────────────────▼  Endpoint handlers  ▼────────────────────────────
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "ValidateAI Backend", "cors": "enabled"}


@app.get("/test")
async def test_endpoint():
    """Simple test endpoint to verify API is working."""
    return {"message": "API is working!", "timestamp": "2025-01-21"}


@app.options("/personas")
async def personas_options():
    """Handle OPTIONS request for personas endpoint."""
    return {"message": "CORS preflight handled"}


@app.options("/interview")
async def interview_options():
    """Handle OPTIONS request for interview endpoint."""
    return {"message": "CORS preflight handled"}


@app.options("/coach-ai")
async def coach_ai_options():
    """Handle OPTIONS request for coach-ai endpoint."""
    return {"message": "CORS preflight handled"}


@app.options("/market-ai")
async def market_ai_options():
    """Handle OPTIONS request for market-ai endpoint."""
    return {"message": "CORS preflight handled"}


@app.post("/orchestrator", response_model=OrchestratorResponse, tags=["Orchestrator"])
async def orchestrator(request: OrchestratorRequest):
    """Main orchestrator that coordinates all AI agents."""
    
    system_prompt = """You are the Orchestrator AI for ValidateAI, coordinating a multi-agent system for startup idea validation.
    Your role is to manage the flow between PersonaAI, InterviewAI, CoachAI, and MarketAI agents.
    Always respond with structured JSON that matches the expected schema."""
    
    try:
        if request.step == "personas":
            # Generate personas using PersonaAI
            prompt = f"""Generate 3-5 customer personas for this startup idea: {request.idea}
            
            Return JSON with this exact structure:
            {{
                "step": "personas",
                "result": {{
                    "personas": [
                        {{
                            "name": "string",
                            "role": "string", 
                            "demographics": "string",
                            "pain_points": ["string"],
                            "goals": ["string"],
                            "personality_traits": ["string"],
                            "communication_style": "string"
                        }}
                    ]
                }},
                "next_step": "interview",
                "progress": 0.25
            }}"""
            
            raw_response = await call_claude(prompt, system_prompt)
            return OrchestratorResponse.parse_raw(raw_response)
            
        elif request.step == "market":
            # Market research using MarketAI
            prompt = f"""Conduct market research for: {request.idea}
            
            Return JSON with this exact structure:
            {{
                "step": "market",
                "result": {{
                    "competitor_heatmap": [
                        {{
                            "competitor": "string",
                            "strength": "string",
                            "weakness": "string", 
                            "differentiation_score": 0.8
                        }}
                    ],
                    "trends": ["string"],
                    "value_propositions": ["string"]
                }},
                "next_step": "complete",
                "progress": 1.0
            }}"""
            
            raw_response = await call_claude(prompt, system_prompt)
            return OrchestratorResponse.parse_raw(raw_response)
            
        else:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"Unknown step: {request.step}")
            
    except Exception as e:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.post("/personas", response_model=PersonaAIResponse, tags=["PersonaAI"])
async def generate_personas(request: PersonaAIRequest):
    """Generate customer personas for a startup idea."""
    
    system_prompt = """You are PersonaAI, an expert at creating detailed customer personas for startup validation.
    Generate realistic, diverse personas that represent potential customers for the given startup idea."""
    
    prompt = f"""Create 3-5 detailed customer personas for this startup idea: {request.idea}
    
    Target segment context: {request.target_segment or 'General market'}
    
    For each persona, provide:
    - Name and role
    - Demographics 
    - Key pain points
    - Goals and motivations
    - Personality traits
    - Communication style
    
    Return as JSON matching the PersonaAIResponse schema."""
    
    try:
        raw_response = await call_claude(prompt, system_prompt)
        # Parse and validate the response
        parsed = PersonaAIResponse.parse_raw(raw_response)
        return parsed
    except Exception as e:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# Updated interview endpoint with fallback
@app.post("/interview", response_model=InterviewAIResponse, tags=["InterviewAI"])
async def conduct_interview(request: InterviewAIRequest):
    """Simulate interview conversation with a persona."""
    
    # Create a contextual response based on the persona's background
    def create_contextual_response():
        # Extract key pain points and goals
        main_pain = request.persona.pain_points[0] if request.persona.pain_points else "time management"
        main_goal = request.persona.goals[0] if request.persona.goals else "efficiency"
        
        if "biggest challenge" in request.user_message.lower():
            return InterviewAIResponse(
                persona_response=f"As a {request.persona.role}, my biggest challenge is {main_pain}. When it comes to {request.idea}, this is particularly frustrating because it directly impacts my {main_goal}.",
                suggested_questions=[
                    "How would your solution specifically address this pain point?",
                    "What kind of time savings could I expect?"
                ],
                conversation_status="ongoing"
            )
        else:
            return InterviewAIResponse(
                persona_response=f"Let me share my perspective as a {request.persona.role}. Currently, {main_pain} is a major challenge for me, and I'm always looking for solutions that could help with {main_goal}.",
                suggested_questions=[
                    "What inspired you to focus on this particular problem?",
                    "How does your solution differ from existing alternatives?"
                ],
                conversation_status="ongoing"
            )
    
    system_prompt = f"""You are {request.persona.name}, a {request.persona.role}.
    
    Your background:
    - Demographics: {request.persona.demographics}
    - Pain points: {', '.join(request.persona.pain_points)}
    - Goals: {', '.join(request.persona.goals)}
    - Personality: {', '.join(request.persona.personality_traits)}
    - Communication style: {request.persona.communication_style}
    
    You're being interviewed about the startup idea: {request.idea}
    
    Always format your response as JSON with this exact structure:
    {{"persona_response": "your response", "suggested_questions": ["question1", "question2"], "conversation_status": "ongoing"}}"""
    
    # Build conversation context
    conversation_context = "\n".join(request.conversation_history) if request.conversation_history else ""
    
    prompt = f"""Conversation so far:
    {conversation_context}
    
    Founder's message: {request.user_message}
    
    Please respond as {request.persona.name} to this message. Keep your response natural and in character.
    Focus on expressing your specific challenges and needs related to {request.idea}.
    
    IMPORTANT: Your entire response must be valid JSON in this exact format:
    {{"persona_response": "your in-character response here", "suggested_questions": ["follow-up question 1", "follow-up question 2"], "conversation_status": "ongoing"}}"""
    
    try:
        print(f"Calling Groq for interview with {request.persona.name}")
        raw_response = await call_groq(prompt, system_prompt)
        print(f"Raw Groq response: {raw_response}")
        
        # Try to parse the JSON response
        try:
            # Clean up the response - sometimes models add extra text
            if "```json" in raw_response:
                raw_response = raw_response.split("```json")[1].split("```")[0].strip()
            elif "```" in raw_response:
                raw_response = raw_response.split("```")[1].strip()
            
            parsed = InterviewAIResponse.parse_raw(raw_response)
            return parsed
            
        except Exception as parse_error:
            print(f"JSON parse error: {parse_error}")
            print(f"Raw response was: {raw_response}")
            
            # Use contextual fallback instead of generic
            return create_contextual_response()
            
    except Exception as e:
        print(f"Interview error: {str(e)}")
        
        # Use contextual fallback for API errors too
        return create_contextual_response()

@app.post("/coach-ai", response_model=CoachAIResponse, tags=["CoachAI"])
async def coach_ai(request: CoachAIRequest):
    """Analyse conversation, surface insights, and detect question bias."""

    system_prompt = """You are CoachAI, an expert customer interview coach. Analyze conversations to:
    1. Extract key insights about customer needs
    2. Identify biased or leading questions
    3. Suggest better, unbiased alternatives
    
    IMPORTANT: You must respond with valid JSON only, no additional text."""

    prompt = f"""Startup idea: {request.idea}

Conversation transcript:
{chr(10).join(request.conversation)}

Tasks:
1. List 3-5 key insights about the persona's needs and behaviors
2. Identify any biased/leading questions asked by the founder
3. Suggest an unbiased rewrite for each problematic question

Return ONLY valid JSON matching this exact schema:
{{
    "key_insights": ["insight 1", "insight 2", "insight 3"],
    "question_biases": [
        {{
            "question": "original question",
            "bias_type": "leading/loaded/double-barreled/etc",
            "why": "explanation of the bias",
            "better_question": "improved version"
        }}
    ]
}}

Do not include any text before or after the JSON."""

    try:
        raw_json = await call_groq(prompt, system_prompt)
        
        # Try to extract JSON if it's wrapped in markdown or has extra text
        if "```json" in raw_json:
            raw_json = raw_json.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_json:
            raw_json = raw_json.split("```")[1].strip()
        
        # Try to parse the JSON
        try:
            parsed = CoachAIResponse.parse_raw(raw_json)
            return parsed
        except Exception as parse_error:
            print(f"JSON parse error: {parse_error}")
            print(f"Raw response was: {raw_json}")
            
            # Return a fallback response if JSON parsing fails
            return CoachAIResponse(
                key_insights=[
                    "Unable to parse AI response - check conversation for insights",
                    "Consider asking more open-ended questions",
                    "Focus on understanding customer pain points"
                ],
                question_biases=[
                    BiasInsight(
                        question="Sample question",
                        bias_type="leading",
                        why="This is a fallback response due to parsing error",
                        better_question="What are your thoughts on this?"
                    )
                ]
            )
            
    except Exception as e:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.post("/market-ai", response_model=MarketAIResponse, tags=["MarketAI"])
async def market_ai(request: MarketAIRequest):
    """Run market research and return competitor heatmap, trends, and value props."""

    query = f"""Conduct comprehensive market research for this startup idea: {request.idea}

Please provide:
1. Competitor analysis with strengths, weaknesses, and differentiation scores
2. Current market trends relevant to this idea
3. Potential value propositions

Format the response as JSON with competitor_heatmap, trends, and value_propositions arrays."""

    try:
        result = await call_perplexity(query)
        
        # Parse the Perplexity response and structure it
        content = result.get("content", "")
        
        # Use GPT to structure the Perplexity research into our schema
        structure_prompt = f"""Take this market research content and structure it into the required JSON format:

Research content: {content}

Return ONLY valid JSON matching this exact schema:
{{
    "competitor_heatmap": [
        {{
            "competitor": "Company Name",
            "strength": "Main strength",
            "weakness": "Main weakness",
            "differentiation_score": 0.7
        }}
    ],
    "trends": ["trend 1", "trend 2", "trend 3"],
    "value_propositions": ["value prop 1", "value prop 2", "value prop 3"]
}}

Do not include any text before or after the JSON."""
        
        structured_response = await call_groq(structure_prompt)
        
        # Try to extract JSON if it's wrapped in markdown
        if "```json" in structured_response:
            structured_response = structured_response.split("```json")[1].split("```")[0].strip()
        elif "```" in structured_response:
            structured_response = structured_response.split("```")[1].strip()
        
        try:
            parsed = MarketAIResponse.parse_raw(structured_response)
            return parsed
        except Exception as parse_error:
            print(f"Market AI JSON parse error: {parse_error}")
            print(f"Raw response was: {structured_response}")
            
            # Return a fallback response if JSON parsing fails
            return MarketAIResponse(
                competitor_heatmap=[
                    HeatmapEntry(
                        competitor="Sample Competitor",
                        strength="Established market presence",
                        weakness="Limited innovation",
                        differentiation_score=0.6
                    )
                ],
                trends=["Market research parsing failed - check manually"],
                value_propositions=["Focus on unique features", "Emphasize portability"]
            )
        
    except Exception as e:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.get("/debug/env")
async def debug_env():
    """Debug endpoint to check environment variables."""
    return {
        "anthropic_key_present": bool(ANTHROPIC_API_KEY and len(ANTHROPIC_API_KEY) > 10),
        "perplexity_key_present": bool(PERPLEXITY_API_KEY and len(PERPLEXITY_API_KEY) > 10),
        "groq_key_present": bool(GROQ_API_KEY and len(GROQ_API_KEY) > 10),
        "anthropic_key_prefix": ANTHROPIC_API_KEY[:10] if ANTHROPIC_API_KEY else "None",
        "perplexity_key_prefix": PERPLEXITY_API_KEY[:10] if PERPLEXITY_API_KEY else "None",
        "groq_key_prefix": GROQ_API_KEY[:10] if GROQ_API_KEY else "None"
    }


@app.get("/debug/claude")
async def debug_claude():
    """Debug endpoint to test Claude API call."""
    try:
        response = await call_claude("Say hello!", "You are a helpful assistant.")
        return {"success": True, "response": response[:100] + "..." if len(response) > 100 else response}
    except Exception as e:
        return {"success": False, "error": str(e), "error_type": type(e).__name__}


@app.get("/debug/groq")
async def debug_groq():
    """Debug endpoint to test Groq API call."""
    try:
        response = await call_groq("Say hello!", "You are a helpful assistant.")
        return {"success": True, "response": response[:100] + "..." if len(response) > 100 else response}
    except Exception as e:
        return {"success": False, "error": str(e), "error_type": type(e).__name__}



# ────────────────────────────▼  Run locally  ▼──────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 

    # Add these debug endpoints to your main.py

@app.get("/debug/test-all-apis")
async def test_all_apis():
    """Test all AI API connections."""
    results = {}
    
    # Test OpenAI
    try:
        openai_result = await call_groq("Say 'OpenAI working!'", "You are a test assistant.")
        results["openai"] = {"status": "success", "response": openai_result[:50]}
    except Exception as e:
        results["openai"] = {"status": "error", "error": str(e)}
    
    # Test Claude
    try:
        claude_result = await call_claude("Say 'Claude working!'", "You are a test assistant.")
        results["claude"] = {"status": "success", "response": claude_result[:50]}
    except Exception as e:
        results["claude"] = {"status": "error", "error": str(e)}
    
    # Test Perplexity
    try:
        perplexity_result = await call_perplexity("What is 2+2?")
        results["perplexity"] = {"status": "success", "response": str(perplexity_result)[:50]}
    except Exception as e:
        results["perplexity"] = {"status": "error", "error": str(e)}
    
    return results


# Updated call_claude function with better error handling
async def call_claude(prompt: str, system_prompt: str = "You are a helpful AI assistant.") -> str:
    """Call Claude API with improved error handling."""
    if not ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY not configured")

    url = "https://api.anthropic.com/v1/messages"
    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01"
    }
    payload = {
        "model": "claude-3-5-sonnet-20241022",  # Updated model
        "max_tokens": 2000,
        "system": system_prompt,
        "messages": [
            {"role": "user", "content": prompt}
        ]
    }

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(url, json=payload, headers=headers)
            
            if resp.status_code != 200:
                error_detail = f"Claude API error {resp.status_code}: {resp.text}"
                print(f"Claude Error: {error_detail}")  # Add logging
                raise HTTPException(
                    status.HTTP_502_BAD_GATEWAY,
                    detail=error_detail,
                )
            
            data: Dict[str, Any] = resp.json()
            return data["content"][0]["text"].strip()
            
    except httpx.TimeoutException:
        raise HTTPException(
            status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Claude API timeout"
        )
    except Exception as e:
        print(f"Claude API Error: {str(e)}")  # Add logging
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            detail=f"Claude API error: {str(e)}"
        )


# Updated call_perplexity function
async def call_perplexity(query: str) -> Dict[str, Any]:
    """Call Perplexity API with better error handling."""
    if not PERPLEXITY_API_KEY:
        raise RuntimeError("PERPLEXITY_API_KEY not configured")

    url = "https://api.perplexity.ai/chat/completions"
    headers = {
        "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "llama-3.1-sonar-small-128k-online",  # Use smaller, more reliable model
        "messages": [
            {"role": "user", "content": query}
        ],
        "temperature": 0.3,
        "max_tokens": 1000
    }

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(url, json=payload, headers=headers)
            
            if resp.status_code != 200:
                error_detail = f"Perplexity API error {resp.status_code}: {resp.text}"
                print(f"Perplexity Error: {error_detail}")  # Add logging
                raise HTTPException(
                    status.HTTP_502_BAD_GATEWAY, 
                    detail=error_detail
                )
            
            data = resp.json()
            return {"content": data["choices"][0]["message"]["content"]}
            
    except httpx.TimeoutException:
        raise HTTPException(
            status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Perplexity API timeout"
        )
    except Exception as e:
        print(f"Perplexity API Error: {str(e)}")  # Add logging
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            detail=f"Perplexity API error: {str(e)}"
        )


# Add fallback responses for demo purposes
@app.post("/personas-fallback", response_model=PersonaAIResponse, tags=["PersonaAI"])
async def generate_personas_fallback(request: PersonaAIRequest):
    """Fallback persona generation without API calls for demo."""
    
    # Demo personas for "CRM for freelancers"
    demo_personas = [
        Persona(
            name="Sarah Chen",
            role="Freelance Graphic Designer", 
            demographics="28, San Francisco, 5 years experience",
            pain_points=[
                "Manual invoice tracking is time-consuming",
                "Loses track of client follow-ups", 
                "Struggles with project file organization"
            ],
            goals=[
                "Streamline client management",
                "Get paid faster",
                "Focus more on creative work"
            ],
            personality_traits=["Detail-oriented", "Creative", "Slightly disorganized"],
            communication_style="Friendly but professional, prefers visual examples"
        ),
        Persona(
            name="Marcus Rodriguez",
            role="Freelance Web Developer",
            demographics="34, Austin, 8 years experience", 
            pain_points=[
                "Scope creep without proper tracking",
                "Client communication gaps",
                "Invoice disputes over unclear requirements"
            ],
            goals=[
                "Better project boundaries",
                "Clear communication with clients",
                "Consistent monthly income"
            ],
            personality_traits=["Analytical", "Direct", "Process-oriented"],
            communication_style="Technical and straightforward, likes data"
        ),
        Persona(
            name="Emma Thompson",
            role="Freelance Marketing Consultant", 
            demographics="31, Remote, 6 years experience",
            pain_points=[
                "Juggling multiple client campaigns",
                "Tracking ROI across different projects", 
                "Maintaining client relationships long-term"
            ],
            goals=[
                "Scale to agency level",
                "Build recurring revenue streams",
                "Improve client retention"
            ],
            personality_traits=["Strategic", "Relationship-focused", "Growth-minded"],
            communication_style="Consultative and relationship-building"
        )
    ]
    
    return PersonaAIResponse(personas=demo_personas)


# Initialize Whisper model (we'll load it once when server starts)
whisper_model = None
if WHISPER_AVAILABLE and whisper is not None:
    try:
        whisper_model = whisper.load_model("base")
    except Exception as e:
        print(f"Failed to load Whisper model: {e}")
        WHISPER_AVAILABLE = False

@app.post("/upload-audio", response_model=Dict[str, str])
async def upload_audio(audio_file: UploadFile = File(...)):
    """Handle audio file uploads for voice interviews."""
    try:
        # Create a temporary file to save the uploaded audio
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
            content = await audio_file.read()
            temp_audio.write(content)
            temp_audio.flush()
            
            # Transcribe the audio using Whisper
            if WHISPER_AVAILABLE and whisper_model is not None:
                result = whisper_model.transcribe(temp_audio.name)
                transcribed_text = result["text"]
            else:
                transcribed_text = "Whisper not available"
            
            return {
                "transcribed_text": transcribed_text,
                "status": "success"
            }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Audio processing failed: {str(e)}"
        )

@app.post("/voice-interview", response_model=VoiceInterviewResponse)
async def conduct_voice_interview(request: VoiceInterviewRequest):
    """Conduct an interview using voice input/output."""
    try:
        # If we have a new audio URL, transcribe it
        transcribed_text = None
        if request.audio_url:
            # Here you would download the audio from the URL and transcribe
            # For now, we'll assume the text is already transcribed
            transcribed_text = "Transcribed text would go here"
        
        # Use the same interview logic but with voice-specific response
        interview_response = await conduct_interview(InterviewAIRequest(
            idea="Your startup idea",
            persona=request.persona,
            conversation_history=[msg["text"] for msg in request.conversation_history],
            user_message=transcribed_text or "Hello"
        ))
        
        # Here you would add text-to-speech conversion for the response
        # For now, we'll return just the text
        return VoiceInterviewResponse(
            persona_response=interview_response.persona_response,
            transcribed_user_message=transcribed_text,
            suggested_questions=interview_response.suggested_questions,
            conversation_status=interview_response.conversation_status
        )
        
    except Exception as e:
        print(f"Voice interview error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Voice interview failed: {str(e)}"
        )