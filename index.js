import 'dotenv/config';
import express from 'express';
import { GoogleGenAI } from '@google/genai';

const app = express();
const port = process.env.PORT || 3000;   // Railway will inject PORT

app.use(express.json());

const ai = new GoogleGenAI();            // GEMINI_API_KEY from .env

async function notify(message) {
  const topic = process.env.NTFY_TOPIC;  // e.g. my-secret-topic
  try {
    await fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      headers: { 'Title': 'New Message via Secretary Bot' },
      body: message
    });
  } catch (err) {
    console.error('ntfy error:', err);
  }
}

app.post('/ask', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).send('Missing prompt');

  try {
    const { text } = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });

    await notify(text);
    res.json({ answer: text });
  } catch (err) {
    console.error(err);
    res.status(500).send('Gemini error');
  }
});

app.get('/', (_req, res) => res.send('Gemini Secretary alive 🚂'));

app.listen(port, () => console.log(`Listening on ${port}`));
