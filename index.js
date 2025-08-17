import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// ---------- tiny world state ----------
let state = { energy: 100, temp: 22 };

// ---------- two tools ----------
const tools = [
  {
    name: 'perceive',
    description: 'Read current sensors (energy and temperature). Returns JSON string.',
    parameters: { type: SchemaType.OBJECT, properties: {}, required: [] }
  },
  {
    name: 'sendNote',
    description: 'Push a short message to the user via ntfy.sh',
    parameters: {
      type: SchemaType.OBJECT,
      properties: { text: { type: SchemaType.STRING } },
      required: ['text']
    }
  }
];

async function perceive() {
  state.temp += (Math.random() - 0.5) * 2; // drift
  state.energy -= 1;                       // drain
  return JSON.stringify(state);
}

async function sendNote(text) {
  await fetch(`https://ntfy.sh/${process.env.NTFY_TOPIC}`, {
    method: 'POST',
    headers: { Title: 'Gemini says' },
    body: text
  });
  return 'sent';
}

// ---------- run once ----------
(async () => {
  const prompt =
    'You are an embodied agent. Use perceive() to check your sensors, then decide if you want to send a note.';

  const chat = model.startChat({ tools: [{ functionDeclarations: tools }] });
  const result = await chat.sendMessage(prompt);

  for (const call of result.response.functionCalls() ?? []) {
    let res = '';
    switch (call.name) {
      case 'perceive': res = await perceive(); break;
      case 'sendNote': res = await sendNote(call.args.text); break;
    }
    // Optional: feed result back
    await chat.sendMessage({
  functionResponse: {
    name: call.name,
    response: { result: call.name === 'sendNote' ? res : JSON.parse(res) }
  }
});

  }
})();
