'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ValidationDatabase } from '../../lib/database';
import { AICoachingService } from '../../lib/coaching';

export default function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [greeting, setGreeting] = useState('');
  const [dashboardData, setDashboardData] = useState({
    stats: null,
    validations: [],
    coachingDashboard: null,
    loading: true
  });
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }

    // Set greeting based on time
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    // Load dashboard data
    if (user) {
      loadDashboardData();
    }
  }, [user, loading, router]);

  const loadDashboardData = async () => {
    try {
      const [statsResult, validationsResult, coachingResult] = await Promise.all([
        ValidationDatabase.getUserStats(user.id),
        ValidationDatabase.getUserValidations(user.id, 10),
        AICoachingService.getCoachingDashboard(user.id)
      ]);

      setDashboardData({
        stats: statsResult.success ? statsResult.stats : null,
        validations: validationsResult.success ? validationsResult.validations : [],
        coachingDashboard: coachingResult.success ? coachingResult.dashboard : null,
        loading: false
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setDashboardData(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const startCoachingSession = async (sessionType) => {
    try {
      const result = await AICoachingService.createCoachingSession(user.id, sessionType);
      if (result.success) {
        router.push(`/coaching/${result.session.id}`);
      }
    } catch (error) {
      console.error('Error starting coaching session:', error);
    }
  };

  if (loading || dashboardData.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 dark:from-blue-500 dark:to-cyan-400 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg animate-pulse">
            <span className="text-white font-bold text-2xl">V</span>
          </div>
          <p className="text-gray-600 dark:text-slate-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const { stats, validations, coachingDashboard } = dashboardData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors duration-500">
      {/* Navigation */}
      <motion.nav 
        className="bg-white/80 dark:bg-slate-950/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-slate-700/50"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8 }}
      >
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
              <span className="text-gray-700 dark:text-slate-300 font-medium">
                {user.email}
              </span>
              <motion.button
                onClick={handleSignOut}
                className="text-gray-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-cyan-400 px-4 py-2 rounded-lg font-medium transition-colors duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Sign Out
              </motion.button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.h1 
            className="text-5xl md:text-6xl font-black text-gray-900 dark:text-white mb-4 tracking-tight"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            {greeting}! 👋
          </motion.h1>
          <motion.p 
            className="text-xl text-gray-600 dark:text-slate-300 mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            {stats?.totalValidations > 0 
              ? `You've completed ${stats.totalValidations} validation${stats.totalValidations > 1 ? 's' : ''}!`
              : 'Ready to validate your next big idea?'
            }
          </motion.p>
        </motion.div>

        {/* Stats Overview */}
        {stats && (
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            {[
              { 
                label: 'Total Validations', 
                value: stats.totalValidations, 
                icon: '🚀', 
                color: 'from-purple-500 to-pink-500' 
              },
              { 
                label: 'Conversations', 
                value: stats.totalConversations, 
                icon: '💬', 
                color: 'from-blue-500 to-cyan-500' 
              },
              { 
                label: 'Biases Detected', 
                value: stats.totalBiasesDetected, 
                icon: '⚠️', 
                color: 'from-orange-500 to-red-500' 
              },
              { 
                label: 'Monthly Average', 
                value: stats.averageValidationsPerMonth.toFixed(1), 
                icon: '📈', 
                color: 'from-green-500 to-teal-500' 
              }
            ].map((stat, index) => (
              <motion.div
                key={index}
                className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/80 dark:border-slate-600/50 rounded-2xl p-6 text-center shadow-lg"
                whileHover={{ y: -5, scale: 1.02 }}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + index * 0.1, duration: 0.6 }}
              >
                <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center mx-auto mb-4 text-2xl`}>
                  {stat.icon}
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600 dark:text-slate-300">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Skill Level & Coaching */}
        {coachingDashboard && (
          <motion.div 
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.8 }}
          >
            {/* Skill Level */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/80 dark:border-slate-600/50 rounded-2xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                🎯 Your Skill Level
              </h3>
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-purple-600 dark:text-cyan-400 mb-2">
                  {coachingDashboard.skillLevel.level}
                </div>
                <div className="text-gray-600 dark:text-slate-300 mb-4">
                  {coachingDashboard.skillLevel.description}
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3 mb-4">
                  <motion.div
                    className="bg-gradient-to-r from-purple-500 to-pink-500 dark:from-blue-500 dark:to-cyan-500 h-3 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${coachingDashboard.skillLevel.progress}%` }}
                    transition={{ delay: 1.5, duration: 1 }}
                  />
                </div>
                <div className="text-sm text-gray-500 dark:text-slate-400">
                  {coachingDashboard.skillLevel.progress}% Complete
                </div>
              </div>
              
              {/* Next Milestone */}
              <div className="bg-purple-50 dark:bg-slate-700/50 rounded-xl p-4">
                <div className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-2">
                  Next Milestone
                </div>
                <div className="text-gray-700 dark:text-slate-300">
                  {coachingDashboard.nextMilestone.description}
                </div>
                <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  {stats?.totalValidations || 0} / {coachingDashboard.nextMilestone.target} validations
                </div>
              </div>
            </div>

            {/* AI Coaching Recommendations */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/80 dark:border-slate-600/50 rounded-2xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                🤖 AI Coaching
              </h3>
              {coachingDashboard.recommendations.length > 0 ? (
                <div className="space-y-4">
                  {coachingDashboard.recommendations.slice(0, 2).map((rec, index) => (
                    <motion.div
                      key={index}
                      className={`border-l-4 pl-4 ${
                        rec.priority === 'high' ? 'border-red-400' :
                        rec.priority === 'medium' ? 'border-yellow-400' : 'border-green-400'
                      }`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.2 + index * 0.1 }}
                    >
                      <div className="font-semibold text-gray-900 dark:text-white text-sm">
                        {rec.title}
                      </div>
                      <div className="text-gray-600 dark:text-slate-300 text-sm mb-2">
                        {rec.description}
                      </div>
                      <motion.button
                        onClick={() => startCoachingSession(rec.type)}
                        className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 dark:from-blue-500 dark:to-cyan-500 text-white px-3 py-1 rounded-lg font-medium"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {rec.action}
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🎉</div>
                  <div className="text-gray-600 dark:text-slate-300">
                    You're doing great! No immediate recommendations.
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Tabs Navigation */}
        <motion.div 
          className="flex space-x-1 mb-8 bg-gray-100 dark:bg-slate-800 rounded-xl p-1"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
        >
          {[
            { id: 'overview', label: 'Quick Actions', icon: '🚀' },
            { id: 'history', label: 'Validation History', icon: '📊' },
            { id: 'coaching', label: 'AI Coaching', icon: '🎯' }
          ].map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-cyan-400 shadow-lg'
                  : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </motion.button>
          ))}
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              {[
                {
                  icon: '🚀',
                  title: 'Start New Validation',
                  description: 'Enter your startup idea and begin the validation process',
                  action: 'Get Started',
                  gradient: 'from-purple-500 to-pink-500 dark:from-blue-500 dark:to-cyan-500',
                  onClick: () => router.push('/validate')
                },
                {
                  icon: '📊',
                  title: 'View Past Validations',
                  description: 'Access your previous validation reports and insights',
                  action: 'View History',
                  gradient: 'from-pink-500 to-orange-500 dark:from-cyan-500 dark:to-teal-500',
                  onClick: () => setActiveTab('history')
                },
                {
                  icon: '🎯',
                  title: 'AI Coaching',
                  description: 'Get personalized tips to improve your validation skills',
                  action: 'Start Session',
                  gradient: 'from-orange-500 to-red-500 dark:from-teal-500 dark:to-green-500',
                  onClick: () => setActiveTab('coaching')
                }
              ].map((card, index) => (
                <motion.div
                  key={index}
                  className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/80 dark:border-slate-600/50 rounded-2xl p-8 text-center group hover:bg-white/95 dark:hover:bg-slate-800/95 transition-all duration-300 shadow-lg cursor-pointer"
                  whileHover={{ y: -10, scale: 1.02 }}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.6, type: "spring", stiffness: 300 }}
                  onClick={card.onClick}
                >
                  <motion.div 
                    className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300"
                    whileHover={{ rotate: 10 }}
                  >
                    {card.icon}
                  </motion.div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 group-hover:text-purple-600 dark:group-hover:text-cyan-400 transition-colors duration-300">
                    {card.title}
                  </h3>
                  <p className="text-gray-600 dark:text-slate-300 mb-6 leading-relaxed">
                    {card.description}
                  </p>
                  <motion.button
                    className={`bg-gradient-to-r ${card.gradient} text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {card.action}
                  </motion.button>
                </motion.div>
              ))}
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/80 dark:border-slate-600/50 rounded-2xl p-8 shadow-lg"
            >
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                Validation History
              </h2>
              {validations.length > 0 ? (
                <div className="space-y-4">
                  {validations.map((validation, index) => (
                    <motion.div
                      key={validation.id}
                      className="border border-gray-200 dark:border-slate-600 rounded-xl p-6 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors duration-300 cursor-pointer"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => router.push(`/validation/${validation.id}`)}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            {validation.idea}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-slate-300">
                            <span>📅 {new Date(validation.created_at).toLocaleDateString()}</span>
                            <span>👥 {validation.personas?.length || 0} personas</span>
                            <span>💬 {validation.conversations?.[0]?.count || 0} conversations</span>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          validation.status === 'completed' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                        }`}>
                          {validation.status}
                        </div>
                      </div>
                      
                      {validation.insights && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700 dark:text-slate-300">Key Insights:</span>
                            <span className="text-gray-600 dark:text-slate-400 ml-2">
                              {validation.insights.key_insights?.length || 0}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700 dark:text-slate-300">Biases Detected:</span>
                            <span className="text-gray-600 dark:text-slate-400 ml-2">
                              {validation.insights.question_biases?.length || 0}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700 dark:text-slate-300">Market Trends:</span>
                            <span className="text-gray-600 dark:text-slate-400 ml-2">
                              {validation.market_analysis?.[0]?.trends?.length || 0}
                            </span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📝</div>
                  <p className="text-gray-600 dark:text-slate-300 text-lg mb-6">
                    No validations yet. Start your first validation to see your history here!
                  </p>
                  <motion.button
                    onClick={() => router.push('/validate')}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 dark:from-blue-500 dark:to-cyan-500 text-white px-8 py-3 rounded-xl font-semibold shadow-lg"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Start Your First Validation
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'coaching' && coachingDashboard && (
            <motion.div
              key="coaching"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="space-y-8"
            >
              {/* Coaching Sessions */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { type: 'questioning_techniques', title: 'Question Mastery', icon: '❓', description: 'Learn to ask unbiased questions' },
                  { type: 'bias_detection', title: 'Bias Detection', icon: '⚠️', description: 'Identify and avoid question bias' },
                  { type: 'interview_flow', title: 'Interview Flow', icon: '🔄', description: 'Structure effective interviews' },
                  { type: 'insight_extraction', title: 'Extract Insights', icon: '💡', description: 'Turn conversations into insights' }
                ].map((session, index) => (
                  <motion.div
                    key={session.type}
                    className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/80 dark:border-slate-600/50 rounded-2xl p-6 text-center cursor-pointer hover:bg-white/95 dark:hover:bg-slate-800/95 transition-all duration-300 shadow-lg"
                    whileHover={{ y: -5, scale: 1.02 }}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => startCoachingSession(session.type)}
                  >
                    <div className="text-4xl mb-4">{session.icon}</div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      {session.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-slate-300 mb-4">
                      {session.description}
                    </p>
                    <motion.button
                      className="bg-gradient-to-r from-purple-500 to-pink-500 dark:from-blue-500 dark:to-cyan-500 text-white px-4 py-2 rounded-lg font-medium text-sm"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Start Session
                    </motion.button>
                  </motion.div>
                ))}
              </div>

              {/* Recent Coaching Sessions */}
              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/80 dark:border-slate-600/50 rounded-2xl p-8 shadow-lg">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  Recent Coaching Sessions
                </h3>
                {coachingDashboard.recentSessions.length > 0 ? (
                  <div className="space-y-4">
                    {coachingDashboard.recentSessions.map((session, index) => (
                      <motion.div
                        key={session.id}
                        className="border border-gray-200 dark:border-slate-600 rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors duration-300"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {session.topic}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-slate-300">
                              {new Date(session.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                            session.completed 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          }`}>
                            {session.completed ? 'Completed' : 'In Progress'}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">🎓</div>
                    <p className="text-gray-600 dark:text-slate-300">
                      No coaching sessions yet. Start your first session above!
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
} 