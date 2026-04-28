#!/usr/bin/env node

/**
 * OPENROUTER API HEALTH CHECK
 * 
 * Usage:
 *   node health-check.js
 * 
 * Tests:
 *   1. Environment variable loading
 *   2. OpenRouter API key validity
 *   3. API connectivity
 *   4. Text generation
 *   5. JSON generation
 *   6. Quiz generation simulation
 */

require('dotenv').config();
const axios = require('axios');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(status, message) {
  const icon = status === '✓' ? colors.green + '✓' : status === '✗' ? colors.red + '✗' : colors.yellow + 'ℹ';
  console.log(`${icon}${colors.reset} ${message}`);
}

async function runHealthCheck() {
  console.log(`\n${colors.cyan}=== OPENROUTER API HEALTH CHECK ===${colors.reset}\n`);

  let passedTests = 0;
  let failedTests = 0;

  // Test 1: Environment Variables
  console.log(`${colors.blue}Test 1: Environment Setup${colors.reset}`);
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (apiKey && apiKey.trim()) {
    log('✓', `OPENROUTER_API_KEY is set (${apiKey.substring(0, 15)}...)`);
    passedTests++;
  } else {
    log('✗', 'OPENROUTER_API_KEY is missing! Add to .env file');
    failedTests++;
    return;
  }

  if (apiKey.startsWith('sk-or-v1-')) {
    log('✓', 'API key format is valid');
    passedTests++;
  } else {
    log('✗', 'API key format looks wrong. Should start with sk-or-v1-');
    failedTests++;
  }

  // Test 2: API Connectivity
  console.log(`\n${colors.blue}Test 2: OpenRouter API Connectivity${colors.reset}`);
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-3.5-turbo-instruct',
        messages: [
          {
            role: 'user',
            content: 'Respond with exactly: "WORKING"',
          },
        ],
        max_tokens: 100,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://vitap-learnhub.com',
          'X-Title': 'VITAP LearnHub',
        },
        timeout: 30000,
      }
    );
    
    log('✓', 'Successfully connected to OpenRouter API');
    passedTests++;
  } catch (error) {
    log('✗', `API connection failed: ${error.message}`);
    failedTests++;
    return;
  }

  // Test 3: Text Generation
  console.log(`\n${colors.blue}Test 3: Text Generation${colors.reset}`);
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-3.5-turbo-instruct',
        messages: [
          {
            role: 'user',
            content: 'Generate a one-sentence explanation of what an array is in programming.',
          },
        ],
        max_tokens: 200,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://vitap-learnhub.com',
          'X-Title': 'VITAP LearnHub',
        },
        timeout: 30000,
      }
    );
    
    const text = response.data?.choices?.[0]?.message?.content;
    if (text && text.length > 0) {
      log('✓', `Text generation successful (${text.length} chars)`);
      console.log(`  Sample: "${text.substring(0, 80)}..."`);
      passedTests++;
    } else {
      log('✗', 'Generated empty response');
      failedTests++;
    }
  } catch (error) {
    log('✗', `Text generation failed: ${error.message}`);
    failedTests++;
  }

  // Test 4: JSON Generation
  console.log(`\n${colors.blue}Test 4: JSON Generation${colors.reset}`);
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-3.5-turbo-instruct',
        messages: [
          {
            role: 'user',
            content: 'Return ONLY valid JSON: {"status": "ok", "message": "test"}',
          },
        ],
        max_tokens: 200,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://vitap-learnhub.com',
          'X-Title': 'VITAP LearnHub',
        },
        timeout: 30000,
      }
    );
    
    const text = response.data?.choices?.[0]?.message?.content;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      log('✓', `JSON generation successful`);
      console.log(`  Parsed: ${JSON.stringify(parsed).substring(0, 100)}`);
      passedTests++;
    } else {
      log('✗', 'No JSON found in response');
      failedTests++;
    }
  } catch (error) {
    log('✗', `JSON generation failed: ${error.message}`);
    failedTests++;
  }

  // Test 5: Quiz Simulation
  console.log(`\n${colors.blue}Test 5: Quiz Generation Simulation${colors.reset}`);
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-3.5-turbo-instruct',
        messages: [
          {
            role: 'user',
            content: `Generate 1 multiple-choice question as JSON only:
[
  {
    "question": "What is 2+2?",
    "options": ["3", "4", "5", "6"],
    "correctAnswer": "4",
    "difficulty": "EASY"
  }
]`,
          },
        ],
        max_tokens: 300,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://vitap-learnhub.com',
          'X-Title': 'VITAP LearnHub',
        },
        timeout: 30000,
      }
    );
    
    const text = response.data?.choices?.[0]?.message?.content;
    const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (jsonMatch) {
      const questions = JSON.parse(jsonMatch[0]);
      if (Array.isArray(questions) && questions.length >= 1) {
        log('✓', `Quiz generation simulation successful (${questions.length} questions)`);
        passedTests++;
      } else {
        log('✗', 'Questions array is invalid');
        failedTests++;
      }
    } else {
      log('✗', 'No JSON array found in response');
      failedTests++;
    }
  } catch (error) {
    log('✗', `Quiz simulation failed: ${error.message}`);
    failedTests++;
  }

  // Test 6: AI Tutor Simulation
  console.log(`\n${colors.blue}Test 6: AI Tutor Simulation${colors.reset}`);
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-3.5-turbo-instruct',
        messages: [
          {
            role: 'user',
            content: 'Explain binary search in 2-3 sentences.',
          },
        ],
        max_tokens: 300,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://vitap-learnhub.com',
          'X-Title': 'VITAP LearnHub',
        },
        timeout: 30000,
      }
    );
    
    const text = response.data?.choices?.[0]?.message?.content;
    if (text && text.length > 0) {
      log('✓', `AI Tutor simulation successful (${text.length} chars)`);
      passedTests++;
    } else {
      log('✗', 'Generated empty response');
      failedTests++;
    }
  } catch (error) {
    log('✗', `AI Tutor simulation failed: ${error.message}`);
    failedTests++;
  }

  // Summary
  console.log(`\n${colors.cyan}=== HEALTH CHECK SUMMARY ===${colors.reset}\n`);
  const totalTests = passedTests + failedTests;
  const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
  
  console.log(`Passed: ${colors.green}${passedTests}${colors.reset}`);
  console.log(`Failed: ${colors.red}${failedTests}${colors.reset}`);
  console.log(`Total:  ${totalTests}`);
  console.log(`Success Rate: ${successRate}%\n`);

  if (failedTests === 0) {
    console.log(`${colors.green}✓ All tests passed! OpenRouter API is ready.${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.red}✗ Some tests failed. Check configuration.${colors.reset}\n`);
    process.exit(1);
  }
}

// Run health check
runHealthCheck().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset} ${error.message}`);
  process.exit(1);
});