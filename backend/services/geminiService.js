const { generateWithFallback } = require('../config/gemini');

/**
 * Generate a quiz using Gemini AI based on teacher-defined context
 */
const generateQuiz = async ({ topicName, quizContext, difficulty = 'MEDIUM', questionCount = 10, previousScores = [] }) => {
  try {
    const difficultyGuide = {
      EASY: 'basic recall and simple understanding questions',
      MEDIUM: 'application-based and analytical questions',
      HARD: 'complex problem-solving, edge cases, and advanced concept questions',
    };

    const prompt = `You are a quiz generator for a university-level computer science course.
    
Topic: ${topicName}
Quiz Context (defined by the teacher): ${quizContext}
Difficulty Level: ${difficulty} - Focus on ${difficultyGuide[difficulty]}
Number of Questions: ${questionCount}

${previousScores.length > 0 ? `Student's previous scores on this topic: ${previousScores.join(', ')}. Adjust difficulty accordingly.` : ''}

Generate exactly ${questionCount} multiple-choice questions. Each question must have exactly 4 options with only one correct answer.

IMPORTANT: Return ONLY a valid JSON array. No markdown, no code blocks, no explanation. Just the raw JSON array.

Format:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "The exact text of the correct option",
    "difficulty": "${difficulty}"
  }
]

Make each question unique, educational, and challenging at the ${difficulty} level. Ensure correct answers are distributed randomly among the options (not always the same position).`;

    console.log(`Generating quiz for topic: ${topicName} with difficulty: ${difficulty}`);
    let text = await generateWithFallback(prompt);
    console.log('Gemini raw response length:', text.length);
    
    // Robustly extract just the JSON array, ignoring any conversational text
    const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (!jsonMatch) {
      console.error('AI response did not contain JSON array. Raw response:', text.substring(0, 500));
      throw new Error('AI did not return a valid JSON array');
    }
    
    const questions = JSON.parse(jsonMatch[0]);
    console.log(`Successfully parsed ${questions.length} questions`);

    // Validate structure
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Invalid quiz format received from AI');
    }

    // Validate each question
    return questions.map(q => ({
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      difficulty: q.difficulty || difficulty,
    }));
  } catch (error) {
    console.error('Gemini quiz generation error:', error.message);
    throw new Error(error.message || 'Failed to generate quiz. Please try again.');
  }
};

/**
 * AI Tutor - Answer student questions about a topic
 */
const askAITutor = async ({ topicName, quizContext, question, chatHistory = [] }) => {
  try {
    const historyContext = chatHistory.length > 0
      ? `\nPrevious conversation:\n${chatHistory.map(m => `${m.role}: ${m.content}`).join('\n')}`
      : '';

    const prompt = `You are an AI tutor helping a university student learn about "${topicName}".
    
Topic Context: ${quizContext}
${historyContext}

Student's Question: ${question}

Provide a clear, educational, and helpful response. Use examples when helpful. Keep the response concise but thorough. If the question is not related to the topic, politely redirect the student to ask about the topic.`;

    console.log(`AI Tutor question for topic: ${topicName}`);
    const response = await generateWithFallback(prompt);
    console.log('AI Tutor response received, length:', response.length);
    return response;
  } catch (error) {
    console.error('AI Tutor error:', error.message);
    throw new Error(error.message || 'AI Tutor is temporarily unavailable. Please try again.');
  }
};

/**
 * Generate teacher recommendations based on class performance
 */
const generateTeacherRecommendations = async ({ topicName, passRate, avgScore, totalAttempts }) => {
  try {
    const prompt = `You are an educational analytics AI. Analyze this class performance data and provide actionable recommendations for the teacher.

Topic: ${topicName}
Pass Rate: ${passRate}%
Average Score: ${avgScore}/10
Total Attempts: ${totalAttempts}

Provide 2-3 concise, actionable recommendations. Return as a JSON array of strings.
Example: ["Recommendation 1", "Recommendation 2"]

Return ONLY the JSON array, no markdown or code blocks.`;

    let text = await generateWithFallback(prompt);
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : ['Unable to parse recommendations.'];
  } catch (error) {
    console.error('Recommendations error:', error.message);
    return ['Unable to generate recommendations at this time.'];
  }
};

module.exports = { generateQuiz, askAITutor, generateTeacherRecommendations };
