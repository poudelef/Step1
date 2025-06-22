/**
 * API service for connecting to ValidateAI FastAPI backend
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

  // InterviewAI - Conduct mock interviews
  async conductInterview(idea, persona, conversationHistory = [], userMessage) {
    return apiRequest('/interview', {
      method: 'POST',
      body: {
        idea,
        persona,
        conversation_history: conversationHistory,
        user_message: userMessage,
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
};

// ════════════════════════════════════════════════════════════════════════════
// Validation Flow Helper
// ════════════════════════════════════════════════════════════════════════════

export class ValidationFlow {
  constructor(idea) {
    this.idea = idea;
    this.currentStep = 'start';
    this.data = {
      personas: [],
      interviews: {},
      insights: [],
      marketAnalysis: null,
    };
    this.progress = 0;
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

  async sendMessage(personaName, message) {
    const interview = this.data.interviews[personaName];
    if (!interview) {
      throw new Error('Interview not started for this persona');
    }

    try {
      const response = await api.conductInterview(
        this.idea,
        interview.persona,
        interview.conversation,
        message
      );

      // Update conversation history
      interview.conversation.push(`Founder: ${message}`);
      interview.conversation.push(`${personaName}: ${response.persona_response}`);

      return {
        personaResponse: response.persona_response,
        suggestedQuestions: response.suggested_questions,
        conversationStatus: response.conversation_status,
        conversation: interview.conversation,
      };
    } catch (error) {
      throw new APIError(`Failed to send message: ${error.message}`);
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