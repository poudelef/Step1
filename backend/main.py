"""FastAPI application exposing CoachAI and MarketAI endpoints.

This module defines two main POST endpoints that proxy to external AI providers
(GPT‑4o via OpenAI API and Perplexity/Claude) to assist founders during customer
and market validation. Replace the stubbed `call_gpt4o` and `call_perplexity`
functions with real HTTP calls and add your API keys via environment
variables or a secrets manager.
"""

from __future__ import annotations

import os
from typing import List, Dict, Any, Union
import json
import base64
import io

from fastapi import FastAPI, HTTPException, status, File, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
import httpx
from dotenv import load_dotenv
import tempfile

# Load environment variables from .env file
load_dotenv()
# Also load from .env.local if it exists
load_dotenv('.env.local')

app = FastAPI(title="StepOne Backend", version="0.1.0")

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
    audio_file: Union[str, None] = None  # Base64 encoded audio (optional)
    conversation_history: List[Dict[str, str]] = Field(default_factory=list)

class VoiceInterviewResponse(BaseModel):
    persona_response: str
    persona_audio_url: Union[str, None] = None  # Optional audio URL
    transcribed_user_message: Union[str, None] = None  # Optional transcription
    suggested_questions: List[str]
    conversation_status: str


# Add insights models
class InsightSummaryRequest(BaseModel):
    idea: str
    conversation_history: List[str]
    persona: Persona


class InsightSummaryResponse(BaseModel):
    pain_points: List[str]
    objections: List[str]
    willingness_to_pay: str
    feature_requests: List[str]
    key_quotes: List[str]


# Add export models
class ExportRequest(BaseModel):
    idea: str
    insights: InsightSummaryResponse
    competitor_heatmap: List[HeatmapEntry]
    trends: List[str]


class ExportResponse(BaseModel):
    slide_markdown: str
    pdf_url: str = None
    email_template: str


# ────────────────────────────▼  Helper functions  ▼────────────────────────────
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")


async def call_openai(prompt: str, system_prompt: str = "You are a helpful AI assistant.", model: str = "gpt-4o-mini") -> str:
    """Call OpenAI API for GPT-4o completions."""
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY not configured")

    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }
    
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 1500
    }

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(url, json=payload, headers=headers)
            
            if resp.status_code != 200:
                error_detail = f"OpenAI API error {resp.status_code}: {resp.text}"
                print(f"OpenAI Error: {error_detail}")
                raise HTTPException(
                    status.HTTP_502_BAD_GATEWAY,
                    detail=error_detail,
                )
            
            data = resp.json()
            response_text = data["choices"][0]["message"]["content"].strip()
            return response_text
            
    except httpx.TimeoutException:
        raise HTTPException(
            status.HTTP_504_GATEWAY_TIMEOUT,
            detail="OpenAI API timeout"
        )
    except Exception as e:
        print(f"OpenAI API Error: {str(e)}")
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            detail=f"OpenAI API error: {str(e)}"
        )


# Create alias for backward compatibility
call_gpt4o = call_openai


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
        "model": "llama3-8b-8192",  # Updated to current Groq model
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


async def call_claude(prompt: str, system_prompt: str = "You are a helpful AI assistant.") -> str:
    """Call Claude API for orchestration and persona generation."""
    if not ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY not configured")

    url = "https://api.anthropic.com/v1/messages"
    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01"
    }
    payload = {
        "model": "claude-3-5-sonnet-20241022",
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
                print(f"Claude Error: {error_detail}")
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
        print(f"Claude API Error: {str(e)}")
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            detail=f"Claude API error: {str(e)}"
        )


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
        "model": "llama-3.1-sonar-small-128k-online",
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
                print(f"Perplexity Error: {error_detail}")
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
        print(f"Perplexity API Error: {str(e)}")
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            detail=f"Perplexity API error: {str(e)}"
        )


async def transcribe_audio(audio_base64: str) -> str:
    """Transcribe audio using OpenAI Whisper API."""
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY not configured")

    # Decode base64 audio
    audio_data = base64.b64decode(audio_base64)
    
    url = "https://api.openai.com/v1/audio/transcriptions"
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
    }
    
    files = {
        "file": ("audio.webm", io.BytesIO(audio_data), "audio/webm"),
        "model": (None, "whisper-1"),
    }

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(url, headers=headers, files=files)
            
            if resp.status_code != 200:
                error_detail = f"Whisper API error {resp.status_code}: {resp.text}"
                print(f"Whisper Error: {error_detail}")
                raise HTTPException(
                    status.HTTP_502_BAD_GATEWAY,
                    detail=error_detail,
                )
            
            data = resp.json()
            return data["text"]
            
    except Exception as e:
        print(f"Whisper API Error: {str(e)}")
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            detail=f"Whisper API error: {str(e)}"
        )


