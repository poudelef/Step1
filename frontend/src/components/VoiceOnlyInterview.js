'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function VoiceOnlyInterview({ persona, idea, onComplete }) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPersonaSpeaking, setIsPersonaSpeaking] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [error, setError] = useState('');
  const [silenceDetected, setSilenceDetected] = useState(false);
  const [useBrowserSpeech, setUseBrowserSpeech] = useState(false);
  
  const mediaRecorder = useRef(null);
  const audioStream = useRef(null);
  const audioContext = useRef(null);
  const analyser = useRef(null);
  const animationFrame = useRef(null);
  const silenceTimer = useRef(null);
  const audioChunks = useRef([]);
  const speechRecognition = useRef(null);
  
  // Silence detection parameters
  const SILENCE_THRESHOLD = 0.01;
  const SILENCE_DURATION = 3000;

  // Initialize audio context and speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
      
      // Initialize browser speech recognition as backup
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        speechRecognition.current = new SpeechRecognition();
        speechRecognition.current.continuous = true;
        speechRecognition.current.interimResults = false;
        speechRecognition.current.lang = 'en-US';
        
        speechRecognition.current.onresult = (event) => {
          const transcript = event.results[event.results.length - 1][0].transcript;
          handleSpeechResult(transcript);
        };
        
        speechRecognition.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setError('Speech recognition failed. Please try again.');
          setIsListening(false);
          setIsProcessing(false);
        };
        
        speechRecognition.current.onend = () => {
          if (isListening) {
            setIsListening(false);
            setIsProcessing(true);
          }
        };
      }
    }
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (audioContext.current) {
      audioContext.current.close();
    }
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
    }
    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current);
    }
    if (audioStream.current) {
      audioStream.current.getTracks().forEach(track => track.stop());
    }
    if (speechRecognition.current) {
      speechRecognition.current.stop();
    }
    if (speechSynthesis) {
      speechSynthesis.cancel();
    }
  };

  // Handle speech recognition result
  const handleSpeechResult = async (transcript) => {
    try {
      setError('');
      
      // Update conversation history
      const newHistory = [
        ...conversationHistory,
        { role: 'user', message: transcript },
      ];
      
      // Generate persona response using Groq
      const response = await generatePersonaResponse(transcript, newHistory);
      
      const finalHistory = [
        ...newHistory,
        { role: 'persona', message: response }
      ];
      
      setConversationHistory(finalHistory);
      
      // Play persona response using browser TTS
      await playPersonaResponse(response);
      
    } catch (error) {
      console.error('Failed to process speech:', error);
      setError('Failed to process speech. Please try again.');
      await playPersonaResponse("I'm sorry, I had trouble understanding that. Could you try speaking again?");
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate persona response using backend
  const generatePersonaResponse = async (userMessage, history) => {
    try {
      const response = await fetch('http://localhost:8000/voice-interview-realtime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          persona: persona,
          audio_file: null, // No audio file, just text
          conversation_history: history
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.persona_response;
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Backend API failed, using fallback response:', error);
      
      // Automatically switch to browser-only mode
      setUseBrowserSpeech(true);
      setError('Backend unavailable. Using browser-only mode.');
      
      // Fallback response generation
      return generateFallbackResponse(userMessage);
    }
  };

  // Fallback response when backend fails
  const generateFallbackResponse = (userMessage) => {
    const responses = [
      `That's really interesting! As a ${persona.role}, I can definitely relate to challenges around ${userMessage.toLowerCase().includes('time') ? 'time management' : 'efficiency'}. Tell me more about how you envision this working.`,
      `I see what you mean. In my experience as a ${persona.role}, that kind of solution could be really valuable. What made you think of this particular approach?`,
      `That sounds promising! I've dealt with similar issues in my work. How do you think this would be different from what's currently available?`,
      `Interesting point! As someone who works in this space, I'm curious about the implementation. Have you thought about potential challenges?`,
      `That could definitely solve a real problem! I'm wondering about the user experience - how would someone like me actually use this day-to-day?`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  // Audio level visualization and silence detection
  const updateAudioLevel = () => {
    if (analyser.current && isListening) {
      const dataArray = new Uint8Array(analyser.current.frequencyBinCount);
      analyser.current.getByteFrequencyData(dataArray);
      
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      const normalizedLevel = average / 255;
      setAudioLevel(normalizedLevel);
      
      // Silence detection
      if (normalizedLevel < SILENCE_THRESHOLD) {
        if (!silenceTimer.current) {
          silenceTimer.current = setTimeout(() => {
            setSilenceDetected(true);
            stopListening();
          }, SILENCE_DURATION);
        }
      } else {
        if (silenceTimer.current) {
          clearTimeout(silenceTimer.current);
          silenceTimer.current = null;
        }
        setSilenceDetected(false);
      }
      
      animationFrame.current = requestAnimationFrame(updateAudioLevel);
    }
  };

  // Start voice conversation
  const startConversation = async () => {
    try {
      setConversationStarted(true);
      setError('');
      
      // Play initial greeting
      const greeting = `Hi! I'm ${persona.name}, ${persona.role}. I'd love to hear about your startup idea and share my thoughts!`;
      await playPersonaResponse(greeting);
      
    } catch (error) {
      console.error('Failed to start conversation:', error);
      setError('Failed to start conversation. Please check your microphone permissions.');
    }
  };

  // Start listening with browser speech recognition fallback
  const startListening = async () => {
    try {
      setError('');
      setSilenceDetected(false);
      
      // Try browser speech recognition first (more reliable)
      if (speechRecognition.current) {
        setUseBrowserSpeech(true);
        speechRecognition.current.start();
        setIsListening(true);
        return;
      }
      
      // Fallback to recording method
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        }
      });
      
      audioStream.current = stream;
      
      // Setup audio analysis for visualization
      if (audioContext.current && audioContext.current.state === 'suspended') {
        await audioContext.current.resume();
      }
      
      if (audioContext.current) {
        const source = audioContext.current.createMediaStreamSource(stream);
        analyser.current = audioContext.current.createAnalyser();
        analyser.current.fftSize = 2048;
        analyser.current.smoothingTimeConstant = 0.8;
        source.connect(analyser.current);
      }
      
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/wav'
      ];
      
      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }
      
      if (!selectedMimeType) {
        throw new Error('No supported audio format found');
      }
      
      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
        audioBitsPerSecond: 128000
      });
      
      audioChunks.current = [];
      
      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };
      
      mediaRecorder.current.onstop = async () => {
        if (audioChunks.current.length > 0) {
          const audioBlob = new Blob(audioChunks.current, { type: selectedMimeType });
          await sendAudioToPersona(audioBlob);
        }
      };
      
      mediaRecorder.current.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        setError('Recording error occurred. Please try again.');
        setIsListening(false);
        setIsProcessing(false);
      };
      
      mediaRecorder.current.start(100);
      setIsListening(true);
      updateAudioLevel();
      
    } catch (error) {
      console.error('Failed to start listening:', error);
      if (error.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone permission and refresh the page.');
      } else if (error.name === 'NotFoundError') {
        setError('No microphone found. Please check your audio devices.');
      } else {
        setError('Failed to access microphone. Please check your permissions and try again.');
      }
    }
  };

  // Stop listening
  const stopListening = () => {
    if (useBrowserSpeech && speechRecognition.current) {
      speechRecognition.current.stop();
      setUseBrowserSpeech(false);
    } else if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop();
    }
    
    if (audioStream.current) {
      audioStream.current.getTracks().forEach(track => track.stop());
    }
    
    setIsListening(false);
    if (!useBrowserSpeech) {
      setIsProcessing(true);
    }
    
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
    }
    
    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current);
      silenceTimer.current = null;
    }
  };

  // Send audio to persona (legacy method for recording fallback)
  const sendAudioToPersona = async (audioBlob) => {
    try {
      setError('');
      
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Audio = reader.result.split(',')[1];
          
          const response = await fetch('http://localhost:8000/voice-interview-realtime', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              persona: persona,
              audio_file: base64Audio,
              conversation_history: conversationHistory
            })
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          
          const newHistory = [
            ...conversationHistory,
            { role: 'user', message: data.transcribed_user_message || 'Audio message' },
            { role: 'persona', message: data.persona_response }
          ];
          setConversationHistory(newHistory);
          
          if (data.persona_audio_url) {
            const audioBase64 = data.persona_audio_url.split(',')[1];
            await playAudioFromBase64(audioBase64);
          } else {
            await playPersonaResponse(data.persona_response);
          }
          
        } catch (error) {
          console.error('Voice processing error:', error);
          setError('API quota exceeded. Using browser speech recognition...');
          // Switch to browser speech recognition for future interactions
          setUseBrowserSpeech(true);
          await playPersonaResponse("I'm sorry, I had trouble understanding that. Could you try speaking again?");
        } finally {
          setIsProcessing(false);
        }
      };
      
      reader.onerror = () => {
        setError('Failed to process audio file');
        setIsProcessing(false);
      };
      
      reader.readAsDataURL(audioBlob);
      
    } catch (error) {
      console.error('Failed to send audio:', error);
      setError('Failed to send audio');
      setIsProcessing(false);
    }
  };

  // Play persona response audio from base64
  const playAudioFromBase64 = async (base64Audio) => {
    return new Promise((resolve) => {
      setIsPersonaSpeaking(true);
      
      const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
      
      audio.onended = () => {
        setIsPersonaSpeaking(false);
        resolve();
      };
      
      audio.onerror = (error) => {
        console.error('Audio playback error:', error);
        setIsPersonaSpeaking(false);
        resolve();
      };
      
      audio.play().catch((error) => {
        console.error('Audio play error:', error);
        setIsPersonaSpeaking(false);
        resolve();
      });
    });
  };

  // Enhanced TTS with better voice selection
  const playPersonaResponse = async (text) => {
    try {
      setIsPersonaSpeaking(true);
      
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
        
        let voices = speechSynthesis.getVoices();
        if (voices.length === 0) {
          await new Promise((resolve) => {
            speechSynthesis.onvoiceschanged = () => {
              voices = speechSynthesis.getVoices();
              resolve();
            };
            setTimeout(resolve, 1000);
          });
        }
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 0.9;
        
        // Better voice selection based on persona
        const personaName = persona.name.toLowerCase();
        let selectedVoice = null;
        
        // Try to find a good voice based on persona characteristics
        if (personaName.includes('sarah') || personaName.includes('emma')) {
          selectedVoice = voices.find(voice => 
            voice.lang.includes('en') && 
            (voice.name.toLowerCase().includes('female') || 
             voice.name.toLowerCase().includes('samantha') ||
             voice.name.toLowerCase().includes('karen') ||
             voice.name.toLowerCase().includes('moira'))
          );
        } else if (personaName.includes('marcus') || personaName.includes('michael')) {
          selectedVoice = voices.find(voice => 
            voice.lang.includes('en') && 
            (voice.name.toLowerCase().includes('male') || 
             voice.name.toLowerCase().includes('daniel') ||
             voice.name.toLowerCase().includes('alex') ||
             voice.name.toLowerCase().includes('fred'))
          );
        }
        
        // Fallback to best English voice
        if (!selectedVoice) {
          selectedVoice = voices.find(voice => {
            const name = voice.name.toLowerCase();
            const isEnglish = voice.lang.includes('en');
            return isEnglish && (name.includes('google') || name.includes('microsoft') || name.includes('enhanced'));
          }) || voices.find(voice => voice.lang.includes('en'));
        }
        
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
        
        return new Promise((resolve) => {
          utterance.onend = () => {
            setIsPersonaSpeaking(false);
            resolve();
          };
          
          utterance.onerror = (error) => {
            console.error('Speech synthesis error:', error);
            setIsPersonaSpeaking(false);
            resolve();
          };
          
          speechSynthesis.speak(utterance);
        });
      } else {
        setTimeout(() => {
          setIsPersonaSpeaking(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Failed to play persona response:', error);
      setIsPersonaSpeaking(false);
    }
  };

  // End conversation
  const endConversation = () => {
    cleanup();
    onComplete?.(conversationHistory);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-8">
      <div className="max-w-lg mx-auto text-center">
        
        {/* Persona Avatar */}
        <motion.div
          className="w-40 h-40 mx-auto mb-8 relative"
          animate={{
            scale: isPersonaSpeaking ? [1, 1.05, 1] : 1,
          }}
          transition={{
            duration: 0.8,
            repeat: isPersonaSpeaking ? Infinity : 0,
          }}
        >
          <div className="w-full h-full bg-gradient-to-br from-cyan-400 to-purple-500 rounded-full flex items-center justify-center shadow-2xl">
            <span className="text-white font-bold text-5xl">
              {persona.name.charAt(0)}
            </span>
          </div>
          
          {/* Speaking indicator */}
          <AnimatePresence>
            {isPersonaSpeaking && (
              <motion.div
                className="absolute -inset-3 border-4 border-cyan-400 rounded-full"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              />
            )}
          </AnimatePresence>
          
          {/* Listening indicator */}
          <AnimatePresence>
            {isListening && (
              <motion.div
                className="absolute -inset-4 border-3 border-red-400 rounded-full"
                animate={{ 
                  scale: [1, 1.1 + audioLevel * 0.5, 1],
                  opacity: [0.7, 1, 0.7]
                }}
                transition={{ duration: 0.5, repeat: Infinity }}
              />
            )}
          </AnimatePresence>
        </motion.div>

        {/* Persona Info */}
        <h2 className="text-4xl font-bold text-white mb-2">
          {persona.name}
        </h2>
        <p className="text-cyan-300 mb-8 text-xl">
          {persona.role}
        </p>

        {/* Speech Mode Indicator */}
        {useBrowserSpeech && (
          <div className="bg-blue-500/20 border border-blue-500 text-blue-300 px-4 py-2 rounded-lg mb-4 text-sm">
            🎤 Using Browser Speech Recognition (Quota-Free Mode)
          </div>
        )}

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="bg-red-500/20 border border-red-500 text-red-300 px-6 py-4 rounded-xl mb-6"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conversation Status */}
        <AnimatePresence mode="wait">
          {!conversationStarted ? (
            <motion.div
              key="start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <p className="text-gray-300 text-lg mb-8">
                Ready to have a natural voice conversation about "{idea}"
              </p>
              
              <motion.button
                onClick={startConversation}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white px-10 py-5 rounded-full font-bold text-xl shadow-xl"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                🎤 Start Voice Chat
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="conversation"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              
              {/* Voice Control Buttons */}
              <div className="flex justify-center items-center space-x-6">
                {/* Main voice button */}
                <motion.button
                  onClick={isListening ? stopListening : startListening}
                  disabled={isProcessing || isPersonaSpeaking}
                  className={`w-28 h-28 rounded-full font-bold text-2xl shadow-2xl transition-all duration-300 ${
                    isListening
                      ? 'bg-red-500 text-white scale-110'
                      : isProcessing
                      ? 'bg-yellow-500 text-white'
                      : isPersonaSpeaking
                      ? 'bg-gray-600 text-gray-300'
                      : 'bg-white text-gray-800 hover:bg-gray-100'
                  }`}
                  style={{
                    transform: isListening ? `scale(${1.1 + audioLevel * 0.3})` : undefined
                  }}
                  whileHover={!isListening && !isProcessing && !isPersonaSpeaking ? { scale: 1.05 } : {}}
                  whileTap={!isListening && !isProcessing && !isPersonaSpeaking ? { scale: 0.95 } : {}}
                >
                  {isProcessing ? '⏳' : isPersonaSpeaking ? '🔇' : isListening ? '🛑' : '🎤'}
                </motion.button>
                
                {/* Manual stop button (only when listening) */}
                <AnimatePresence>
                  {isListening && (
                    <motion.button
                      onClick={stopListening}
                      className="bg-orange-500 text-white px-6 py-3 rounded-full font-semibold shadow-lg hover:bg-orange-600 transition-colors"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Done Speaking
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              {/* Status Text */}
              <motion.div
                key={isPersonaSpeaking ? 'speaking' : isProcessing ? 'processing' : isListening ? 'listening' : 'ready'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <p className="text-gray-300 text-lg mb-2">
                  {isPersonaSpeaking
                    ? `${persona.name} is speaking...`
                    : isProcessing
                    ? 'Processing your message...'
                    : isListening
                    ? `Listening... ${useBrowserSpeech ? '(Browser Speech)' : '(Click 🛑 or "Done Speaking" when finished)'}`
                    : 'Click 🎤 to start speaking'
                  }
                </p>
                
                {/* Silence detection indicator */}
                {isListening && !useBrowserSpeech && (
                  <p className="text-sm text-cyan-400">
                    {silenceDetected ? 'Silence detected - stopping soon...' : 'Auto-stop after 3 seconds of silence'}
                  </p>
                )}
                
                {/* Audio level indicator */}
                {isListening && !useBrowserSpeech && (
                  <div className="w-64 mx-auto mt-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Audio Level</span>
                      <span>{Math.round(audioLevel * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <motion.div
                        className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${audioLevel * 100}%` }}
                        transition={{ duration: 0.1 }}
                      />
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Conversation Count */}
              {conversationHistory.length > 0 && (
                <p className="text-cyan-300 text-sm">
                  {Math.floor(conversationHistory.length / 2)} exchanges completed
                </p>
              )}

              {/* End Conversation */}
              <motion.button
                onClick={endConversation}
                className="bg-gray-700 text-gray-300 px-8 py-3 rounded-full font-medium hover:bg-gray-600 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                End Conversation & Analyze
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
} 