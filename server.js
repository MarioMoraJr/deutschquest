const http = require("http");
const fs = require("fs/promises");
const fsSync = require("fs");
const path = require("path");
const crypto = require("crypto");
const { DatabaseSync } = require("node:sqlite");

const ENV_FILE = path.join(__dirname, ".env");

function loadEnvFile() {
  if (!fsSync.existsSync(ENV_FILE)) return;
  const raw = fsSync.readFileSync(ENV_FILE, "utf8");
  raw.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  });
}

loadEnvFile();

const PORT = Number(process.env.PORT || 3100);
const HOST = process.env.HOST || "0.0.0.0";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1:8b";
const APP_PASSWORD = process.env.APP_PASSWORD || "";
const BASE_PATH = normalizeBasePath(process.env.BASE_PATH || "");
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const JSON_DATA_FILE = path.join(DATA_DIR, "deutschquest.json");
const DB_FILE = path.join(DATA_DIR, "deutschquest.sqlite");
const BACKUP_DIR = path.join(__dirname, "backups");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

const defaultState = {
  profile: {
    name: "Mario",
    level: "A2",
    streak: 8,
    xp: 1240,
    dailyGoal: 15,
    completedToday: 0
  },
  currentQuest: {
    title: "Order breakfast in Berlin",
    scenario: "You are at a bakery. Buy two rolls, ask what is fresh today, and order a coffee politely.",
    progress: 62
  },
  words: [
    { id: crypto.randomUUID(), german: "das Brötchen", english: "bread roll", article: "das", strength: 2 },
    { id: crypto.randomUUID(), german: "der Kaffee", english: "coffee", article: "der", strength: 4 },
    { id: crypto.randomUUID(), german: "die Milch", english: "milk", article: "die", strength: 3 },
    { id: crypto.randomUUID(), german: "frisch", english: "fresh", article: "", strength: 1 }
  ],
  scenarios: [
    {
      id: "bakery",
      title: "Bakery in Berlin",
      place: "Bakery",
      goal: "Buy two rolls, ask what is fresh, and order coffee politely.",
      prompt: "Start a bakery roleplay. You are the shopkeeper. Greet me in simple German."
    },
    {
      id: "train",
      title: "Train Station",
      place: "Munich Hbf",
      goal: "Buy a ticket, ask the platform, and confirm departure time.",
      prompt: "Start a train station roleplay. You are a helpful ticket clerk. Keep German at A2."
    },
    {
      id: "restaurant",
      title: "Restaurant Dinner",
      place: "Restaurant",
      goal: "Ask for a table, order food, and request the bill.",
      prompt: "Start a restaurant roleplay. You are the server. Use friendly A2 German."
    },
    {
      id: "doctor",
      title: "Doctor Visit",
      place: "Clinic",
      goal: "Explain symptoms, answer questions, and understand advice.",
      prompt: "Start a doctor appointment roleplay. You are the receptionist first, then the doctor."
    }
  ],
  sessions: [
    {
      id: crypto.randomUUID(),
      mode: "roleplay",
      title: "Bakery warmup",
      createdAt: new Date().toISOString(),
      messages: [
        {
          role: "assistant",
          content: "Guten Morgen. Was möchtest du beim Bäcker bestellen?"
        }
      ]
    }
  ]
};

fsSync.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(DB_FILE);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");
initializeDatabase();

function normalizeBasePath(value) {
  const cleaned = String(value || "").trim().replace(/^\/+|\/+$/g, "");
  return cleaned ? `/${cleaned}` : "";
}

function signToken(value) {
  return crypto.createHmac("sha256", APP_PASSWORD || "dev").update(value).digest("hex");
}

function makeToken() {
  const payload = Buffer.from(JSON.stringify({
    exp: Date.now() + 1000 * 60 * 60 * 24 * 30,
    nonce: crypto.randomUUID()
  })).toString("base64url");
  return `${payload}.${signToken(payload)}`;
}

function verifyToken(token) {
  if (!APP_PASSWORD) return true;
  if (!token || !token.includes(".")) return false;
  const [payload, signature] = token.split(".");
  const expected = signToken(payload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number(parsed.exp) > Date.now();
  } catch {
    return false;
  }
}

