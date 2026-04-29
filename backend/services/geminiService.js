const { generateWithOpenRouter, extractJSON } = require('../config/openrouter');

// ============================================================================
// OPENROUTER AI SERVICE - QUIZ & AI TUTOR
// Production-ready implementations with comprehensive error handling
// ============================================================================

/**
 * Generate a quiz using OpenRouter AI
 * Returns properly validated quiz questions
 */
const generateQuiz = async ({
  topicName = 'General',
  quizContext = '',
  difficulty = 'MEDIUM',
  questionCount = 10,
  previousScores = [],
}) => {
  try {
    if (!topicName || topicName.trim().length === 0) {
      throw new Error('Topic name is required');
    }
    
    if (![5, 10, 15, 20].includes(questionCount)) {
      questionCount = 10; // Default to 10
    }
    
    const validDifficulties = ['EASY', 'MEDIUM', 'HARD'];
    if (!validDifficulties.includes(difficulty)) {
      difficulty = 'MEDIUM';
    }

    const difficultyGuide = {
      EASY: 'basic recall, definitions, and simple understanding questions. Questions should be straightforward and test fundamental concepts.',
      MEDIUM: 'application-based and analytical questions. Students should apply their knowledge to solve problems.',
      HARD: 'complex problem-solving, edge cases, critical thinking, and advanced concept integration questions.',
    };

    const scoreContext = previousScores.length > 0
      ? `Recent attempts: ${previousScores.join(', ')}. Adjust difficulty based on student performance.`
      : '';

    const prompt = `You are an expert educational quiz generator for computer science courses.

TOPIC: ${topicName}
CONTEXT: ${quizContext || 'General computer science knowledge'}
DIFFICULTY LEVEL: ${difficulty}
NUMBER OF QUESTIONS: ${questionCount}
${scoreContext}

INSTRUCTIONS:
1. Generate EXACTLY ${questionCount} multiple-choice questions
2. Each question must have EXACTLY 4 options
3. Only ONE correct answer per question
4. Questions should be diverse and non-repetitive
5. Ensure correct answers are randomly distributed among positions
6. Focus on: ${difficultyGuide[difficulty]}

CRITICAL REQUIREMENTS:
- Return ONLY valid JSON array
- NO markdown code blocks (no \`\`\`json)
- NO extra text before or after JSON
- NO explanations or comments
- Each option must be plain text (not starting with A, B, C, D)

Return only this JSON structure:
[{"question":"?","options":["opt1","opt2","opt3","opt4"],"correctAnswer":"correct","difficulty":"${difficulty}"}]

Generate ${questionCount} questions now as pure JSON:`;

    console.log(`[QUIZ] Generating ${questionCount} ${difficulty} questions for: ${topicName}`);
    

    console.log(`[QUIZ] Generating ${questionCount} ${difficulty} questions for: ${topicName}`);
    
    const response = await generateWithOpenRouter(prompt, 'json');
    console.log(`[QUIZ] Received response (${response.length} chars)`);

    // Extract and parse JSON
    const questions = extractJSON(response, true);

    // Validate response structure
    if (!Array.isArray(questions)) {
      throw new Error('Response is not a JSON array');
    }

    if (questions.length === 0) {
      throw new Error('No questions returned');
    }

    if (questions.length !== questionCount) {
      console.warn(`[QUIZ] Expected ${questionCount} questions but got ${questions.length}`);
    }

    // Validate and sanitize each question
    const validatedQuestions = questions.map((q, index) => {
      if (!q.question || typeof q.question !== 'string') {
        throw new Error(`Question ${index + 1}: Missing or invalid question text`);
      }

      if (!Array.isArray(q.options) || q.options.length !== 4) {
        throw new Error(`Question ${index + 1}: Must have exactly 4 options`);
      }

      if (!q.correctAnswer || typeof q.correctAnswer !== 'string') {
        throw new Error(`Question ${index + 1}: Missing or invalid correct answer`);
      }

      if (!q.options.includes(q.correctAnswer)) {
        throw new Error(`Question ${index + 1}: Correct answer not in options`);
      }

      return {
        question: q.question.trim(),
        options: q.options.map(o => String(o).trim()),
        correctAnswer: q.correctAnswer.trim(),
        difficulty: q.difficulty || difficulty,
      };
    });

    console.log(`[QUIZ] ✓ Successfully generated and validated ${validatedQuestions.length} questions`);
    return validatedQuestions;

  } catch (error) {
    console.error(`[QUIZ] ✗ Error: ${error.message}`);
    
    if (error.message.includes('API failed')) {
      throw new Error('AI service temporarily unavailable. Please try again in 30 seconds.');
    }
    
    throw new Error(error.message || 'Failed to generate quiz. Please try again.');
  }
};

/**
 * AI Tutor - Answer student questions about a topic
 */
