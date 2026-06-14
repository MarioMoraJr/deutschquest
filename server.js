const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 3100);
const HOST = process.env.HOST || "0.0.0.0";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1:8b";
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "deutschquest.json");

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
    dailyGoal: 15
  },
  currentQuest: {
    title: "Order breakfast in Berlin",
    scenario: "You are at a bakery. Buy two rolls, ask what is fresh today, and order a coffee politely.",
    progress: 62
  },
  words: [
    { id: crypto.randomUUID(), german: "das Broetchen", english: "bread roll", article: "das", strength: 2 },
    { id: crypto.randomUUID(), german: "der Kaffee", english: "coffee", article: "der", strength: 4 },
    { id: crypto.randomUUID(), german: "frisch", english: "fresh", article: "", strength: 1 }
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
          content: "Guten Morgen. Was moechtest du beim Baecker bestellen?"
        }
      ]
    }
  ]
};

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await writeState(defaultState);
  }
}

async function readState() {
  await ensureDataFile();
  return JSON.parse(await fs.readFile(DATA_FILE, "utf8"));
}

async function writeState(state) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(state, null, 2));
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
  return [
    "You are DeutschQuest, a friendly German tutor in a mobile learning game.",
    `The learner level is ${level || "A2"}. Keep German appropriate for that level.`,
    "Use German for roleplay and examples, with brief English explanations when correcting.",
    "Correct mistakes kindly and concisely. Include a natural version when helpful.",
    "For roleplay, stay in character and keep the conversation moving.",
    "Avoid long lectures. Give one small next step.",
    `Current mode: ${mode || "tutor"}.`
  ].join("\n");
}

async function askOllama(messages, level, mode) {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      messages: [
        { role: "system", content: systemPrompt(level, mode) },
        ...messages
      ],
      options: {
        temperature: mode === "drill" ? 0.35 : 0.7,
        num_predict: 260
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama returned ${response.status}. Is Ollama running with ${OLLAMA_MODEL}?`);
  }

  const payload = await response.json();
  return payload.message?.content?.trim() || "Ich bin bereit. Was moechtest du ueben?";
}

async function handleApi(req, res, url) {
  const state = await readState();

  if (req.method === "GET" && url.pathname === "/api/app") {
    sendJson(res, 200, {
      ...state,
      ollama: {
        url: OLLAMA_URL,
        model: OLLAMA_MODEL
      }
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/chat") {
    const body = await readBody(req);
    const message = String(body.message || "").trim();
    const mode = String(body.mode || "tutor");
    if (!message) {
      sendJson(res, 400, { error: "Message is required." });
      return;
    }

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
    session.messages.push({ role: "user", content: message });
    const recentMessages = session.messages.slice(-10);
    const answer = await askOllama(recentMessages, state.profile.level, mode);
    session.messages.push({ role: "assistant", content: answer });
    await writeState(state);
    sendJson(res, 200, { sessionId: session.id, answer, messages: session.messages });
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
      strength: 0
    };
    state.words.unshift(word);
    await writeState(state);
    sendJson(res, 201, word);
    return;
  }

  if (req.method === "PATCH" && url.pathname === "/api/profile") {
    const body = await readBody(req);
    if (typeof body.level === "string") {
      state.profile.level = body.level.slice(0, 4);
    }
    if (typeof body.name === "string" && body.name.trim()) {
      state.profile.name = body.name.trim().slice(0, 40);
    }
    await writeState(state);
    sendJson(res, 200, state.profile);
    return;
  }

  sendJson(res, 404, { error: "API route not found." });
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
    const file = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": ext === ".html" ? "no-store" : "public, max-age=3600"
    });
    res.end(file);
  } catch {
    const index = await fs.readFile(path.join(PUBLIC_DIR, "index.html"));
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[".html"],
      "Cache-Control": "no-store"
    });
    res.end(index);
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
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
  console.log(`DeutschQuest running at http://localhost:${PORT}`);
});
