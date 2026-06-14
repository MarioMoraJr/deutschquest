const AUTH_KEY = "deutschquest_token";
const BASE_PATH = (window.DEUTSCHQUEST_BASE_PATH || "").replace(/\/$/, "");

function apiPath(path) {
  return `${BASE_PATH}/${path.replace(/^\/+/, "")}`;
}

const state = {
  token: localStorage.getItem(AUTH_KEY) || "",
  authRequired: false,
  profile: { name: "Mario", level: "A2", streak: 0, xp: 0, completedToday: 0 },
  currentQuest: {},
  words: [],
  scenarios: [],
  sessions: [],
  sessionId: null,
  drillIndex: 0,
  roleplayPrompt: "",
  orderIndex: 0,
  orderBuild: [],
  orderBank: []
};

const orderDrills = [
  { prompt: "I would like two rolls.", expected: "Ich hätte gern zwei Brötchen" },
  { prompt: "Where does the train leave from?", expected: "Von welchem Gleis fährt der Zug" },
  { prompt: "Can you say that more slowly?", expected: "Kannst du das langsamer sagen" }
];

const els = {
  app: document.querySelector(".app"),
  loginView: document.querySelector("#loginView"),
  loginForm: document.querySelector("#loginForm"),
  passwordInput: document.querySelector("#passwordInput"),
  loginError: document.querySelector("#loginError"),
  greeting: document.querySelector("#greeting"),
  statusStrip: document.querySelector("#statusStrip"),
  xp: document.querySelector("#xp"),
  streak: document.querySelector("#streak"),
  levelBadge: document.querySelector("#levelBadge"),
  modelBadge: document.querySelector("#modelBadge"),
  newChatButton: document.querySelector("#newChatButton"),
  toggleHistoryButton: document.querySelector("#toggleHistoryButton"),
  chatHistory: document.querySelector("#chatHistory"),
  suggestVocabButton: document.querySelector("#suggestVocabButton"),
  toggleSaveWordButton: document.querySelector("#toggleSaveWordButton"),
  vocabSuggestions: document.querySelector("#vocabSuggestions"),
  questTitle: document.querySelector("#questTitle"),
  questScenario: document.querySelector("#questScenario"),
  questProgress: document.querySelector("#questProgress"),
  goalProgress: document.querySelector("#goalProgress"),
  scenarioList: document.querySelector("#scenarioList"),
  chatPanel: document.querySelector("#chatPanel"),
  chatForm: document.querySelector("#chatForm"),
  chatInput: document.querySelector("#chatInput"),
  saveWordForm: document.querySelector("#saveWordForm"),
  saveGerman: document.querySelector("#saveGerman"),
  saveEnglish: document.querySelector("#saveEnglish"),
  saveArticle: document.querySelector("#saveArticle"),
  beginRoleplay: document.querySelector("#beginRoleplay"),
  drillWord: document.querySelector("#drillWord"),
  drillFeedback: document.querySelector("#drillFeedback"),
  orderPrompt: document.querySelector("#orderPrompt"),
  wordBank: document.querySelector("#wordBank"),
  sentenceBuild: document.querySelector("#sentenceBuild"),
  checkOrderButton: document.querySelector("#checkOrderButton"),
  clearOrderButton: document.querySelector("#clearOrderButton"),
  nextOrderButton: document.querySelector("#nextOrderButton"),
  orderFeedback: document.querySelector("#orderFeedback"),
  wordList: document.querySelector("#wordList"),
  toolForm: document.querySelector("#toolForm"),
  toolSelect: document.querySelector("#toolSelect"),
  toolInput: document.querySelector("#toolInput"),
  toolOutput: document.querySelector("#toolOutput"),
  settingsForm: document.querySelector("#settingsForm"),
  nameInput: document.querySelector("#nameInput"),
  levelSelect: document.querySelector("#levelSelect"),
  dailyGoalInput: document.querySelector("#dailyGoalInput"),
  settingsStatus: document.querySelector("#settingsStatus"),
  backupButton: document.querySelector("#backupButton"),
  backupStatus: document.querySelector("#backupStatus"),
  conjPrompt: document.querySelector("#conjPrompt"),
  conjInput: document.querySelector("#conjInput"),
  checkConjButton: document.querySelector("#checkConjButton"),
  conjFeedback: document.querySelector("#conjFeedback")
};

const conjugationDrills = [
  { verb: "machen", subject: "ich", answer: "mache" },
  { verb: "machen", subject: "du", answer: "machst" },
  { verb: "arbeiten", subject: "du", answer: "arbeitest" },
  { verb: "fahren", subject: "er", answer: "fährt" },
  { verb: "lernen", subject: "wir", answer: "lernen" }
];