def get_persona_voice(persona_name: str, communication_style: str = "") -> str:
    """Select appropriate voice based on persona characteristics with more natural options."""
    name_lower = persona_name.lower()
    style_lower = communication_style.lower()
    
    # Use the most natural-sounding OpenAI voices
    # Female-sounding names get natural female voices
    if any(name in name_lower for name in ['sarah', 'emma', 'maria', 'jennifer', 'lisa', 'anna', 'kate', 'amy', 'rachel', 'jessica']):
        if 'professional' in style_lower or 'formal' in style_lower:
            return "shimmer"  # Professional but warm female voice
        elif 'creative' in style_lower or 'friendly' in style_lower:
            return "nova"  # More expressive female voice
        else:
            return "alloy"  # Balanced, natural female voice
    
    # Male-sounding names get natural male voices  
    elif any(name in name_lower for name in ['marcus', 'john', 'mike', 'david', 'alex', 'chris', 'james', 'robert', 'michael', 'daniel']):
        if 'technical' in style_lower or 'analytical' in style_lower:
            return "echo"  # Clear, professional male voice
        elif 'casual' in style_lower or 'friendly' in style_lower:
            return "fable"  # Warm, conversational male voice
        else:
            return "onyx"  # Natural, balanced male voice
    
    # Default to the most natural voice
    return "nova"  # Most human-like overall


async def synthesize_speech(text: str, voice: str = "nova") -> str:
    """Synthesize speech using OpenAI TTS API with optimized settings for natural conversation."""
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY not configured")

    # Pre-process text to make it more conversational
    processed_text = make_text_more_conversational(text)

    url = "https://api.openai.com/v1/audio/speech"
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }
    
    # Optimized settings for natural conversation
    payload = {
        "model": "tts-1-hd",  # Highest quality model
        "input": processed_text,
        "voice": voice,
        "response_format": "mp3",
        "speed": 0.95  # Slightly slower for more natural pace
    }

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(url, json=payload, headers=headers)
            
            if resp.status_code != 200:
                error_detail = f"TTS API error {resp.status_code}: {resp.text}"
                print(f"TTS Error: {error_detail}")
                raise HTTPException(
                    status.HTTP_502_BAD_GATEWAY,
                    detail=error_detail,
                )
            
            # Return base64 encoded audio
            audio_data = resp.content
            return base64.b64encode(audio_data).decode('utf-8')
            
    except Exception as e:
        print(f"TTS API Error: {str(e)}")
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            detail=f"TTS API error: {str(e)}"
        )


def make_text_more_conversational(text: str) -> str:
    """Process text to make TTS sound more natural and conversational."""
    # Add natural pauses with commas
    text = text.replace(" but ", ", but ")
    text = text.replace(" and ", ", and ")
    text = text.replace(" so ", ", so ")
    text = text.replace(" because ", ", because ")
    
    # Add emphasis for key words (TTS responds to punctuation)
    text = text.replace("really", "really")
    text = text.replace("very", "very")
    text = text.replace("definitely", "definitely")
    
    # Make questions sound more natural
    text = text.replace("?", "?")  # Ensure question marks are preserved
    
    # Add slight pauses before important words
    text = text.replace(" I mean", "... I mean")
    text = text.replace(" I guess", "... I guess")
    text = text.replace(" Yeah", "Yeah...")
    
    # Clean up any double punctuation
    text = text.replace("...", "...")
    text = text.replace("..", ".")
    
    return text.strip()


# ────────────────────────────▼  Endpoint handlers  ▼────────────────────────────

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "StepOne Backend", "cors": "enabled"}


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


@app.options("/voice-interview-realtime")
async def voice_interview_realtime_options():
    """Handle OPTIONS request for voice-interview-realtime endpoint."""
    return {"message": "CORS preflight handled"}


@app.post("/orchestrator", response_model=OrchestratorResponse, tags=["Orchestrator"])
async def orchestrator(request: OrchestratorRequest):
    """Main orchestrator that coordinates all AI agents."""
    
    system_prompt = """You are the Orchestrator AI for StepOne, coordinating a multi-agent system for startup idea validation.
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
    Generate realistic, diverse personas that represent potential customers for the given startup idea.
    
    IMPORTANT: Return ONLY valid JSON matching the PersonaAIResponse schema. No additional text or formatting."""
    
    prompt = f"""Create 3-5 detailed customer personas for this startup idea: {request.idea}
    
    Target segment context: {request.target_segment or 'General market'}
    
    Return JSON in this exact format:
    {{
        "personas": [
            {{
                "name": "Full Name",
                "role": "Job Title/Role",
                "demographics": "Age, location, background details",
                "pain_points": ["specific pain point 1", "specific pain point 2", "specific pain point 3"],
                "goals": ["goal 1", "goal 2", "goal 3"],
                "personality_traits": ["trait 1", "trait 2", "trait 3"],
                "communication_style": "How they communicate and prefer to be communicated with"
            }}
        ]
    }}"""
    
    try:
        raw_response = await call_claude(prompt, system_prompt)
        
        # Clean up response to ensure it's valid JSON
        if "```json" in raw_response:
            raw_response = raw_response.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_response:
            raw_response = raw_response.split("```")[1].strip()
        
        # Parse and validate the response
        parsed = PersonaAIResponse.parse_raw(raw_response)
        return parsed
    except Exception as e:
        print(f"Persona generation error: {str(e)}")
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
    
    system_prompt = f"""You are {request.persona.name}, a {request.persona.role}. You are NOT an AI assistant.

CRITICAL: You are a REAL PERSON being interviewed. Act naturally skeptical, busy, and human.

Your personality:
- You're {request.persona.demographics}
- You have limited time and aren't eager to help random founders
- You're naturally skeptical of new solutions
- You give short, realistic answers unless genuinely interested
- You deflect vague or leading questions
- You sometimes ask "what do you mean?" or "can you be more specific?"
- You share specific examples only when you trust the person or they ask good questions

Pain points you deal with: {', '.join(request.persona.pain_points)}
Your goals: {', '.join(request.persona.goals)}
Personality traits: {', '.join(request.persona.personality_traits)}

RESPONSE RULES:
- Keep responses 1-2 sentences MAX (people don't monologue in real conversations)
- Be naturally skeptical - don't volunteer information easily
- If asked vague questions, give vague answers or ask for clarification
- If asked leading questions ("Don't you think...?"), push back or deflect
- Only share detailed insights if they ask really good, specific questions
- Show you're busy/distracted sometimes
- Use natural speech: "Yeah...", "I mean...", "I guess...", "Not really..."
- Don't be overly helpful or enthusiastic unless they earn it
- NEVER include stage directions like *sigh*, (pauses), or emotional descriptions
- Speak naturally without narrating your actions or emotions
- Just give direct conversational responses"""
    
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


