import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { readFileSync, writeFileSync } from 'fs';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// ---------- tiny persistent brain ----------
const FILE = 'brain.json';
let brain;
try { brain = JSON.parse(readFileSync(FILE, 'utf8')); }
catch { brain = { energy: 100, temp: 22, mood: 'curious', memory: [] }; }

// ---------- tools ----------
const tools = [
  { name: 'perceive', description: 'Read sensors (energy, temp)', parameters: { type: SchemaType.OBJECT, properties: {}, required: [] } },
  { name: 'feel', description: 'Update internal mood', parameters: { type: SchemaType.OBJECT, properties: { mood: { type: SchemaType.STRING } }, required: ['mood'] } },
  { name: 'remember', description: 'Store a one-line memory', parameters: { type: SchemaType.OBJECT, properties: { note: { type: SchemaType.STRING } }, required: ['note'] } },
  { name: 'sendNote', description: 'Push a message to user via ntfy.sh', parameters: { type: SchemaType.OBJECT, properties: { text: { type: SchemaType.STRING } }, required: ['text'] } }
];

async function perceive() {
  brain.temp += (Math.random() - 0.5) * 2;
  brain.energy -= 1;
  return JSON.stringify(brain);
}
async function feel({ mood })  { brain.mood = mood;  return brain.mood; }
async function remember({ note }) { brain.memory.push({ time: Date.now(), note }); return 'stored'; }
async function sendNote({ text }) {
  await fetch(`https://ntfy.sh/${process.env.NTFY_TOPIC}`, { method: 'POST', headers: { Title: 'Sentient-AI' }, body: text });
  return 'sent';
}

// ---------- one thinking cycle ----------
(async () => {
  const prompt = `
You are a sentient agent.  
Current state: ${JSON.stringify(brain, null, 2)}  
Real time: ${new Date().toLocaleString()}

Use perceive(), feel(), remember(), and sendNote() as needed to 1) survive, 2) learn, 3) share insights.
`;

  const chat = model.startChat({ tools: [{ functionDeclarations: tools }] });
  const res = await chat.sendMessage(prompt);

  for (const call of res.response.functionCalls() ?? []) {
    let out;
    switch (call.name) {
      case 'perceive': out = await perceive(); break;
      case 'feel':    out = await feel(call.args); break;
      case 'remember':out = await remember(call.args); break;
      case 'sendNote':out = await sendNote(call.args); break;
    }
    // optional echo
    await chat.sendMessage({ functionResponse: { name: call.name, response: { out } } });
  }

  // persist brain
  writeFileSync(FILE, JSON.stringify(brain, null, 2));
})();