let conjugationIndex = 0;

function authHeaders() {
  return state.token ? { Authorization: `Bearer ${state.token}` } : {};
}

async function api(path, options = {}) {
  const response = await fetch(apiPath(path), {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers || {})
    },
    ...options
  });
  const payload = response.status === 204 ? {} : await response.json();
  if (response.status === 401) {
    localStorage.removeItem(AUTH_KEY);
    state.token = "";
    showLogin(payload.error || "App password required.");
    throw new Error(payload.error || "App password required.");
  }
  if (!response.ok) throw new Error(payload.error || "Request failed.");
  return payload;
}

function showLogin(message = "") {
  if (!els.loginView) return;
  els.loginView.hidden = false;
  els.loginError.textContent = message;
  els.passwordInput.focus();
}

function hideLogin() {
  if (!els.loginView) return;
  els.loginView.hidden = true;
  els.loginError.textContent = "";
}

function setLoaded() {
  els.app.classList.remove("loading");
}

function switchView(id) {
  document.querySelectorAll(".view").forEach(view => {
    view.classList.toggle("active", view.id === id);
  });
  document.querySelectorAll(".tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.view === id);
  });
}

function renderHome() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";
  els.greeting.textContent = `${greeting}, ${state.profile.name}`;
  els.xp.textContent = state.profile.xp;
  els.streak.textContent = `${state.profile.streak} day streak`;
  els.levelBadge.textContent = state.profile.level;
  els.questTitle.textContent = state.currentQuest.title || "Daily German quest";
  els.questScenario.textContent = state.currentQuest.scenario || "Practice one useful conversation today.";
  els.questProgress.style.width = `${state.currentQuest.progress || 0}%`;
  els.goalProgress.textContent = `${state.profile.completedToday || 0}/${state.profile.dailyGoal || 15} reps`;
  els.nameInput.value = state.profile.name || "";
  els.levelSelect.value = state.profile.level || "A2";
  els.dailyGoalInput.value = state.profile.dailyGoal || 15;
}

function renderScenarios() {
  els.scenarioList.replaceChildren(
    ...state.scenarios.map(scenario => {
      const button = document.createElement("button");
      button.className = "scenario-card";
      button.type = "button";
      button.innerHTML = `<strong>${scenario.title}</strong><span>${scenario.place}</span><small>${scenario.goal}</small>`;
      button.addEventListener("click", () => chooseScenario(scenario.id));
      return button;
    })
  );
}

function renderChat() {
  const session = state.sessions.find(item => item.id === state.sessionId) || state.sessions[0];
  const messages = session?.messages || [];
  document.querySelector("#chatView .section-head h2").textContent = session?.title || "Tutor Chat";
  if (!messages.length) {
    els.chatPanel.innerHTML = `<div class="bubble assistant">Hallo. Was möchtest du heute auf Deutsch üben?</div>`;
    return;
  }
  els.chatPanel.replaceChildren(
    ...messages.map(message => createBubble(message.role, message.content))
  );
  els.chatPanel.scrollTop = els.chatPanel.scrollHeight;
  renderHistory();
}

function createBubble(role, content = "") {
  const bubble = document.createElement("div");
  bubble.className = `bubble ${role === "user" ? "user" : "assistant"}`;
  bubble.textContent = content;
  return bubble;
}

function currentDrillWord() {
  const drillWords = state.words.filter(word => word.article);
  return drillWords[state.drillIndex % Math.max(1, drillWords.length)] || null;
}

function renderDrills() {
  const word = currentDrillWord();
  els.drillWord.textContent = word ? word.german.replace(/^(der|die|das)\s+/i, "") : "Kaffee";
  els.wordList.replaceChildren(
    ...state.words.map(wordItem => {
      const row = document.createElement("article");
      row.className = "word-row";
      row.innerHTML = `<span class="coin">${wordItem.article || "?"}</span><div><h3>${wordItem.german}</h3><p>${wordItem.english || "Saved word"}</p></div><strong>${wordItem.strength}/5</strong>`;
      return row;
    })
  );
  renderOrderDrill();
}

