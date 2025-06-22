#!/usr/bin/env python3
"""
Demo script for testing voice-only interview functionality.
Run this to see how the voice AI persona works.
"""

import asyncio
import json
from main import app, call_groq, synthesize_speech

async def demo_voice_conversation():
    """Demo a voice conversation with a persona."""
    
    # Demo persona
    persona = {
        "name": "Sarah Chen",
        "role": "Freelance Graphic Designer",
        "demographics": "28, San Francisco, 5 years experience",
        "pain_points": ["Manual invoice tracking", "Client follow-ups", "Project organization"],
        "goals": ["Streamline workflow", "Focus on creative work", "Get paid faster"],
        "personality_traits": ["Detail-oriented", "Creative", "Slightly disorganized"],
        "communication_style": "Friendly but professional, prefers visual examples"
    }
    
    print(f"🎤 Starting voice demo with {persona['name']}")
    print(f"📝 Role: {persona['role']}")
    print(f"💭 Style: {persona['communication_style']}")
    print("\n" + "="*50)
    
    # Simulate conversation
    user_messages = [
        "Hi Sarah! Tell me about your biggest challenge with client management.",
        "How do you currently handle invoicing?",
        "What would make your workflow better?",
        "Would you pay for a tool that solved this?"
    ]
    
    for user_msg in user_messages:
        print(f"\n👤 Founder: {user_msg}")
        
        # Generate persona response
        system_prompt = f"""You are {persona['name']}, a {persona['role']}.
        
        You're in a natural voice conversation about a startup idea. 
        Respond naturally as if speaking, using conversational speech patterns.
        Keep responses concise (1-2 sentences max) and authentic.
        Show emotion and personality in your responses.
        
        Your background:
        - Pain points: {', '.join(persona['pain_points'])}
        - Goals: {', '.join(persona['goals'])}
        - Style: {persona['communication_style']}
        """
        
        prompt = f"The founder just said: '{user_msg}'. Respond naturally as {persona['name']}."
        
        try:
            # Get response from Groq
            response = await call_groq(prompt, system_prompt)
            print(f"🎙️  {persona['name']}: {response}")
            
            # Generate speech (for demo, we'll just show it would be synthesized)
            print(f"🔊 [Audio would be synthesized here]")
            
        except Exception as e:
            print(f"❌ Error: {e}")
        
        print("-" * 30)
    
    print("\n🎉 Demo conversation completed!")
    print("\nThis shows how the voice-only interview would work:")
    print("✅ Natural conversational responses")
    print("✅ Persona stays in character")
    print("✅ No text visible to user - pure voice")
    print("✅ Fast response times with Groq")

if __name__ == "__main__":
    asyncio.run(demo_voice_conversation()) 