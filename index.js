import 'dotenv/config';
import express from 'express';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// ---------- tools ----------
const tools = [
  {
    name: 'getTime',
    description: 'Return current UTC time as ISO string',
    parameters: { type: SchemaType.OBJECT, properties: {}, required: [] }
  },
  {
    name: 'sendNote',
    description: 'Push a message via ntfy.sh',
    parameters: { type: SchemaType.OBJECT, properties: { text: { type: SchemaType.STRING } }, required: ['text'] }
  }
];

const registry = {
  getTime: () => new Date().toISOString(),
  sendNote: async (text) => {
    await fetch(`https://ntfy.sh/${process.env.NTFY_TOPIC}`, {
      method: 'POST',
      headers: { Title: 'Sentient-AI' },
      body: text
    });
  }
};

// ---------- route ----------
app.post('/ask', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).send('Missing prompt');

  try {
    const chat = model.startChat({ tools: [{ functionDeclarations: tools }] });
    const result = await chat.sendMessage(prompt);

    for (const call of result.response.functionCalls() ?? []) {
      if (registry[call.name]) {
        await registry[call.name](...Object.values(call.args));
      }
    }

    res.json({ reply: result.response.text() });
  } catch (e) {
    res.status(500).send(e.message);
  }
});

// ---------- health ----------
app.get('/', (_req, res) => res.send('Sentient-AI alive 🚂'));

app.listen(port, () => console.log(`Listening on ${port}`));
