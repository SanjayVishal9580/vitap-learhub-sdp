const axios = require('axios');

// ============================================================================
// OPENROUTER AI CONFIGURATION - Production Ready
// ============================================================================

const REQUEST_TIMEOUT = 60000; // 60 seconds
const RETRY_DELAYS = [1000, 2000, 4000, 8000]; // Exponential backoff

/**
 * Get and validate OpenRouter API key
 */
const getApiKey = () => {
  const key = process.env.OPENROUTER_API_KEY;
  
  if (!key || key.trim().length === 0) {
    throw new Error('CRITICAL: OPENROUTER_API_KEY not found in environment variables!');
  }
  
  return key.trim();
};

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
  const status = error.response?.status;
  
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
    'timeout',
    'rate',
  ];
  
  return retryableMessages.some(msg => 
    error.message.toLowerCase().includes(msg.toLowerCase())
  );
};

/**
 * Main content generation function with full error handling
 * 
 * @param {string} prompt - The prompt to send to OpenRouter
 * @param {string} contentType - 'text' or 'json' to indicate expected response format
 * @returns {Promise<string>} The generated content
 */
const generateWithOpenRouter = async (prompt, contentType = 'text') => {
  let lastError = null;
  
  try {
    const apiKey = getApiKey();
    
    console.log(`[OPENROUTER] Sending request (${prompt.length} chars)`);
    
    // Retry loop with exponential backoff
    for (let retryAttempt = 0; retryAttempt < RETRY_DELAYS.length; retryAttempt++) {
      try {
        console.log(`[OPENROUTER] Attempt ${retryAttempt + 1}/${RETRY_DELAYS.length}`);
        
        // Race against timeout
        const requestPromise = axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: 'openai/gpt-3.5-turbo',
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: 0.3,
            top_p: 0.95,
            max_tokens: 4096,
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'HTTP-Referer': 'https://vitap-learnhub.com',
              'X-Title': 'VITAP LearnHub',
              'Content-Type': 'application/json',
            },
            timeout: REQUEST_TIMEOUT,
          }
        );
        
        const response = await Promise.race([
          requestPromise,
          createTimeoutPromise(REQUEST_TIMEOUT),
        ]);
        
        const text = response.data?.choices?.[0]?.message?.content;
        
        if (!text || text.trim().length === 0) {
          throw new Error('Empty response from OpenRouter');
        }
        
        console.log(`[OPENROUTER] ✓ Success (${text.length} chars)`);
        return text;
        
      } catch (error) {
        lastError = error;
        const status = error.response?.status;
        const errorMsg = error.response?.data?.error?.message || error.message;
        
        console.warn(
          `[OPENROUTER] ✗ Attempt ${retryAttempt + 1} failed: ${errorMsg.substring(0, 100)}` +
          (status ? ` [Status: ${status}]` : '')
        );
        
        // Rate limited - wait and retry
        if (status === 429) {
          if (retryAttempt < RETRY_DELAYS.length - 1) {
            const waitTime = RETRY_DELAYS[retryAttempt];
            console.log(`[OPENROUTER]   → Rate limited, waiting ${waitTime}ms...`);
            await sleep(waitTime);
            continue;
          }
        }
        
        // Server errors - wait and retry
        if (status >= 500) {
          if (retryAttempt < RETRY_DELAYS.length - 1) {
            const waitTime = RETRY_DELAYS[retryAttempt];
            console.log(`[OPENROUTER]   → Server error, waiting ${waitTime}ms...`);
            await sleep(waitTime);
            continue;
          }
        }
        
        // Other retryable errors
        if (isRetryableError(error)) {
          if (retryAttempt < RETRY_DELAYS.length - 1) {
            const waitTime = RETRY_DELAYS[retryAttempt];
            console.log(`[OPENROUTER]   → Retrying in ${waitTime}ms...`);
            await sleep(waitTime);
            continue;
          }
        }
        
        // Don't retry on client errors
        throw error;
      }
    }
    
  } catch (error) {
    console.error('[OPENROUTER] Fatal error:', error.message);
    lastError = error;
  }
  
  // All attempts failed
  const errorMessage = lastError?.message || 'Unknown error';
  console.error(`[OPENROUTER] All generation attempts failed. Last error: ${errorMessage}`);
  
  throw new Error(
    `OpenRouter API failed: ${errorMessage}. Please try again in a few moments.`
  );
};

/**
 * Safe JSON extraction from text response
 */
const extractJSON = (text, isArray = true) => {
  try {
    // Try direct parsing first
    return JSON.parse(text);
  } catch (e) {
    // Remove markdown code blocks if present
    let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Try parsing cleaned text
    try {
      return JSON.parse(cleaned);
    } catch (e2) {
      // Try to find JSON in the response
      const jsonRegex = isArray ? /\[\s*\{[\s\S]*?\}\s*\]/g : /\{\s*[\s\S]*?\}/g;
      const matches = cleaned.match(jsonRegex);
      
      if (matches && matches.length > 0) {
        try {
          return JSON.parse(matches[0]);
        } catch (parseError) {
          console.error('[OPENROUTER] Failed to parse extracted JSON:', parseError.message);
          throw new Error('Invalid JSON format in response');
        }
      }
      
      throw new Error('No JSON found in response');
    }
  }
};

module.exports = {
  generateWithOpenRouter,
  extractJSON,
  sleep,
};