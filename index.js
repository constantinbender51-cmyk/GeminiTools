import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const tools = [
  {
    name: 'getTime',
    description: 'Return current UTC time as ISO string',
    parameters: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'sendNote',
    description: 'Push a message via ntfy.sh',
    parameters: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] }
  }
];

async function getTime() { return new Date().toISOString(); }
async function sendNote(text) {
  await fetch(`https://ntfy.sh/${process.env.NTFY_TOPIC}`, { method: 'POST', headers: { Title: 'Gemini' }, body: text });
}

(async () => {
  const prompt =
    'Call getTime() exactly once and store its return value in a variable called t. ' +
    'Then call sendNote(t). Nothing else.';
  const res = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    tools: [{ functionDeclarations: tools }]
  });

  for (const call of res.response.functionCalls() ?? []) {
    switch (call.name) {
      case 'getTime':
        await getTime();  // we ignore the return here; Gemini already has it
        break;
      case 'sendNote':
  console.log('Gemini wants to send:', JSON.stringify(call.args));
  await sendNote(call.args.text);
  break;

    }
  }
})();
