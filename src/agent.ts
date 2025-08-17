import 'dotenv/config';
import {
  GoogleGenerativeAI,
  SchemaType
} from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// ---------- STATE ----------
interface State {
  energy: number;
  temp: number;
  step: number;
}
const state: State = { energy: 100, temp: 22, step: 0 };

// ---------- TOOLS ----------
async function notify(message: string): Promise<string> {
  await fetch(`https://ntfy.sh/${process.env.NTFY_TOPIC}`, {
    method: 'POST',
    headers: { Title: 'Gemini-Secretary' },
    body: message
  });
  return 'notified';
}

function perceive(): string {
  state.temp += (Math.random() - 0.5) * 2;
  state.energy -= 1;
  return JSON.stringify(state);
}

function act(action: 'idle' | 'seek_heat' | 'seek_cool' | 'recharge'): string {
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
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
      required: []
    }
  },
  {
    name: 'act',
    description: 'Perform an action.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        action: {
          type: SchemaType.STRING,
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
      type: SchemaType.OBJECT,
      properties: {
        message: { type: SchemaType.STRING }
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

    const chat = model.startChat({
      tools: [{ functionDeclarations: tools }]
    });
    const result = await chat.sendMessage(prompt);

    // Execute each function call and return the result
    for (const call of result.response.functionCalls() ?? []) {
      const { name, args } = call;
      let res = '';
      switch (name) {
        case 'perceive': res = perceive(); break;
        case 'act':      res = act(args.action as string); break;
        case 'notify':   res = await notify(args.message as string); break;
      }
      // Optional: send results back to Gemini
      await chat.sendMessage([{ functionResponse: { name, response: res } }]);
    }

    state.step += 1;
    await new Promise(r => setTimeout(r, 5000));
  }
})();
