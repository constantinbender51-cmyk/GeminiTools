import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { setTimeout } from 'timers/promises';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// ---------- registry ----------
const registry = {
  getTime:  async () => new Date().toISOString(),
  sendNote: async (text) => {
    await fetch(`https://ntfy.sh/${process.env.NTFY_TOPIC}`, {
      method: 'POST',
      headers: { Title: 'Gemini' },
      body: text
    });
    return 'sent';
  }
};

// ---------- auto-build tool definitions ----------
const tools = Object.entries(registry).map(([name, fn]) => ({
  name,
  description: fn.description || name,
  parameters: { type: SchemaType.OBJECT, properties: {}, required: [] }
}));

// ---------- run ----------
(async () => {
  const chat = model.startChat({ tools: [{ functionDeclarations: tools }] });

  let prompt = 'Use any tools you need to accomplish the goal: tell me the exact UTC time.';

  while (true) {
    const res = await chat.sendMessage(prompt);

    const calls = res.response.functionCalls() ?? [];
    if (calls.length === 0) break;

    for (const call of calls) {
      if (!registry[call.name]) continue;

      const result = await registry[call.name](...Object.values(call.args));
      await chat.sendMessage([{
        functionResponse: { name: call.name, response: { result } }
      }]);
      await setTimeout(1000);
    }
  }
})();
