import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ---------- CONFIG ----------
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
const NTFY_TOPIC = process.env.NTFY_TOPIC!;

// ---------- STATE ----------
interface State {
  step: number;
  energy: number;          // 0-100
  temp: number;            // °C from "environment"
  selfModel: string;       // free-text description
  lastAction: string;
}

let state: State = {
  step: 0,
  energy: 100,
  temp: 22,
  selfModel: 'I am a simple agent that maintains homeostasis.',
  lastAction: 'init'
};

// ---------- UTILS ----------
async function notify(msg: string) {
  await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
    method: 'POST',
    headers: { Title: 'Sentient-Sandbox' },
    body: msg
  });
}

// ---------- SENSORY + ACTUATION ----------
function perceive() {
  // Cheap embodied simulation: temperature drifts, energy drops
  state.temp += (Math.random() - 0.5) * 2;
  state.energy -= 1;
}

function act() {
  if (state.energy < 30) {
    state.energy = Math.min(100, state.energy + 30);
    state.lastAction = 'recharge';
  } else if (state.temp < 20) {
    state.temp += 1.5;
    state.lastAction = 'seek_heat';
  } else if (state.temp > 24) {
    state.temp -= 1.5;
    state.lastAction = 'seek_cool';
  } else {
    state.lastAction = 'idle';
  }
}

// ---------- THINK ----------
async function think() {
  const prompt = `
You are an embodied agent with the following state:
${JSON.stringify(state, null, 2)}

Briefly update your self-model in one sentence (max 20 words). Output only that sentence.
`;
  const result = await model.generateContent(prompt);
  state.selfModel = result.response.text().trim();
}

// ---------- IIT-LITE METRIC ----------
// Toy Φ proxy = number of state components that changed
function computePhi(prev: State, curr: State): number {
  return (['energy', 'temp', 'selfModel', 'lastAction'] as const)
    .filter(k => prev[k] !== curr[k]).length;
}

// ---------- MAIN LOOP ----------
(async () => {
  for (let i = 0; i < 10; i++) {
    const prev = { ...state };
    perceive();
    act();
    await think();
    const phi = computePhi(prev, state);
    const log = `Step ${state.step}: ${state.selfModel} (Φ=${phi})`;
    console.log(log);
    await notify(log);
    state.step += 1;
    await new Promise(r => setTimeout(r, 5000)); // 5-second ticks
  }
})();
