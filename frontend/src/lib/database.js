import { supabase } from './supabase';

// Database service for validation tracking
export class ValidationDatabase {
  
  // Save a complete validation session
  static async saveValidation(userId, validationData) {
    try {
      // Validate inputs
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      if (!validationData || !validationData.idea) {
        throw new Error('Validation data and idea are required');
      }
      
      console.log('🔄 Saving validation to Supabase...');
      console.log('User ID:', userId);
      console.log('Supabase client:', supabase ? 'Connected' : 'Not connected');
      
      // Insert main validation record
      const { data: validation, error: validationError } = await supabase
        .from('validations')
        .insert({
          user_id: userId,
          idea: validationData.idea,
          status: validationData.status || 'completed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (validationError) {
        console.error('❌ Validation insert error:', validationError);
        throw new Error(`Failed to save validation: ${validationError.message || validationError.code || 'Unknown error'}`);
      }
      
      if (!validation) {
        throw new Error('No validation data returned from database');
      }
      
      console.log('✅ Main validation saved:', validation.id);

      // Save personas
      if (validationData.personas && validationData.personas.length > 0) {
        console.log('💾 Saving personas...');
        const personaRecords = validationData.personas.map(persona => ({
          validation_id: validation.id,
          name: persona.name,
          role: persona.role,
          demographics: persona.demographics,
          pain_points: persona.pain_points,
          goals: persona.goals,
          personality_traits: persona.personality_traits,
          communication_style: persona.communication_style
        }));

        const { error: personasError } = await supabase
          .from('personas')
          .insert(personaRecords);

        if (personasError) {
          console.error('❌ Personas insert error:', personasError);
          throw new Error(`Failed to save personas: ${personasError.message || personasError.code}`);
        }
        console.log('✅ Personas saved');
      }

      // Save conversation history
      if (validationData.conversationHistory && validationData.conversationHistory.length > 0) {
        console.log('💾 Saving conversation history...');
        const conversationRecords = validationData.conversationHistory.map((message, index) => ({
          validation_id: validation.id,
          persona_name: validationData.selectedPersona?.name || 'Unknown',
          role: message.role,
          message: message.message,
          sequence_number: index,
          timestamp: new Date().toISOString()
        }));

        const { error: conversationError } = await supabase
          .from('conversations')
          .insert(conversationRecords);

        if (conversationError) {
          console.error('❌ Conversation insert error:', conversationError);
          throw new Error(`Failed to save conversation: ${conversationError.message || conversationError.code}`);
        }
        console.log('✅ Conversation history saved');
      }

      // Save insights
      if (validationData.insights) {
        console.log('💾 Saving insights...');
        const { error: insightsError } = await supabase
          .from('insights')
          .insert({
            validation_id: validation.id,
            key_insights: validationData.insights.key_insights || [],
            question_biases: validationData.insights.question_biases || [],
            pain_points: validationData.insights.pain_points || [],
            objections: validationData.insights.objections || [],
            willingness_to_pay: validationData.insights.willingness_to_pay || '',
            feature_requests: validationData.insights.feature_requests || [],
            key_quotes: validationData.insights.key_quotes || []
          });

        if (insightsError) {
          console.error('❌ Insights insert error:', insightsError);
          throw new Error(`Failed to save insights: ${insightsError.message || insightsError.code}`);
        }
        console.log('✅ Insights saved');
      }

      // Save market analysis
      if (validationData.marketAnalysis) {
        console.log('💾 Saving market analysis...');
        const { error: marketError } = await supabase
          .from('market_analysis')
          .insert({
            validation_id: validation.id,
            competitor_heatmap: validationData.marketAnalysis.competitor_heatmap || [],
            trends: validationData.marketAnalysis.trends || [],
            value_propositions: validationData.marketAnalysis.value_propositions || []
          });

        if (marketError) {
          console.error('❌ Market analysis insert error:', marketError);
          throw new Error(`Failed to save market analysis: ${marketError.message || marketError.code}`);
        }
        console.log('✅ Market analysis saved');
      }

      console.log('🎉 All validation data saved successfully!');
      return { success: true, validation };
    } catch (error) {
      console.error('💥 Error saving validation:', error);
      return { success: false, error: error.message || 'Unknown error occurred' };
    }
  }

  // Get all validations for a user
  static async getUserValidations(userId, limit = 10) {
    try {
      const { data, error } = await supabase
        .from('validations')
        .select(`
          *,
          personas(*),
          insights(*),
          market_analysis(*),
          conversations(count)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return { success: true, validations: data };
    } catch (error) {
      console.error('Error fetching validations:', error);
      return { success: false, error: error.message };
    }
  }

  // Get a specific validation with all related data
  static async getValidationById(validationId, userId) {
    try {
      const { data, error } = await supabase
        .from('validations')
        .select(`
          *,
          personas(*),
          insights(*),
          market_analysis(*),
          conversations(*)
        `)
        .eq('id', validationId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      return { success: true, validation: data };
    } catch (error) {
      console.error('Error fetching validation:', error);
      return { success: false, error: error.message };
    }
  }

  // Get validation statistics for a user
  static async getUserStats(userId) {
    try {
      const [validationsResult, conversationsResult, insightsResult] = await Promise.all([
        supabase
          .from('validations')
          .select('id, created_at, status')
          .eq('user_id', userId),
        
        supabase
          .from('conversations')
          .select('id, validation_id')
          .in('validation_id', 
            (await supabase.from('validations').select('id').eq('user_id', userId)).data?.map(v => v.id) || []
          ),
        
        supabase
          .from('insights')
          .select('question_biases')
          .in('validation_id',
            (await supabase.from('validations').select('id').eq('user_id', userId)).data?.map(v => v.id) || []
          )
      ]);

      const validations = validationsResult.data || [];
      const conversations = conversationsResult.data || [];
      const insights = insightsResult.data || [];

      const totalBiases = insights.reduce((sum, insight) => 
        sum + (insight.question_biases?.length || 0), 0
      );

      const stats = {
        totalValidations: validations.length,
        totalConversations: conversations.length,
        totalBiasesDetected: totalBiases,
        completedValidations: validations.filter(v => v.status === 'completed').length,
        averageValidationsPerMonth: this.calculateMonthlyAverage(validations),
        recentActivity: validations.slice(0, 5).map(v => ({
          id: v.id,
          date: v.created_at,
          status: v.status
        }))
      };

      return { success: true, stats };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return { success: false, error: error.message };
    }
  }

  // Save coaching session data
  static async saveCoachingSession(userId, sessionData) {
    try {
      const { data, error } = await supabase
        .from('coaching_sessions')
        .insert({
          user_id: userId,
          session_type: sessionData.type,
          topic: sessionData.topic,
          content: sessionData.content,
          recommendations: sessionData.recommendations || [],
          completed: sessionData.completed || false,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, session: data };
    } catch (error) {
      console.error('Error saving coaching session:', error);
      return { success: false, error: error.message };
    }
  }

  // Get coaching sessions for a user
  static async getCoachingSessions(userId, limit = 10) {
    try {
      const { data, error } = await supabase
        .from('coaching_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return { success: true, sessions: data };
    } catch (error) {
      console.error('Error fetching coaching sessions:', error);
      return { success: false, error: error.message };
    }
  }

  // Helper function to calculate monthly average
  static calculateMonthlyAverage(validations) {
    if (validations.length === 0) return 0;
    
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    
    const recentValidations = validations.filter(v => 
      new Date(v.created_at) >= sixMonthsAgo
    );
    
    return Math.round(recentValidations.length / 6 * 10) / 10;
  }

  // Initialize database tables (run once)
  static async initializeTables() {
    // This would typically be done via Supabase SQL editor or migrations
    // Including here for reference
    const sqlCommands = `
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

      -- Create policies
      CREATE POLICY "Users can view own validations" ON validations FOR SELECT USING (auth.uid() = user_id);
      CREATE POLICY "Users can insert own validations" ON validations FOR INSERT WITH CHECK (auth.uid() = user_id);
      CREATE POLICY "Users can update own validations" ON validations FOR UPDATE USING (auth.uid() = user_id);

      CREATE POLICY "Users can view own personas" ON personas FOR SELECT USING (
        auth.uid() = (SELECT user_id FROM validations WHERE id = validation_id)
      );
      CREATE POLICY "Users can insert own personas" ON personas FOR INSERT WITH CHECK (
        auth.uid() = (SELECT user_id FROM validations WHERE id = validation_id)
      );

      CREATE POLICY "Users can view own conversations" ON conversations FOR SELECT USING (
        auth.uid() = (SELECT user_id FROM validations WHERE id = validation_id)
      );
      CREATE POLICY "Users can insert own conversations" ON conversations FOR INSERT WITH CHECK (
        auth.uid() = (SELECT user_id FROM validations WHERE id = validation_id)
      );

      CREATE POLICY "Users can view own insights" ON insights FOR SELECT USING (
        auth.uid() = (SELECT user_id FROM validations WHERE id = validation_id)
      );
      CREATE POLICY "Users can insert own insights" ON insights FOR INSERT WITH CHECK (
        auth.uid() = (SELECT user_id FROM validations WHERE id = validation_id)
      );

      CREATE POLICY "Users can view own market analysis" ON market_analysis FOR SELECT USING (
        auth.uid() = (SELECT user_id FROM validations WHERE id = validation_id)
      );
      CREATE POLICY "Users can insert own market analysis" ON market_analysis FOR INSERT WITH CHECK (
        auth.uid() = (SELECT user_id FROM validations WHERE id = validation_id)
      );

      CREATE POLICY "Users can view own coaching sessions" ON coaching_sessions FOR SELECT USING (auth.uid() = user_id);
      CREATE POLICY "Users can insert own coaching sessions" ON coaching_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
      CREATE POLICY "Users can update own coaching sessions" ON coaching_sessions FOR UPDATE USING (auth.uid() = user_id);
    `;

    console.log('Database schema:', sqlCommands);
    return sqlCommands;
  }
} 