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
  const [lastTranscript, setLastTranscript] = useState(''); // Track last processed transcript
  
  const mediaRecorder = useRef(null);
  const audioStream = useRef(null);
  const audioContext = useRef(null);
  const analyser = useRef(null);
  const animationFrame = useRef(null);
  const silenceTimer = useRef(null);
  const audioChunks = useRef([]);
  const speechRecognition = useRef(null);
  const isProcessingRef = useRef(false);
  
  // Silence detection parameters - increased for more natural conversation
  const SILENCE_THRESHOLD = 0.01;
  const SILENCE_DURATION = 6000; // Increased from 3000ms to 6000ms (6 seconds)

  // Initialize audio context and speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
      
      // Initialize browser speech recognition as backup
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        speechRecognition.current = new SpeechRecognition();
        speechRecognition.current.continuous = false; // Changed back to false to prevent multiple triggers
        speechRecognition.current.interimResults = false; // Changed back to false to only get final results
        speechRecognition.current.lang = 'en-US';
        speechRecognition.current.maxAlternatives = 1;
        
        speechRecognition.current.onresult = (event) => {
          // Get the final result
          const lastResult = event.results[event.results.length - 1];
          if (lastResult.isFinal) {
            const transcript = lastResult[0].transcript.trim();
            if (transcript.length > 0) {
              console.log('Speech recognition final result:', transcript);
              
              // Stop recognition immediately to prevent multiple triggers
              try {
                speechRecognition.current.stop();
              } catch (e) {
                // Ignore errors when stopping
              }
              
              handleSpeechResult(transcript);
            }
          }
        };
        
        speechRecognition.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          
          // Don't show error for common interruptions
          if (event.error !== 'aborted' && event.error !== 'no-speech') {
            setError('Speech recognition had an issue. Please try again.');
          }
          
          setIsListening(false);
          isProcessingRef.current = false;
          setIsProcessing(false);
        };
        
        speechRecognition.current.onend = () => {
          console.log('Speech recognition ended');
          setIsListening(false);
          
          // Don't automatically restart - wait for user to click again
        };
        
        speechRecognition.current.onstart = () => {
          console.log('Speech recognition started');
          setIsListening(true);
        };
        
        speechRecognition.current.onnomatch = () => {
          console.log('No speech was recognized');
          setIsListening(false);
        };
        
        speechRecognition.current.onspeechstart = () => {
          console.log('Speech started - user is speaking');
        };
        
        speechRecognition.current.onspeechend = () => {
          console.log('Speech ended - processing final result');
          // Don't immediately stop - let it process final results
        };
      }
    }
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    // Reset processing state
    isProcessingRef.current = false;
    
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

  // Handle speech recognition result (browser-based)
  const handleSpeechResult = async (transcript) => {
    if (isProcessingRef.current) {
      console.log('Already processing, ignoring duplicate speech result');
      return;
    }
    
    // Check for duplicate transcript
    if (transcript === lastTranscript) {
      console.log('Duplicate transcript detected, ignoring:', transcript);
      return;
    }
    
    // Check for very short or meaningless transcripts
    if (transcript.length < 3 || transcript.toLowerCase().trim() === 'uh' || transcript.toLowerCase().trim() === 'um') {
      console.log('Ignoring short/meaningless transcript:', transcript);
      return;
    }
    
    try {
      isProcessingRef.current = true;
      setIsProcessing(true);
      setError('');
      setLastTranscript(transcript); // Store this transcript to prevent duplicates
      
      console.log('Processing user speech:', transcript);
      
      const userMessage = { role: 'user', message: transcript };
      const updatedHistory = [...conversationHistory, userMessage];
      setConversationHistory(updatedHistory);
      
      const personaResponse = await generatePersonaResponse(transcript, updatedHistory);
      
      const personaMessage = { role: 'persona', message: personaResponse };
      const finalHistory = [...updatedHistory, personaMessage];
      setConversationHistory(finalHistory);
      
      await speakPersonaResponse(personaResponse);
      
    } catch (error) {
      console.error('Speech processing error:', error);
      setError('Failed to process your message. Please try again.');
      await speakPersonaResponse("I'm sorry, I didn't catch that. Could you repeat what you said?");
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  };

  // Generate persona response using backend
  const generatePersonaResponse = async (userMessage, history) => {
    try {
      console.log('Generating persona response for:', userMessage);
      
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
        console.log('Backend response:', data.persona_response);
        return data.persona_response;
      } else {
        console.error('Backend API error:', response.status, response.statusText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Backend API failed, using fallback response:', error);
      
      // Fallback persona response based on user message - make it realistic and skeptical
      const role = persona.role.toLowerCase();
      const name = persona.name;
      const userLower = userMessage.toLowerCase();
      
      // Check for leading questions - respond skeptically
      if (userLower.includes("don't you think") || userLower.includes("wouldn't you") || userLower.includes("surely you")) {
        const skepticalResponses = [
          "I mean, I'm not sure about that...",
          "Not necessarily, no.",
          "I guess it depends.",
          "That's not really how I see it."
        ];
        return skepticalResponses[Math.floor(Math.random() * skepticalResponses.length)];
      }
      
      // Check for vague questions
      if ((userLower.includes("what do you think") || userLower.includes("tell me about")) && userMessage.split(' ').length < 8) {
        const vageResponses = [
          "About what specifically?",
          "Can you be more specific?",
          "It depends on what you mean.",
          "I don't really have strong opinions on that."
        ];
        return vageResponses[Math.floor(Math.random() * vageResponses.length)];
      }
      
      if (userLower.includes('hello') || userLower.includes('hi')) {
        return `Hi. I'm ${name}. What's this about?`;
      } else if (userLower.includes('problem') || userLower.includes('challenge')) {
        const painPoint = persona.pain_points[0] || 'some challenges';
        return `Yeah, I deal with ${painPoint} sometimes. Why?`;
      } else if (userLower.includes('price') || userLower.includes('cost')) {
        return `Depends what I'm getting for it. What's the value?`;
      } else {
        const neutralResponses = [
          "I'm not sure I follow. Can you explain?",
          "Okay... and?",
          "I guess. What's your point?",
          "I mean, maybe. I'd need to understand more."
        ];
        return neutralResponses[Math.floor(Math.random() * neutralResponses.length)];
      }
    }
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
      await speakPersonaResponse(greeting);
      
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
      
      // Prevent starting if already processing
      if (isProcessingRef.current || isListening) {
        console.log('Already listening or processing, ignoring start request');
        return;
      }
      
      // Try browser speech recognition first (more reliable)
      if (speechRecognition.current) {
        console.log('Starting browser speech recognition');
        setUseBrowserSpeech(true);
        
        // Stop any existing recognition first
        try {
          speechRecognition.current.stop();
        } catch (e) {
          // Ignore errors when stopping
        }
        
        // Start new recognition
        speechRecognition.current.start();
        // setIsListening will be set by onstart event
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
    console.log('Stopping listening...');
    
    if (useBrowserSpeech && speechRecognition.current) {
      try {
        speechRecognition.current.stop();
      } catch (e) {
        console.log('Error stopping speech recognition:', e);
      }
      setUseBrowserSpeech(false);
    } else if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop();
    }
    
    if (audioStream.current) {
      audioStream.current.getTracks().forEach(track => track.stop());
    }
    
    setIsListening(false);
    
    // Only set processing for non-browser speech (legacy recording method)
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
            await speakPersonaResponse(data.persona_response, data.persona_audio_url);
          } else {
            await speakPersonaResponse(data.persona_response);
          }
          
        } catch (error) {
          console.error('Voice processing error:', error);
          setError('API quota exceeded. Using browser speech recognition...');
          // Switch to browser speech recognition for future interactions
          setUseBrowserSpeech(true);
          await speakPersonaResponse("I'm sorry, I had trouble understanding that. Could you try speaking again?");
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

  // Speak persona response with better voice quality
  const speakPersonaResponse = async (text, useServerAudio = null) => {
    if (isPersonaSpeaking) return;
    
    setIsPersonaSpeaking(true);
    
    try {
      // If server provided audio, use that first
      if (useServerAudio) {
        const audio = new Audio(useServerAudio);
        audio.onended = () => setIsPersonaSpeaking(false);
        audio.onerror = () => {
          console.log('Server audio failed, falling back to browser TTS');
          speakWithBrowserTTS(text);
        };
        await audio.play();
        return;
      }
      
      // Otherwise use enhanced browser TTS
      speakWithBrowserTTS(text);
      
    } catch (error) {
      console.error('Error playing persona response:', error);
      setIsPersonaSpeaking(false);
    }
  };

  const speakWithBrowserTTS = (text) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      speechSynthesis.cancel();
      
      // Pre-process text for more natural speech
      const processedText = makeTextMoreNatural(text);
      
      const utterance = new SpeechSynthesisUtterance(processedText);
      
      // Enhanced voice selection based on persona
      const voices = speechSynthesis.getVoices();
      const personaVoice = selectBestBrowserVoice(voices, persona);
      
      if (personaVoice) {
        utterance.voice = personaVoice;
      }
      
      // Optimized settings for natural conversation
      utterance.rate = 0.85;  // Slightly slower for more natural pace
      utterance.pitch = personaVoice?.name.includes('Female') || personaVoice?.name.includes('Woman') ? 1.1 : 0.9;
      utterance.volume = 0.9;
      
      utterance.onend = () => {
        setIsPersonaSpeaking(false);
      };
      
      utterance.onerror = (error) => {
        console.error('Browser TTS error:', error);
        setIsPersonaSpeaking(false);
      };
      
      speechSynthesis.speak(utterance);
    } else {
      setIsPersonaSpeaking(false);
    }
  };

  const makeTextMoreNatural = (text) => {
    // Add natural pauses and emphasis for better TTS
    let processed = text;
    
    // Add pauses for natural speech rhythm
    processed = processed.replace(/\. /g, '... ');
    processed = processed.replace(/, /g, ', ');
    
    // Emphasize conversational words
    processed = processed.replace(/\bI mean\b/g, 'I mean,');
    processed = processed.replace(/\bI guess\b/g, 'I guess,');
    processed = processed.replace(/\bYeah\b/g, 'Yeah,');
    processed = processed.replace(/\bWell\b/g, 'Well,');
    processed = processed.replace(/\bSo\b/g, 'So,');
    
    // Make questions more natural
    processed = processed.replace(/\?/g, '?');
    
    return processed;
  };

  const selectBestBrowserVoice = (voices, persona) => {
    if (!voices.length) return null;
    
    const name = persona.name.toLowerCase();
    const demographics = persona.demographics.toLowerCase();
    
    // Prefer high-quality voices
    const highQualityVoices = voices.filter(voice => 
      voice.name.includes('Premium') || 
      voice.name.includes('Enhanced') ||
      voice.name.includes('Neural') ||
      voice.localService === false // Cloud-based voices are usually better
    );
    
    const voicesToSearch = highQualityVoices.length > 0 ? highQualityVoices : voices;
    
    // Gender-based voice selection with better matching
    const femaleNames = ['sarah', 'emma', 'maria', 'jennifer', 'lisa', 'anna', 'kate', 'amy', 'rachel', 'jessica'];
    const maleNames = ['marcus', 'john', 'mike', 'david', 'alex', 'chris', 'james', 'robert', 'michael', 'daniel'];
    
    let preferredGender = 'female';
    if (maleNames.some(maleName => name.includes(maleName))) {
      preferredGender = 'male';
    }
    
    // Find the best voice match
    const genderVoices = voicesToSearch.filter(voice => {
      const voiceName = voice.name.toLowerCase();
      if (preferredGender === 'female') {
        return voiceName.includes('female') || voiceName.includes('woman') || 
               voiceName.includes('samantha') || voiceName.includes('victoria') ||
               voiceName.includes('karen') || voiceName.includes('susan');
      } else {
        return voiceName.includes('male') || voiceName.includes('man') ||
               voiceName.includes('alex') || voiceName.includes('daniel') ||
               voiceName.includes('tom') || voiceName.includes('fred');
      }
    });
    
    // Prefer US English voices for consistency
    const englishVoices = genderVoices.filter(voice => 
      voice.lang.startsWith('en-US') || voice.lang.startsWith('en-GB')
    );
    
    return englishVoices[0] || genderVoices[0] || voicesToSearch[0];
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
                      className={`${useBrowserSpeech 
                        ? 'bg-green-500 text-white px-8 py-4 rounded-full font-bold text-lg shadow-xl hover:bg-green-600' 
                        : 'bg-orange-500 text-white px-6 py-3 rounded-full font-semibold shadow-lg hover:bg-orange-600'
                      } transition-colors`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {useBrowserSpeech ? '✅ Done Speaking' : 'Done Speaking'}
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
                    ? `🎤 I'm listening... ${useBrowserSpeech ? '(Take your time - click "Done" when finished)' : '(Auto-stop after 6 seconds of silence)'}`
                    : 'Click 🎤 to start speaking'
                  }
                </p>
                
                {/* Enhanced listening feedback for browser speech */}
                {isListening && useBrowserSpeech && (
                  <div className="bg-blue-500/20 border border-blue-400 rounded-lg p-4 mt-4">
                    <p className="text-blue-300 text-sm mb-2">
                      🎯 Listening with Browser Speech Recognition
                    </p>
                    <p className="text-blue-200 text-xs">
                      Speak naturally - I'll wait for you to finish. Click "Done Speaking" when you're finished talking.
                    </p>
                  </div>
                )}
                
                {/* Silence detection indicator */}
                {isListening && !useBrowserSpeech && (
                  <p className="text-sm text-cyan-400">
                    {silenceDetected ? 'Silence detected - stopping soon...' : 'Auto-stop after 6 seconds of silence'}
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