import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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
    headers: { Title: 'Gemini says' },
    body: text
  });
  return 'sent';
}

(async () => {
  const prompt = 'Decide what short note you want to send yourself and use sendNote().';
  const chat = model.startChat({ tools: [{ functionDeclarations: tools }] });
  const result = await chat.sendMessage(prompt);

  for (const call of result.response.functionCalls() ?? []) {
    if (call.name === 'sendNote') {
      await sendNote(call.args.text);
      console.log('Gemini pushed:', call.args.text);
    }
  }
})();
