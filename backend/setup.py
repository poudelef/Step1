#!/usr/bin/env python3
"""
Setup script for StepOne Backend
"""

import subprocess
import sys
import os

def run_command(command, description):
    """Run a shell command and handle errors."""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed: {e.stderr}")
        return None

def main():
    print("🚀 Setting up StepOne Backend...")
    
    # Check if we're in the backend directory
    if not os.path.exists('main.py'):
        print("❌ Please run this script from the backend directory")
        sys.exit(1)
    
    # Install dependencies
    run_command("pip install -r requirements.txt", "Installing Python dependencies")
    
    # Create .env file if it doesn't exist
    if not os.path.exists('.env'):
        print("📝 Creating .env file...")
        with open('.env', 'w') as f:
            f.write("""# API Keys for AI Services
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
PERPLEXITY_API_KEY=your_perplexity_api_key_here

# FastAPI Settings
ENVIRONMENT=development
DEBUG=True
""")
        print("✅ Created .env file - please add your API keys!")
    else:
        print("✅ .env file already exists")
    
    print("\n🎉 Backend setup complete!")
    print("\n📋 Next steps:")
    print("1. Add your API keys to the .env file")
    print("2. Run: python main.py")
    print("3. Backend will be available at http://localhost:8000")

if __name__ == "__main__":
    main() 