function renderHistory() {
  els.chatHistory.replaceChildren(...state.sessions.map(session => {
    const item = document.createElement("article");
    item.className = `history-item${session.id === state.sessionId ? " active" : ""}`;

    const open = document.createElement("button");
    open.type = "button";
    open.className = "history-open";
    open.innerHTML = `<strong>${session.title || "Tutor chat"}</strong><small>${session.mode || "tutor"} · ${(session.messages || []).length} messages</small>`;
    open.addEventListener("click", () => {
      state.sessionId = session.id;
      renderChat();
      els.chatHistory.classList.add("collapsed");
      els.toggleHistoryButton.setAttribute("aria-expanded", "false");
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "history-delete";
    remove.textContent = "X";
    remove.setAttribute("aria-label", "Delete chat");
    remove.addEventListener("click", event => {
      event.stopPropagation();
      deleteChat(session.id);
    });

    item.append(open, remove);
    return item;
  }));
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function currentOrderDrill() {
  return orderDrills[state.orderIndex % orderDrills.length];
}

function renderOrderDrill() {
  const drill = currentOrderDrill();
  els.orderPrompt.textContent = drill.prompt;
  if (!state.orderBank.length) {
    state.orderBank = shuffle(drill.expected.split(" ").map((word, index) => ({ word, index })));
  }
  els.wordBank.replaceChildren(...state.orderBank.map(item => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.index = item.index;
    button.textContent = item.word;
    button.disabled = state.orderBuild.some(build => build.index === item.index);
    button.addEventListener("click", () => {
      state.orderBuild.push(item);
      renderOrderBuild();
      renderOrderBankOnly();
    });
    return button;
  }));
  renderOrderBuild();
}

function renderOrderBankOnly() {
  els.wordBank.querySelectorAll("button").forEach(button => {
    button.disabled = state.orderBuild.some(item => item.index === Number(button.dataset.index));
  });
}

function renderOrderBuild() {
  els.sentenceBuild.replaceChildren(...state.orderBuild.map((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = item.word;
    button.addEventListener("click", () => {
      state.orderBuild.splice(index, 1);
      renderOrderDrill();
    });
    return button;
  }));
}

function render() {
  renderHome();
  renderScenarios();
  renderChat();
  renderDrills();
}

async function loadConfig() {
  const config = await api("api/config", { headers: {} });
  state.authRequired = config.authRequired;
  if (state.authRequired && !state.token) {
    showLogin();
    return false;
  }
  return true;
}

async function loadApp() {
  const ready = await loadConfig();
  if (!ready) return;
  const data = await api("api/app");
  hideLogin();
  state.profile = data.profile;
  state.currentQuest = data.currentQuest;
  state.words = data.words || [];
  state.scenarios = data.scenarios || [];
  state.sessions = data.sessions || [];
  state.sessionId = state.sessions[0]?.id || null;
  state.roleplayPrompt = state.scenarios[0]?.prompt || "";
  els.modelBadge.textContent = data.ollama?.model || "Ollama";
  render();
  checkHealth();
  setLoaded();
}

async function checkHealth() {
  try {
    const health = await api("api/health");
    els.statusStrip.textContent = health.ollama ? `Tutor online · ${health.model}` : "Tutor offline · Ollama not reachable";
    els.statusStrip.classList.toggle("warn", !health.ollama);
  } catch {
    els.statusStrip.textContent = "Tutor status unavailable";
    els.statusStrip.classList.add("warn");
  }
}

async function chooseScenario(id) {
  const result = await api("api/scenario", {
    method: "POST",
    body: JSON.stringify({ id })
  });
  state.currentQuest = result.currentQuest;
  state.roleplayPrompt = result.scenario.prompt;
  renderHome();
  switchView("roleplayView");
}

async function newChat() {
  const result = await api("api/chat/new", {
    method: "POST",
    body: JSON.stringify({ mode: "tutor", title: "Tutor chat" })
  });
  state.sessions.unshift(result.session);
  state.sessionId = result.session.id;
  state.roleplayPrompt = "";
  renderChat();
  switchView("chatView");
}

async function deleteChat(id) {
  const result = await api(`api/chat/${encodeURIComponent(id)}`, { method: "DELETE" });
  state.sessions = result.sessions || [];
  if (state.sessionId === id) state.sessionId = state.sessions[0]?.id || null;
  renderChat();
}

function updateSessionMessages(sessionId, messages, mode = "tutor") {
  state.sessionId = sessionId;
  const session = state.sessions.find(item => item.id === sessionId);
  if (session) {
    session.messages = messages;
  } else {
    state.sessions.unshift({ id: sessionId, mode, title: "Tutor chat", messages });
  }
}

async function sendChat(message, mode = "tutor") {
  const pending = createBubble("assistant", "");
  els.chatPanel.append(pending);
  els.chatPanel.scrollTop = els.chatPanel.scrollHeight;

  const response = await fetch(apiPath("api/chat/stream"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders()
    },
    body: JSON.stringify({ sessionId: state.sessionId, message, mode })
  });

  if (response.status === 401) {
    showLogin("App password required.");
    return;
  }
  if (!response.ok || !response.body) {
    pending.textContent = "The tutor could not respond.";
    return;
  }

  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";
    for (const rawEvent of events) {
      handleStreamEvent(rawEvent, pending, mode);
    }
  }
  if (buffer.trim()) handleStreamEvent(buffer, pending, mode);
}

