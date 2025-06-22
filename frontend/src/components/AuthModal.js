'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function AuthModal({ isOpen, onClose, mode = 'signin' }) {
  const [authMode, setAuthMode] = useState(mode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const { signIn, signUp, signInWithGoogle } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (authMode === 'signup') {
        const { data, error } = await signUp(email, password);
        if (error) throw error;
        setMessage('🎉 Welcome to StepOne! Check your email to confirm your account.');
      } else {
        const { data, error } = await signIn(email, password);
        if (error) throw error;
        
        // Success! Redirect to dashboard
        onClose();
        router.push('/dashboard');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const { error } = await signInWithGoogle();
      if (error) throw error;
      
      // Note: OAuth will redirect automatically, so we don't need to manually redirect here
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl p-10 w-full max-w-lg shadow-2xl border border-gray-200/50 dark:border-slate-700/50 relative overflow-hidden"
          initial={{ scale: 0.8, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 50 }}
          transition={{ type: "spring", duration: 0.5 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Animated Background Gradient */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-orange-500/10 dark:from-blue-500/10 dark:via-cyan-500/10 dark:to-teal-500/10 rounded-3xl"
            animate={{
              background: [
                "linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(236, 72, 153, 0.1) 50%, rgba(251, 146, 60, 0.1) 100%)",
                "linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(251, 146, 60, 0.1) 50%, rgba(168, 85, 247, 0.1) 100%)",
                "linear-gradient(135deg, rgba(251, 146, 60, 0.1) 0%, rgba(168, 85, 247, 0.1) 50%, rgba(236, 72, 153, 0.1) 100%)"
              ]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />

          {/* Close Button */}
          <motion.button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 dark:bg-slate-800/20 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white transition-colors duration-300"
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
          >
            ✕
          </motion.button>

          {/* Header */}
          <motion.div
            className="text-center mb-10 relative z-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <motion.div 
              className="relative mx-auto mb-6"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 dark:from-blue-500 dark:to-cyan-400 rounded-2xl flex items-center justify-center mx-auto shadow-2xl shadow-purple-500/25 dark:shadow-blue-500/25">
                <span className="text-white font-bold text-3xl">V</span>
              </div>
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 dark:from-blue-500 dark:to-cyan-400 rounded-2xl opacity-75"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            </motion.div>

            <motion.h2 
              className="text-4xl font-black text-gray-900 dark:text-white mb-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {authMode === 'signup' ? (
                <span>Join the <span className="bg-gradient-to-r from-purple-600 to-pink-500 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">Revolution</span></span>
              ) : (
                <span>Welcome <span className="bg-gradient-to-r from-purple-600 to-pink-500 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">Back</span></span>
              )}
            </motion.h2>
            <motion.p 
              className="text-lg text-gray-600 dark:text-slate-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {authMode === 'signup' 
                ? '🚀 Start validating ideas like a pro' 
                : '✨ Continue your validation journey'}
            </motion.p>
          </motion.div>

          {/* Google Sign In */}
          <motion.button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-white px-6 py-4 rounded-2xl font-semibold mb-8 flex items-center justify-center space-x-3 hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-purple-300 dark:hover:border-cyan-400 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed relative z-10"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <motion.span 
              className="text-2xl"
              animate={{ rotate: loading ? 360 : 0 }}
              transition={{ duration: 1, repeat: loading ? Infinity : 0 }}
            >
              {loading ? '⏳' : '🌐'}
            </motion.span>
            <span>Continue with Google</span>
          </motion.button>

          <motion.div 
            className="relative mb-8"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-gray-200 dark:border-slate-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white/90 dark:bg-slate-900/90 text-gray-500 dark:text-slate-400 font-medium backdrop-blur-sm rounded-full">
                Or continue with email
              </span>
            </div>
          </motion.div>

          {/* Form */}
          <motion.form 
            onSubmit={handleSubmit} 
            className="space-y-6 relative z-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
            >
              <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-3">
                ✉️ Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl border-2 border-gray-200 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 dark:focus:ring-cyan-400/20 dark:focus:border-cyan-400 transition-all duration-300 backdrop-blur-sm"
                placeholder="your@email.com"
                required
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
            >
              <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-3">
                🔒 Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl border-2 border-gray-200 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 dark:focus:ring-cyan-400/20 dark:focus:border-cyan-400 transition-all duration-300 backdrop-blur-sm"
                placeholder="Enter your password"
                required
                minLength={6}
              />
            </motion.div>

            {error && (
              <motion.div
                className="bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-5 py-4 rounded-2xl text-sm font-medium backdrop-blur-sm"
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                ⚠️ {error}
              </motion.div>
            )}

            {message && (
              <motion.div
                className="bg-green-50 dark:bg-green-900/30 border-2 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-5 py-4 rounded-2xl text-sm font-medium backdrop-blur-sm"
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {message}
              </motion.div>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-500 dark:from-blue-600 dark:to-cyan-500 text-white px-6 py-4 rounded-2xl font-bold text-lg shadow-2xl shadow-purple-500/25 dark:shadow-blue-500/25 hover:shadow-purple-500/40 dark:hover:shadow-blue-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
              whileHover={{ scale: loading ? 1 : 1.02, y: loading ? 0 : -2 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-600 dark:from-cyan-500 dark:to-blue-600 opacity-0 hover:opacity-100 transition-opacity duration-300"
              />
              <span className="relative z-10 flex items-center justify-center space-x-2">
                {loading ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      ⏳
                    </motion.span>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>{authMode === 'signup' ? '🚀' : '✨'}</span>
                    <span>{authMode === 'signup' ? 'Create Account' : 'Sign In'}</span>
                  </>
                )}
              </span>
            </motion.button>
          </motion.form>

          {/* Toggle Mode */}
          <motion.div 
            className="text-center mt-8 relative z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <button
              onClick={() => {
                setAuthMode(authMode === 'signup' ? 'signin' : 'signup');
                setError('');
                setMessage('');
              }}
              className="text-purple-600 dark:text-cyan-400 hover:text-purple-700 dark:hover:text-cyan-300 font-bold text-lg transition-colors duration-300 hover:underline"
            >
              {authMode === 'signup' 
                ? '👋 Already have an account? Sign in' 
                : '🆕 New here? Create account'}
            </button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
} 