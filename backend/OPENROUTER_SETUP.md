# OpenRouter API Integration - Setup & Usage Guide

## Overview
VITAP LearnHub now uses **OpenRouter** for AI features (quiz generation, AI tutor, learning recommendations). OpenRouter provides:
- ✅ Reliable access to GPT-3.5 Turbo and other models
- ✅ No strict quota limits for educational projects
- ✅ Simple HTTP API (no special SDKs required)
- ✅ Consistent pricing and fair rate limiting

## Quick Setup

### 1. Get Your OpenRouter API Key
1. Go to [openrouter.ai/keys](https://openrouter.ai/keys)
2. Create a new free account or sign in
3. Generate an API key
4. Copy the key (starts with `sk-or-v1-`)

### 2. Configure Environment
Add to `backend/.env`:
```
OPENROUTER_API_KEY=sk-or-v1-your-api-key-here
```

### 3. Verify Installation
```bash
cd backend
node health-check.js
```

Expected output:
```
✓ OPENROUTER_API_KEY is set
✓ API key format is valid
✓ Successfully connected to OpenRouter API
✓ Text generation successful
✓ JSON generation successful
✓ AI Tutor simulation successful
✓ All tests passed! OpenRouter API is ready.
```

## Architecture

### Integration Points
All AI calls go through `backend/config/openrouter.js`:

```javascript
const { generateWithOpenRouter } = require('./config/openrouter');

// Text response
const response = await generateWithOpenRouter('Your prompt here', 'text');

// JSON response
const json = await generateWithOpenRouter('Your prompt here', 'json');
```

### Core Modules Using OpenRouter

**Quiz Generation** (`/api/quizzes/generate`)
- File: `backend/services/geminiService.js` → `generateQuiz()`
- Generates 10 multiple-choice questions
- Adjusts difficulty based on student history

**AI Tutor** (`/api/ai/tutor`)
- File: `backend/services/geminiService.js` → `askAITutor()`
- Answers student questions with learning context
- Maintains chat history per topic

**Teacher Recommendations** (`/api/analytics`)
- File: `backend/services/geminiService.js` → `generateTeacherRecommendations()`
- Provides pedagogical insights
- Analyzes class performance trends

**Learning Path Analysis**
- File: `backend/services/geminiService.js` → `generateLearningPathAnalysis()`
- Suggests next topics to study
- Uses student progress data

## Features

### Automatic Retry Logic
- 4 automatic retries on failure (1s, 2s, 4s, 8s delays)
- Handles rate limits (HTTP 429) gracefully
- Detects and retries server errors (5xx)

### Timeout Protection
- 60-second timeout per request
- Prevents hanging connections
- Graceful degradation on timeout

### Robust JSON Parsing
- Extracts JSON from markdown code blocks
- Handles messy responses
- Falls back to partial parsing if needed

## API Models Used

**Primary Model**: `openai/gpt-3.5-turbo-instruct`
- Latest OpenAI GPT-3.5 Turbo
- Optimized for instruction following
- Good balance of speed and quality

### Model Alternatives (if needed)
- `openai/gpt-4-turbo-preview` (higher quality, slower, higher cost)
- `meta-llama/llama-2-70b-chat` (open source, free on OpenRouter)
- `anthropic/claude-3-haiku` (very fast, good for real-time)

To switch models, edit `backend/config/openrouter.js` line 14:
```javascript
model: 'openai/gpt-3.5-turbo-instruct', // Change this
```

## Troubleshooting

### Error: "CRITICAL: No OPENROUTER_API_KEY found"
**Fix**: Ensure `.env` has:
```
OPENROUTER_API_KEY=sk-or-v1-...
```

### Error: "Unauthorized - 401"
**Fix**: Verify API key:
1. Copy exact key from openrouter.ai/keys
2. Restart server: `npm run dev`
3. Re-test: `node health-check.js`

### Error: "Too many requests - 429"
**Fix**: OpenRouter rate limiting (auto-retry should handle)
- Upgrade account at openrouter.ai for higher limits
- Increase retry count in `backend/config/openrouter.js` (line 37)

### Quiz Generator Returns Empty
**Likely Cause**: Model returning unexpected format
- Try with Claude model: change line 14 in `openrouter.js`
- Check prompt in `geminiService.js` generateQuiz() function
- Review response with `console.log()` before JSON parsing

### AI Tutor Not Responding
**Check**:
1. Verify API key is valid: `node health-check.js`
2. Check network connectivity
3. Monitor server logs for error messages
4. Try with shorter/simpler question first

## Performance Metrics

### Typical Response Times
- Text generation: 1-3 seconds
- JSON (quiz): 2-5 seconds
- JSON (recommendations): 2-4 seconds

### Quota Information
- Free tier: Sufficient for educational prototype
- Paid tier: Unlimited usage with monthly billing

## Migration Notes

This was migrated from Google Gemini due to:
- Free tier quota exhaustion on Gemini
- OpenRouter provides unlimited free tier access
- Simpler HTTP API, no SDK dependencies
- Better performance stability

### Files Removed
- `backend/config/gemini.js` (old Gemini config)
- `backend/GEMINI_SETUP.md` (old documentation)

### Files Updated
- `backend/config/openrouter.js` (new OpenRouter integration)
- `backend/services/geminiService.js` (uses OpenRouter instead of Gemini)
- `backend/.env` (uses OPENROUTER_API_KEY instead of GEMINI_API_KEY)
- `backend/health-check.js` (tests OpenRouter endpoints)

## API Reference

### OpenRouter Endpoint
```
POST https://openrouter.ai/api/v1/chat/completions
```

### Required Headers
```
Authorization: Bearer sk-or-v1-...
HTTP-Referer: https://vitap-learnhub.com
X-Title: VITAP LearnHub
Content-Type: application/json
```

### Request Format
```json
{
  "model": "openai/gpt-3.5-turbo-instruct",
  "messages": [
    {
      "role": "user",
      "content": "Your prompt here"
    }
  ],
  "max_tokens": 500,
  "temperature": 0.7
}
```

### Response Format
```json
{
  "choices": [
    {
      "message": {
        "content": "Generated response here"
      }
    }
  ]
}
```

## Support
- OpenRouter Documentation: https://openrouter.ai/docs
- API Status: https://status.openrouter.ai
- Issues: Check server logs in `npm run dev` output