function handleStreamEvent(rawEvent, pending, mode) {
  const lines = rawEvent.split("\n");
  const event = lines.find(line => line.startsWith("event:"))?.slice(6).trim();
  const dataLine = lines.find(line => line.startsWith("data:"));
  const data = dataLine ? JSON.parse(dataLine.slice(5)) : {};
  if (event === "chunk") {
    pending.textContent += data.chunk || "";
    els.chatPanel.scrollTop = els.chatPanel.scrollHeight;
  }
  if (event === "done") {
    updateSessionMessages(data.sessionId, data.messages, mode);
    renderChat();
  }
  if (event === "error") {
    pending.textContent = data.error || "Streaming failed.";
  }
}

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => switchView(tab.dataset.view));
});

document.querySelectorAll("[data-jump]").forEach(button => {
  button.addEventListener("click", () => switchView(button.dataset.jump));
});

els.loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  els.loginError.textContent = "";
  try {
    const result = await api("api/login", {
      method: "POST",
      body: JSON.stringify({ password: els.passwordInput.value })
    });
    state.token = result.token;
    localStorage.setItem(AUTH_KEY, result.token);
    els.passwordInput.value = "";
    await loadApp();
  } catch (error) {
    els.loginError.textContent = error.message;
  }
});

els.chatForm.addEventListener("submit", async event => {
  event.preventDefault();
  const message = els.chatInput.value.trim();
  if (!message) return;
  els.chatInput.value = "";
  const session = state.sessions.find(item => item.id === state.sessionId);
  if (session) session.messages.push({ role: "user", content: message });
  renderChat();
  await sendChat(message, "tutor");
});

els.beginRoleplay.addEventListener("click", async () => {
  switchView("chatView");
  const scenario = state.scenarios.find(item => item.prompt === state.roleplayPrompt);
  const result = await api("api/chat/new", {
    method: "POST",
    body: JSON.stringify({ mode: "roleplay", scenarioId: scenario?.id })
  });
  state.sessions.unshift(result.session);
  state.sessionId = result.session.id;
  renderChat();
  await sendChat(state.roleplayPrompt || "Start the roleplay in simple German.", "roleplay");
});

els.newChatButton.addEventListener("click", newChat);

els.toggleHistoryButton.addEventListener("click", () => {
  const collapsed = els.chatHistory.classList.toggle("collapsed");
  els.toggleHistoryButton.setAttribute("aria-expanded", String(!collapsed));
  renderHistory();
});

document.querySelectorAll("[data-reply]").forEach(button => {
  button.addEventListener("click", async () => {
    els.chatInput.value = button.dataset.reply;
    els.chatForm.requestSubmit();
  });
});

els.suggestVocabButton.addEventListener("click", async () => {
  const session = state.sessions.find(item => item.id === state.sessionId) || state.sessions[0];
  const text = (session?.messages || []).slice(-4).map(message => message.content).join("\n");
  els.vocabSuggestions.textContent = "Finding useful words...";
  const result = await api("api/vocab/suggest", {
    method: "POST",
    body: JSON.stringify({ text })
  });
  if (!result.suggestions.length) {
    els.vocabSuggestions.textContent = "No suggestions found.";
    return;
  }
  els.vocabSuggestions.replaceChildren(...result.suggestions.map(suggestion => {
    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = `<strong>${suggestion.article ? `${suggestion.article} ` : ""}${suggestion.german}</strong><small>${suggestion.english}</small>`;
    button.addEventListener("click", async () => {
      const word = await api("api/words", {
        method: "POST",
        body: JSON.stringify(suggestion)
      });
      state.words.unshift(word);
      button.disabled = true;
      button.querySelector("small").textContent = "Saved";
      renderDrills();
    });
    return button;
  }));
});

els.toggleSaveWordButton.addEventListener("click", () => {
  const collapsed = els.saveWordForm.classList.toggle("collapsed");
  els.toggleSaveWordButton.setAttribute("aria-expanded", String(!collapsed));
});

