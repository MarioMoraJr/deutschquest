const state = {
  profile: { name: "Mario", level: "A2", streak: 0, xp: 0 },
  currentQuest: {},
  words: [],
  sessions: [],
  sessionId: null,
  drillIndex: 0
};

const els = {
  greeting: document.querySelector("#greeting"),
  xp: document.querySelector("#xp"),
  streak: document.querySelector("#streak"),
  levelBadge: document.querySelector("#levelBadge"),
  modelBadge: document.querySelector("#modelBadge"),
  questTitle: document.querySelector("#questTitle"),
  questScenario: document.querySelector("#questScenario"),
  questProgress: document.querySelector("#questProgress"),
  chatPanel: document.querySelector("#chatPanel"),
  chatForm: document.querySelector("#chatForm"),
  chatInput: document.querySelector("#chatInput"),
  beginRoleplay: document.querySelector("#beginRoleplay"),
  drillWord: document.querySelector("#drillWord"),
  drillFeedback: document.querySelector("#drillFeedback"),
  wordList: document.querySelector("#wordList"),
  toolForm: document.querySelector("#toolForm"),
  toolSelect: document.querySelector("#toolSelect"),
  toolInput: document.querySelector("#toolInput"),
  toolOutput: document.querySelector("#toolOutput")
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });
    const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }
  return payload;
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
}

function renderChat() {
  const session = state.sessions.find(item => item.id === state.sessionId) || state.sessions[0];
  const messages = session?.messages || [];

  if (!messages.length) {
    els.chatPanel.innerHTML = `<div class="bubble assistant">Hallo. Was moechtest du heute auf Deutsch ueben?</div>`;
    return;
  }

  els.chatPanel.replaceChildren(
    ...messages.map(message => {
      const bubble = document.createElement("div");
      bubble.className = `bubble ${message.role === "user" ? "user" : "assistant"}`;
      bubble.textContent = message.content;
      return bubble;
    })
  );
  els.chatPanel.scrollTop = els.chatPanel.scrollHeight;
}

function renderDrills() {
  if (!state.words.length) {
    els.drillWord.textContent = "Kaffee";
    return;
  }
  const word = state.words[state.drillIndex % state.words.length];
  els.drillWord.textContent = word.german.replace(/^(der|die|das)\s+/i, "");

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
  renderChat();
  renderDrills();
}

async function loadApp() {
  const data = await api("api/app");
  state.profile = data.profile;
  state.currentQuest = data.currentQuest;
  state.words = data.words || [];
  state.sessions = data.sessions || [];
  state.sessionId = state.sessions[0]?.id || null;
  els.modelBadge.textContent = data.ollama?.model || "Ollama";
  render();
}

async function sendChat(message, mode = "tutor") {
  const pending = document.createElement("div");
  pending.className = "bubble assistant";
  pending.textContent = "Denke nach...";
  els.chatPanel.append(pending);
  els.chatPanel.scrollTop = els.chatPanel.scrollHeight;

  const result = await api("api/chat", {
    method: "POST",
    body: JSON.stringify({ sessionId: state.sessionId, message, mode })
  });

  state.sessionId = result.sessionId;
  const session = state.sessions.find(item => item.id === result.sessionId);
  if (session) {
    session.messages = result.messages;
  } else {
    state.sessions.unshift({ id: result.sessionId, mode, title: "Tutor chat", messages: result.messages });
  }
  renderChat();
}

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => switchView(tab.dataset.view));
});

document.querySelectorAll("[data-jump]").forEach(button => {
  button.addEventListener("click", () => switchView(button.dataset.jump));
});

els.chatForm.addEventListener("submit", async event => {
  event.preventDefault();
  const message = els.chatInput.value.trim();
  if (!message) return;
  els.chatInput.value = "";
  const session = state.sessions.find(item => item.id === state.sessionId);
  if (session) {
    session.messages.push({ role: "user", content: message });
  }
  renderChat();
  try {
    await sendChat(message, "tutor");
  } catch (error) {
    els.chatPanel.append(Object.assign(document.createElement("div"), {
      className: "bubble assistant",
      textContent: error.message
    }));
  }
});

els.beginRoleplay.addEventListener("click", async () => {
  switchView("chatView");
  await sendChat("Start the bakery roleplay. You are the shopkeeper. Greet me in simple German.", "roleplay");
});

document.querySelectorAll("[data-article]").forEach(button => {
  button.addEventListener("click", () => {
    const word = state.words[state.drillIndex % state.words.length];
    if (!word) return;
    const correct = button.dataset.article === word.article;
    els.drillFeedback.textContent = correct ? "Richtig! +10 XP" : `Fast. Correct: ${word.article}`;
    state.drillIndex += 1;
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

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js?v=20260614"));
}

loadApp().catch(error => {
  document.body.innerHTML = `<main class="app"><h1>DeutschQuest</h1><p>${error.message}</p></main>`;
});
