# TODO: Critical Security and API Refactoring

This is a list of critical changes required to make the application secure and robust.

## 1. 🚨 CRITICAL: Move API Key to a Secure Backend

**Problem:** The Gemini API key is currently stored in the frontend code (`import.meta.env.VITE_API_KEY`) and used directly on the client-side. This is a major security vulnerability. Anyone using your app can easily find your API key and use it, which could lead to significant, unexpected costs on your Google Cloud bill.

**Solution:** You MUST move all API calls to a secure backend environment (e.g., a Node.js/Express server, a Python/FastAPI server, or serverless functions like Google Cloud Functions, AWS Lambda, or Vercel Functions).

### Example Backend (Node.js/Express)

Here is a conceptual example of a backend endpoint that would securely handle the API request for the "Chain Reaction" game.

**`server.js`**
```javascript
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors()); // Configure this for your specific domain in production

// IMPORTANT: Use environment variables to store your API key securely on the server.
// DO NOT hardcode it.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/generate-chain-reaction', async (req, res) => {
  const { theme, linkCount, language } = req.body;

  if (!theme) {
    return res.status(400).json({ error: 'Theme is required.' });
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    // This is where you would place your prompt generation logic from geminiService.ts
    const prompt = `...`; // Your prompt here

    const result = await model.generateContent(prompt);
    const text = await result.response.text();
    
    // You can even do the JSON cleaning and validation here
    // const parsedData = safeJson(text);
    // res.json(parsedData);

    res.send(text); // For simplicity, sending raw text back to client to parse

  } catch (error) {
    console.error('API call failed:', error);
    res.status(500).json({ error: 'Failed to generate game data.' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

### Frontend Change (`geminiService.ts`)

Your frontend service would then call this new backend endpoint instead of the Google API directly.

```typescript
// Example of what generateChainReactionRound would become
export async function generateChainReactionRound(theme: string, linkCount: number, language: string) {
  const response = await fetch('http://localhost:3001/api/generate-chain-reaction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ theme, linkCount, language }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch from backend.');
  }

  const data = await response.json();
  return data;
}
```

## 2. Refactor API Service for Robustness

**Problem:** The current `geminiService.ts` throws generic errors and relies on fragile string parsing.

**Solution:**
- **Return `{ data, error }` objects:** Instead of throwing errors, have each function return an object like `{ data: YourType | null, error: string | null }`. This lets the UI easily check for failures without `try/catch` blocks and display user-friendly messages.
- **Use JSON Mode:** For models that support it, instruct the Gemini API to return a JSON object directly. This is far more reliable than generating text and then cleaning it up.

**Example with JSON Mode and better return types:**
```typescript
/*
// This is a conceptual example of how to use JSON mode
// It requires a model version that supports it.

const result = await model.generateContent(
  [
    { text: "Generate a story about a magic backpack." },
  ],
  {
    // ... other parameters
    responseMimeType: "application/json", 
  }
);
*/
```
