import { ValidationDatabase } from './database';

// AI Coaching Service
export class AICoachingService {
  
  // Generate personalized coaching recommendations
  static async generateCoachingRecommendations(userId, userStats) {
    try {
      const recommendations = [];
      
      // Analyze validation patterns
      if (userStats.totalValidations === 0) {
        recommendations.push({
          type: 'getting_started',
          title: 'Start Your First Validation',
          description: 'Begin your customer discovery journey with your first idea validation',
          priority: 'high',
          action: 'Create your first validation session',
          tips: [
            'Start with a clear, specific problem statement',
            'Focus on one target customer segment initially',
            'Prepare open-ended questions that avoid leading the customer'
          ]
        });
      } else if (userStats.totalValidations < 3) {
        recommendations.push({
          type: 'build_momentum',
          title: 'Build Validation Momentum',
          description: 'Continue practicing to improve your customer discovery skills',
          priority: 'medium',
          action: 'Complete 2 more validations this week',
          tips: [
            'Try validating different types of ideas',
            'Experiment with different customer personas',
            'Focus on asking follow-up questions'
          ]
        });
      }

      // Analyze bias detection
      if (userStats.totalBiasesDetected > userStats.totalValidations * 2) {
        recommendations.push({
          type: 'improve_questioning',
          title: 'Improve Your Questioning Technique',
          description: 'You\'re asking some biased questions. Let\'s work on neutral inquiry.',
          priority: 'high',
          action: 'Practice unbiased questioning',
          tips: [
            'Use "How" and "What" questions instead of "Would you" or "Don\'t you think"',
            'Avoid questions that contain your assumptions',
            'Let the customer tell their story without leading them'
          ]
        });
      }

      // Activity-based recommendations
      if (userStats.averageValidationsPerMonth < 1) {
        recommendations.push({
          type: 'increase_frequency',
          title: 'Increase Validation Frequency',
          description: 'Regular practice is key to mastering customer discovery',
          priority: 'medium',
          action: 'Set a goal of 2 validations per month',
          tips: [
            'Schedule regular validation sessions',
            'Keep a list of ideas to validate',
            'Set reminders to practice weekly'
          ]
        });
      }

      // Advanced recommendations for experienced users
      if (userStats.totalValidations >= 5 && userStats.totalBiasesDetected < userStats.totalValidations) {
        recommendations.push({
          type: 'advanced_techniques',
          title: 'Master Advanced Techniques',
          description: 'You\'re doing well! Let\'s explore advanced customer discovery methods.',
          priority: 'low',
          action: 'Try advanced validation techniques',
          tips: [
            'Experiment with solution interviews vs problem interviews',
            'Practice the "5 Whys" technique for deeper insights',
            'Try validating with different customer segments simultaneously'
          ]
        });
      }

      return recommendations;
    } catch (error) {
      console.error('Error generating coaching recommendations:', error);
      return [];
    }
  }

  // Create a personalized coaching session
  static async createCoachingSession(userId, sessionType = 'general') {
    try {
      const userStatsResult = await ValidationDatabase.getUserStats(userId);
      if (!userStatsResult.success) throw new Error('Failed to get user stats');

      const stats = userStatsResult.stats;
      let sessionContent = {};

      switch (sessionType) {
        case 'questioning_techniques':
          sessionContent = await this.generateQuestioningSession(stats);
          break;
        case 'bias_detection':
          sessionContent = await this.generateBiasDetectionSession(stats);
          break;
        case 'interview_flow':
          sessionContent = await this.generateInterviewFlowSession(stats);
          break;
        case 'insight_extraction':
          sessionContent = await this.generateInsightExtractionSession(stats);
          break;
        default:
          sessionContent = await this.generateGeneralSession(stats);
      }

      const sessionData = {
        type: sessionType,
        topic: sessionContent.title,
        content: sessionContent,
        recommendations: await this.generateCoachingRecommendations(userId, stats),
        completed: false
      };

      const result = await ValidationDatabase.saveCoachingSession(userId, sessionData);
      return result;
    } catch (error) {
      console.error('Error creating coaching session:', error);
      return { success: false, error: error.message };
    }
  }

