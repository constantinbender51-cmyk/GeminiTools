import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// ---------- tool definitions ----------
const tools = [
  {
    name: 'getTime',
    description: 'Return current UTC time as ISO string',
    parameters: { type: SchemaType.OBJECT, properties: {}, required: [] }
  },
  {
    name: 'sendNote',
    description: 'Push a short message via ntfy.sh',
    parameters: {
      type: SchemaType.OBJECT,
      properties: { text: { type: SchemaType.STRING } },
      required: ['text']
    }
  }
];

// ---------- handlers ----------
async function getTime()   { return new Date().toISOString(); }
async function sendNote(t) {
  await fetch(`https://ntfy.sh/${process.env.NTFY_TOPIC}`, {
    method: 'POST',
    headers: { Title: 'Gemini' },
    body: t
  });
}

// ---------- single turn ----------
(async () => {
  const prompt =
    'Use getTime() to fetch the UTC time, then immediately use sendNote() with that exact string.';

  const chat = model.startChat({ tools: [{ functionDeclarations: tools }] });
  const res = await chat.sendMessage(prompt);

  for (const call of res.response.functionCalls() ?? []) {
    let out;
    switch (call.name) {
      case 'getTime': out = await getTime(); break;
      case 'sendNote': out = await sendNote(call.args.text); break;
    }
    // feed back only if you want another turn
    await chat.sendMessage([{ functionResponse: { name: call.name, response: { result: out } } }]);
  }
})();
