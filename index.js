import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const tools = [{
  name: 'sendNote',
  description: 'Push a short message to the user via ntfy.sh',
  parameters: {
    type: SchemaType.OBJECT,
    properties: { text: { type: SchemaType.STRING } },
    required: ['text']
  }
}];

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
    'Use getTime() to fetch the current UTC time, then use sendNote() to send that exact time string.';

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    tools: [{ functionDeclarations: tools }]
  });

  console.log('📦 Gemini raw response:', JSON.stringify(result.response, null, 2));

  const calls = result.response.functionCalls?.() ?? [];
  console.log('🔧 calls found:', calls.length);

  for (const call of calls) {
    console.log('→ executing', call.name, call.args);
    switch (call.name) {
      case 'getTime':
        const t = await getTime();
        console.log('⏰ time', t);
        break;
      case 'sendNote':
        await sendNote(call.args.text);
        console.log('📤 sent', call.args.text);
        break;
    }
  }
})();
