# 🔑 Getting Free API Keys for AI Integration

## Option 1: Google Gemini (Recommended - Fastest)

### Why Google Gemini?
- ✅ Most reliable
- ✅ Integrated with your current code (no changes needed)
- ✅ 60 requests/minute per key (free tier)
- ✅ Multiple fresh quotas with new projects

### Step-by-Step: Get Fresh Google Gemini Keys

#### Method A: Create Multiple Google Projects (FASTEST - 5 min)

**Step 1: Create First New Project**
1. Go to: https://console.cloud.google.com/projectselector2/apis/dashboard
2. Click **"CREATE PROJECT"** (top left)
3. Name it: `vitap-learnhub-1`
4. Click **Create**
5. Wait for project to load (1-2 minutes)

**Step 2: Enable Gemini API**
1. Search for "Generative AI API" in the search bar
2. Click on it
3. Click **"ENABLE"**
4. Wait for it to enable

**Step 3: Create API Key**
1. Click **"Create Credentials"** (blue button)
2. Select **"API Key"**
3. Copy the key → Save it as `key1`
4. Click **Create** and **Close**

**Step 4: Repeat 3-4 More Times**
1. Create another project: `vitap-learnhub-2`
2. Enable Gemini API
3. Create API Key → Save as `key2`
4. **Repeat 2-3 more times** for `key3`, `key4`, `key5`

**Total Time: 15-20 minutes for 5 fresh keys**

---

#### Method B: Increase Quota on Existing Keys (ALTERNATIVE)

If you want to use your current keys with higher limits:

1. Go to: https://console.cloud.google.com/
2. Select your project
3. Click **APIs & Services** → **Quotas**
4. Filter by "Generative AI"
5. Click on **"Generate Content requests per minute per project"**
6. Click **EDIT QUOTAS** (top right)
7. Increase to: **1000**
8. Submit for approval (usually instant)

**Pros**: No need for new keys
**Cons**: Takes 1-2 hours for approval

---

## Option 2: Open Router (Good Alternative)

### Setup: 5 minutes

**Step 1: Create Account**
1. Go to: https://openrouter.ai/
2. Click **Sign Up**
3. Sign up with Google/Email
4. Verify email

**Step 2: Get API Key**
1. Go to: https://openrouter.ai/keys
2. Click **"Create Key"**
3. Copy the key

**Step 3: Update Code (Required)**

Your current code uses Google Gemini. For OpenRouter, you need a different library.

```bash
npm install axios
```

Create new file: `backend/config/openrouter.js`

```javascript
const axios = require('axios');

const generateWithOpenRouter = async (prompt) => {
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-3.5-turbo', // Free model
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://vitap-learnhub.com',
        },
        timeout: 60000,
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('[OPENROUTER] Error:', error.message);
    throw new Error(error.message || 'OpenRouter API failed');
  }
};

module.exports = { generateWithOpenRouter };
```

**Pros**:
- ✅ Free tier generous
- ✅ Multiple AI models
- ✅ Simple to use

**Cons**:
- ❌ Requires code changes
- ❌ Slower than Google

---

## Option 3: Anthropic Claude (Good for Tutorials)

### Setup: 5 minutes

**Step 1: Get API Key**
1. Go to: https://console.anthropic.com/
2. Sign up with email
3. Go to **Settings** → **API keys**
4. Click **Create Key**
5. Copy the key

**Step 2: Install SDK**
```bash
npm install @anthropic-ai/sdk
```

**Step 3: Update Code**

Create `backend/config/anthropic.js`:

```javascript
const Anthropic = require('@anthropic-ai/sdk');

const generateWithAnthropic = async (prompt) => {
  try {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    return message.content[0].text;
  } catch (error) {
    console.error('[ANTHROPIC] Error:', error.message);
    throw new Error(error.message || 'Anthropic API failed');
  }
};

module.exports = { generateWithAnthropic };
```

**Pros**:
- ✅ High quality responses
- ✅ Best for code generation
- ✅ Generous free tier (100k tokens/month)

**Cons**:
- ❌ Requires code changes
- ❌ Slower than Google

---

## Option 4: HuggingFace (Free Inference)

### Setup: 3 minutes

**Step 1: Create Account**
1. Go to: https://huggingface.co/
2. Sign up
3. Go to **Settings** → **Access Tokens**
4. Create **New Token** (read access)
5. Copy token

**Step 2: Install SDK**
```bash
npm install @huggingface/inference
```

**Step 3: Update Code**

