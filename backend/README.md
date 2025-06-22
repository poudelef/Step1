# StepOne Backend

AI Customer Discovery Copilot backend built with FastAPI. This service coordinates multiple AI agents to help founders validate startup ideas through simulated customer interviews.

## Architecture

The backend implements a multi-agent AI system with these components:

- **Orchestrator**: Coordinates workflow between different AI agents
- **PersonaAI**: Generates realistic customer personas using Claude
- **InterviewAI**: Simulates customer interviews using Groq
- **CoachAI**: Analyzes conversation quality using GPT-4o
- **MarketAI**: Conducts market research using Perplexity + GPT-4o
- **VoiceAI**: Handles speech-to-text and text-to-speech using OpenAI Whisper/TTS

## Features

### Core Functionality
- ✅ **Persona Generation**: Create 3-5 realistic customer personas
- ✅ **Mock Interviews**: AI-powered customer interview simulation
- ✅ **Question Coaching**: Real-time feedback on interview questions
- ✅ **Market Research**: Competitor analysis and trend identification
- ✅ **Insight Extraction**: Summarize pain points, objections, and quotes
- ✅ **Export Tools**: Generate slide decks and email templates

### Voice Features
- ✅ **Voice Interviews**: Conduct interviews via speech
- ✅ **Speech-to-Text**: Transcribe user audio using Whisper
- ✅ **Text-to-Speech**: Synthesize persona responses

## API Endpoints

### Core Endpoints
- `POST /personas` - Generate customer personas
- `POST /interview` - Conduct text-based interview
- `POST /voice-interview` - Conduct voice-based interview
- `POST /coach-ai` - Analyze conversation quality
- `POST /market-ai` - Conduct market research
- `POST /insights` - Extract key insights
- `POST /export` - Generate exports

### Orchestration
- `POST /orchestrator` - Main workflow coordinator

### Debug
- `GET /debug/env` - Check API key configuration
- `GET /debug/claude` - Test Claude API
- `GET /debug/groq` - Test Groq API
- `GET /debug/openai` - Test OpenAI API

## Setup

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Environment Configuration
Create a `.env` file with your API keys:

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
PERPLEXITY_API_KEY=pplx-...
GROQ_API_KEY=gsk_...
```

### 3. Run the Server
```bash
python main.py
```

The server will start on `http://localhost:8000`

## API Usage Examples

### Generate Personas
```bash
curl -X POST http://localhost:8000/personas \
  -H "Content-Type: application/json" \
  -d '{"idea": "CRM for freelancers", "target_segment": "creative freelancers"}'
```

### Conduct Interview
```bash
curl -X POST http://localhost:8000/interview \
  -H "Content-Type: application/json" \
  -d '{
    "idea": "CRM for freelancers",
    "persona": {...},
    "user_message": "What is your biggest challenge with client management?",
    "conversation_history": []
  }'
```

### Get Market Research
```bash
curl -X POST http://localhost:8000/market-ai \
  -H "Content-Type: application/json" \
  -d '{"idea": "CRM for freelancers"}'
```

## AI Provider Configuration

### OpenAI (GPT-4o + Whisper + TTS)
- Used for: Question coaching, market research structuring, voice features
- Models: `gpt-4o-mini`, `whisper-1`, `tts-1`
- Fallback: Groq for basic completions

### Anthropic Claude
- Used for: Persona generation, orchestration
- Model: `claude-3-5-sonnet-20241022`
- Fallback: OpenAI GPT-4o

### Groq
- Used for: Fast interview responses
- Model: `mixtral-8x7b-32768`
- Fallback: Contextual responses

### Perplexity
- Used for: Real-time market research
- Model: `llama-3.1-sonar-small-128k-online`
- Fallback: Static competitor data

## Error Handling

The backend implements comprehensive error handling:
- API timeouts with graceful fallbacks
- JSON parsing error recovery
- Contextual fallback responses for interviews
- Demo data fallbacks for market research

## Performance Notes

- Groq provides fastest interview responses (~2-3s)
- Claude gives highest quality personas
- Perplexity provides most current market data
- OpenAI offers best voice quality

## Development

### Adding New Endpoints
1. Define Pydantic models in the schemas section
2. Implement the endpoint handler
3. Add proper error handling and fallbacks
4. Update this README

### Testing APIs
Use the debug endpoints to verify your API keys are working:
- `/debug/env` - Check key configuration
- `/debug/openai` - Test OpenAI
- `/debug/claude` - Test Claude
- `/debug/groq` - Test Groq

## Deployment

For production deployment:
1. Set up environment variables securely
2. Use a production WSGI server like Gunicorn
3. Configure proper CORS origins
4. Set up logging and monitoring
5. Consider rate limiting for API calls

## License

MIT License - see LICENSE file for details. 