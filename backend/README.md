# ValidateAI Backend

FastAPI backend with AI agent orchestration for startup idea validation.

## Architecture

The backend implements a 5-agent AI system:

1. **Orchestrator** (Claude) - Coordinates all agents and manages flow
2. **PersonaAI** (Claude) - Generates customer personas
3. **InterviewAI** (GPT-4o) - Conducts mock interviews with personas
4. **CoachAI** (GPT-4o) - Analyzes conversations for bias and insights
5. **MarketAI** (Perplexity + GPT-4o) - Market research and competitor analysis

## Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

Or use the setup script:
```bash
python setup.py
```

### 2. Environment Variables

Create a `.env` file in the backend directory:

```env
# API Keys for AI Services
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
PERPLEXITY_API_KEY=your_perplexity_api_key_here

# FastAPI Settings
ENVIRONMENT=development
DEBUG=True
```

### 3. Run the Server

```bash
python main.py
```

The API will be available at `http://localhost:8000`

## API Endpoints

### Health Check
- `GET /health` - Health check endpoint

### Main Orchestrator
- `POST /orchestrator` - Main coordination endpoint for AI agents

### Individual Agents
- `POST /personas` - Generate customer personas
- `POST /interview` - Conduct mock interviews
- `POST /coach-ai` - Analyze conversations for insights
- `POST /market-ai` - Market research and analysis

## API Documentation

Once running, visit:
- Interactive docs: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Usage Example

```python
import httpx

# Generate personas
response = httpx.post("http://localhost:8000/personas", json={
    "idea": "A CRM tool for freelancers",
    "target_segment": "Creative freelancers"
})

personas = response.json()["personas"]

# Conduct interview
response = httpx.post("http://localhost:8000/interview", json={
    "idea": "A CRM tool for freelancers",
    "persona": personas[0],
    "conversation_history": [],
    "user_message": "What's your biggest challenge with client management?"
})

interview_result = response.json()
```

## Frontend Integration

The frontend connects via the API service at `frontend/src/lib/api.js` which provides:

- `api.generatePersonas(idea)` - Generate personas
- `api.conductInterview(idea, persona, history, message)` - Interview simulation
- `api.analyzeConversation(idea, conversation)` - Get insights
- `api.analyzeMarket(idea)` - Market analysis
- `ValidationFlow` class - Complete validation workflow

## Error Handling

All endpoints return structured error responses:

```json
{
  "detail": "Error description",
  "status_code": 400
}
```

## CORS

CORS is configured to allow requests from `http://localhost:3000` (Next.js frontend).

## Development

The server runs with auto-reload enabled. Changes to the code will automatically restart the server. 