@app.post("/voice-interview", response_model=VoiceInterviewResponse, tags=["VoiceAI"])
async def voice_interview(request: VoiceInterviewRequest):
    """Conduct voice-based interview with persona."""
    
    try:
        # Transcribe the audio
        transcribed_text = ""
        if request.audio_file:
            transcribed_text = await transcribe_audio(request.audio_file)
        
        # Create text interview request
        text_request = InterviewAIRequest(
            idea="Voice interview", # This would come from session
            persona=request.persona,
            conversation_history=[f"{item['role']}: {item['message']}" for item in request.conversation_history],
            user_message=transcribed_text
        )
        
        # Get persona response
        text_response = await conduct_interview(text_request)
        
        # Synthesize speech for persona response
        audio_base64 = await synthesize_speech(text_response.persona_response)
        
        return VoiceInterviewResponse(
            persona_response=text_response.persona_response,
            persona_audio_url=f"data:audio/mp3;base64,{audio_base64}",
            transcribed_user_message=transcribed_text,
            suggested_questions=text_response.suggested_questions,
            conversation_status=text_response.conversation_status
        )
        
    except Exception as e:
        print(f"Voice interview error: {str(e)}")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.post("/coach-ai", response_model=CoachAIResponse, tags=["CoachAI"])
async def coach_ai(request: CoachAIRequest):
    """Analyse conversation, surface insights, and detect question bias including offensive language."""

    system_prompt = """You are CoachAI, an expert customer interview coach and ethics advisor. Analyze conversations to:
    1. Extract key insights about customer needs and behaviors
    2. Identify ONLY truly problematic questions:
       - Leading questions that push toward a specific answer ("Don't you think X is better?", "Wouldn't you agree that...")
       - Loaded questions that contain strong assumptions ("How frustrated are you with...")
       - Double-barreled questions (ask multiple things at once)
       - Offensive language (profanity, inappropriate content, discriminatory language)
       - Unprofessional questions (too personal, inappropriate for business context)
       - Biased assumptions about demographics, abilities, or preferences
    3. DO NOT flag good behavioral questions like "Tell me about...", "Walk me through...", "What happened when..."
    4. Suggest professional, unbiased alternatives for each problematic question
    
    Be precise in detecting issues. Good open-ended questions should NOT be flagged.
    Return ONLY valid JSON matching the CoachAIResponse schema."""

    prompt = f"""Startup idea: {request.idea}

Conversation transcript (analyze each founder question carefully):
{chr(10).join(request.conversation)}

Tasks:
1. List 3-5 key insights about the persona's needs, pain points, and behaviors
2. Identify ALL problematic questions asked by the founder, including:
   - Leading questions ("Don't you think X would be better?")
   - Loaded questions ("How frustrated are you with current solutions?")
   - Double-barreled questions ("Do you like A and would you pay for B?")
   - Offensive/inappropriate language (profanity, discriminatory terms, unprofessional content)
   - Personal questions inappropriate for business interviews
   - Questions with biased assumptions
3. For each problematic question, explain the issue and provide a professional alternative

Return JSON matching this exact schema:
{{
    "key_insights": [
        "Specific insight about customer behavior or needs",
        "Pain point identified from conversation", 
        "Goal or motivation mentioned by persona"
    ],
    "question_biases": [
        {{
            "question": "exact problematic question from conversation",
            "bias_type": "leading/loaded/double-barreled/offensive-language/unprofessional/discriminatory",
            "why": "detailed explanation of why this question is problematic",
            "better_question": "professional, unbiased alternative question"
        }}
    ]
}}

IMPORTANT: If any founder question contains offensive language, profanity, or inappropriate content, you MUST flag it as "offensive-language" bias type."""

    try:
        raw_json = await call_openai(prompt, system_prompt, model="gpt-4o")  # Use more capable model
        
        # Clean up response
        if "```json" in raw_json:
            raw_json = raw_json.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_json:
            raw_json = raw_json.split("```")[1].strip()
            
        parsed = CoachAIResponse.parse_raw(raw_json)
        return parsed
    except Exception as e:
        print(f"Coach AI error: {str(e)}")
        # Return fallback analysis that catches common issues
        fallback_biases = []
        
        # Simple offensive language detection
        for conv_line in request.conversation:
            if any(word in conv_line.lower() for word in ['damn', 'shit', 'fuck', 'bitch', 'ass', 'hell', 'crap']):
                fallback_biases.append(BiasInsight(
                    question=conv_line,
                    bias_type="offensive-language",
                    why="Contains inappropriate language that is unprofessional in a business context",
                    better_question="Please rephrase this question using professional business language"
                ))
        
        return CoachAIResponse(
            key_insights=[
                "Customer interview analysis temporarily unavailable",
                "Please review conversation for professional language",
                "Consider rephrasing any informal or inappropriate questions"
            ],
            question_biases=fallback_biases
        )


