#!/usr/bin/env python3
"""
Test script for StepOne Backend API endpoints.
Run this to verify all functionality is working properly.
"""

import asyncio
import json
import httpx
from typing import Dict, Any

BASE_URL = "http://localhost:8000"

async def test_health():
    """Test health check endpoint."""
    print("🏥 Testing health check...")
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{BASE_URL}/health")
            if response.status_code == 200:
                print("✅ Health check passed")
                return True
            else:
                print(f"❌ Health check failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Health check error: {e}")
            return False

async def test_debug_env():
    """Test environment configuration."""
    print("\n🔧 Testing environment configuration...")
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{BASE_URL}/debug/env")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Environment check passed")
                print(f"   OpenAI Key: {'✅' if data['openai_key_present'] else '❌'}")
                print(f"   Claude Key: {'✅' if data['anthropic_key_present'] else '❌'}")
                print(f"   Perplexity Key: {'✅' if data['perplexity_key_present'] else '❌'}")
                print(f"   Groq Key: {'✅' if data['groq_key_present'] else '❌'}")
                return True
            else:
                print(f"❌ Environment check failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Environment check error: {e}")
            return False

async def test_personas():
    """Test persona generation."""
    print("\n👥 Testing persona generation...")
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(f"{BASE_URL}/personas", json={
                "idea": "CRM for freelancers",
                "target_segment": "creative freelancers"
            })
            if response.status_code == 200:
                data = response.json()
                personas = data.get("personas", [])
                print(f"✅ Persona generation passed - Generated {len(personas)} personas")
                if personas:
                    print(f"   Sample persona: {personas[0]['name']} - {personas[0]['role']}")
                return personas
            else:
                print(f"❌ Persona generation failed: {response.status_code}")
                print(f"   Error: {response.text}")
                return []
        except Exception as e:
            print(f"❌ Persona generation error: {e}")
            return []

async def test_interview(personas):
    """Test interview simulation."""
    print("\n🎤 Testing interview simulation...")
    if not personas:
        print("❌ No personas available for interview test")
        return None
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(f"{BASE_URL}/interview", json={
                "idea": "CRM for freelancers",
                "persona": personas[0],
                "conversation_history": [],
                "user_message": "What's your biggest challenge with client management?"
            })
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Interview simulation passed")
                print(f"   Persona response: {data['persona_response'][:100]}...")
                print(f"   Suggested questions: {len(data['suggested_questions'])}")
                return data
            else:
                print(f"❌ Interview simulation failed: {response.status_code}")
                print(f"   Error: {response.text}")
                return None
        except Exception as e:
            print(f"❌ Interview simulation error: {e}")
            return None

async def test_market_research():
    """Test market research."""
    print("\n📊 Testing market research...")
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            response = await client.post(f"{BASE_URL}/market-ai", json={
                "idea": "CRM for freelancers"
            })
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Market research passed")
                print(f"   Competitors found: {len(data['competitor_heatmap'])}")
                print(f"   Trends identified: {len(data['trends'])}")
                print(f"   Value propositions: {len(data['value_propositions'])}")
                return data
            else:
                print(f"❌ Market research failed: {response.status_code}")
                print(f"   Error: {response.text}")
                return None
        except Exception as e:
            print(f"❌ Market research error: {e}")
            return None

async def test_coach_ai():
    """Test coaching functionality."""
    print("\n🏆 Testing coach AI...")
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(f"{BASE_URL}/coach-ai", json={
                "idea": "CRM for freelancers",
                "conversation": [
                    "Founder: Don't you think our CRM would solve all your problems?",
                    "Persona: Well, I do have issues with client management...",
                    "Founder: How much would you pay for this amazing solution?",
                    "Persona: I'm not sure about pricing..."
                ]
            })
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Coach AI passed")
                print(f"   Key insights: {len(data['key_insights'])}")
                print(f"   Question biases detected: {len(data['question_biases'])}")
                return data
            else:
                print(f"❌ Coach AI failed: {response.status_code}")
                print(f"   Error: {response.text}")
                return None
        except Exception as e:
            print(f"❌ Coach AI error: {e}")
            return None

