const { GoogleGenerativeAI } = require('@google/generative-ai');

// ============================================================================
// GEMINI API CONFIGURATION - PRODUCTION READY
// ============================================================================

let keyIndex = 0;
const REQUEST_TIMEOUT = 60000; // 60 seconds timeout
const RETRY_DELAYS = [1000, 2000, 4000, 8000]; // Exponential backoff delays

/**
 * Get and validate Gemini API keys from environment
 */
const getKeys = () => {
  const rawKeys = (process.env.GEMINI_API_KEY || '')
    .split(',')
    .map(k => k.trim())
    .filter(k => k);
  
  if (rawKeys.length === 0) {
    throw new Error('CRITICAL: No GEMINI_API_KEY found in environment variables!');
  }
  
  return rawKeys;
};

/**
 * Rotate to next API key (for rate limiting)
 */
const rotateKey = () => {
  try {
    const keys = getKeys();
    if (keys.length > 1) {
      keyIndex = (keyIndex + 1) % keys.length;
      console.log(`[GEMINI] Rotating to API key #${keyIndex + 1}/${keys.length}`);
      return true;
    }
  } catch (error) {
    console.error('[GEMINI] Key rotation failed:', error.message);
  }
  return false;
};

/**
 * Get initialized Gemini AI instance with current API key
 */
const getGenAI = () => {
  try {
    const keys = getKeys();
    const currentKey = keys[keyIndex];
    
    if (!currentKey) {
      throw new Error('No valid API key available');
    }
    
    return new GoogleGenerativeAI(currentKey);
  } catch (error) {
    console.error('[GEMINI] Failed to initialize GoogleGenerativeAI:', error.message);
    throw error;
  }
};

/**
 * Primary models to use (in order of preference)
 * Using latest stable Gemini models
 */
const MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash'
];

/**
 * Sleep utility function
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Create a timeout promise that rejects after specified milliseconds
 */
const createTimeoutPromise = (ms) => {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms)
  );
};

/**
 * Check if error is retryable
 */
const isRetryableError = (error) => {
  const status = error.status || error.httpStatusCode;
  
  // Retryable status codes
  const retryableCodes = [429, 500, 502, 503, 504];
  if (retryableCodes.includes(status)) {
    return true;
  }
  
  // Retryable error messages
  const retryableMessages = [
    'RESOURCE_EXHAUSTED',
    'INTERNAL',
    'UNAVAILABLE',
    'DEADLINE_EXCEEDED',
    'ECONNRESET',
    'ENOTFOUND',
    'timeout'
  ];
  
  return retryableMessages.some(msg => error.message.includes(msg));
};

/**
 * Main content generation function with full error handling
 * 
 * @param {string} prompt - The prompt to send to Gemini
 * @param {string} contentType - 'text' or 'json' to indicate expected response format
 * @returns {Promise<string>} The generated content
 */
const generateWithFallback = async (prompt, contentType = 'text') => {
  let lastError = null;
  
  try {
    const keys = getKeys();
    console.log(`[GEMINI] Starting generation with ${keys.length} key(s) and ${MODELS.length} model(s)`);
    
    // Outer loop: retry with keys
    for (let keyAttempt = 0; keyAttempt < Math.max(keys.length, 1); keyAttempt++) {
      // Inner loop: retry with backoff
      for (let retryAttempt = 0; retryAttempt < RETRY_DELAYS.length; retryAttempt++) {
        // Model loop: try different models
        for (const modelName of MODELS) {
          try {
            console.log(`[GEMINI] Attempt ${keyAttempt + 1}/${keys.length} | Retry ${retryAttempt + 1}/${RETRY_DELAYS.length} | Model: ${modelName}`);
            
            const genAI = getGenAI();
            const model = genAI.getGenerativeModel({
              model: modelName,
              // Configuration for more reliable responses
              generationConfig: {
                temperature: 0.7,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 4096,
              },
              safetySettings: [
                {
                  category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                  threshold: 'BLOCK_ONLY_HIGH',
                },
                {
                  category: 'HARM_CATEGORY_UNSPECIFIED',
                  threshold: 'BLOCK_ONLY_HIGH',
                },
              ],
            });
            
            // Race against timeout
            const generationPromise = model.generateContent(prompt);
            const result = await Promise.race([
              generationPromise,
              createTimeoutPromise(REQUEST_TIMEOUT),
            ]);
            
            const response = await result.response;
            const text = response.text();
            
            if (!text || text.trim().length === 0) {
              throw new Error('Empty response from Gemini');
            }
            
            console.log(`[GEMINI] ✓ Success with ${modelName} (${text.length} chars)`);
            return text;
            
          } catch (error) {
            lastError = error;
            const status = error.status || error.httpStatusCode;
            
            console.warn(
              `[GEMINI] ✗ Failed with ${modelName}: ${error.message.substring(0, 100)}` +
              (status ? ` [Status: ${status}]` : '')
            );
            
            // Model not found - try next model
            if (status === 404 || error.message.includes('not found')) {
              console.log(`[GEMINI]   → Model not found, trying next model...`);
              continue; // Try next model
            }
            
            // Bad request - don't retry
            if (status === 400 || error.message.includes('INVALID_ARGUMENT')) {
              console.log(`[GEMINI]   → Invalid request, not retrying`);
              throw error;
            }
            
            // Rate limited - rotate key
            if (status === 429 || error.message.includes('RESOURCE_EXHAUSTED')) {
              console.log(`[GEMINI]   → Rate limited`);
              if (keyAttempt < keys.length - 1) {
                console.log(`[GEMINI]   → Rotating to next API key...`);
                rotateKey();
                break; // Break model loop, try next key
              }
            }
            
            // Server errors - wait and retry
            if (isRetryableError(error)) {
              if (retryAttempt < RETRY_DELAYS.length - 1) {
                const waitTime = RETRY_DELAYS[retryAttempt];
                console.log(`[GEMINI]   → Retrying in ${waitTime}ms...`);
                await sleep(waitTime);
                break; // Break model loop, retry with backoff
              }
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.error('[GEMINI] Fatal error:', error.message);
    lastError = error;
  }
  
  // All attempts failed
  const errorMessage = lastError?.message || 'Unknown error';
  console.error(`[GEMINI] All generation attempts failed. Last error: ${errorMessage}`);
  
  throw new Error(
    `Gemini API failed: ${errorMessage}. Please try again in a few moments.`
  );
};

/**
 * Safe JSON extraction from text response
 * Handles various JSON formats in API responses
 */
const extractJSON = (text, isArray = true) => {
  try {
    // Try direct parsing first
    return JSON.parse(text);
  } catch (e) {
    // Try to find JSON in the response
    const jsonRegex = isArray ? /\[\s*\{[\s\S]*?\}\s*\]/g : /\{\s*[\s\S]*?\}/g;
    const matches = text.match(jsonRegex);
    
    if (matches && matches.length > 0) {
      try {
        return JSON.parse(matches[0]);
      } catch (parseError) {
        console.error('[GEMINI] Failed to parse extracted JSON:', parseError.message);
        throw new Error('Invalid JSON format in response');
      }
    }
    
    throw new Error('No JSON found in response');
  }
};

module.exports = {
  getGenAI,
  generateWithFallback,
  extractJSON,
  sleep,
};