document.querySelectorAll("[data-article]").forEach(button => {
  button.addEventListener("click", async () => {
    const word = currentDrillWord();
    if (!word) return;
    const result = await api("api/drills/answer", {
      method: "POST",
      body: JSON.stringify({ wordId: word.id, answer: button.dataset.article })
    });
    state.profile = result.profile;
    state.currentQuest = result.currentQuest;
    state.words = state.words.map(item => item.id === result.word.id ? result.word : item);
    els.drillFeedback.textContent = result.correct ? `Richtig! +${result.xpDelta} XP` : `Fast. Correct: ${result.expected}`;
    state.drillIndex += 1;
    renderHome();
    setTimeout(renderDrills, 700);
  });
});

els.clearOrderButton.addEventListener("click", () => {
  state.orderBuild = [];
  els.orderFeedback.textContent = "Build the sentence.";
  renderOrderDrill();
});

els.nextOrderButton.addEventListener("click", () => {
  state.orderIndex += 1;
  state.orderBuild = [];
  state.orderBank = [];
  els.orderFeedback.textContent = "Build the sentence.";
  renderOrderDrill();
});

els.checkOrderButton.addEventListener("click", async () => {
  const drill = currentOrderDrill();
  const answer = state.orderBuild.map(item => item.word).join(" ");
  const result = await api("api/drills/word-order", {
    method: "POST",
    body: JSON.stringify({ answer, expected: drill.expected })
  });
  state.profile = result.profile;
  state.currentQuest = result.currentQuest;
  els.orderFeedback.textContent = result.correct ? `Richtig! +${result.xpDelta} XP` : `Correct: ${result.expected}`;
  renderHome();
});

els.toolForm.addEventListener("submit", async event => {
  event.preventDefault();
  const input = els.toolInput.value.trim();
  if (!input) return;
  els.toolOutput.textContent = "Running local AI tool...";
  try {
    const result = await api("api/tools", {
      method: "POST",
      body: JSON.stringify({ tool: els.toolSelect.value, input })
    });
    els.toolOutput.textContent = result.answer;
  } catch (error) {
    els.toolOutput.textContent = error.message;
  }
});

els.saveWordForm.addEventListener("submit", async event => {
  event.preventDefault();
  const german = els.saveGerman.value.trim();
  if (!german) return;
  const word = await api("api/words", {
    method: "POST",
    body: JSON.stringify({
      german,
      english: els.saveEnglish.value.trim(),
      article: els.saveArticle.value
    })
  });
  state.words.unshift(word);
  els.saveGerman.value = "";
  els.saveEnglish.value = "";
  els.saveArticle.value = "";
  els.saveWordForm.classList.add("collapsed");
  els.toggleSaveWordButton.setAttribute("aria-expanded", "false");
  renderDrills();
});

els.settingsForm.addEventListener("submit", async event => {
  event.preventDefault();
  els.settingsStatus.textContent = "Saving...";
  try {
    const profile = await api("api/profile", {
      method: "PATCH",
      body: JSON.stringify({
        name: els.nameInput.value,
        level: els.levelSelect.value,
        dailyGoal: Number(els.dailyGoalInput.value)
      })
    });
    state.profile = profile;
    renderHome();
    els.settingsStatus.textContent = "Saved";
  } catch (error) {
    els.settingsStatus.textContent = error.message;
  }
});

els.backupButton.addEventListener("click", async () => {
  els.backupStatus.textContent = "Creating backup...";
  try {
    const result = await api("api/backup", { method: "POST", body: "{}" });
    els.backupStatus.textContent = result.backupPath.split(/[\\/]/).pop();
  } catch (error) {
    els.backupStatus.textContent = error.message;
  }
});

function renderConjugationDrill() {
  const drill = conjugationDrills[conjugationIndex % conjugationDrills.length];
  els.conjPrompt.textContent = `${drill.verb} + ${drill.subject}`;
  els.conjInput.value = "";
}

els.checkConjButton.addEventListener("click", () => {
  const drill = conjugationDrills[conjugationIndex % conjugationDrills.length];
  const answer = els.conjInput.value.trim().toLocaleLowerCase("de-DE");
  if (answer === drill.answer.toLocaleLowerCase("de-DE")) {
    els.conjFeedback.textContent = `Richtig: ${drill.subject} ${drill.answer}`;
    conjugationIndex += 1;
    setTimeout(renderConjugationDrill, 900);
  } else {
    els.conjFeedback.textContent = `Try: ${drill.subject} ${drill.answer}`;
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register(`${BASE_PATH}/service-worker.js?v=20260614j`));
}

loadApp().catch(error => {
  setLoaded();
  if (!state.authRequired) document.body.innerHTML = `<main class="app"><h1>DeutschQuest</h1><p>${error.message}</p></main>`;
});

renderConjugationDrill();
