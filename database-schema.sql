-- ValidateAI Database Schema
-- Run this in Supabase SQL Editor to set up validation tracking

-- Validations table
CREATE TABLE IF NOT EXISTS validations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  idea TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'in_progress',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Personas table
CREATE TABLE IF NOT EXISTS personas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  validation_id UUID REFERENCES validations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(255) NOT NULL,
  demographics TEXT,
  pain_points JSONB DEFAULT '[]',
  goals JSONB DEFAULT '[]',
  personality_traits JSONB DEFAULT '[]',
  communication_style TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  validation_id UUID REFERENCES validations(id) ON DELETE CASCADE,
  persona_name VARCHAR(255),
  role VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  sequence_number INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insights table
CREATE TABLE IF NOT EXISTS insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  validation_id UUID REFERENCES validations(id) ON DELETE CASCADE,
  key_insights JSONB DEFAULT '[]',
  question_biases JSONB DEFAULT '[]',
  pain_points JSONB DEFAULT '[]',
  objections JSONB DEFAULT '[]',
  willingness_to_pay TEXT,
  feature_requests JSONB DEFAULT '[]',
  key_quotes JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Market analysis table
CREATE TABLE IF NOT EXISTS market_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  validation_id UUID REFERENCES validations(id) ON DELETE CASCADE,
  competitor_heatmap JSONB DEFAULT '[]',
  trends JSONB DEFAULT '[]',
  value_propositions JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Coaching sessions table
CREATE TABLE IF NOT EXISTS coaching_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_type VARCHAR(50) NOT NULL,
  topic VARCHAR(255),
  content JSONB,
  recommendations JSONB DEFAULT '[]',
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for validations
CREATE POLICY "Users can view own validations" ON validations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own validations" ON validations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own validations" ON validations FOR UPDATE USING (auth.uid() = user_id);

-- Create policies for personas
CREATE POLICY "Users can view own personas" ON personas FOR SELECT USING (
  auth.uid() = (SELECT user_id FROM validations WHERE id = validation_id)
);
CREATE POLICY "Users can insert own personas" ON personas FOR INSERT WITH CHECK (
  auth.uid() = (SELECT user_id FROM validations WHERE id = validation_id)
);

-- Create policies for conversations
CREATE POLICY "Users can view own conversations" ON conversations FOR SELECT USING (
  auth.uid() = (SELECT user_id FROM validations WHERE id = validation_id)
);
CREATE POLICY "Users can insert own conversations" ON conversations FOR INSERT WITH CHECK (
  auth.uid() = (SELECT user_id FROM validations WHERE id = validation_id)
);

-- Create policies for insights
CREATE POLICY "Users can view own insights" ON insights FOR SELECT USING (
  auth.uid() = (SELECT user_id FROM validations WHERE id = validation_id)
);
CREATE POLICY "Users can insert own insights" ON insights FOR INSERT WITH CHECK (
  auth.uid() = (SELECT user_id FROM validations WHERE id = validation_id)
);

-- Create policies for market analysis
CREATE POLICY "Users can view own market analysis" ON market_analysis FOR SELECT USING (
  auth.uid() = (SELECT user_id FROM validations WHERE id = validation_id)
);
CREATE POLICY "Users can insert own market analysis" ON market_analysis FOR INSERT WITH CHECK (
  auth.uid() = (SELECT user_id FROM validations WHERE id = validation_id)
);

-- Create policies for coaching sessions
CREATE POLICY "Users can view own coaching sessions" ON coaching_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own coaching sessions" ON coaching_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own coaching sessions" ON coaching_sessions FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_validations_user_id ON validations(user_id);
CREATE INDEX IF NOT EXISTS idx_validations_created_at ON validations(created_at);
CREATE INDEX IF NOT EXISTS idx_personas_validation_id ON personas(validation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_validation_id ON conversations(validation_id);
CREATE INDEX IF NOT EXISTS idx_insights_validation_id ON insights(validation_id);
CREATE INDEX IF NOT EXISTS idx_market_analysis_validation_id ON market_analysis(validation_id);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_user_id ON coaching_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_created_at ON coaching_sessions(created_at); 