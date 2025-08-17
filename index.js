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
  const chat = model.startChat({ tools: [{ functionDeclarations: tools }] });

  // Turn 1: ask Gemini to call getTime
  const res1 = await chat.sendMessage('Please call getTime().');
  const call1 = res1.response.functionCalls()?.[0];
  if (!call1) return;

  const time = await getTime();
  await chat.sendMessage([{ functionResponse: { name: 'getTime', response: { time } } }]);

  // Turn 2: now ask Gemini to send the time
  const res2 = await chat.sendMessage('Now call sendNote() with the exact time string.');
  const call2 = res2.response.functionCalls()?.[0];
  if (call2?.name === 'sendNote') await sendNote(call2.args.text);
})();
