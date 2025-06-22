/**
 * API service for connecting to StepOne FastAPI backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class APIError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        errorData.detail || `HTTP ${response.status}`,
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(`Network error: ${error.message}`, 0, {});
  }
}

// ════════════════════════════════════════════════════════════════════════════
// API Functions
// ════════════════════════════════════════════════════════════════════════════

export const api = {
  // Health check
  async healthCheck() {
    return apiRequest('/health');
  },

  // Orchestrator - Main coordination endpoint
  async orchestrator(idea, step, data = {}) {
    return apiRequest('/orchestrator', {
      method: 'POST',
      body: { idea, step, data },
    });
  },

  // PersonaAI - Generate customer personas
  async generatePersonas(idea, targetSegment = '') {
    return apiRequest('/personas', {
      method: 'POST',
      body: { idea, target_segment: targetSegment },
    });
  },

  // InterviewAI - Text interviews are disabled (Voice-Only Mode)
  // Use conductVoiceInterview instead

  // VoiceInterviewAI - Conduct voice interviews (Voice-Only Mode)
  async conductVoiceInterview(idea, persona, conversationHistory = [], userMessage, voiceMode = true, voiceId = "shimmer") {
    return apiRequest('/voice-interview-realtime', {
      method: 'POST',
      body: {
        persona,
        audio_file: userMessage, // userMessage should be base64 audio for voice-only
        conversation_history: conversationHistory
      },
    });
  },

  // CoachAI - Analyze conversation for insights and bias
  async analyzeConversation(idea, conversation) {
    return apiRequest('/coach-ai', {
      method: 'POST',
      body: { idea, conversation },
    });
  },

  // MarketAI - Market research and competitor analysis
  async analyzeMarket(idea) {
    return apiRequest('/market-ai', {
      method: 'POST',
      body: { idea },
    });
  },

  // Setup WebSocket connection for voice streaming
  setupVoiceStream(callId, onAudio, onTranscript) {
    const ws = new WebSocket(`${API_BASE_URL.replace('http', 'ws')}/voice-stream`);
    
    ws.onopen = () => {
      ws.send(JSON.stringify({ call_id: callId }));
    };
    
    ws.onmessage = (event) => {
      if (event.data instanceof Blob) {
        onAudio(event.data);
      } else {
        const data = JSON.parse(event.data);
        if (data.type === 'transcript') {
          onTranscript(data.text);
        }
      }
    };
    
    return ws;
  },
};

// ════════════════════════════════════════════════════════════════════════════
// Validation Flow Helper
// ════════════════════════════════════════════════════════════════════════════

export class ValidationFlow {
  constructor(idea) {
    this.idea = idea;
    this.currentStep = 'start';
    this.progress = 0;
    this.data = {
      personas: [],
      interviews: {},
      marketAnalysis: null,
    };
  }

  async start() {
    try {
      // Step 1: Generate personas
      this.currentStep = 'personas';
      const personaResponse = await api.generatePersonas(this.idea);
      this.data.personas = personaResponse.personas;
      this.progress = 0.25;

      return {
        step: 'personas',
        personas: this.data.personas,
        progress: this.progress,
      };
    } catch (error) {
      throw new APIError(`Failed to start validation: ${error.message}`);
    }
  }

  async startInterview(personaIndex) {
    if (!this.data.personas[personaIndex]) {
      throw new Error('Invalid persona index');
    }

    const persona = this.data.personas[personaIndex];
    this.currentStep = 'interview';
    
    // Initialize interview data for this persona
    if (!this.data.interviews[persona.name]) {
      this.data.interviews[persona.name] = {
        persona,
        conversation: [],
        insights: [],
      };
    }

    return {
      step: 'interview',
      persona,
      conversation: this.data.interviews[persona.name].conversation,
    };
  }

  async sendMessage(personaName, audioBase64) {
    const interview = this.data.interviews[personaName];
    if (!interview) {
      throw new Error('Interview not started for this persona');
    }

    try {
      const response = await api.conductVoiceInterview(
        this.idea,
        interview.persona,
        interview.conversation,
        audioBase64
      );

      // Update conversation history with voice conversation format
      interview.conversation.push({
        role: 'user',
        message: response.transcribed_user_message || 'Audio message'
      });
      interview.conversation.push({
        role: 'persona',
        message: response.persona_response
      });

      return {
        personaResponse: response.persona_response,
        audioUrl: response.persona_audio_url,
        transcribedMessage: response.transcribed_user_message,
        conversationStatus: response.conversation_status,
        conversation: interview.conversation,
      };
    } catch (error) {
      throw new APIError(`Failed to send voice message: ${error.message}`);
    }
  }

  async analyzeInterview(personaName) {
    const interview = this.data.interviews[personaName];
    if (!interview || interview.conversation.length === 0) {
      throw new Error('No conversation to analyze');
    }

    try {
      const analysis = await api.analyzeConversation(this.idea, interview.conversation);
      interview.insights = analysis;
      
      return analysis;
    } catch (error) {
      throw new APIError(`Failed to analyze interview: ${error.message}`);
    }
  }

  async runMarketAnalysis() {
    try {
      this.currentStep = 'market';
      const marketData = await api.analyzeMarket(this.idea);
      this.data.marketAnalysis = marketData;
      this.progress = 1.0;

      return {
        step: 'market',
        marketAnalysis: marketData,
        progress: this.progress,
      };
    } catch (error) {
      throw new APIError(`Failed to run market analysis: ${error.message}`);
    }
  }

  getAllInsights() {
    const allInsights = [];
    
    // Collect insights from all interviews
    Object.values(this.data.interviews).forEach(interview => {
      if (interview.insights && interview.insights.key_insights) {
        allInsights.push({
          persona: interview.persona.name,
          insights: interview.insights.key_insights,
          biases: interview.insights.question_biases,
        });
      }
    });

    return {
      interviewInsights: allInsights,
      marketAnalysis: this.data.marketAnalysis,
      personas: this.data.personas,
    };
  }

  getProgress() {
    return {
      step: this.currentStep,
      progress: this.progress,
      completedPersonas: Object.keys(this.data.interviews).length,
      totalPersonas: this.data.personas.length,
    };
  }
}

export { APIError }; 