  // Generate questioning techniques session
  static async generateQuestioningSession(stats) {
    return {
      title: 'Mastering Customer Interview Questions',
      duration: '15 minutes',
      sections: [
        {
          title: 'The Power of Open-Ended Questions',
          content: 'Learn how to ask questions that reveal deep customer insights without leading them to your desired answer.',
          examples: [
            { bad: 'Would you pay $50 for this solution?', good: 'How do you currently budget for tools like this?' },
            { bad: 'Don\'t you think this is frustrating?', good: 'How does this situation affect your daily work?' },
            { bad: 'Would you use our app?', good: 'Walk me through how you currently handle this task.' }
          ]
        },
        {
          title: 'The Question Hierarchy',
          content: 'Structure your questions from broad to specific to uncover the full context.',
          framework: [
            '1. Context: "Tell me about your current process..."',
            '2. Problems: "What challenges do you face with..."',
            '3. Impact: "How does this affect your business/life?"',
            '4. Solutions: "What have you tried to solve this?"',
            '5. Validation: "If this problem disappeared, what would change?"'
          ]
        },
        {
          title: 'Practice Exercise',
          content: 'Try rewriting these biased questions:',
          exercises: [
            'Our CRM is perfect for freelancers, don\'t you agree?',
            'Would you pay for a solution that saves you 2 hours a day?',
            'This problem must be really annoying, right?'
          ]
        }
      ],
      keyTakeaways: [
        'Start with broad, open-ended questions',
        'Listen more than you speak',
        'Follow up with "why" and "how" questions',
        'Avoid questions that contain your assumptions'
      ]
    };
  }

  // Generate bias detection session
  static async generateBiasDetectionSession(stats) {
    const biasRate = stats.totalValidations > 0 ? stats.totalBiasesDetected / stats.totalValidations : 0;
    
    return {
      title: 'Detecting and Avoiding Question Bias',
      duration: '12 minutes',
      personalizedInsight: biasRate > 2 ? 
        'You\'ve been detected asking biased questions frequently. Let\'s work on this!' :
        'You\'re doing well with unbiased questions. Let\'s refine your technique.',
      sections: [
        {
          title: 'Types of Bias to Avoid',
          content: 'Recognize these common biases in customer interviews:',
          biasTypes: [
            {
              type: 'Leading Questions',
              description: 'Questions that push toward a specific answer',
              example: 'Don\'t you think this would solve your problem?',
              fix: 'What would need to change for this problem to be solved?'
            },
            {
              type: 'Loaded Questions',
              description: 'Questions that contain assumptions',
              example: 'How frustrated are you with your current slow software?',
              fix: 'How do you feel about your current software\'s performance?'
            },
            {
              type: 'Double-Barreled',
              description: 'Questions that ask about multiple things at once',
              example: 'Do you like our design and would you pay for it?',
              fix: 'What do you think of this design? (separate question for pricing)'
            }
          ]
        },
        {
          title: 'The Neutral Question Framework',
          content: 'Use this template to create unbiased questions:',
          template: '"Tell me about..." + [situation] + "..." + [open-ended follow-up]',
          examples: [
            'Tell me about the last time you had to manage client invoices. What was that experience like?',
            'Walk me through your typical morning routine. What parts feel most challenging?'
          ]
        }
      ],
      keyTakeaways: [
        'Always question your questions before asking them',
        'Remove assumptions and leading words',
        'Focus on understanding, not validating your idea',
        'Practice active listening to customer stories'
      ]
    };
  }