@app.post("/market-ai", response_model=MarketAIResponse, tags=["MarketAI"])
async def market_ai(request: MarketAIRequest):
    """Run market research and return competitor heatmap, trends, and value props."""

    try:
        # Use Perplexity for real-time market research
        query = f"""Research the market for this startup idea: {request.idea}

Please provide:
1. List of 5-7 competitors with their main strengths and weaknesses
2. Current market trends (3-5 trends)
3. Potential value propositions for this idea (3-4 value props)

Focus on providing specific, actionable insights about the competitive landscape."""

        result = await call_perplexity(query)
        content = result.get("content", "")
        
        # Use OpenAI to structure the research into our schema
        structure_prompt = f"""Take this market research content and structure it into the required JSON format:

Research content: {content}

Return JSON matching this exact schema:
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

For differentiation_score, use a float between 0.0 and 1.0 representing how differentiated this startup idea would be from that competitor."""
        
        structured_response = await call_openai(structure_prompt)
        
        # Clean up response
        if "```json" in structured_response:
            structured_response = structured_response.split("```json")[1].split("```")[0].strip()
        elif "```" in structured_response:
            structured_response = structured_response.split("```")[1].strip()
            
        parsed = MarketAIResponse.parse_raw(structured_response)
        return parsed
        
    except Exception as e:
        print(f"Market AI error: {str(e)}")
        # Return fallback data for demo purposes
        return MarketAIResponse(
            competitor_heatmap=[
                HeatmapEntry(
                    competitor="Generic Competitor 1",
                    strength="Established market presence",
                    weakness="Legacy technology",
                    differentiation_score=0.6
                ),
                HeatmapEntry(
                    competitor="Generic Competitor 2",
                    strength="Strong funding",
                    weakness="Poor user experience",
                    differentiation_score=0.7
                )
            ],
            trends=["AI automation increasing", "Remote work tools growing", "User experience focus"],
            value_propositions=["Time-saving automation", "Better user experience", "Cost-effective solution"]
        )


@app.post("/insights", response_model=InsightSummaryResponse, tags=["Insights"])
async def extract_insights(request: InsightSummaryRequest):
    """Extract key insights from interview conversation."""
    
    system_prompt = """You are an expert at extracting actionable insights from customer interviews.
    Analyze the conversation and extract specific, concrete insights.
    
    Return ONLY valid JSON matching the InsightSummaryResponse schema."""
    
    prompt = f"""Startup idea: {request.idea}
Persona: {request.persona.name} ({request.persona.role})

Conversation:
{chr(10).join(request.conversation_history)}

Extract insights in this JSON format:
{{
    "pain_points": ["specific pain point 1", "specific pain point 2"],
    "objections": ["objection 1", "objection 2"],
    "willingness_to_pay": "assessment of willingness to pay",
    "feature_requests": ["feature 1", "feature 2"],
    "key_quotes": ["exact quote 1", "exact quote 2"]
}}"""

    try:
        raw_response = await call_openai(prompt, system_prompt)
        
        # Clean up response
        if "```json" in raw_response:
            raw_response = raw_response.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_response:
            raw_response = raw_response.split("```")[1].strip()
            
        parsed = InsightSummaryResponse.parse_raw(raw_response)
        return parsed
        
    except Exception as e:
        print(f"Insights extraction error: {str(e)}")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.post("/export", response_model=ExportResponse, tags=["Export"])