const askAITutor = async ({
  topicName = 'General',
  quizContext = '',
  question = '',
  chatHistory = [],
}) => {
  try {
    if (!question || question.trim().length === 0) {
      throw new Error('Question cannot be empty');
    }

    const maxHistoryLength = 5;
    const recentHistory = chatHistory.slice(-maxHistoryLength);
    
    let historyContext = '';
    if (recentHistory.length > 0) {
      historyContext = '\nPrevious conversation context:\n' +
        recentHistory
          .map(m => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`)
          .join('\n');
    }

    const prompt = `You are an expert AI tutor helping students learn about "${topicName}".

${quizContext ? `TOPIC CONTEXT: ${quizContext}` : 'GENERAL KNOWLEDGE MODE'}
${historyContext}

STUDENT'S CURRENT QUESTION: ${question}

INSTRUCTIONS:
1. Provide a clear, educational, and helpful response
2. Use examples when they help explain concepts
3. Keep the response concise but thorough (2-4 paragraphs)
4. If the question is off-topic, gently redirect to the subject
5. Use a friendly, encouraging tone
6. Avoid overly technical jargon unless necessary

Respond naturally and helpfully:`;

    console.log(`[TUTOR] Answering question on ${topicName}: "${question.substring(0, 50)}..."`);
    
    const response = await generateWithOpenRouter(prompt, 'text');
    
    if (!response || response.trim().length === 0) {
      throw new Error('Empty response from AI');
    }

    console.log(`[TUTOR] ✓ Response generated (${response.length} chars)`);
    return response.trim();

  } catch (error) {
    console.error(`[TUTOR] ✗ Error: ${error.message}`);
    
    if (error.message.includes('API failed')) {
      throw new Error('AI Tutor is temporarily unavailable. Please try again later.');
    }
    
    throw new Error(error.message || 'Failed to get AI response. Please try again.');
  }
};

/**
 * Generate teacher recommendations based on class performance analytics
 */
const generateTeacherRecommendations = async ({
  topicName = 'General',
  passRate = 0,
  avgScore = 0,
  totalAttempts = 0,
  commonMistakes = [],
}) => {
  try {
    const commonMistakesText = commonMistakes.length > 0
      ? `Common mistakes: ${commonMistakes.slice(0, 3).join(', ')}`
      : '';

    const prompt = `You are an educational analytics AI helping teachers improve student learning.

TOPIC: ${topicName}
CLASS STATISTICS:
- Pass Rate: ${passRate}%
- Average Score: ${avgScore}/10
- Total Attempts: ${totalAttempts}
${commonMistakesText}

Generate 2-3 specific, actionable recommendations for the teacher to improve student performance.

CRITICAL: Return ONLY a valid JSON array of strings. No markdown or code blocks.

FORMAT:
[
  "Recommendation 1 - Be specific about actions to take",
  "Recommendation 2 - Include what to focus on",
  "Recommendation 3 - Optional additional insight"
]

Generate recommendations now:`;

    console.log(`[RECOMMENDATIONS] Analyzing ${topicName} (Pass: ${passRate}%, Avg: ${avgScore})`);
    
    const response = await generateWithOpenRouter(prompt, 'json');
    const recommendations = extractJSON(response, true);

    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      throw new Error('Invalid recommendations format');
    }

    const validated = recommendations
      .filter(r => typeof r === 'string' && r.trim().length > 0)
      .map(r => r.trim())
      .slice(0, 5); // Limit to 5 recommendations

    console.log(`[RECOMMENDATIONS] ✓ Generated ${validated.length} recommendations`);
    return validated;

  } catch (error) {
    console.error(`[RECOMMENDATIONS] ✗ Error: ${error.message}`);
    
    // Return sensible defaults if AI fails
    const defaults = [];
    if (passRate < 60) {
      defaults.push('Consider reviewing fundamental concepts as class average is below 60%');
    }
    if (avgScore < 5) {
      defaults.push('Implement additional practice sessions for this topic');
    }
    if (totalAttempts < 3) {
      defaults.push('Encourage more students to attempt the quiz for better learning');
    }
    
    return defaults.length > 0
      ? defaults
      : ['Unable to generate recommendations at this time. Try again later.'];
  }
};

/**
 * Advanced: Generate detailed learning path recommendations
 */
const generateLearningPathAnalysis = async ({
  studentProgress = {},
  completedTopics = [],
  weakAreas = [],
}) => {
  try {
    const prompt = `You are an AI learning path advisor for computer science students.

STUDENT PROGRESS:
- Completed Topics: ${completedTopics.join(', ') || 'None yet'}
- Weak Areas: ${weakAreas.join(', ') || 'None identified'}
- Performance: ${JSON.stringify(studentProgress).substring(0, 200)}

Provide 2-3 specific next steps the student should take to improve their learning.

CRITICAL: Return ONLY valid JSON array of strings. No markdown.

FORMAT:
[
  "Next step 1",
  "Next step 2",
  "Next step 3"
]

Generate now:`;

    const response = await generateWithOpenRouter(prompt, 'json');
    return extractJSON(response, true);

  } catch (error) {
    console.error('[LEARNING_PATH] Error:', error.message);
    return ['Continue with foundational topics before moving to advanced material'];
  }
};

module.exports = {
  generateQuiz,
  askAITutor,
  generateTeacherRecommendations,
  generateLearningPathAnalysis,
};