  // Generate interview flow session
  static async generateInterviewFlowSession(stats) {
    return {
      title: 'Structuring Effective Customer Interviews',
      duration: '18 minutes',
      sections: [
        {
          title: 'The Interview Arc',
          content: 'Follow this structure for maximum insight extraction:',
          phases: [
            {
              phase: 'Warm-up (2-3 minutes)',
              goal: 'Build rapport and context',
              questions: ['Tell me about your role and what you do', 'How long have you been in this position?']
            },
            {
              phase: 'Problem Discovery (10-15 minutes)',
              goal: 'Understand their current situation',
              questions: ['Walk me through your typical [relevant process]', 'What challenges do you face with...?']
            },
            {
              phase: 'Solution Exploration (5-8 minutes)',
              goal: 'Learn about their attempts to solve problems',
              questions: ['What have you tried to solve this?', 'What would an ideal solution look like?']
            },
            {
              phase: 'Wrap-up (2-3 minutes)',
              goal: 'Clarify and thank',
              questions: ['Is there anything important I should have asked?', 'Who else should I talk to?']
            }
          ]
        },
        {
          title: 'Conversation Flow Techniques',
          content: 'Keep the conversation natural and insightful:',
          techniques: [
            'Use transition phrases: "That\'s interesting, tell me more about..."',
            'Employ the 5-second pause after they finish speaking',
            'Mirror their language: Use their words, not yours',
            'Ask for specific examples: "Can you give me a concrete example?"'
          ]
        }
      ],
      keyTakeaways: [
        'Structure interviews but stay flexible',
        'Spend 70% of time on problem discovery',
        'Always ask for specific examples',
        'End with referral requests'
      ]
    };
  }

  // Generate insight extraction session
  static async generateInsightExtractionSession(stats) {
    return {
      title: 'Extracting Actionable Insights from Interviews',
      duration: '14 minutes',
      sections: [
        {
          title: 'The Insight Pyramid',
          content: 'Transform raw interview data into actionable insights:',
          levels: [
            {
              level: 'Raw Data',
              description: 'Direct quotes and observations',
              example: '"I spend 3 hours every Friday updating spreadsheets"'
            },
            {
              level: 'Patterns',
              description: 'Common themes across interviews',
              example: 'Most freelancers spend significant time on admin tasks'
            },
            {
              level: 'Insights',
              description: 'Why patterns exist and what they mean',
              example: 'Freelancers value time over money - admin efficiency is critical'
            },
            {
              level: 'Actions',
              description: 'What to do based on insights',
              example: 'Build automation features, not just organization tools'
            }
          ]
        },
        {
          title: 'Insight Categories to Track',
          content: 'Look for these types of insights in every interview:',
          categories: [
            'Pain Points: What frustrates them most?',
            'Motivations: What drives their behavior?',
            'Workarounds: How do they currently solve problems?',
            'Decision Criteria: What influences their choices?',
            'Emotional Triggers: What makes them excited or anxious?'
          ]
        }
      ],
      keyTakeaways: [
        'Look for patterns across multiple interviews',
        'Focus on the "why" behind customer behavior',
        'Capture exact quotes for emotional impact',
        'Turn insights into testable hypotheses'
      ]
    };
  }

  // Generate general coaching session
  static async generateGeneralSession(stats) {
    const level = stats.totalValidations < 3 ? 'beginner' : 
                 stats.totalValidations < 10 ? 'intermediate' : 'advanced';
    
    return {
      title: `Customer Discovery Mastery - ${level.charAt(0).toUpperCase() + level.slice(1)} Level`,
      duration: '20 minutes',
      personalizedStats: {
        validationsCompleted: stats.totalValidations,
        biasesDetected: stats.totalBiasesDetected,
        averagePerMonth: stats.averageValidationsPerMonth
      },
      sections: [
        {
          title: 'Your Progress',
          content: `You've completed ${stats.totalValidations} validations with ${stats.totalBiasesDetected} biases detected.`,
          nextSteps: this.getNextStepsForLevel(level, stats)
        },
        {
          title: 'Key Principles Refresher',
          content: 'The fundamentals that drive successful customer discovery:',
          principles: [
            'Customers don\'t know what they want, but they know what they need',
            'Past behavior predicts future behavior better than stated intentions',
            'Problems are more valuable to understand than solutions',
            'Context matters more than individual responses'
          ]
        },
        {
          title: 'Common Mistakes to Avoid',
          content: 'Pitfalls that even experienced founders fall into:',
          mistakes: [
            'Asking hypothetical questions instead of behavioral ones',
            'Focusing on features instead of problems',
            'Talking more than listening',
            'Seeking validation instead of truth'
          ]
        }
      ],
      keyTakeaways: this.getKeyTakeawaysForLevel(level)
    };
  }

