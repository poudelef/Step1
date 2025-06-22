'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import VoiceOnlyInterview from '../../components/VoiceOnlyInterview';
import { ValidationDatabase } from '../../lib/database';

export default function ValidatePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  // Main state
  const [currentStep, setCurrentStep] = useState('input'); // input, personas, interview, analysis, market, results
  const [idea, setIdea] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Step-specific state
  const [personas, setPersonas] = useState([]);
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [voiceConversationHistory, setVoiceConversationHistory] = useState([]);
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
      // Call personas endpoint directly
      const response = await fetch('http://localhost:8000/personas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idea: idea,
          target_segment: ''
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setPersonas(data.personas);
      setProgress(0.25);
      setCurrentStep('personas');
    } catch (err) {
      setError('Failed to generate personas: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPersona = async (personaIndex) => {
    setSelectedPersona(personas[personaIndex]);
    setVoiceConversationHistory([]);
    setCurrentStep('interview');
  };

  const handleVoiceInterviewComplete = async (conversationHistory) => {
    setLoading(true);
    setError('');

    try {
      // Analyze the voice conversation
      await handleAnalyzeVoiceInterview(conversationHistory);
      
    } catch (err) {
      setError('Failed to complete validation: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeVoiceInterview = async (conversationHistory) => {
    setLoading(true);
    setError('');

    try {
      // Convert voice conversation history to the format expected by coach-ai
      const formattedConversation = conversationHistory.map(item => 
        `${item.role === 'user' ? 'Founder' : selectedPersona.name}: ${item.message}`
      );

      // Call coach-ai endpoint
      const response = await fetch('http://localhost:8000/coach-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idea: idea,
          conversation: formattedConversation
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setInsights(data);
      setProgress(0.75);
      setCurrentStep('analysis');
      
      // Save validation after analysis (in case user doesn't run market analysis)
      await saveValidationToDatabase(conversationHistory, data, null);
      
    } catch (err) {
      setError('Failed to analyze interview: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarketAnalysis = async () => {
    setLoading(true);
    setError('');

    try {
      // Call market-ai endpoint
      const response = await fetch('http://localhost:8000/market-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idea: idea
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setMarketAnalysis(data);
      setProgress(1.0);
      setCurrentStep('market');
      
      // Save complete validation with market analysis
      await saveValidationToDatabase(voiceConversationHistory, insights, data);
      
    } catch (err) {
      setError('Failed to run market analysis: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to save validation data
  const saveValidationToDatabase = async (conversationHistory, insightsData, marketData) => {
    if (!user) {
      console.error('No user found - cannot save validation');
      return;
    }

    try {
      console.log('🔄 Attempting to save validation to database...');
      console.log('User ID:', user.id);
      console.log('Validation data:', {
        idea: idea,
        personas: personas?.length || 0,
        selectedPersona: selectedPersona?.name || 'None',
        conversationHistory: conversationHistory?.length || 0,
        insights: insightsData ? 'Present' : 'Missing',
        marketAnalysis: marketData ? 'Present' : 'Missing'
      });

      const validationData = {
        idea: idea,
        personas: personas,
        selectedPersona: selectedPersona,
        conversationHistory: conversationHistory,
        insights: insightsData,
        marketAnalysis: marketData,
        status: 'completed'
      };

      const saveResult = await ValidationDatabase.saveValidation(user.id, validationData);
      
      if (!saveResult.success) {
        console.error('❌ Failed to save validation:', saveResult.error);
        setError(`Failed to save validation: ${saveResult.error}`);
      } else {
        console.log('✅ Validation saved successfully!', saveResult.validation);
        // Show success message to user
        setError(''); // Clear any previous errors
      }
    } catch (error) {
      console.error('💥 Exception while saving validation:', error);
      setError(`Error saving validation: ${error.message}`);
    }
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
              <span className="text-gray-900 dark:text-white font-bold text-2xl tracking-tight">StepOne</span>
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

          {/* Step 3: Voice-Only Interview */}
          {currentStep === 'interview' && selectedPersona && (
            <VoiceOnlyInterview
              persona={selectedPersona}
              idea={idea}
              onComplete={handleVoiceInterviewComplete}
            />
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
                  className="bg-gradient-to-r from-purple-600 to-pink-500 dark:from-blue-600 dark:to-cyan-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg mr-4"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  🔍 Run Market Analysis
                </motion.button>
                
                <motion.button
                  onClick={() => router.push('/dashboard')}
                  className="bg-gray-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  ← Back to Dashboard
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
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-8">
                  <h3 className="text-2xl font-bold text-green-800 dark:text-green-300 mb-4">
                    🎉 Validation Complete!
                  </h3>
                  <p className="text-green-700 dark:text-green-400 mb-6">
                    You've successfully validated your startup idea with AI-powered customer interviews and market analysis.
                  </p>
                  
                  <motion.button
                    onClick={() => router.push('/dashboard')}
                    className="bg-gradient-to-r from-purple-600 to-pink-500 dark:from-blue-600 dark:to-cyan-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    ← Back to Dashboard
                  </motion.button>
                </div>
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