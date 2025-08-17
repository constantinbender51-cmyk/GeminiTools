import 'dotenv/config';
import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());

// 1️⃣  Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// 2️⃣  Notify via ntfy
async function notify(message) {
  const topic = process.env.NTFY_TOPIC;  // set in Railway vars
  try {
    await fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      headers: { 'Title': 'Gemini Secretary' },
      body: message
    });
  } catch (e) {
    console.error('ntfy error:', e);
  }
}

// 3️⃣  One-time hard-coded test when the app boots
(async () => {
  try {
    const prompt = 'Summarize today’s weather in one sentence.';
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    console.log('Gemini says:', text);
    await notify(text);
  } catch (e) {
    console.error('Startup test failed:', e);
  }
})();

// 4️⃣  Optional: still expose POST /ask for future use
app.post('/ask', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).send('Missing prompt');
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    await notify(text);
    res.json({ answer: text });
  } catch (e) {
    console.error(e);
    res.status(500).send('Gemini error');
  }
});

// Health check
app.get('/', (_req, res) => res.send('Gemini Secretary running 🚂'));

app.listen(port, () => console.log(`Listening on ${port}`));
