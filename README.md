# UC_Berkeley_Hackathon-2025

## Introduction

Over 90% of startups fail, with the lack of market need cited as the #1 reason for failure (CB Insights, 2018). At the heart of this issue is a broken or non-existent customer discovery process. Despite the popularity of frameworks like Lean Startup, most founders still struggle with the how of effective customer interviews.

We recognized that founders often enter interviews with biases, ask leading questions, and hear only what they want to hear. As a result, they build products based on assumptions—not reality. According to Batova et al. (2016), this overconfidence and lack of qualitative rigor in lean startup customer discovery creates a "validation void" that can doom ventures early.

So, we set out to build something that could help.

## What it does

Our solution is an AI-powered Customer Discovery Agent—a smart, interactive platform that simulates real customer conversations. Founders can pitch their ideas to diverse AI personas (like Sarah, a single mom), engage in guided interviews, and receive real-time analysis of pain points, competitive threats, and unmet needs.

**Our Three-Step Approach**

1. Pitch Your Idea: Founders describe their startup idea and select relevant personas.

2. Practice Interviews: Natural language interviews help founders learn to ask open-ended, unbiased questions.

3. Insights & Feedback: A reasoning agent provides an instant summary of key insights, highlights areas of concern, and offers suggestions for better questioning.

This is more than just practice—it's a training ground that replicates real discovery conditions, while helping founders break out of their confirmation bias loops.

## How to run the code

**Run frontend**

  1. npm install 
  2. npm run dev

**Run backend**

  Make sure you have python and pip installed
  
  1. cd backend
  
  2. Install required libraries:
  
    fastapi==0.109.2<br>
    httpx==0.26.0<br>
    uvicorn==0.27.1<br>
    python-dotenv==1.0.1<br>
    pydantic==2.5.3<br>
    fastapi[standard]<br>
    protobuf<3.20,>=3.9.2<br>
    openai-whisper==20231117<br>
    torch==2.2.0<br>
    torchaudio==2.2.0<br>
    python-multipart==0.0.9  # For handling file uploads <br>
    numpy<1.26.0,>=1.18.5<br>
    google-auth-oauthlib<0.5,>=0.4.1<br>
  
  **Or** you can run this command directly: pip install -r requirements.txt

3. To run server, use command

  fastapi run main.py
