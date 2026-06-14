const AUTH_KEY = "deutschquest_token";

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
  roleplayPrompt: ""
};

const els = {
  app: document.querySelector(".app"),
  loginView: document.querySelector("#loginView"),
  loginForm: document.querySelector("#loginForm"),
  passwordInput: document.querySelector("#passwordInput"),
  loginError: document.querySelector("#loginError"),
  greeting: document.querySelector("#greeting"),
  xp: document.querySelector("#xp"),
  streak: document.querySelector("#streak"),
  levelBadge: document.querySelector("#levelBadge"),
  modelBadge: document.querySelector("#modelBadge"),
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
  wordList: document.querySelector("#wordList"),
  toolForm: document.querySelector("#toolForm"),
  toolSelect: document.querySelector("#toolSelect"),
  toolInput: document.querySelector("#toolInput"),
  toolOutput: document.querySelector("#toolOutput"),
  settingsForm: document.querySelector("#settingsForm"),
  nameInput: document.querySelector("#nameInput"),
  levelSelect: document.querySelector("#levelSelect"),
  dailyGoalInput: document.querySelector("#dailyGoalInput"),
  settingsStatus: document.querySelector("#settingsStatus")
};

function authHeaders() {
  return state.token ? { Authorization: `Bearer ${state.token}` } : {};
}

async function api(path, options = {}) {
  const response = await fetch(path, {
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
  if (!messages.length) {
    els.chatPanel.innerHTML = `<div class="bubble assistant">Hallo. Was möchtest du heute auf Deutsch üben?</div>`;
    return;
  }
  els.chatPanel.replaceChildren(
    ...messages.map(message => createBubble(message.role, message.content))
  );
  els.chatPanel.scrollTop = els.chatPanel.scrollHeight;
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
  setLoaded();
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

  const response = await fetch("api/chat/stream", {
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
  let buffer = "";
  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";
    for (const rawEvent of events) {
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
  await sendChat(state.roleplayPrompt || "Start the roleplay in simple German.", "roleplay");
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

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js?v=20260614c"));
}

loadApp().catch(error => {
  setLoaded();
  if (!state.authRequired) document.body.innerHTML = `<main class="app"><h1>DeutschQuest</h1><p>${error.message}</p></main>`;
});
