
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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

(async () => {
  const prompt =
    'Use getTime() once and then immediately use sendNote() with the exact string returned.';

  const chat = model.startChat({ tools: [{ functionDeclarations: tools }] });
  const res = await chat.sendMessage(prompt);

  for (const call of res.response.functionCalls() ?? []) {
    if (registry[call.name]) {
      const result = await registry[call.name](...Object.values(call.args));
      if (call.name === 'getTime') await registry.sendNote(result);
    }
  }
})();
