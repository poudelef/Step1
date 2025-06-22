'use client';

import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import AnimatedCounter from '../components/AnimatedCounter';
import ThemeToggle from '../components/ThemeToggle';
import AuthModal from '../components/AuthModal';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [isVisible, setIsVisible] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 300], [0, 100]);
  const y2 = useTransform(scrollY, [0, 300], [0, -100]);
  
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setIsVisible(true);
    
    // Redirect authenticated users to dashboard
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const handleSignIn = () => {
    setAuthMode('signin');
    setShowAuthModal(true);
  };

  const handleSignUp = () => {
    setAuthMode('signup');
    setShowAuthModal(true);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
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
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden transition-colors duration-500">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-pink-400/20 to-purple-400/20 dark:from-blue-500/10 dark:to-purple-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 dark:from-cyan-500/10 dark:to-teal-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.4, 0.2, 0.4],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Navigation */}
      <motion.nav 
        className="fixed top-0 w-full bg-white/80 dark:bg-slate-950/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-slate-700/50 z-50 transition-colors duration-500"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <motion.div 
              className="flex items-center space-x-3"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 dark:from-blue-500 dark:to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25 dark:shadow-blue-500/25">
                  <span className="text-white font-bold text-lg">V</span>
                </div>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 dark:from-blue-500 dark:to-cyan-400 rounded-xl opacity-75"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              <span className="text-gray-900 dark:text-white font-bold text-2xl tracking-tight transition-colors duration-300">ValidateAI</span>
            </motion.div>
            
            <div className="hidden md:flex space-x-8 items-center">
              {['Features', 'Demo', 'Pricing'].map((item, index) => (
                <motion.a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="text-gray-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-cyan-400 transition-colors font-medium"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 + 0.5 }}
                  whileHover={{ y: -2 }}
                >
                  {item}
                </motion.a>
              ))}
              <ThemeToggle />
            </div>
            
            <div className="flex items-center space-x-4">
              {user ? (
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
              ) : (
                <>
                  <motion.button
                    onClick={handleSignIn}
                    className="text-gray-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-cyan-400 px-4 py-2 rounded-lg font-medium transition-colors duration-300"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 }}
                  >
                    Sign In
                  </motion.button>
                  <motion.button
                    onClick={handleSignUp}
                    className="bg-gradient-to-r from-purple-600 to-pink-500 dark:from-blue-600 dark:to-cyan-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-purple-500/25 dark:shadow-blue-500/25 hover:shadow-purple-500/40 dark:hover:shadow-blue-500/40 transition-all duration-300"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    Get Started
                  </motion.button>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <motion.div 
              className="inline-flex items-center bg-gradient-to-r from-purple-100 to-pink-100 dark:from-slate-800/80 dark:to-slate-700/80 backdrop-blur-sm border border-purple-200 dark:border-slate-600/50 rounded-full px-6 py-3 mb-8"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              whileHover={{ scale: 1.05 }}
            >
              <motion.span 
                className="text-purple-600 dark:text-cyan-400 text-sm font-semibold tracking-wide"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                🚀 Validate any startup idea in 5 minutes
              </motion.span>
            </motion.div>
            
            <motion.h1 
              className="text-6xl md:text-8xl font-black text-gray-900 dark:text-white mb-8 leading-tight tracking-tight"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              Stop Building
              <motion.span 
                className="block bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 dark:from-blue-400 dark:via-cyan-400 dark:to-teal-400 bg-clip-text text-transparent"
                animate={{ 
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] 
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity,
                  ease: "linear" 
                }}
                style={{ backgroundSize: "200% 200%" }}
              >
                Blind
              </motion.span>
            </motion.h1>
            
            <motion.p 
              className="text-xl md:text-2xl text-gray-600 dark:text-slate-300 mb-12 max-w-4xl mx-auto leading-relaxed font-light"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              Get real-sounding customer feedback, question coaching, and deck-ready insights—all powered by AI. 
              <span className="text-purple-600 dark:text-cyan-400 font-medium"> No cold outreach required.</span>
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.8 }}
            >
              <motion.button
                className="bg-gradient-to-r from-purple-600 to-pink-500 dark:from-blue-600 dark:to-cyan-500 text-white px-10 py-4 rounded-xl font-bold text-lg shadow-2xl shadow-purple-500/25 dark:shadow-blue-500/25 relative overflow-hidden group"
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-600 dark:from-cyan-500 dark:to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                />
                <span className="relative z-10">Try ValidateAI Free</span>
              </motion.button>
              
              <motion.button
                className="border-2 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 px-10 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 dark:hover:bg-slate-800/50 hover:border-purple-400 dark:hover:border-cyan-400 transition-all duration-300 backdrop-blur-sm"
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.95 }}
              >
                Watch Demo
              </motion.button>
            </motion.div>

            {/* Animated Stats */}
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-4xl mx-auto"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.8 }}
            >
              {[
                { value: "5", suffix: " min", label: "Average validation time" },
                { value: "90", suffix: "%", label: "Skip customer discovery" },
                { value: "5", suffix: "", label: "AI personas per idea" }
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  className="text-center group"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 + index * 0.1 }}
                  whileHover={{ y: -5 }}
                >
                  <motion.div 
                    className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-3 group-hover:text-purple-600 dark:group-hover:text-cyan-400 transition-colors duration-300"
                    whileHover={{ scale: 1.1 }}
                  >
                    <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                  </motion.div>
                  <div className="text-gray-600 dark:text-slate-400 font-medium">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Floating Elements */}
        <motion.div
          className="absolute top-1/4 left-10 w-4 h-4 bg-purple-500 dark:bg-cyan-500 rounded-full opacity-60"
          animate={{
            y: [0, -20, 0],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute top-1/3 right-20 w-6 h-6 bg-pink-400 dark:bg-blue-400 rounded-full opacity-40"
          animate={{
            y: [0, 20, 0],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
      </section>

      {/* Demo Section */}
      <section id="demo" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-slate-900/80 dark:to-slate-800/80 backdrop-blur-sm relative">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <motion.h2 
              className="text-5xl md:text-6xl font-black text-gray-900 dark:text-white mb-8 tracking-tight"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
            >
              See ValidateAI in
              <span className="bg-gradient-to-r from-purple-600 to-pink-500 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent"> Action</span>
            </motion.h2>
            <motion.p 
              className="text-xl text-gray-600 dark:text-slate-300 mb-12 font-light"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              viewport={{ once: true }}
            >
              Watch how Sam validates his CRM idea in under 5 minutes
            </motion.p>
          </motion.div>
          
          <motion.div 
            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/80 dark:border-slate-600/50 rounded-3xl p-8 mb-8 shadow-2xl"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            viewport={{ once: true }}
            whileHover={{ y: -5 }}
          >
            <motion.div 
              className="aspect-video bg-gradient-to-br from-purple-100 to-pink-100 dark:from-slate-700/50 dark:to-slate-600/50 rounded-2xl flex items-center justify-center mb-6 relative overflow-hidden group"
              whileHover={{ scale: 1.02 }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-blue-500/10 dark:to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              />
              <motion.div
                className="text-8xl mb-4 group-hover:scale-110 transition-transform duration-300"
                whileHover={{ rotate: 10 }}
              >
                🎬
              </motion.div>
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                whileHover={{ scale: 1.1 }}
              >
                <div className="w-20 h-20 bg-white/30 dark:bg-slate-800/50 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/50 dark:border-slate-600/50">
                  <div className="w-0 h-0 border-l-[12px] border-l-purple-600 dark:border-l-cyan-400 border-y-[8px] border-y-transparent ml-1"></div>
                </div>
              </motion.div>
            </motion.div>
            
            <motion.h3 
              className="text-3xl font-bold text-gray-900 dark:text-white mb-4"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              viewport={{ once: true }}
            >
              Interactive Demo
            </motion.h3>
            <motion.p 
              className="text-gray-600 dark:text-slate-300 mb-6"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 1 }}
              viewport={{ once: true }}
            >
              30-second walkthrough of the complete validation flow
            </motion.p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              {[
                { step: "01", title: "Enter Idea", desc: "CRM for freelancers" },
                { step: "02", title: "AI Interview", desc: "Chat with personas" },
                { step: "03", title: "Get Insights", desc: "Export deck & emails" }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-slate-700/80 dark:to-slate-600/80 p-4 rounded-xl border border-purple-100 dark:border-slate-600/30"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.2 + index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="text-purple-600 dark:text-cyan-400 font-bold text-sm mb-2">{item.step}</div>
                  <div className="text-gray-900 dark:text-white font-semibold mb-1">{item.title}</div>
                  <div className="text-gray-600 dark:text-slate-300 text-sm">{item.desc}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.button
            className="bg-gradient-to-r from-purple-600 to-pink-500 dark:from-blue-600 dark:to-cyan-500 text-white px-12 py-4 rounded-xl font-bold text-lg shadow-2xl shadow-purple-500/25 dark:shadow-blue-500/25 relative overflow-hidden group"
            whileHover={{ scale: 1.05, y: -3 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4 }}
            viewport={{ once: true }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-600 dark:from-cyan-500 dark:to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            />
            <span className="relative z-10">Try Interactive Demo</span>
          </motion.button>
        </div>
      </section>

      {/* Problem Section with Parallax */}
      <motion.section 
        className="py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-white via-gray-50 to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 relative"
        style={{ y: y1 }}
      >
        <div className="max-w-6xl mx-auto">
          <motion.div 
            className="text-center mb-20"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <motion.h2 
              className="text-5xl md:text-6xl font-black text-gray-900 dark:text-white mb-8 tracking-tight"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
            >
              The Problem is
              <span className="text-red-500 dark:text-red-400"> Real</span>
            </motion.h2>
            <motion.p 
              className="text-xl text-gray-600 dark:text-slate-300 max-w-3xl mx-auto font-light"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              viewport={{ once: true }}
            >
              90% of founders skip customer discovery—or do it wrong. They build products nobody wants.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: "🔨", title: "Build-Blind Founders", desc: "Dive into coding without any customer input", color: "red" },
              { icon: "🤔", title: "Guess-and-Build Founders", desc: "Surface-level research but lack structured feedback", color: "yellow" },
              { icon: "📞", title: "Interview-Iterate Founders", desc: "Run interviews but need better analysis tools", color: "blue" }
            ].map((item, index) => (
              <motion.div
                key={index}
                className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/80 dark:border-slate-600/50 rounded-2xl p-8 text-center group hover:bg-white/95 dark:hover:bg-slate-800/95 transition-all duration-300 shadow-lg"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                whileHover={{ y: -10, scale: 1.02 }}
              >
                <motion.div 
                  className={`w-20 h-20 bg-gradient-to-r from-${item.color}-400/20 to-${item.color}-500/20 dark:from-${item.color}-500/20 dark:to-${item.color}-400/20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:from-${item.color}-400/30 group-hover:to-${item.color}-500/30 transition-colors duration-300`}
                  whileHover={{ rotate: 5, scale: 1.1 }}
                >
                  <span className="text-4xl">{item.icon}</span>
                </motion.div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 group-hover:text-purple-600 dark:group-hover:text-cyan-400 transition-colors duration-300">
                  {item.title}
                </h3>
                <p className="text-gray-600 dark:text-slate-300 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Solution Flow with Advanced Animations */}
      <section id="features" className="py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            className="text-center mb-20"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <motion.h2 
              className="text-5xl md:text-6xl font-black text-gray-900 dark:text-white mb-8 tracking-tight"
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
            >
              Simple 3-Step
              <span className="bg-gradient-to-r from-purple-600 to-pink-500 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent"> Validation</span>
            </motion.h2>
            <motion.p 
              className="text-xl text-gray-600 dark:text-slate-300 max-w-3xl mx-auto font-light"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              viewport={{ once: true }}
            >
              From idea to insights in minutes, not months
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {[
              {
                step: 1,
                title: "Enter Your Idea",
                desc: "Describe your startup idea and get instant market insights",
                example: '"CRM for freelancers"',
                result: "→ 3 pain points identified",
                gradient: "from-purple-500/20 to-pink-500/20 dark:from-blue-500/20 dark:to-cyan-500/20",
                border: "border-purple-300/50 dark:border-blue-500/30"
              },
              {
                step: 2,
                title: "Mock Interview",
                desc: "Chat with AI personas that match your target customers",
                example: '"Freelance Designer"',
                result: "→ Real-time question coaching",
                gradient: "from-pink-500/20 to-orange-500/20 dark:from-cyan-500/20 dark:to-teal-500/20",
                border: "border-pink-300/50 dark:border-cyan-500/30"
              },
              {
                step: 3,
                title: "Get Insights",
                desc: "Auto-generated slides and outreach templates",
                example: "PDF + Email templates",
                result: "→ Deck-ready insights",
                gradient: "from-orange-500/20 to-red-500/20 dark:from-teal-500/20 dark:to-green-500/20",
                border: "border-orange-300/50 dark:border-teal-500/30"
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                className="relative"
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                viewport={{ once: true }}
              >
                <motion.div 
                  className={`bg-gradient-to-br ${item.gradient} backdrop-blur-sm border ${item.border} rounded-3xl p-8 text-center h-full relative overflow-hidden group shadow-xl`}
                  whileHover={{ y: -10, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent dark:from-white/5 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  />
                  
                  <motion.div 
                    className={`w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 dark:from-blue-500 dark:to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white font-black text-2xl shadow-lg`}
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.6 }}
                  >
                    {item.step}
                  </motion.div>
                  
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 group-hover:text-purple-600 dark:group-hover:text-cyan-400 transition-colors duration-300">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 dark:text-slate-300 mb-8 leading-relaxed font-light">{item.desc}</p>
                  
                  <motion.div 
                    className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-6 text-left backdrop-blur-sm border border-white/30 dark:border-slate-600/30"
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="text-sm text-gray-500 dark:text-slate-400 mb-2 font-medium">Example:</div>
                    <div className="text-gray-900 dark:text-white font-semibold mb-3">{item.example}</div>
                    <div className="text-purple-600 dark:text-cyan-400 text-sm font-medium">{item.result}</div>
                  </motion.div>
                </motion.div>
                
                {/* Animated Connectors */}
                {index < 2 && (
                  <motion.div
                    className="hidden md:block absolute top-1/2 -right-4 w-8 h-1 bg-gradient-to-r from-purple-500 to-pink-500 dark:from-blue-500 dark:to-cyan-500 rounded-full"
                    initial={{ width: 0 }}
                    whileInView={{ width: 32 }}
                    transition={{ delay: 0.8 + index * 0.2, duration: 0.6 }}
                    viewport={{ once: true }}
                  />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid with Stagger Animation */}
      <motion.section 
        className="py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-950 dark:to-slate-900 backdrop-blur-sm relative"
        style={{ y: y2 }}
      >
        <div className="max-w-6xl mx-auto">
          <motion.div 
            className="text-center mb-20"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <motion.h2 
              className="text-5xl md:text-6xl font-black text-gray-900 dark:text-white mb-8 tracking-tight"
              whileInView={{ opacity: 1, scale: 1 }}
              initial={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              Powerful
              <span className="bg-gradient-to-r from-purple-600 to-pink-500 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent"> Features</span>
            </motion.h2>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.1
                }
              }
            }}
          >
            {[
              { icon: "⚡", title: "Market Flash", desc: "Instant pain points and competitor analysis" },
              { icon: "🎭", title: "AI Personas", desc: "Curated customer personas with context" },
              { icon: "💬", title: "Mock Interviews", desc: "Realistic customer conversations" },
              { icon: "🎯", title: "Question Coach", desc: "Real-time feedback on question quality" },
              { icon: "📊", title: "Insight Extractor", desc: "Auto-generated pain points and objections" },
              { icon: "📤", title: "Export Kit", desc: "Slide-ready PDFs and email templates" }
            ].map((feature, index) => (
              <motion.div
                key={index}
                className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/80 dark:border-slate-600/50 rounded-2xl p-8 text-center group hover:bg-white/95 dark:hover:bg-slate-800/95 transition-all duration-300 shadow-lg"
                variants={{
                  hidden: { opacity: 0, y: 50 },
                  visible: { opacity: 1, y: 0 }
                }}
                whileHover={{ y: -10, scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <motion.div 
                  className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300"
                  whileHover={{ rotate: 10 }}
                >
                  {feature.icon}
                </motion.div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 group-hover:text-purple-600 dark:group-hover:text-cyan-400 transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-slate-300 leading-relaxed font-light">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* CTA Section with Magnetic Effect */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-slate-900/90 dark:to-slate-800/90 backdrop-blur-sm relative">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h2 
            className="text-5xl md:text-6xl font-black text-gray-900 dark:text-white mb-8 tracking-tight"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            Ready to Stop
            <span className="bg-gradient-to-r from-red-500 to-orange-500 dark:from-red-400 dark:to-orange-400 bg-clip-text text-transparent"> Building Blind?</span>
          </motion.h2>
          
          <motion.p 
            className="text-xl text-gray-600 dark:text-slate-300 mb-12 font-light"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
          >
            Join thousands of founders who validate before they build
          </motion.p>
          
          <motion.div 
            className="flex flex-col sm:flex-row gap-6 justify-center items-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <motion.button
              className="bg-gradient-to-r from-purple-600 to-pink-500 dark:from-blue-600 dark:to-cyan-500 text-white px-12 py-4 rounded-xl font-bold text-lg shadow-2xl shadow-purple-500/25 dark:shadow-blue-500/25 relative overflow-hidden group"
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-600 dark:from-cyan-500 dark:to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              />
              <span className="relative z-10">Start Validating Now</span>
            </motion.button>
            
            <motion.button
              className="border-2 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 px-12 py-4 rounded-xl font-bold text-lg hover:bg-white/50 dark:hover:bg-slate-800/50 hover:border-purple-400 dark:hover:border-cyan-400 transition-all duration-300 backdrop-blur-sm"
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
            >
              Book a Demo
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 sm:px-6 lg:px-8 border-t border-gray-200 dark:border-slate-700/50 bg-gradient-to-br from-white via-gray-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            {/* Brand Section */}
            <div className="md:col-span-2">
              <motion.div 
                className="flex items-center space-x-3 mb-6"
                whileHover={{ scale: 1.05 }}
              >
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 dark:from-blue-500 dark:to-cyan-400 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-xl">V</span>
                  </div>
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 dark:from-blue-500 dark:to-cyan-400 rounded-xl opacity-75"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />
                </div>
                <span className="text-gray-900 dark:text-white font-bold text-3xl tracking-tight">ValidateAI</span>
              </motion.div>
              <p className="text-gray-600 dark:text-slate-300 text-lg mb-6 max-w-md leading-relaxed">
                Stop building blind. Validate any startup idea in 5 minutes with AI-powered customer discovery.
              </p>
              <div className="flex space-x-4">
                {[
                  { icon: "🐦", label: "Twitter", href: "#" },
                  { icon: "💼", label: "LinkedIn", href: "#" },
                  { icon: "📧", label: "Email", href: "#" },
                  { icon: "📱", label: "Discord", href: "#" }
                ].map((social, index) => (
                  <motion.a
                    key={index}
                    href={social.href}
                    className="w-12 h-12 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200 dark:border-slate-600/50 rounded-xl flex items-center justify-center text-xl hover:bg-purple-50 dark:hover:bg-slate-700/80 transition-all duration-300 shadow-sm"
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    {social.icon}
                  </motion.a>
                ))}
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="text-gray-900 dark:text-white font-bold text-lg mb-6">Product</h4>
              <ul className="space-y-4">
                {[
                  { name: "Features", href: "#features" },
                  { name: "Demo", href: "#demo" },
                  { name: "Pricing", href: "#pricing" },
                  { name: "API", href: "#" },
                  { name: "Integrations", href: "#" }
                ].map((link, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + index * 0.05 }}
                  >
                    <a 
                      href={link.href}
                      className="text-gray-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-cyan-400 transition-colors duration-300 font-medium"
                    >
                      {link.name}
                    </a>
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h4 className="text-gray-900 dark:text-white font-bold text-lg mb-6">Company</h4>
              <ul className="space-y-4">
                {[
                  { name: "About", href: "#" },
                  { name: "Blog", href: "#" },
                  { name: "Careers", href: "#" },
                  { name: "Contact", href: "#" },
                  { name: "Privacy", href: "#" }
                ].map((link, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.05 }}
                  >
                    <a 
                      href={link.href}
                      className="text-gray-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-cyan-400 transition-colors duration-300 font-medium"
                    >
                      {link.name}
                    </a>
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>

          {/* Newsletter Signup */}
          <motion.div 
            className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-slate-800/50 dark:to-slate-700/50 rounded-2xl p-8 mb-12 border border-purple-100 dark:border-slate-600/30"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="text-center max-w-2xl mx-auto">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Stay Updated
              </h3>
              <p className="text-gray-600 dark:text-slate-300 mb-6">
                Get the latest updates on customer discovery trends and ValidateAI features.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-cyan-400 transition-all duration-300"
                />
                <motion.button
                  className="bg-gradient-to-r from-purple-600 to-pink-500 dark:from-blue-600 dark:to-cyan-500 text-white px-6 py-3 rounded-xl font-semibold whitespace-nowrap shadow-lg shadow-purple-500/25 dark:shadow-blue-500/25 hover:shadow-purple-500/40 dark:hover:shadow-blue-500/40 transition-all duration-300"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Subscribe
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Bottom Bar */}
          <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-gray-200 dark:border-slate-700/50">
            <motion.div 
              className="text-gray-600 dark:text-slate-400 text-sm font-light mb-4 md:mb-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              © 2025 ValidateAI. Built for founders, by founders. 🚀
            </motion.div>
            
            <motion.div 
              className="flex items-center space-x-6 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
            >
              <a href="#" className="text-gray-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-cyan-400 transition-colors duration-300">
                Terms of Service
              </a>
              <a href="#" className="text-gray-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-cyan-400 transition-colors duration-300">
                Privacy Policy
              </a>
              <div className="flex items-center space-x-2">
                <span className="text-gray-600 dark:text-slate-400">Made with</span>
                <motion.span 
                  className="text-red-500"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  ❤️
                </motion.span>
                <span className="text-gray-600 dark:text-slate-400">in Berkeley</span>
              </div>
            </motion.div>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
      />
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <motion.div 
      className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200/80 dark:border-slate-600/50 rounded-2xl p-8 text-center group hover:bg-white/95 dark:hover:bg-slate-800/95 transition-all duration-300 shadow-lg"
      whileHover={{ y: -10, scale: 1.05 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <motion.div 
        className="text-5xl mb-6 group-hover:scale-110 transition-transform duration-300"
        whileHover={{ rotate: 10 }}
      >
        {icon}
      </motion.div>
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 group-hover:text-purple-600 dark:group-hover:text-cyan-400 transition-colors duration-300">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-slate-300 leading-relaxed font-light">{description}</p>
    </motion.div>
  );
}