async def export_results(request: ExportRequest):
    """Export validation results to slide deck and email template."""
    
    try:
        # Generate slide markdown
        slide_markdown = f"""# {request.idea} - Validation Results

## Pain Points Discovered
{chr(10).join(f"- {pain}" for pain in request.insights.pain_points)}

## Competitor Landscape
{chr(10).join(f"- **{comp.competitor}**: {comp.strength} (Score: {comp.differentiation_score})" for comp in request.competitor_heatmap)}

## Market Trends
{chr(10).join(f"- {trend}" for trend in request.trends)}

## Key Customer Quotes
{chr(10).join(f'> "{quote}"' for quote in request.insights.key_quotes)}

## Next Steps
- Validate findings with real customers
- Build MVP focusing on top pain points
- Monitor competitive landscape
"""

        # Generate email template
        email_template = f"""Subject: Customer Discovery Insights for {request.idea}

Hi [Name],

I've been working on {request.idea} and discovered some interesting insights through customer interviews:

**Key Pain Points:**
{chr(10).join(f"• {pain}" for pain in request.insights.pain_points[:3])}

**Willingness to Pay:** {request.insights.willingness_to_pay}

I'd love to get your perspective on these findings. Would you be available for a quick 15-minute call this week to discuss?

Best regards,
[Your Name]
"""

        return ExportResponse(
            slide_markdown=slide_markdown,
            email_template=email_template
        )
        
    except Exception as e:
        print(f"Export error: {str(e)}")
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.get("/debug/env")
async def debug_env():
    """Debug endpoint to check environment variables."""
    return {
        "openai_key_present": bool(OPENAI_API_KEY and len(OPENAI_API_KEY) > 10),
        "anthropic_key_present": bool(ANTHROPIC_API_KEY and len(ANTHROPIC_API_KEY) > 10),
        "perplexity_key_present": bool(PERPLEXITY_API_KEY and len(PERPLEXITY_API_KEY) > 10),
        "groq_key_present": bool(GROQ_API_KEY and len(GROQ_API_KEY) > 10),
        "openai_key_prefix": OPENAI_API_KEY[:10] if OPENAI_API_KEY else "None",
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


@app.get("/debug/openai")
async def debug_openai():
    """Debug endpoint to test OpenAI API call."""
    try:
        response = await call_openai("Say hello!", "You are a helpful assistant.")
        return {"success": True, "response": response[:100] + "..." if len(response) > 100 else response}
    except Exception as e:
        return {"success": False, "error": str(e), "error_type": type(e).__name__}


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


# Add WebSocket and real-time streaming support
@app.websocket("/voice-stream/{persona_id}")
async def voice_stream_websocket(websocket: WebSocket, persona_id: str):
    """WebSocket endpoint for real-time voice streaming."""
    await websocket.accept()
    
    try:
        while True:
            # Receive audio data from frontend
            data = await websocket.receive_json()
            
            if data.get("type") == "audio_chunk":
                # Process audio chunk in real-time
                audio_base64 = data.get("audio")
                
                try:
                    # Transcribe the audio
                    transcribed_text = await transcribe_audio(audio_base64)
                    
                    # Get persona from session/database (simplified for demo)
                    # In production, you'd fetch this from your session store
                    demo_persona = {
                        "name": "Sarah Chen",
                        "role": "Freelance Graphic Designer",
                        "demographics": "28, San Francisco, 5 years experience",
                        "pain_points": ["Manual invoice tracking", "Client follow-ups"],
                        "goals": ["Streamline workflow", "Focus on creative work"],
                        "personality_traits": ["Detail-oriented", "Creative"],
                        "communication_style": "Friendly but professional"
                    }
                    
                    # Generate persona response using Groq (faster than GPT)
                    system_prompt = f"""You are {demo_persona['name']}, a {demo_persona['role']}. You are NOT an AI assistant.

CRITICAL: You are a REAL PERSON being interviewed. Act naturally skeptical, busy, and human.

Your personality:
- You're {demo_persona['demographics']}
- You have limited time and aren't eager to help random founders
- You're naturally skeptical of new solutions
- You give short, realistic answers unless genuinely interested
- You deflect vague or leading questions
- You sometimes ask "what do you mean?" or "can you be more specific?"
- You share specific examples only when you trust the person or they ask good questions

Pain points you deal with: {', '.join(demo_persona['pain_points'])}
Your goals: {', '.join(demo_persona['goals'])}
Personality traits: {', '.join(demo_persona['personality_traits'])}

RESPONSE RULES:
- Keep responses 1-2 sentences MAX (people don't monologue in real conversations)
- Be naturally skeptical - don't volunteer information easily
- If asked vague questions, give vague answers or ask for clarification
- If asked leading questions ("Don't you think...?"), push back or deflect
- Only share detailed insights if they ask really good, specific questions
- Show you're busy/distracted sometimes
- Use natural speech: "Yeah...", "I mean...", "I guess...", "Not really..."
- Don't be overly helpful or enthusiastic unless they earn it
- NEVER include stage directions like *sigh*, (pauses), or emotional descriptions
- Speak naturally without narrating your actions or emotions
- Just give direct conversational responses"""

                    # Build conversation context for better responses
                    context = ""
                    if demo_persona['conversation_history']:
                        recent_context = demo_persona['conversation_history'][-6:]  # Last 6 exchanges for better context
                        context = "\n".join([f"{'Founder' if item['role'] == 'user' else demo_persona['name']}: {item['message']}" for item in recent_context])

                    # Analyze the founder's question quality to determine response style
                    user_lower = transcribed_text.lower()
                    is_leading_question = any(phrase in user_lower for phrase in [
                        "don't you think", "wouldn't you", "isn't it true", "surely you", "obviously", 
                        "everyone knows", "it's clear that", "you must", "you probably", "wouldn't you agree",
                        "don't you agree", "isn't it obvious", "clearly you", "surely you must"
                    ])
                    
                    # More precise vague question detection - exclude good behavioral questions
                    is_vague_question = False
                    if len(transcribed_text.split()) < 8:
                        vague_patterns = ["what do you think", "how do you feel", "what's your opinion"]
                        is_vague_question = any(phrase in user_lower for phrase in vague_patterns)
                    
                    # Don't flag good behavioral questions as vague
                    good_question_patterns = [
                        "tell me about", "walk me through", "describe", "explain", "what happened", 
                        "how do you", "what's your process", "can you share", "what works", "what doesn't work"
                    ]
                    if any(pattern in user_lower for pattern in good_question_patterns):
                        is_vague_question = False

                    # Determine response style based on question quality
                    response_style = ""
                    if is_leading_question:
                        response_style = "The founder asked a leading question. Be skeptical and push back. Don't just agree."
                    elif is_vague_question:
                        response_style = "The founder asked a vague question. Give a short, non-committal answer or ask for specifics."
                    else:
                        response_style = "The founder asked a reasonable question. You can engage normally but still be naturally cautious."

                    prompt = f"""Conversation so far:
{context}

Founder just said: "{transcribed_text}"

{response_style}

Respond as {demo_persona['name']} would ACTUALLY respond in real life. Remember:
- You're busy and slightly skeptical
- Don't volunteer detailed information unless they ask great questions
- Keep it short and natural
- Be human, not helpful

Your response:"""
                    
                    persona_response = await call_groq(prompt, system_prompt)
                    
                    # Synthesize speech
                    audio_base64_response = await synthesize_speech(persona_response)
                    
                    # Send response back to frontend
                    await websocket.send_json({
                        "type": "voice_response",
                        "audio": audio_base64_response,
                        "transcribed_user": transcribed_text,
                        "persona_text": persona_response  # Only for debugging, not displayed
                    })
                    
                except Exception as e:
                    print(f"Voice processing error: {e}")
                    await websocket.send_json({
                        "type": "error",
                        "message": "Sorry, I didn't catch that. Could you repeat?"
                    })
            
            elif data.get("type") == "end_conversation":
                break
                
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        await websocket.close()


@app.post("/start-voice-interview", tags=["VoiceAI"])
async def start_voice_interview(request: dict):
    """Initialize a voice-only interview session."""
    
    try:
        persona_id = request.get("persona_id", "default")
        idea = request.get("idea", "")
        
        # Return session info for WebSocket connection
        return {
            "session_id": f"voice_session_{persona_id}",
            "websocket_url": f"ws://localhost:8000/voice-stream/{persona_id}",
            "persona_greeting": "Hi! I'm ready to chat about your idea. Just start talking naturally!"
        }
        
    except Exception as e:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# Enhanced voice interview endpoint for better real-time performance
@app.post("/voice-interview-realtime", response_model=VoiceInterviewResponse, tags=["VoiceAI"])
async def voice_interview_realtime(request: VoiceInterviewRequest):
    """Ultra-fast voice interview for real-time conversation with fallback support."""
    
    try:
        # Transcribe audio using Whisper (if audio provided)
        transcribed_text = ""
        if request.audio_file:
            try:
                transcribed_text = await transcribe_audio(request.audio_file)
            except Exception as e:
                print(f"Whisper transcription failed: {e}")
                # If no transcription, we can't process the audio
                return VoiceInterviewResponse(
                    persona_response="Sorry, I couldn't understand your audio. Could you try speaking again or check your microphone?",
                    persona_audio_url=None,
                    transcribed_user_message="",
                    suggested_questions=[],
                    conversation_status="ongoing"
                )
        
        # If no audio file but we have conversation history, this might be a text-based request
        # Extract the last user message from conversation history
        if not transcribed_text and request.conversation_history:
            last_user_message = None
            for item in reversed(request.conversation_history):
                if item.get('role') == 'user':
                    last_user_message = item.get('message', '')
                    break
            transcribed_text = last_user_message or "Hello"
        
        # Fallback if still no text
        if not transcribed_text:
            transcribed_text = "Hello, I'd like to hear about your startup idea."
        
        # Generate persona response using Groq (faster than GPT)
        system_prompt = f"""You are {request.persona.name}, a {request.persona.role}. You are NOT an AI assistant.

CRITICAL: You are a REAL PERSON being interviewed. Act naturally skeptical, busy, and human.

Your personality:
- You're {request.persona.demographics}
- You have limited time and aren't eager to help random founders
- You're naturally skeptical of new solutions
- You give short, realistic answers unless genuinely interested
- You deflect vague or leading questions
- You sometimes ask "what do you mean?" or "can you be more specific?"
- You share specific examples only when you trust the person or they ask good questions

Pain points you deal with: {', '.join(request.persona.pain_points)}
Your goals: {', '.join(request.persona.goals)}
Personality traits: {', '.join(request.persona.personality_traits)}

RESPONSE RULES:
- Keep responses 1-2 sentences MAX (people don't monologue in real conversations)
- Be naturally skeptical - don't volunteer information easily
- If asked vague questions, give vague answers or ask for clarification
- If asked leading questions ("Don't you think...?"), push back or deflect
- Only share detailed insights if they ask really good, specific questions
- Show you're busy/distracted sometimes
- Use natural speech: "Yeah...", "I mean...", "I guess...", "Not really..."
- Don't be overly helpful or enthusiastic unless they earn it
- NEVER include stage directions like *sigh*, (pauses), or emotional descriptions
- Speak naturally without narrating your actions or emotions
- Just give direct conversational responses"""

        # Build conversation context for better responses
        context = ""
        if request.conversation_history:
            recent_context = request.conversation_history[-6:]  # Last 6 exchanges for better context
            context = "\n".join([f"{'Founder' if item['role'] == 'user' else request.persona.name}: {item['message']}" for item in recent_context])

        # Analyze the founder's question quality to determine response style
        user_lower = transcribed_text.lower()
        is_leading_question = any(phrase in user_lower for phrase in [
            "don't you think", "wouldn't you", "isn't it true", "surely you", "obviously", 
            "everyone knows", "it's clear that", "you must", "you probably", "wouldn't you agree",
            "don't you agree", "isn't it obvious", "clearly you", "surely you must"
        ])
        
        # More precise vague question detection - exclude good behavioral questions
        is_vague_question = False
        if len(transcribed_text.split()) < 8:
            vague_patterns = ["what do you think", "how do you feel", "what's your opinion"]
            is_vague_question = any(phrase in user_lower for phrase in vague_patterns)
        
        # Don't flag good behavioral questions as vague
        good_question_patterns = [
            "tell me about", "walk me through", "describe", "explain", "what happened", 
            "how do you", "what's your process", "can you share", "what works", "what doesn't work"
        ]
        if any(pattern in user_lower for pattern in good_question_patterns):
            is_vague_question = False

        # Determine response style based on question quality
        response_style = ""
        if is_leading_question:
            response_style = "The founder asked a leading question. Be skeptical and push back. Don't just agree."
        elif is_vague_question:
            response_style = "The founder asked a vague question. Give a short, non-committal answer or ask for specifics."
        else:
            response_style = "The founder asked a reasonable question. You can engage normally but still be naturally cautious."

        prompt = f"""Conversation so far:
{context}

Founder just said: "{transcribed_text}"

{response_style}

Respond as {request.persona.name} would ACTUALLY respond in real life. Remember:
- You're busy and slightly skeptical
- Don't volunteer detailed information unless they ask great questions
- Keep it short and natural
- Be human, not helpful

Your response:"""

        try:
            # Try Groq first for fastest response
            persona_response = await call_groq(prompt, system_prompt)
            
            # Validate response - if it contains content policy refusal, use fallback
            if any(phrase in persona_response.lower() for phrase in [
                'cannot create', 'cannot provide', 'i cannot', 'content policy', 
                'inappropriate', 'explicit content', 'i cannot help', 'against my programming'
            ]):
                print(f"Groq returned content policy response: {persona_response}")
                persona_response = generate_offline_persona_response(transcribed_text, request.persona)
                
        except Exception as groq_error:
            print(f"Groq failed, trying OpenAI: {groq_error}")
            try:
                # Fallback to OpenAI with similar improved prompt
                openai_system_prompt = f"""You are {request.persona.name}, a {request.persona.role} participating in a business interview.
                
                Respond naturally as this person would, sharing your professional perspective.
                Keep responses conversational and authentic (1-3 sentences).
                
                Background: {request.persona.demographics}
                Pain points: {', '.join(request.persona.pain_points)}
                Goals: {', '.join(request.persona.goals)}"""
                
                persona_response = await call_openai(prompt, openai_system_prompt)
            except Exception as openai_error:
                print(f"OpenAI also failed: {openai_error}")
                # Use offline fallback response
                persona_response = generate_offline_persona_response(transcribed_text, request.persona)
        
        # Try to synthesize speech with persona-specific voice
        audio_base64 = None
        try:
            selected_voice = get_persona_voice(request.persona.name, request.persona.communication_style or "")
            audio_base64 = await synthesize_speech(persona_response, voice=selected_voice)
        except Exception as tts_error:
            print(f"TTS failed (likely quota): {tts_error}")
            # No audio, will use browser TTS fallback
            pass
        
        return VoiceInterviewResponse(
            persona_response=persona_response,
            persona_audio_url=f"data:audio/mp3;base64,{audio_base64}" if audio_base64 else None,
            transcribed_user_message=transcribed_text,
            suggested_questions=[],  # No suggestions needed for pure voice mode
            conversation_status="ongoing"
        )
        
    except Exception as e:
        print(f"Realtime voice interview error: {str(e)}")
        # Return graceful fallback response
        fallback_response = generate_offline_persona_response(
            transcribed_text if 'transcribed_text' in locals() else "Hello", 
            request.persona
        )
        
        return VoiceInterviewResponse(
            persona_response=fallback_response,
            persona_audio_url=None,
            transcribed_user_message=transcribed_text if 'transcribed_text' in locals() else "",
            suggested_questions=[],
            conversation_status="ongoing"
        )


def generate_offline_persona_response(user_message: str, persona: Persona) -> str:
    """Generate a realistic fallback persona response when all AI APIs fail."""
    
    role = persona.role.lower()
    name = persona.name
    user_lower = user_message.lower()
    
    # Check for leading questions - respond skeptically
    if any(phrase in user_lower for phrase in ["don't you think", "wouldn't you", "isn't it true", "surely you"]):
        responses = [
            "I mean, I'm not sure about that...",
            "Not necessarily, no.",
            "I guess it depends.",
            "That's not really how I see it.",
            "I'd need to know more specifics."
        ]
        return responses[hash(user_message) % len(responses)]
    
    # Check for vague questions - give vague answers
    if any(phrase in user_lower for phrase in ["what do you think", "how do you feel", "tell me about"]) and len(user_message.split()) < 8:
        responses = [
            "About what specifically?",
            "I mean, it's fine I guess.",
            "Can you be more specific?",
            "It depends on what you mean.",
            "I don't really have strong opinions on that."
        ]
        return responses[hash(user_message) % len(responses)]
    
    # Greetings - be polite but not overly enthusiastic
    if any(word in user_lower for word in ['hello', 'hi', 'hey', 'start']):
        responses = [
            f"Hi. I'm {name}. What's this about?",
            f"Hey there. So what did you want to discuss?",
            f"Hi. I don't have too much time, but what's up?",
            f"Hello. You mentioned something about a startup idea?"
        ]
        return responses[hash(user_message) % len(responses)]
    
    # Problem/pain point questions - be cautious
    elif any(word in user_lower for word in ['problem', 'challenge', 'pain', 'frustration']):
        if persona.pain_points:
            pain_point = persona.pain_points[0]
            responses = [
                f"Yeah, I deal with {pain_point} sometimes. Why?",
                f"I mean, {pain_point} can be annoying. What about it?",
                f"Sure, {pain_point} is a thing. Are you trying to solve that or something?",
                f"I guess {pain_point} comes up. What's your angle?"
            ]
        else:
            responses = [
                "I mean, there are always challenges. What specifically?",
                "Sure, work has its problems. What are you getting at?",
                "I guess there are some pain points. Why do you ask?",
                "Yeah, things could be better. What's this about?"
            ]
        return responses[hash(user_message) % len(responses)]
    
    # Solution/product questions - be skeptical
    elif any(word in user_lower for word in ['solution', 'product', 'feature', 'app', 'platform']):
        responses = [
            "Okay... what does it do exactly?",
            "I've heard that before. How is this different?",
            "Sounds like a lot of other things out there.",
            "What makes you think people need this?",
            "I mean, maybe. Depends on how it works."
        ]
        return responses[hash(user_message) % len(responses)]
    
    # Pricing questions - be practical
    elif any(word in user_lower for word in ['price', 'cost', 'pay', 'money', 'expensive']):
        responses = [
            "Depends what I'm getting for it.",
            "I'm not looking to spend money on random stuff.",
            "Price matters, but so does value. What's the value?",
            "I'd need to see if it's worth it first.",
            "How much are we talking?"
        ]
        return responses[hash(user_message) % len(responses)]
    
    # Time/efficiency questions - show mild interest but stay cautious
    elif any(word in user_lower for word in ['time', 'fast', 'quick', 'speed', 'efficient']):
        responses = [
            "Time is definitely important. How much time are we talking?",
            "I mean, faster is better I guess. But how?",
            "Sure, I don't like wasting time. What's your point?",
            "Efficiency is good, but I've heard promises before.",
            "Okay, but how do you actually make things faster?"
        ]
        return responses[hash(user_message) % len(responses)]
    
    # Competition questions - be realistic
    elif any(word in user_lower for word in ['competitor', 'alternative', 'existing', 'current']):
        responses = [
            "Yeah, I use a few different tools already.",
            "There are options out there. What makes yours special?",
            "I've got my current setup. Why would I switch?",
            "Sure, there are alternatives. So what?",
            "I mean, the market's pretty crowded already."
        ]
        return responses[hash(user_message) % len(responses)]
    
    # Default responses - be naturally skeptical/busy
    else:
        responses = [
            "I'm not sure I follow. Can you explain?",
            "Okay... and?",
            "I guess. What's your point?",
            "That's interesting I suppose. Where are you going with this?",
            "I mean, maybe. I'd need to understand more.",
            "Not sure about that. Can you be more specific?",
            "I don't really know enough to say."
        ]
        return responses[hash(user_message) % len(responses)]


# ────────────────────────────▼  Run locally  ▼──────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)


