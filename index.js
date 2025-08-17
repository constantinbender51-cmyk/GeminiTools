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
    description: 'Push a short message via ntfy.sh',
    parameters: {
      type: 'object',
      properties: { text: { type: 'string' } },
      required: ['text']
    }
  }
];

// ---------- handler ----------
async function getTime() {
  return new Date().toISOString();
}


async function sendNote(text) {
  await fetch(`https://ntfy.sh/${process.env.NTFY_TOPIC}`, {
    method: 'POST',
    headers: { Title: 'Gemini' },
    body: text
  });
  console.log('Gemini pushed:', text);
}

(async () => {
  console.log('🟢 starting');
  const prompt =
  'Use getTime() to fetch the current UTC time as a plain string. ' +
  'Then call sendNote() with that exact string (no JSON, no quotes, just the ISO text).';

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    tools: [{ functionDeclarations: tools }]
  });

  console.log('📦 Gemini raw response:', JSON.stringify(result.response, null, 2));

  const calls = result.response.functionCalls?.() ?? [];
  console.log('🔧 calls found:', calls.length);

  for (const call of result.response.functionCalls() ?? []) {
  let res = '';
  switch (call.name) {
    case 'getTime':
      res = await getTime();
      break;
    case 'sendNote':
      await sendNote(call.args.text);
      break;
  }

  // 👇 feed the value back to Gemini
  await model.generateContent({
    contents: [{
      role: 'function',
      name: call.name,
      parts: [{ text: res }]
    }]
  });
}

})();