  // Helper methods
  static getNextStepsForLevel(level, stats) {
    switch (level) {
      case 'beginner':
        return [
          'Complete your first 3 validations to build confidence',
          'Focus on asking open-ended questions',
          'Practice active listening techniques'
        ];
      case 'intermediate':
        return [
          'Work on reducing question bias',
          'Practice the 5 Whys technique',
          'Start identifying patterns across interviews'
        ];
      case 'advanced':
        return [
          'Experiment with different interview structures',
          'Mentor other founders in customer discovery',
          'Develop industry-specific questioning techniques'
        ];
      default:
        return ['Continue practicing and improving'];
    }
  }

  static getKeyTakeawaysForLevel(level) {
    const common = [
      'Customer discovery is a skill that improves with practice',
      'Focus on understanding problems, not validating solutions'
    ];

    const levelSpecific = {
      beginner: [
        'Start with people you know to build confidence',
        'Prepare questions but stay flexible in conversation'
      ],
      intermediate: [
        'Look for patterns across multiple interviews',
        'Challenge your own assumptions regularly'
      ],
      advanced: [
        'Develop your own interview frameworks',
        'Focus on teaching and sharing your knowledge'
      ]
    };

    return [...common, ...(levelSpecific[level] || [])];
  }

  // Get coaching dashboard data
  static async getCoachingDashboard(userId) {
    try {
      const [statsResult, sessionsResult] = await Promise.all([
        ValidationDatabase.getUserStats(userId),
        ValidationDatabase.getCoachingSessions(userId, 5)
      ]);

      if (!statsResult.success) throw new Error('Failed to get user stats');

      const stats = statsResult.stats;
      const sessions = sessionsResult.success ? sessionsResult.sessions : [];
      const recommendations = await this.generateCoachingRecommendations(userId, stats);

      return {
        success: true,
        dashboard: {
          stats,
          recommendations,
          recentSessions: sessions,
          skillLevel: this.calculateSkillLevel(stats),
          nextMilestone: this.getNextMilestone(stats)
        }
      };
    } catch (error) {
      console.error('Error getting coaching dashboard:', error);
      return { success: false, error: error.message };
    }
  }

  static calculateSkillLevel(stats) {
    const validations = stats.totalValidations;
    const biasRate = validations > 0 ? stats.totalBiasesDetected / validations : 0;
    
    if (validations === 0) return { level: 'Beginner', progress: 0, description: 'Just getting started' };
    if (validations < 3) return { level: 'Novice', progress: 25, description: 'Learning the basics' };
    if (validations < 10 || biasRate > 1.5) return { level: 'Developing', progress: 50, description: 'Building skills' };
    if (validations < 20 || biasRate > 0.5) return { level: 'Proficient', progress: 75, description: 'Strong foundation' };
    return { level: 'Expert', progress: 100, description: 'Mastering customer discovery' };
  }

  static getNextMilestone(stats) {
    const validations = stats.totalValidations;
    
    if (validations < 3) return { target: 3, description: 'Complete your first 3 validations' };
    if (validations < 10) return { target: 10, description: 'Reach 10 validations milestone' };
    if (validations < 25) return { target: 25, description: 'Achieve 25 validations expertise' };
    return { target: 50, description: 'Master level: 50 validations' };
  }
} 