async def test_insights(personas):
    """Test insight extraction."""
    print("\n💡 Testing insight extraction...")
    if not personas:
        print("❌ No personas available for insight test")
        return None
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(f"{BASE_URL}/insights", json={
                "idea": "CRM for freelancers",
                "conversation_history": [
                    "Founder: What's your biggest challenge with client management?",
                    "Persona: I spend way too much time on invoicing and follow-ups. It's taking time away from my actual design work.",
                    "Founder: How do you currently handle this?",
                    "Persona: I use a mix of spreadsheets and manual reminders. It's not working well."
                ],
                "persona": personas[0]
            })
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Insight extraction passed")
                print(f"   Pain points: {len(data['pain_points'])}")
                print(f"   Objections: {len(data['objections'])}")
                print(f"   Key quotes: {len(data['key_quotes'])}")
                return data
            else:
                print(f"❌ Insight extraction failed: {response.status_code}")
                print(f"   Error: {response.text}")
                return None
        except Exception as e:
            print(f"❌ Insight extraction error: {e}")
            return None

async def test_export(insights, market_data):
    """Test export functionality."""
    print("\n📤 Testing export functionality...")
    if not insights or not market_data:
        print("❌ Missing data for export test")
        return None
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(f"{BASE_URL}/export", json={
                "idea": "CRM for freelancers",
                "insights": insights,
                "competitor_heatmap": market_data["competitor_heatmap"],
                "trends": market_data["trends"]
            })
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Export functionality passed")
                print(f"   Slide markdown generated: {len(data['slide_markdown'])} chars")
                print(f"   Email template generated: {len(data['email_template'])} chars")
                return data
            else:
                print(f"❌ Export functionality failed: {response.status_code}")
                print(f"   Error: {response.text}")
                return None
        except Exception as e:
            print(f"❌ Export functionality error: {e}")
            return None

async def test_orchestrator():
    """Test orchestrator functionality."""
    print("\n🎭 Testing orchestrator...")
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            # Test persona generation step
            response = await client.post(f"{BASE_URL}/orchestrator", json={
                "idea": "CRM for freelancers",
                "step": "personas",
                "data": {}
            })
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Orchestrator (personas) passed")
                print(f"   Step: {data['step']}")
                print(f"   Next step: {data['next_step']}")
                print(f"   Progress: {data['progress']}")
                return True
            else:
                print(f"❌ Orchestrator failed: {response.status_code}")
                print(f"   Error: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Orchestrator error: {e}")
            return False

async def run_all_tests():
    """Run all API tests."""
    print("🚀 Starting StepOne Backend API Tests\n")
    print("="*50)
    
    # Basic connectivity tests
    health_ok = await test_health()
    env_ok = await test_debug_env()
    
    if not health_ok:
        print("\n❌ Basic connectivity failed. Check if server is running.")
        return
    
    # Core functionality tests
    personas = await test_personas()
    interview_data = await test_interview(personas)
    market_data = await test_market_research()
    coach_data = await test_coach_ai()
    insights = await test_insights(personas)
    export_data = await test_export(insights, market_data)
    orchestrator_ok = await test_orchestrator()
    
    # Summary
    print("\n" + "="*50)
    print("📋 TEST SUMMARY")
    print("="*50)
    
    tests = [
        ("Health Check", health_ok),
        ("Environment", env_ok),
        ("Persona Generation", bool(personas)),
        ("Interview Simulation", bool(interview_data)),
        ("Market Research", bool(market_data)),
        ("Coach AI", bool(coach_data)),
        ("Insight Extraction", bool(insights)),
        ("Export Functionality", bool(export_data)),
        ("Orchestrator", orchestrator_ok)
    ]
    
    passed = sum(1 for _, result in tests if result)
    total = len(tests)
    
    for test_name, result in tests:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:<20} {status}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Your API is ready to use.")
    else:
        print("⚠️  Some tests failed. Check the error messages above.")

if __name__ == "__main__":
    asyncio.run(run_all_tests()) 