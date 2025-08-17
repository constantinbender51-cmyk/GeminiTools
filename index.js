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
  const prompt = 'Check the time and decide what short note you want to send yourself and use sendNote().';
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    tools: [{ functionDeclarations: tools }]
  });

  const call = result.response.functionCalls()?.[0];
switch (call?.name) {
  case 'getTime':  await getTime(); break;
  case 'sendNote': await sendNote(call.args.text); break;
}
})();
