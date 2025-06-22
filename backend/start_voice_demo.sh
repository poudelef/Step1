#!/bin/bash

echo "🚀 Starting ValidateAI Voice-Only Demo"
echo "======================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating example..."
    cat > .env << EOF
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
PERPLEXITY_API_KEY=your_perplexity_key_here
GROQ_API_KEY=your_groq_key_here
EOF
    echo "📝 Please add your API keys to the .env file and run again"
    exit 1
fi

# Install requirements
echo "📦 Installing requirements..."
pip3 install -r requirements.txt

echo ""
echo "🎤 VOICE-ONLY INTERVIEW DEMO"
echo "============================="
echo ""
echo "This demo shows how the voice AI persona works:"
echo "✅ Pure voice-to-voice conversation"
echo "✅ No text interface - feels like talking to a real person"
echo "✅ Natural, spontaneous responses"
echo "✅ Fast AI responses using Groq"
echo "✅ Speech synthesis for persona voice"
echo ""
echo "To run the full system:"
echo "1. Start backend: python3 main.py"
echo "2. Start frontend: cd ../frontend && npm run dev"
echo "3. Go to: http://localhost:3000/validate"
echo ""
echo "For now, here's a text demo of the conversation:"
echo ""

# Run the demo
python3 demo_voice.py

echo ""
echo "🎉 Demo complete!"
echo ""
echo "The actual voice interface will be:"
echo "• Minimalist UI - just a microphone button"
echo "• Real-time voice recognition"
echo "• Instant AI persona responses"
echo "• Natural conversation flow"
echo "• No text anywhere - pure voice experience" 