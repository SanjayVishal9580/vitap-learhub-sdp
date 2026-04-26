const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAIInstance = null;

const getGenAI = () => {
  if (!genAIInstance) {
    if (!process.env.GEMINI_API_KEY) {
      // Try to load dotenv just in case
      require('dotenv').config();
    }
    if (!process.env.GEMINI_API_KEY) {
      console.error('CRITICAL: GEMINI_API_KEY is missing from environment variables!');
    }
    genAIInstance = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log('Gemini SDK Initialized with key:', process.env.GEMINI_API_KEY ? `${process.env.GEMINI_API_KEY.substring(0, 5)}...` : 'MISSING');
  }
  return genAIInstance;
};

// Models to try in order of preference
const MODEL_FALLBACKS = [
  'gemini-3.1-flash-lite-preview',
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-flash-latest',
  'gemini-pro-latest',
];

const getGeminiModel = (modelName) => {
  const name = modelName || MODEL_FALLBACKS[0];
  return getGenAI().getGenerativeModel({ model: name });
};

/**
 * Sleep for ms milliseconds
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Try generating content with automatic model fallback and retry logic.
 * Handles 404 (model not found), 503 (overloaded), and 429 (rate limited).
 */
const generateWithFallback = async (prompt) => {
  let lastError = null;

  for (const model of MODEL_FALLBACKS) {
    // Try each model up to 2 times (with a delay on 429)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        // Create fresh instance if needed (or just use genAI)
        const genModel = getGenAI().getGenerativeModel({ model: model.trim() });
        const result = await genModel.generateContent(prompt);
        const response = await result.response;
        console.log(`✓ Gemini response from model: ${model} (attempt ${attempt + 1})`);
        return response.text();
      } catch (error) {
        lastError = error;
        const status = error.status || error.httpStatusCode;
        const msg = error.message?.substring(0, 120) || 'Unknown error';
        console.warn(`✗ Model ${model} attempt ${attempt + 1} failed [${status}]: ${msg}`);

        if (status === 404 || status === 400) {
          // Model not found or invalid request — skip to next model immediately
          break;
        } else if (status === 429) {
          // Rate limited — wait and retry with same model, then try next
          if (attempt === 0) {
            console.log(`  ↳ Rate limited on ${model}, waiting 5s before retry...`);
            await sleep(5000);
            continue;
          }
          // After retry failed, try next model
          break;
        } else if (status === 503) {
          // Overloaded — try next model
          break;
        } else {
          // Other error (e.g. invalid API key) — throw immediately
          throw error;
        }
      }
    }
  }
  throw lastError || new Error('All Gemini models failed. Your API key may have exhausted its daily quota.');
};

module.exports = { getGenAI, getGeminiModel, generateWithFallback };
