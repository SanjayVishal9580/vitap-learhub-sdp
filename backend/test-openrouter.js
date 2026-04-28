const axios = require('axios');
require('dotenv').config();

const testOpenRouterKey = async () => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  console.log('=== Testing OpenRouter API Key ===\n');
  
  if (!apiKey) {
    console.error('❌ ERROR: OPENROUTER_API_KEY not found in .env');
    return;
  }
  
  console.log(`✓ API Key found: ${apiKey.substring(0, 15)}...`);
  console.log(`✓ Key length: ${apiKey.length}`);
  console.log(`\nTesting with simple API call...\n`);
  
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: 'Say "test successful" only',
          },
        ],
        temperature: 0.3,
        max_tokens: 100,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://vitap-learnhub.com',
          'X-Title': 'VITAP LearnHub',
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );
    
    const text = response.data?.choices?.[0]?.message?.content;
    console.log('✅ SUCCESS! OpenRouter API is working');
    console.log(`Response: ${text}`);
    
  } catch (error) {
    const status = error.response?.status;
    const errorMsg = error.response?.data?.error?.message || error.message;
    
    console.error(`\n❌ ERROR [Status ${status}]: ${errorMsg}`);
    
    if (status === 401) {
      console.error('\n⚠️  401 Unauthorized - Your API key is invalid or expired');
      console.error('   Action: Generate a new API key from https://openrouter.ai/keys');
    } else if (status === 429) {
      console.error('\n⚠️  429 Rate Limited - Too many requests');
    } else if (status >= 500) {
      console.error('\n⚠️  Server Error - OpenRouter service is having issues');
    }
  }
};

testOpenRouterKey();