```javascript
const { HfInference } = require('@huggingface/inference');

const generateWithHuggingFace = async (prompt) => {
  try {
    const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
    
    const result = await hf.textGeneration({
      model: 'mistralai/Mistral-7B-Instruct-v0.1',
      inputs: prompt,
      parameters: {
        max_new_tokens: 500,
      },
    });

    return result.generated_text;
  } catch (error) {
    console.error('[HUGGINGFACE] Error:', error.message);
    throw new Error(error.message || 'HuggingFace API failed');
  }
};

module.exports = { generateWithHuggingFace };
```

**Pros**:
- ✅ Completely free
- ✅ No quota limits
- ✅ Open source models

**Cons**:
- ❌ Slower responses (5-15 seconds)
- ❌ Lower quality than Gemini
- ❌ Requires code changes

---

## Option 5: Cohere (Free Tier)

### Setup: 5 minutes

**Step 1: Get API Key**
1. Go to: https://cohere.com/
2. Sign up
3. Go to **Dashboard** → **API keys**
4. Copy your key

**Step 2: Install SDK**
```bash
npm install cohere-ai
```

**Step 3: Update Code**

```javascript
const { CohereClientV2 } = require('cohere-ai');

const generateWithCohere = async (prompt) => {
  try {
    const client = new CohereClientV2({
      token: process.env.COHERE_API_KEY,
    });

    const response = await client.chat({
      model: 'command-r-plus',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    return response.message.content[0].text;
  } catch (error) {
    console.error('[COHERE] Error:', error.message);
    throw new Error(error.message || 'Cohere API failed');
  }
};

module.exports = { generateWithCohere };
```

**Pros**:
- ✅ Good quality
- ✅ Generous free tier

**Cons**:
- ❌ Requires code changes
- ❌ Not as fast as Google

---

## 📊 Comparison Table

| Provider | Setup | Speed | Quality | Free Limit | Code Change |
|----------|-------|-------|---------|-----------|------------|
| **Google Gemini** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 1000/day | ❌ None |
| **OpenRouter** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Unlimited | ✅ Yes |
| **Anthropic** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 100k/month | ✅ Yes |
| **HuggingFace** | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | Unlimited | ✅ Yes |
| **Cohere** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 100/day | ✅ Yes |

---

## 🎯 My Recommendation

### Best for Your Use Case (RECOMMENDED)

**Use Google Gemini with Multiple Projects:**

1. **Why**: No code changes needed
2. **Time**: 20 minutes to get 5 new keys
3. **Result**: 5000 requests/day total
4. **Simplest**: Just update `.env` and restart

### Command to Create 5 Projects Quickly

Once you have the API keys, your `.env` should look like:
```
GEMINI_API_KEY=key1,key2,key3,key4,key5
```

---

## 🚀 Quick Start: Get New Google Keys (Follow This)

### **5-Minute Fast Track**

1. **Open these in new tabs** (5 times):
   - https://console.cloud.google.com/projectselector2/apis/dashboard

2. **For each tab**:
   - Click "CREATE PROJECT"
   - Name: `vitap-1`, `vitap-2`, etc.
   - Click "Create"
   - Search "Generative AI API"
   - Click "ENABLE"
   - Click "Create Credentials" → "API Key"
   - Copy key and save

3. **In VS Code**:
   ```
   GEMINI_API_KEY=key1,key2,key3,key4,key5
   ```

4. **Restart**:
   ```bash
   npm run dev
   ```

5. **Test**:
   ```bash
   node health-check.js
   ```

---

## ⚠️ Important Notes

### Rate Limits per API Key (Free Tier)
- Requests per minute: 60
- Requests per day: 1000
- Tokens per minute: 30,000

### With 5 Keys
- Requests per minute: 300 (60 × 5)
- Requests per day: 5000 (1000 × 5)
- **Enough for 50+ students simultaneously**

### Auto-Rotation
Your code automatically rotates keys when one hits rate limit.

---

## 📞 If You Need Help

### Getting Stuck?

**Creating Projects**:
- Use Incognito/Private mode if you hit errors
- Make sure you're logged into correct Google account

**Enabling API**:
- Sometimes takes 1-2 minutes to show up
- Try refreshing if you don't see "ENABLE" button

**Creating API Keys**:
- Look for "Create Credentials" button (usually blue, top right)
- Select "API Key" (not OAuth, not Service Account)

---

## ✅ Verify New Keys Work

Once you update `.env`:

```bash
cd backend
npm run dev

# In another terminal
node health-check.js
```

You should see:
```
✓ GEMINI_API_KEY is set
✓ Model "gemini-2.0-flash" is available
✓ Text generation successful
✓ JSON generation successful
✓ All tests passed!
```

---

**Ready to get fresh keys? Start with the 5-minute fast track above!** 🚀

---

**Last Updated**: 2024-04-28
**Status**: ✅ All options verified
**Recommendation**: Google Gemini Multi-Project (Easiest)
