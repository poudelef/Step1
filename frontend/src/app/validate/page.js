'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ValidationFlow, api, APIError } from '../../lib/api';

export default function ValidatePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  // Main state
  const [validationFlow, setValidationFlow] = useState(null);
  const [currentStep, setCurrentStep] = useState('input'); // input, personas, interview, analysis, market, results
  const [idea, setIdea] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Step-specific state
  const [personas, setPersonas] = useState([]);
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [insights, setInsights] = useState(null);
  const [marketAnalysis, setMarketAnalysis] = useState(null);
  
  // Progress tracking
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const handleStartValidation = async () => {
    if (!idea.trim()) {
      setError('Please enter your startup idea');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const flow = new ValidationFlow(idea);
      const result = await flow.start();
      
      setValidationFlow(flow);
      setPersonas(result.personas);
      setProgress(result.progress);
      setCurrentStep('personas');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPersona = async (personaIndex) => {
    setLoading(true);
    setError('');

    try {
      const result = await validationFlow.startInterview(personaIndex);
      setSelectedPersona(result.persona);
      setConversation(result.conversation);
      setCurrentStep('interview');
      setCurrentMessage('');
      setSuggestedQuestions([
        "What's your biggest challenge with this problem?",
        "How do you currently solve this?",
        "What would an ideal solution look like?"
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim()) return;

    setLoading(true);
    setError('');

    try {
      const result = await validationFlow.sendMessage(selectedPersona.name, currentMessage);
      
      setConversation(result.conversation);
      setSuggestedQuestions(result.suggestedQuestions);
      setCurrentMessage('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeInterview = async () => {
    setLoading(true);
    setError('');

    try {
      const analysis = await validationFlow.analyzeInterview(selectedPersona.name);
      setInsights(analysis);
      setCurrentStep('analysis');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarketAnalysis = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await validationFlow.runMarketAnalysis();
      setMarketAnalysis(result.marketAnalysis);
      setProgress(result.progress);
      setCurrentStep('market');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewResults = () => {
    const allInsights = validationFlow.getAllInsights();
    setCurrentStep('results');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 dark:from-blue-500 dark:to-cyan-400 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg animate-pulse">
            <span className="text-white font-bold text-2xl">V</span>
          </div>
          <p className="text-gray-600 dark:text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Navigation */}
      <nav className="bg-white/80 dark:bg-slate-950/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <motion.div 
              className="flex items-center space-x-3"
              whileHover={{ scale: 1.05 }}
            >
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 dark:from-blue-500 dark:to-cyan-400 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">V</span>
              </div>
              <span className="text-gray-900 dark:text-white font-bold text-2xl tracking-tight">ValidateAI</span>
            </motion.div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-cyan-400 px-4 py-2 rounded-lg font-medium transition-colors duration-300"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Progress Bar */}
      {progress > 0 && (
        <div className="bg-white/80 dark:bg-slate-950/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-slate-700/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Validation Progress</span>
              <span className="text-sm font-medium text-gray-700 dark:text-slate-300">{Math.round(progress * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-purple-500 to-pink-500 dark:from-blue-500 dark:to-cyan-400 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <AnimatePresence mode="wait">
          {/* Step 1: Idea Input */}
          {currentStep === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center max-w-2xl mx-auto"
            >
              <h1 className="text-5xl font-black text-gray-900 dark:text-white mb-8 tracking-tight">
                Validate Your
                <span className="bg-gradient-to-r from-purple-600 to-pink-500 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent"> Startup Idea</span>
              </h1>
              
              <p className="text-xl text-gray-600 dark:text-slate-300 mb-12">
                Enter your startup idea and let our AI agents help you validate it in minutes
              </p>

              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/80 dark:border-slate-600/50 rounded-2xl p-8 shadow-lg">
                <textarea
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder="Describe your startup idea... (e.g., 'A CRM tool specifically designed for freelancers to manage client relationships')"
                  className="w-full h-32 px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-cyan-400 transition-all duration-300 resize-none"
                />
                
                {error && (
                  <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}

                <motion.button
                  onClick={handleStartValidation}
                  disabled={loading}
                  className="mt-6 w-full bg-gradient-to-r from-purple-600 to-pink-500 dark:from-blue-600 dark:to-cyan-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                >
                  {loading ? '🤖 Generating Personas...' : '🚀 Start Validation'}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Persona Selection */}
          {currentStep === 'personas' && (
            <motion.div
              key="personas"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="text-center mb-12">
                <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-4">
                  Choose Your
                  <span className="bg-gradient-to-r from-purple-600 to-pink-500 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent"> Customer Persona</span>
                </h2>
                <p className="text-xl text-gray-600 dark:text-slate-300">
                  Our AI generated these personas for your idea: "{idea}"
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {personas.map((persona, index) => (
                  <motion.div
                    key={index}
                    className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/80 dark:border-slate-600/50 rounded-2xl p-6 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300"
                    whileHover={{ y: -5, scale: 1.02 }}
                    onClick={() => handleSelectPersona(index)}
                  >
                    <div className="text-center mb-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 dark:from-blue-500 dark:to-cyan-400 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-white font-bold text-xl">
                          {persona.name.charAt(0)}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {persona.name}
                      </h3>
                      <p className="text-gray-600 dark:text-slate-300 font-medium">
                        {persona.role}
                      </p>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="font-semibold text-gray-700 dark:text-slate-300">Demographics:</span>
                        <p className="text-gray-600 dark:text-slate-400">{persona.demographics}</p>
                      </div>
                      
                      <div>
                        <span className="font-semibold text-gray-700 dark:text-slate-300">Pain Points:</span>
                        <ul className="text-gray-600 dark:text-slate-400 list-disc list-inside">
                          {persona.pain_points.slice(0, 2).map((pain, i) => (
                            <li key={i}>{pain}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <motion.button
                      className="w-full mt-4 bg-gradient-to-r from-purple-600 to-pink-500 dark:from-blue-600 dark:to-cyan-500 text-white px-4 py-2 rounded-lg font-semibold"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Interview {persona.name}
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 3: Interview */}
          {currentStep === 'interview' && selectedPersona && (
            <motion.div
              key="interview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Persona Info */}
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/80 dark:border-slate-600/50 rounded-2xl p-6 shadow-lg">
                  <div className="text-center mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 dark:from-blue-500 dark:to-cyan-400 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-white font-bold text-xl">
                        {selectedPersona.name.charAt(0)}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {selectedPersona.name}
                    </h3>
                    <p className="text-gray-600 dark:text-slate-300">
                      {selectedPersona.role}
                    </p>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="font-semibold text-gray-700 dark:text-slate-300">Style:</span>
                      <p className="text-gray-600 dark:text-slate-400">{selectedPersona.communication_style}</p>
                    </div>
                    
                    <div>
                      <span className="font-semibold text-gray-700 dark:text-slate-300">Goals:</span>
                      <ul className="text-gray-600 dark:text-slate-400 list-disc list-inside">
                        {selectedPersona.goals.map((goal, i) => (
                          <li key={i}>{goal}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Chat Interface */}
                <div className="lg:col-span-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/80 dark:border-slate-600/50 rounded-2xl p-6 shadow-lg">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Interview with {selectedPersona.name}
                    </h3>
                    <button
                      onClick={handleAnalyzeInterview}
                      disabled={conversation.length === 0}
                      className="bg-gradient-to-r from-green-500 to-teal-500 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Analyze Interview
                    </button>
                  </div>

                  {/* Conversation */}
                  <div className="h-64 overflow-y-auto bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4 mb-4 space-y-3">
                    {conversation.length === 0 ? (
                      <p className="text-gray-500 dark:text-slate-400 text-center">
                        Start the conversation by asking a question...
                      </p>
                    ) : (
                      conversation.map((message, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg ${
                            message.startsWith('Founder:')
                              ? 'bg-purple-100 dark:bg-purple-900/30 ml-8'
                              : 'bg-blue-100 dark:bg-blue-900/30 mr-8'
                          }`}
                        >
                          <p className="text-gray-800 dark:text-slate-200">{message}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Message Input */}
                  <div className="flex space-x-3">
                    <input
                      type="text"
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Ask a question..."
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-cyan-400"
                    />
                    <motion.button
                      onClick={handleSendMessage}
                      disabled={loading || !currentMessage.trim()}
                      className="bg-gradient-to-r from-purple-600 to-pink-500 dark:from-blue-600 dark:to-cyan-500 text-white px-6 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Send
                    </motion.button>
                  </div>

                  {/* Suggested Questions */}
                  {suggestedQuestions.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                        Suggested questions:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {suggestedQuestions.map((question, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentMessage(question)}
                            className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 px-3 py-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                          >
                            {question}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 4: Analysis Results */}
          {currentStep === 'analysis' && insights && (
            <motion.div
              key="analysis"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="text-center mb-12">
                <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-4">
                  Interview
                  <span className="bg-gradient-to-r from-purple-600 to-pink-500 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent"> Analysis</span>
                </h2>
                <p className="text-xl text-gray-600 dark:text-slate-300">
                  AI-powered insights from your conversation with {selectedPersona.name}
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Key Insights */}
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/80 dark:border-slate-600/50 rounded-2xl p-6 shadow-lg">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    🎯 Key Insights
                  </h3>
                  <ul className="space-y-3">
                    {insights.key_insights.map((insight, index) => (
                      <li key={index} className="flex items-start space-x-3">
                        <span className="text-green-500 mt-1">✓</span>
                        <span className="text-gray-700 dark:text-slate-300">{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Question Biases */}
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/80 dark:border-slate-600/50 rounded-2xl p-6 shadow-lg">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    ⚠️ Question Coaching
                  </h3>
                  {insights.question_biases.length === 0 ? (
                    <p className="text-green-600 dark:text-green-400">
                      Great job! No biased questions detected.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {insights.question_biases.map((bias, index) => (
                        <div key={index} className="border-l-4 border-orange-400 pl-4">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {bias.bias_type}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">
                            "{bias.question}"
                          </p>
                          <p className="text-sm text-gray-700 dark:text-slate-300">
                            <span className="font-medium">Better:</span> "{bias.better_question}"
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center">
                <motion.button
                  onClick={handleMarketAnalysis}
                  className="bg-gradient-to-r from-purple-600 to-pink-500 dark:from-blue-600 dark:to-cyan-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  🔍 Run Market Analysis
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 5: Market Analysis */}
          {currentStep === 'market' && marketAnalysis && (
            <motion.div
              key="market"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="text-center mb-12">
                <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-4">
                  Market
                  <span className="bg-gradient-to-r from-purple-600 to-pink-500 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent"> Analysis</span>
                </h2>
                <p className="text-xl text-gray-600 dark:text-slate-300">
                  Competitive landscape and market insights for your idea
                </p>
              </div>

              <div className="space-y-8">
                {/* Competitor Heatmap */}
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/80 dark:border-slate-600/50 rounded-2xl p-6 shadow-lg">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                    🏆 Competitor Heatmap
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {marketAnalysis.competitor_heatmap.map((competitor, index) => (
                      <div key={index} className="bg-gray-50 dark:bg-slate-900/50 rounded-xl p-4">
                        <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                          {competitor.competitor}
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-green-600 dark:text-green-400">Strength:</span>
                            <p className="text-gray-700 dark:text-slate-300">{competitor.strength}</p>
                          </div>
                          <div>
                            <span className="text-red-600 dark:text-red-400">Weakness:</span>
                            <p className="text-gray-700 dark:text-slate-300">{competitor.weakness}</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600 dark:text-slate-400">Differentiation:</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-16 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                                  style={{ width: `${competitor.differentiation_score * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-600 dark:text-slate-400">
                                {Math.round(competitor.differentiation_score * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trends and Value Props */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/80 dark:border-slate-600/50 rounded-2xl p-6 shadow-lg">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      📈 Market Trends
                    </h3>
                    <ul className="space-y-3">
                      {marketAnalysis.trends.map((trend, index) => (
                        <li key={index} className="flex items-start space-x-3">
                          <span className="text-blue-500 mt-1">📊</span>
                          <span className="text-gray-700 dark:text-slate-300">{trend}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/80 dark:border-slate-600/50 rounded-2xl p-6 shadow-lg">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      💎 Value Propositions
                    </h3>
                    <ul className="space-y-3">
                      {marketAnalysis.value_propositions.map((prop, index) => (
                        <li key={index} className="flex items-start space-x-3">
                          <span className="text-purple-500 mt-1">💡</span>
                          <span className="text-gray-700 dark:text-slate-300">{prop}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="text-center mt-8">
                <motion.button
                  onClick={handleViewResults}
                  className="bg-gradient-to-r from-green-600 to-teal-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  🎉 View Complete Results
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Display */}
        {error && (
          <motion.div
            className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-xl shadow-lg"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
          >
            {error}
          </motion.div>
        )}
      </div>
    </div>
  );
} 