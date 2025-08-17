import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// ---------- STATE ----------
interface State {
  energy: number;   // 0-100
  temp: number;     // °C
  step: number;
}
const state: State = { energy: 100, temp: 22, step: 0 };

// ---------- TOOLS ----------
async function notify(message: string) {
  await fetch(`https://ntfy.sh/${process.env.NTFY_TOPIC}`, {
    method: 'POST',
    headers: { Title: 'Gemini-Secretary' },
    body: message
  });
}

function perceive() {
  state.temp += (Math.random() - 0.5) * 2;
  state.energy -= 1;
  return JSON.stringify(state);
}

function act(action: 'idle' | 'seek_heat' | 'seek_cool' | 'recharge') {
  switch (action) {
    case 'seek_heat':  state.temp += 1.5; break;
    case 'seek_cool':  state.temp -= 1.5; break;
    case 'recharge':   state.energy = Math.min(100, state.energy + 30); break;
    case 'idle':       break;
  }
  return JSON.stringify(state);
}

// ---------- TOOL DEFINITIONS ----------
const tools = [
  {
    name: 'perceive',
    description: 'Read current sensor values (energy, temp).',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'act',
    description: 'Perform an action.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['idle', 'seek_heat', 'seek_cool', 'recharge']
        }
      },
      required: ['action']
    }
  },
  {
    name: 'notify',
    description: 'Push a message to the user.',
    parameters: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      },
      required: ['message']
    }
  }
];

// ---------- MAIN LOOP ----------
(async () => {
  for (let i = 0; i < 10; i++) {
    const prompt = `
You are an embodied agent with the following state:
${JSON.stringify(state, null, 2)}

Use perceive() to check sensors, then act() once, then notify() a short sentence describing what you did and why.
`;

    const chat = model.startChat({ tools });
    const result = await chat.sendMessage(prompt);

    // Gemini may return multiple function calls
    for (const part of result.response.functionCalls() ?? []) {
      const { name, args } = part;
      let res = '';
      switch (name) {
        case 'perceive':  res = perceive(); break;
        case 'act':       res = act(args.action); break;
        case 'notify':    res = await notify(args.message); break;
      }
      // Send the tool result back to Gemini (optional here)
      await chat.sendMessage([{ functionResponse: { name, response: res } }]);
    }

    state.step += 1;
    await new Promise(r => setTimeout(r, 5000));
  }
})();
