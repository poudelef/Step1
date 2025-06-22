'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }

    // Set greeting based on time
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, [user, loading, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (loading) {
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
              <span className="text-gray-900 dark:text-white font-bold text-2xl tracking-tight">ValidateAI</span>
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
            Ready to validate your next big idea?
          </motion.p>
        </motion.div>

        {/* Quick Actions */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
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
              onClick: () => {}
            },
            {
              icon: '🎯',
              title: 'AI Coaching',
              description: 'Get personalized tips to improve your validation skills',
              action: 'Learn More',
              gradient: 'from-orange-500 to-red-500 dark:from-teal-500 dark:to-green-500',
              onClick: () => {}
            }
          ].map((card, index) => (
            <motion.div
              key={index}
              className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/80 dark:border-slate-600/50 rounded-2xl p-8 text-center group hover:bg-white/95 dark:hover:bg-slate-800/95 transition-all duration-300 shadow-lg cursor-pointer"
              whileHover={{ y: -10, scale: 1.02 }}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + index * 0.1, duration: 0.6, type: "spring", stiffness: 300 }}
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

        {/* Recent Activity */}
        <motion.div
          className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/80 dark:border-slate-600/50 rounded-2xl p-8 shadow-lg"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
        >
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            Recent Activity
          </h2>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-gray-600 dark:text-slate-300 text-lg">
              No validations yet. Start your first validation to see your activity here!
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 