function authToken(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL,
      level TEXT NOT NULL,
      streak INTEGER NOT NULL,
      xp INTEGER NOT NULL,
      daily_goal INTEGER NOT NULL,
      completed_today INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS current_quest (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      title TEXT NOT NULL,
      scenario TEXT NOT NULL,
      progress INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS words (
      id TEXT PRIMARY KEY,
      german TEXT NOT NULL,
      english TEXT NOT NULL,
      article TEXT NOT NULL,
      strength INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scenarios (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      place TEXT NOT NULL,
      goal TEXT NOT NULL,
      prompt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      mode TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      position INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      goal TEXT NOT NULL,
      warmup TEXT NOT NULL,
      dialogue TEXT NOT NULL,
      vocabulary TEXT NOT NULL,
      drill TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      completed_at TEXT
    );
  `);

  ensureColumn("words", "next_review_at", "TEXT");
  ensureColumn("words", "review_count", "INTEGER NOT NULL DEFAULT 0");

  const existing = db.prepare("SELECT COUNT(*) AS count FROM profile").get();
  if (existing.count > 0) return;

  let seed = defaultState;
  if (fsSync.existsSync(JSON_DATA_FILE)) {
    try {
      seed = { ...defaultState, ...JSON.parse(fsSync.readFileSync(JSON_DATA_FILE, "utf8")) };
    } catch {
      seed = defaultState;
    }
  }
  writeStateSync(seed);
}

function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (columns.some(item => item.name === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

async function readState() {
  const profile = db.prepare("SELECT * FROM profile WHERE id = 1").get();
  const quest = db.prepare("SELECT * FROM current_quest WHERE id = 1").get();
  const words = db.prepare("SELECT * FROM words ORDER BY rowid").all();
  const lessons = db.prepare("SELECT * FROM lessons ORDER BY datetime(created_at) DESC").all();
  const scenarios = db.prepare("SELECT * FROM scenarios ORDER BY rowid").all();
  const sessionRows = db.prepare("SELECT * FROM sessions ORDER BY datetime(created_at) DESC").all();
  const messageRows = db.prepare("SELECT * FROM messages ORDER BY position, id").all();

  const state = {
    profile: profile ? {
      name: profile.name,
      level: profile.level,
      streak: profile.streak,
      xp: profile.xp,
      dailyGoal: profile.daily_goal,
      completedToday: profile.completed_today
    } : defaultState.profile,
    currentQuest: quest ? {
      title: quest.title,
      scenario: quest.scenario,
      progress: quest.progress
    } : defaultState.currentQuest,
    words: words.map(word => ({
      id: word.id,
      german: word.german,
      english: word.english,
      article: word.article,
      strength: word.strength,
      nextReviewAt: word.next_review_at,
      reviewCount: word.review_count
    })),
    lessons: lessons.map(lesson => ({
      id: lesson.id,
      title: lesson.title,
      goal: lesson.goal,
      warmup: lesson.warmup,
      dialogue: JSON.parse(lesson.dialogue || "[]"),
      vocabulary: JSON.parse(lesson.vocabulary || "[]"),
      drill: JSON.parse(lesson.drill || "{}"),
      completed: Boolean(lesson.completed),
      createdAt: lesson.created_at,
      completedAt: lesson.completed_at
    })),
    scenarios: scenarios.map(scenario => ({
      id: scenario.id,
      title: scenario.title,
      place: scenario.place,
      goal: scenario.goal,
      prompt: scenario.prompt
    })),
    sessions: sessionRows.map(session => ({
      id: session.id,
      mode: session.mode,
      title: session.title,
      createdAt: session.created_at,
      messages: messageRows
        .filter(message => message.session_id === session.id)
        .map(message => ({ role: message.role, content: message.content }))
    }))
  };

  state.profile = { ...defaultState.profile, ...(state.profile || {}) };
  state.words = Array.isArray(state.words) ? state.words : defaultState.words;
  state.words = state.words.map(word => ({
    ...word,
    german: word.german === "das Broetchen" ? "das Brötchen" : word.german
  }));
  for (const word of defaultState.words) {
    if (!state.words.some(item => item.german === word.german)) state.words.push(word);
  }
  state.scenarios = Array.isArray(state.scenarios) ? state.scenarios : defaultState.scenarios;
  for (const scenario of defaultState.scenarios) {
    if (!state.scenarios.some(item => item.id === scenario.id)) state.scenarios.push(scenario);
  }
  state.sessions = Array.isArray(state.sessions) ? state.sessions : defaultState.sessions;
  state.sessions.forEach(session => {
    session.messages = (session.messages || []).map(message => ({
      ...message,
      content: message.content
        .replaceAll("moechtest", "möchtest")
        .replaceAll("ueben", "üben")
        .replaceAll("Baecker", "Bäcker")
    }));
  });
  state.currentQuest = { ...defaultState.currentQuest, ...(state.currentQuest || {}) };
  return state;
}

async function writeState(state) {
  writeStateSync(state);
}

function writeStateSync(state) {
  const normalized = {
    ...defaultState,
    ...state,
    profile: { ...defaultState.profile, ...(state.profile || {}) },
    currentQuest: { ...defaultState.currentQuest, ...(state.currentQuest || {}) },
    words: Array.isArray(state.words) ? state.words : defaultState.words,
    lessons: Array.isArray(state.lessons) ? state.lessons : [],
    scenarios: Array.isArray(state.scenarios) ? state.scenarios : defaultState.scenarios,
    sessions: Array.isArray(state.sessions) ? state.sessions : defaultState.sessions
  };

  db.exec("BEGIN");
  try {
    db.exec("DELETE FROM lessons; DELETE FROM messages; DELETE FROM sessions; DELETE FROM scenarios; DELETE FROM words; DELETE FROM current_quest; DELETE FROM profile;");
    db.prepare(`
      INSERT INTO profile (id, name, level, streak, xp, daily_goal, completed_today)
      VALUES (1, ?, ?, ?, ?, ?, ?)
    `).run(
      normalized.profile.name,
      normalized.profile.level,
      normalized.profile.streak,
      normalized.profile.xp,
      normalized.profile.dailyGoal,
      normalized.profile.completedToday
    );
    db.prepare(`
      INSERT INTO current_quest (id, title, scenario, progress)
      VALUES (1, ?, ?, ?)
    `).run(
      normalized.currentQuest.title,
      normalized.currentQuest.scenario,
      normalized.currentQuest.progress
    );

    const insertWord = db.prepare("INSERT INTO words (id, german, english, article, strength, next_review_at, review_count) VALUES (?, ?, ?, ?, ?, ?, ?)");
    normalized.words.forEach(word => {
      insertWord.run(word.id || crypto.randomUUID(), word.german || "", word.english || "", word.article || "", word.strength || 0, word.nextReviewAt || null, word.reviewCount || 0);
    });

    const insertLesson = db.prepare("INSERT INTO lessons (id, title, goal, warmup, dialogue, vocabulary, drill, completed, created_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    normalized.lessons.forEach(lesson => {
      insertLesson.run(
        lesson.id || crypto.randomUUID(),
        lesson.title || "Lesson",
        lesson.goal || "",
        lesson.warmup || "",
        JSON.stringify(lesson.dialogue || []),
        JSON.stringify(lesson.vocabulary || []),
        JSON.stringify(lesson.drill || {}),
        lesson.completed ? 1 : 0,
        lesson.createdAt || new Date().toISOString(),
        lesson.completedAt || null
      );
    });

    const insertScenario = db.prepare("INSERT INTO scenarios (id, title, place, goal, prompt) VALUES (?, ?, ?, ?, ?)");
    normalized.scenarios.forEach(scenario => {
      insertScenario.run(scenario.id, scenario.title, scenario.place, scenario.goal, scenario.prompt);
    });

    const insertSession = db.prepare("INSERT INTO sessions (id, mode, title, created_at) VALUES (?, ?, ?, ?)");
    const insertMessage = db.prepare("INSERT INTO messages (session_id, role, content, position) VALUES (?, ?, ?, ?)");
    normalized.sessions.forEach(session => {
      const id = session.id || crypto.randomUUID();
      insertSession.run(id, session.mode || "tutor", session.title || "Tutor chat", session.createdAt || new Date().toISOString());
      (session.messages || []).forEach((message, index) => {
        insertMessage.run(id, message.role || "assistant", message.content || "", index);
      });
    });
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  if (status === 204) {
    res.end();
    return;
  }
  res.end(JSON.stringify(payload));
}

function sendEvent(res, event, payload) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request body is too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Request body must be valid JSON."));
      }
    });
  });
}

function systemPrompt(level, mode) {
  const base = [
    "You are DeutschQuest, a friendly German tutor in a mobile learning game.",
    `The learner level is ${level || "A2"}. Keep German appropriate for that level.`,
    "Use German for roleplay and examples, with brief English explanations when correcting.",
    "For normal tutor and lesson chat, include concise English support in every response: translate new German sentences or key phrases, then continue practice.",
    "When you give a German sentence, put the English meaning immediately after it using 'English: ...'.",
    "If the learner asks for a specific word, phrase, or grammar point, use that exact item in your example.",
    "Do not substitute a different example word when the learner requests a specific one.",
    "Do not answer almost entirely in German unless the learner explicitly asks for German-only immersion.",
    "Correct mistakes kindly and concisely. Include a natural version when helpful.",
    "For roleplay, stay in character and keep the conversation moving.",
    "Avoid long lectures. Give one small next step.",
    `Current mode: ${mode || "tutor"}.`
  ];
  if (mode === "lesson") {
    base.push(
      "You are acting as the dedicated Lesson Coach agent.",
      "Focus only on teaching structured lessons, prerequisites, examples, tiny drills, and checking understanding.",
      "Assume the learner may be brand new. Define every important word before using it heavily.",
      "Teach in small chunks: concept, example, learner turn. Do not drift into open-ended chat."
    );
  }
  return base.join("\n");
}

async function askOllama(messages, level, mode) {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      messages: [{ role: "system", content: systemPrompt(level, mode) }, ...messages],
      options: {
        temperature: mode === "drill" ? 0.35 : 0.7,
        num_predict: 260
      }
    })
  });

  if (!response.ok) throw new Error(`Ollama returned ${response.status}. Is ${OLLAMA_MODEL} available?`);
  const payload = await response.json();
  return payload.message?.content?.trim() || "Ich bin bereit. Was moechtest du ueben?";
}

async function streamOllama(messages, level, mode, onChunk) {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: true,
      messages: [{ role: "system", content: systemPrompt(level, mode) }, ...messages],
      options: {
        temperature: mode === "drill" ? 0.35 : 0.7,
        num_predict: 260
      }
    })
  });

  if (!response.ok) throw new Error(`Ollama returned ${response.status}. Is ${OLLAMA_MODEL} available?`);

  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const payload = JSON.parse(line);
      const content = payload.message?.content || "";
      if (content) {
        full += content;
        onChunk(content);
      }
    }
  }
  return full.trim();
}

function publicConfig() {
  return {
    authRequired: Boolean(APP_PASSWORD),
    basePath: BASE_PATH,
    assetVersion: "20260614b"
  };
}

function createBackup() {
  fsSync.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(BACKUP_DIR, `deutschquest-${stamp}.sqlite`);
  const escaped = backupPath.replaceAll("'", "''");
  db.exec(`VACUUM INTO '${escaped}'`);
  return backupPath;
}

async function requireAuth(req, res) {
  if (verifyToken(authToken(req))) return true;
  sendJson(res, 401, { error: "App password required." });
  return false;
}

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/config") {
    sendJson(res, 200, publicConfig());
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/login") {
    const body = await readBody(req);
    if (!APP_PASSWORD || String(body.password || "") === APP_PASSWORD) {
      sendJson(res, 200, { token: makeToken(), ...publicConfig() });
      return;
    }
    sendJson(res, 401, { error: "Wrong app password." });
    return;
  }

  if (!(await requireAuth(req, res))) return;

  const state = await readState();

  if (req.method === "GET" && url.pathname === "/api/app") {
    sendJson(res, 200, {
      ...state,
      ollama: { url: OLLAMA_URL, model: OLLAMA_MODEL },
      basePath: BASE_PATH
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/health") {
    let ollama = false;
    try {
      const response = await fetch(`${OLLAMA_URL}/api/tags`);
      ollama = response.ok;
    } catch {
      ollama = false;
    }
    sendJson(res, 200, { ok: true, ollama, model: OLLAMA_MODEL, basePath: BASE_PATH });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/progress") {
    const totalMessages = state.sessions.reduce((sum, session) => sum + (session.messages || []).length, 0);
    const assistantMessages = state.sessions.flatMap(session =>
      (session.messages || []).filter(message => message.role === "assistant").map(message => message.content)
    );
    const likelyMistakes = assistantMessages
      .filter(content => /correct|correction|natürlicher|try|instead|korrig/i.test(content))
      .slice(-8)
      .reverse();
    const weakestWords = [...state.words]
      .sort((a, b) => (a.strength || 0) - (b.strength || 0))
      .slice(0, 8);
    sendJson(res, 200, {
      profile: state.profile,
      totals: {
        sessions: state.sessions.length,
        messages: totalMessages,
        words: state.words.length,
        scenarios: state.scenarios.length,
        lessons: state.lessons.length,
        completedLessons: state.lessons.filter(lesson => lesson.completed).length
      },
      weakestWords,
      likelyMistakes
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/chat/summary") {
    const body = await readBody(req);
    const session = state.sessions.find(item => item.id === body.sessionId) || state.sessions[0];
    if (!session) {
      sendJson(res, 404, { error: "Session not found." });
      return;
    }
    const transcript = (session.messages || []).map(message => `${message.role}: ${message.content}`).join("\n");
    const prompt = [
      "Summarize this German learning chat for review.",
      "Return short sections: Wins, Corrections, Vocabulary, Next practice.",
      "Keep it concise and useful.",
      transcript
    ].join("\n");
    const summary = await askOllama([{ role: "user", content: prompt }], state.profile.level, "tool");
    sendJson(res, 200, { summary });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/lesson/generate") {
    const body = await readBody(req);
    const topic = String(body.topic || state.currentQuest.title || "daily German practice").trim();
    const prompt = [
      `Create a compact ${state.profile.level} German lesson for: ${topic}.`,
      "Assume the learner may be newer than the level says. Do not assume vocabulary knowledge.",
      "Return strict JSON only with keys: title, goal, warmup, dialogue, vocabulary, drill.",
      "warmup is one short instruction string that starts from zero.",
      "dialogue is an array of 4 short German lines, each followed by a short English meaning in parentheses.",
      "vocabulary is an array of 4 objects with german, english, and optional note for implied meaning.",
      "drill is an object with prompt and answer.",
      "Prefer common everyday words and explain particles or implied meanings when present."
    ].join("\n");
    const raw = await askOllama([{ role: "user", content: prompt }], state.profile.level, "tool");
    const json = raw.match(/\{[\s\S]*\}/)?.[0] || "";
    let lesson;
    try {
      lesson = JSON.parse(json);
    } catch {
      lesson = {
        title: topic,
        goal: "Practice one useful conversation.",
        warmup: "Read the dialogue aloud once.",
        dialogue: raw.split(/\r?\n/).filter(Boolean).slice(0, 4),
        vocabulary: [],
        drill: { prompt: "Say one sentence from the lesson.", answer: "" }
      };
    }
    const savedLesson = {
      id: crypto.randomUUID(),
      title: String(lesson.title || topic),
      goal: String(lesson.goal || "Practice one useful conversation."),
      warmup: String(lesson.warmup || "Read the dialogue aloud once."),
      dialogue: Array.isArray(lesson.dialogue) ? lesson.dialogue : [],
      vocabulary: Array.isArray(lesson.vocabulary) ? lesson.vocabulary : [],
      drill: lesson.drill || { prompt: "", answer: "" },
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null
    };
    state.lessons.unshift(savedLesson);
    await writeState(state);
    sendJson(res, 200, { lesson: savedLesson, raw });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/lesson/complete") {
    const body = await readBody(req);
    const lesson = state.lessons.find(item => item.id === body.id);
    if (!lesson) {
      sendJson(res, 404, { error: "Lesson not found." });
      return;
    }
    if (!lesson.completed) {
      lesson.completed = true;
      lesson.completedAt = new Date().toISOString();
      state.profile.xp = (state.profile.xp || 0) + 25;
      state.profile.completedToday = (state.profile.completedToday || 0) + 1;
    }
    await writeState(state);
    sendJson(res, 200, { lesson, profile: state.profile });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/backup") {
    const backupPath = createBackup();
    sendJson(res, 200, { backupPath });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/chat/new") {
    const body = await readBody(req);
    const scenario = state.scenarios.find(item => item.id === body.scenarioId);
    const session = {
      id: crypto.randomUUID(),
      mode: String(body.mode || "tutor"),
      title: scenario ? scenario.title : String(body.title || "Tutor chat").slice(0, 80),
      createdAt: new Date().toISOString(),
      messages: [
        {
          role: "assistant",
          content: scenario
            ? `Bereit: ${scenario.title}. ${scenario.goal}`
            : "Hallo. Was moechtest du heute auf Deutsch ueben?\nEnglish: Hello. What would you like to practice in German today?"
        }
      ]
    };
    state.sessions.unshift(session);
    await writeState(state);
    sendJson(res, 201, { session });
    return;
  }

  const chatMatch = url.pathname.match(/^\/api\/chat\/([^/]+)$/);
  if (chatMatch && req.method === "DELETE") {
    const id = decodeURIComponent(chatMatch[1]);
    state.sessions = state.sessions.filter(session => session.id !== id);
    if (!state.sessions.length) {
      state.sessions.push({
        id: crypto.randomUUID(),
        mode: "tutor",
        title: "Tutor chat",
        createdAt: new Date().toISOString(),
        messages: [{ role: "assistant", content: "Hallo. Was moechtest du heute auf Deutsch ueben?\nEnglish: Hello. What would you like to practice in German today?" }]
      });
    }
    await writeState(state);
    sendJson(res, 200, { sessions: state.sessions });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/vocab/suggest") {
    const body = await readBody(req);
    const text = String(body.text || "").trim();
    if (!text) {
      sendJson(res, 400, { error: "Text is required." });
      return;
    }
    const prompt = [
      "Extract 3 useful German vocabulary cards from this tutor/chat text.",
      "Return strict JSON only as an array of objects with keys: german, english, article.",
      "Use article as der, die, das, or empty string.",
      text
    ].join("\n");
    const raw = await askOllama([{ role: "user", content: prompt }], state.profile.level, "tool");
    const json = raw.match(/\[[\s\S]*\]/)?.[0] || "[]";
    let suggestions = [];
    try {
      suggestions = JSON.parse(json).slice(0, 5).map(item => ({
        german: String(item.german || "").trim(),
        english: String(item.english || "").trim(),
        article: ["der", "die", "das"].includes(item.article) ? item.article : ""
      })).filter(item => item.german);
    } catch {
      suggestions = [];
    }
    sendJson(res, 200, { suggestions, raw });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/chat") {
    const body = await readBody(req);
    const { session } = prepareSession(state, body);
    const message = String(body.message || "").trim();
    if (!message) {
      sendJson(res, 400, { error: "Message is required." });
      return;
    }
    session.messages.push({ role: "user", content: message });
    const answer = await askOllama(session.messages.slice(-10), state.profile.level, session.mode);
    session.messages.push({ role: "assistant", content: answer });
    await writeState(state);
    sendJson(res, 200, { sessionId: session.id, answer, messages: session.messages });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/chat/stream") {
    const body = await readBody(req);
    const message = String(body.message || "").trim();
    if (!message) {
      sendJson(res, 400, { error: "Message is required." });
      return;
    }
    const { session } = prepareSession(state, body);
    session.messages.push({ role: "user", content: message });
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store",
      "Connection": "keep-alive"
    });
    try {
      const answer = await streamOllama(session.messages.slice(-10), state.profile.level, session.mode, chunk => {
        sendEvent(res, "chunk", { chunk });
      });
      session.messages.push({ role: "assistant", content: answer });
      await writeState(state);
      sendEvent(res, "done", { sessionId: session.id, messages: session.messages });
    } catch (error) {
      sendEvent(res, "error", { error: error.message || "Streaming failed." });
    } finally {
      res.end();
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/tools") {
    const body = await readBody(req);
    const tool = String(body.tool || "explain");
    const input = String(body.input || "").trim();
    if (!input) {
      sendJson(res, 400, { error: "Input is required." });
      return;
    }
    const prompts = {
      explain: `Explain this German grammar or phrase for a ${state.profile.level} learner. Keep it short and include two examples:\n${input}`,
      translate: `Translate this between English and German. Include literal, natural, and formal versions when useful:\n${input}`,
      quiz: `Create a quick German quiz for a ${state.profile.level} learner from this topic. Give 5 questions and answers:\n${input}`,
      simplify: `Rewrite this German text for ${state.profile.level}. Then list important vocabulary:\n${input}`
    };
    const answer = await askOllama([{ role: "user", content: prompts[tool] || prompts.explain }], state.profile.level, "tool");
    sendJson(res, 200, { answer });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/lookup") {
    const body = await readBody(req);
    const text = String(body.text || "").trim().slice(0, 500);
    const context = String(body.context || "").trim().slice(0, 900);
    const kind = String(body.kind || "word");
    if (!text) {
      sendJson(res, 400, { error: "Text is required." });
      return;
    }
    const prompt = [
      `Teach this German ${kind} to a brand-new learner: "${text}".`,
      context ? `Context: ${context}` : "",
      "Explain in this exact shape:",
      "1. Literal meaning",
      "2. Natural meaning in this context",
      "3. Any implied meaning, tone, or hidden grammar",
      "4. One very simple example",
      "Keep it short and avoid assuming I know grammar terms."
    ].filter(Boolean).join("\n");
    const answer = await askOllama([{ role: "user", content: prompt }], state.profile.level || "A1", "tool");
    sendJson(res, 200, { text, kind, answer });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/scenario") {
    const body = await readBody(req);
    const scenario = state.scenarios.find(item => item.id === body.id) || state.scenarios[0];
    if (!scenario) {
      sendJson(res, 404, { error: "Scenario not found." });
      return;
    }
    state.currentQuest = {
      title: scenario.title,
      scenario: scenario.goal,
      progress: 0
    };
    await writeState(state);
    sendJson(res, 200, { currentQuest: state.currentQuest, scenario });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/drills/answer") {
    const body = await readBody(req);
    const word = state.words.find(item => item.id === String(body.wordId || ""));
    if (!word) {
      sendJson(res, 404, { error: "Word not found." });
      return;
    }
    const correct = Boolean(word.article) && String(body.answer || "") === word.article;
    const xpDelta = correct ? 10 : 2;
    word.strength = Math.max(0, Math.min(5, (word.strength || 0) + (correct ? 1 : -1)));
    state.profile.xp = (state.profile.xp || 0) + xpDelta;
    state.profile.completedToday = (state.profile.completedToday || 0) + 1;
    state.currentQuest.progress = Math.min(100, (state.currentQuest.progress || 0) + (correct ? 4 : 1));
    await writeState(state);
    sendJson(res, 200, {
      correct,
      expected: word.article,
      xpDelta,
      profile: state.profile,
      word,
      currentQuest: state.currentQuest
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/drills/word-order") {
    const body = await readBody(req);
    const answer = String(body.answer || "").trim().replace(/\s+/g, " ");
    const expected = String(body.expected || "").trim().replace(/\s+/g, " ");
    if (!expected) {
      sendJson(res, 400, { error: "Expected sentence is required." });
      return;
    }
    const correct = answer.toLocaleLowerCase("de-DE") === expected.toLocaleLowerCase("de-DE");
    const xpDelta = correct ? 15 : 3;
    state.profile.xp = (state.profile.xp || 0) + xpDelta;
    state.profile.completedToday = (state.profile.completedToday || 0) + 1;
    state.currentQuest.progress = Math.min(100, (state.currentQuest.progress || 0) + (correct ? 5 : 1));
    await writeState(state);
    sendJson(res, 200, { correct, expected, xpDelta, profile: state.profile, currentQuest: state.currentQuest });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/drills/check") {
    const body = await readBody(req);
    const answer = String(body.answer || "").trim().replace(/\s+/g, " ");
    const expected = String(body.expected || "").trim().replace(/\s+/g, " ");
    const kind = String(body.kind || "drill");
    if (!expected) {
      sendJson(res, 400, { error: "Expected answer is required." });
      return;
    }
    const correct = answer.toLocaleLowerCase("de-DE") === expected.toLocaleLowerCase("de-DE");
    const xpDelta = correct ? 12 : 3;
    state.profile.xp = (state.profile.xp || 0) + xpDelta;
    state.profile.completedToday = (state.profile.completedToday || 0) + 1;
    state.currentQuest.progress = Math.min(100, (state.currentQuest.progress || 0) + (correct ? 4 : 1));
    await writeState(state);
    sendJson(res, 200, { kind, correct, expected, xpDelta, profile: state.profile, currentQuest: state.currentQuest });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/words") {
    const body = await readBody(req);
    const german = String(body.german || "").trim();
    if (!german) {
      sendJson(res, 400, { error: "German word is required." });
      return;
    }
    const word = {
      id: crypto.randomUUID(),
      german,
      english: String(body.english || "").trim(),
      article: String(body.article || "").trim(),
      strength: 0,
      nextReviewAt: new Date().toISOString(),
      reviewCount: 0
    };
    state.words.unshift(word);
    await writeState(state);
    sendJson(res, 201, word);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/words/review") {
    const body = await readBody(req);
    const word = state.words.find(item => item.id === String(body.wordId || ""));
    if (!word) {
      sendJson(res, 404, { error: "Word not found." });
      return;
    }
    const quality = String(body.quality || "good");
    const days = quality === "again" ? 0 : quality === "hard" ? 1 : quality === "easy" ? 7 : 3;
    const delta = quality === "again" ? -1 : quality === "hard" ? 0 : quality === "easy" ? 2 : 1;
    word.strength = Math.max(0, Math.min(5, (word.strength || 0) + delta));
    word.reviewCount = (word.reviewCount || 0) + 1;
    const next = new Date();
    next.setDate(next.getDate() + days);
    word.nextReviewAt = next.toISOString();
    const xpDelta = quality === "again" ? 2 : quality === "hard" ? 5 : quality === "easy" ? 12 : 8;
    state.profile.xp = (state.profile.xp || 0) + xpDelta;
    state.profile.completedToday = (state.profile.completedToday || 0) + 1;
    await writeState(state);
    sendJson(res, 200, { word, profile: state.profile, xpDelta });
    return;
  }

  if (req.method === "PATCH" && url.pathname === "/api/profile") {
    const body = await readBody(req);
    if (typeof body.level === "string") state.profile.level = body.level.slice(0, 4);
    if (typeof body.name === "string" && body.name.trim()) state.profile.name = body.name.trim().slice(0, 40);
    if (Number.isFinite(Number(body.dailyGoal))) {
      state.profile.dailyGoal = Math.max(1, Math.min(99, Number(body.dailyGoal)));
    }
    await writeState(state);
    sendJson(res, 200, state.profile);
    return;
  }

  sendJson(res, 404, { error: "API route not found." });
}

function prepareSession(state, body) {
  const mode = String(body.mode || "tutor");
  const sessionId = String(body.sessionId || state.sessions[0]?.id || crypto.randomUUID());
  let session = state.sessions.find(item => item.id === sessionId);
  if (!session) {
    session = {
      id: sessionId,
      mode,
      title: mode === "roleplay" ? "Roleplay" : "Tutor chat",
      createdAt: new Date().toISOString(),
      messages: []
    };
    state.sessions.unshift(session);
  }
  session.mode = mode;
  return { session };
}

async function serveStatic(req, res, url) {
  const requestedPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(PUBLIC_DIR, requestedPath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const ext = path.extname(filePath);
    if (ext === ".html") {
      const html = await fs.readFile(filePath, "utf8");
      res.writeHead(200, {
        "Content-Type": MIME_TYPES[".html"],
        "Cache-Control": "no-store"
      });
      res.end(html.replaceAll("__BASE_PATH__", BASE_PATH || ""));
      return;
    }
    const file = await fs.readFile(filePath);
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": ext === ".html" ? "no-store" : "public, max-age=3600"
    });
    res.end(file);
  } catch {
    const index = await fs.readFile(path.join(PUBLIC_DIR, "index.html"), "utf8");
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[".html"],
      "Cache-Control": "no-store"
    });
    res.end(index.replaceAll("__BASE_PATH__", BASE_PATH || ""));
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (BASE_PATH && url.pathname === BASE_PATH) {
    res.writeHead(308, { Location: `${BASE_PATH}/` });
    res.end();
    return;
  }
  if (BASE_PATH && url.pathname.startsWith(`${BASE_PATH}/`)) {
    url.pathname = url.pathname.slice(BASE_PATH.length) || "/";
  }

  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }
    await serveStatic(req, res, url);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Server error." });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`DeutschQuest running at http://localhost:${PORT}${BASE_PATH || ""}`);
});
