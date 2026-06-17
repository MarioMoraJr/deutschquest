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
  lessons: [],
  dailyStory: null,
  scenarios: [],
  sessions: [],
  sessionId: null,
  activeLessonId: null,
  activeLesson: null,
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

const starterLessons = [
  {
    title: "Survival Words",
    topic: "German survival words: hello, yes, no, please, thank you, I, you",
    goal: "Use tiny words before grammar gets involved."
  },
  {
    title: "I Want / I Have",
    topic: "German beginner sentence pattern: ich moechte, ich habe, ich bin",
    goal: "Build your first useful sentences."
  },
  {
    title: "der die das",
    topic: "German articles der die das for absolute beginners",
    goal: "Understand why nouns carry little tags."
  },
  {
    title: "Questions",
    topic: "German beginner questions with wo, was, wie, and yes no questions",
    goal: "Ask simple things without freezing."
  },
  {
    title: "Tone Words",
    topic: "German tone words schon, doch, mal, ja for beginners",
    goal: "Notice the small words that change meaning."
  }
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
  summarizeChatButton: document.querySelector("#summarizeChatButton"),
  chatSummary: document.querySelector("#chatSummary"),
  toggleSaveWordButton: document.querySelector("#toggleSaveWordButton"),
  vocabSuggestions: document.querySelector("#vocabSuggestions"),
  questTitle: document.querySelector("#questTitle"),
  questScenario: document.querySelector("#questScenario"),
  questProgress: document.querySelector("#questProgress"),
  goalProgress: document.querySelector("#goalProgress"),
  scenarioList: document.querySelector("#scenarioList"),
  continueChatButton: document.querySelector("#continueChatButton"),
  lessonTopicInput: document.querySelector("#lessonTopicInput"),
  generateLessonButton: document.querySelector("#generateLessonButton"),
  lessonCoachButton: document.querySelector("#lessonCoachButton"),
  lessonPath: document.querySelector("#lessonPath"),
  logoutButton: document.querySelector("#logoutButton"),
  dailyStoryTitle: document.querySelector("#dailyStoryTitle"),
  dailyStoryLevel: document.querySelector("#dailyStoryLevel"),
  dailyStorySummary: document.querySelector("#dailyStorySummary"),
  dailyStoryBody: document.querySelector("#dailyStoryBody"),
  dailyStoryVocab: document.querySelector("#dailyStoryVocab"),
  dailyStoryQuestions: document.querySelector("#dailyStoryQuestions"),
  generateStoryButton: document.querySelector("#generateStoryButton"),
  refreshStoryButton: document.querySelector("#refreshStoryButton"),
  lessonCard: document.querySelector("#lessonCard"),
  lessonTitle: document.querySelector("#lessonTitle"),
  lessonGoal: document.querySelector("#lessonGoal"),
  lessonWarmup: document.querySelector("#lessonWarmup"),
  lessonDialogue: document.querySelector("#lessonDialogue"),
  lessonVocab: document.querySelector("#lessonVocab"),
  lessonDrill: document.querySelector("#lessonDrill"),
  completeLessonButton: document.querySelector("#completeLessonButton"),
  practiceLessonButton: document.querySelector("#practiceLessonButton"),
  lessonDrillInput: document.querySelector("#lessonDrillInput"),
  checkLessonDrillButton: document.querySelector("#checkLessonDrillButton"),
  lessonDrillFeedback: document.querySelector("#lessonDrillFeedback"),
  lessonCount: document.querySelector("#lessonCount"),
  pastLessons: document.querySelector("#pastLessons"),
  chatPanel: document.querySelector("#chatPanel"),
  chatForm: document.querySelector("#chatForm"),
  chatInput: document.querySelector("#chatInput"),
  sendChatButton: document.querySelector("#sendChatButton"),
  stopChatButton: document.querySelector("#stopChatButton"),
  retryChatButton: document.querySelector("#retryChatButton"),
  lookupPanel: document.querySelector("#lookupPanel"),
  lookupTitle: document.querySelector("#lookupTitle"),
  lookupOutput: document.querySelector("#lookupOutput"),
  closeLookupButton: document.querySelector("#closeLookupButton"),
  simplerLookupButton: document.querySelector("#simplerLookupButton"),
  saveLookupButton: document.querySelector("#saveLookupButton"),
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
  repairPrompt: document.querySelector("#repairPrompt"),
  repairInput: document.querySelector("#repairInput"),
  checkRepairButton: document.querySelector("#checkRepairButton"),
  repairFeedback: document.querySelector("#repairFeedback"),
  translatePrompt: document.querySelector("#translatePrompt"),
  translateInput: document.querySelector("#translateInput"),
  checkTranslateButton: document.querySelector("#checkTranslateButton"),
  translateFeedback: document.querySelector("#translateFeedback"),
  reviewWord: document.querySelector("#reviewWord"),
  reviewMeaning: document.querySelector("#reviewMeaning"),
  nextReviewButton: document.querySelector("#nextReviewButton"),
  reviewButtons: document.querySelectorAll("[data-quality]"),
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
  progressLevel: document.querySelector("#progressLevel"),
  progressXp: document.querySelector("#progressXp"),
  progressSessions: document.querySelector("#progressSessions"),
  progressWords: document.querySelector("#progressWords"),
  progressReps: document.querySelector("#progressReps"),
  progressLessons: document.querySelector("#progressLessons"),
  weakestWords: document.querySelector("#weakestWords"),
  mistakeList: document.querySelector("#mistakeList"),
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
let repairIndex = 0;
let translateIndex = 0;
let reviewIndex = 0;
let chatAbortController = null;
let lastChatRequest = null;
let lastLookup = null;

const repairDrills = [
  { broken: "Ich gehen nach Hause.", expected: "Ich gehe nach Hause." },
  { broken: "Du macht Kaffee.", expected: "Du machst Kaffee." },
  { broken: "Ich möchte einen Brötchen.", expected: "Ich möchte ein Brötchen." }
];

const translateDrills = [
  { prompt: "I would like coffee.", expected: "Ich hätte gern Kaffee." },
  { prompt: "Where is the train station?", expected: "Wo ist der Bahnhof?" },
  { prompt: "Can you speak more slowly?", expected: "Können Sie langsamer sprechen?" }
];

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
  if (id === "progressView") loadProgress();
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
  renderHistory();
  if (!messages.length) {
    els.chatPanel.innerHTML = `<div class="bubble assistant">Hallo. Was moechtest du heute auf Deutsch ueben?\nEnglish: Hello. What would you like to practice in German today?</div>`;
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
  renderTappableText(bubble, content);
  if (role !== "user" && content.trim()) {
    bubble.append(createMessageActions(content));
  }
  return bubble;
}

function createMessageActions(content) {
  const actions = document.createElement("div");
  actions.className = "message-actions";
  [
    ["translate", "Translate"],
    ["simplify", "Simpler"],
    ["save-words", "Save words"]
  ].forEach(([action, label]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.messageAction = action;
    button.dataset.messageText = content;
    button.textContent = label;
    actions.append(button);
  });
  return actions;
}

function renderTappableText(container, content = "") {
  container.replaceChildren();
  const sentences = String(content).match(/[^.!?\n]+[.!?]?|\n+/g) || [String(content)];
  sentences.forEach(sentence => {
    if (!sentence.trim()) {
      container.append(document.createTextNode(sentence));
      return;
    }
    const line = document.createElement("span");
    line.className = "sentence-line";
    tokenizeText(sentence).forEach(part => {
      if (/^[A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß]+(?:[-'][A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß]+)?$/.test(part)) {
        const word = document.createElement("button");
        word.type = "button";
        word.className = "word-token";
        word.dataset.lookupText = part;
        word.dataset.lookupKind = "word";
        word.textContent = part;
        line.append(word);
      } else {
        line.append(document.createTextNode(part));
      }
    });
    const explain = document.createElement("button");
    explain.type = "button";
    explain.className = "sentence-explain";
    explain.dataset.lookupText = sentence.trim();
    explain.dataset.lookupKind = "sentence";
    explain.textContent = "?";
    line.append(explain);
    container.append(line);
  });
}

function tokenizeText(text) {
  return String(text).match(/[A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß]+(?:[-'][A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß]+)?|\s+|./g) || [];
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
  renderRepairDrill();
  renderTranslateDrill();
  renderReviewQueue();
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
  renderPastLessons();
  renderLessonPath();
  renderDailyStory();
}

function renderDailyStory() {
  if (!els.dailyStoryTitle) return;
  const story = state.dailyStory;
  els.dailyStoryLevel.textContent = state.profile.level || "A2";
  if (!story) {
    els.dailyStoryTitle.textContent = "Today's story";
    els.dailyStorySummary.textContent = "Generate a fresh mid-to-long story matched to your profile level.";
    els.dailyStoryBody.classList.add("collapsed");
    els.dailyStoryBody.textContent = "";
    els.dailyStoryVocab.innerHTML = "";
    els.dailyStoryQuestions.innerHTML = "";
    els.generateStoryButton.textContent = "Generate Story";
    return;
  }
  els.dailyStoryTitle.textContent = story.title || "Daily Story";
  els.dailyStoryLevel.textContent = story.level || state.profile.level || "A2";
  els.dailyStorySummary.textContent = story.summary || "Today's German story.";
  els.dailyStoryBody.classList.remove("collapsed");
  renderTappableText(els.dailyStoryBody, story.body || "");
  const vocabulary = Array.isArray(story.vocabulary) ? story.vocabulary : [];
  els.dailyStoryVocab.replaceChildren(...vocabulary.map(item => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.dataset.lookupText = item.german || "";
    chip.dataset.lookupKind = "word";
    chip.innerHTML = `<strong>${item.german || ""}</strong><small>${item.english || ""}${item.note ? ` - ${item.note}` : ""}</small>`;
    return chip;
  }));
  const questions = Array.isArray(story.questions) ? story.questions : [];
  els.dailyStoryQuestions.replaceChildren(...questions.map((question, index) => {
    const item = document.createElement("p");
    item.textContent = `${index + 1}. ${question}`;
    return item;
  }));
  els.generateStoryButton.textContent = "Read Today";
}

function renderLessonPath() {
  if (!els.lessonPath) return;
  els.lessonPath.replaceChildren(...starterLessons.map((lesson, index) => {
    const card = document.createElement("article");
    card.className = "path-step";
    card.innerHTML = `
      <span>${index + 1}</span>
      <div>
        <h3>${lesson.title}</h3>
        <p>${lesson.goal}</p>
      </div>
      <div class="path-actions">
        <button data-path-coach="${index}">Teach</button>
        <button data-path-generate="${index}">Make lesson</button>
      </div>
    `;
    return card;
  }));
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
  state.lessons = data.lessons || [];
  state.dailyStory = data.dailyStory || null;
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
  if (chatAbortController) chatAbortController.abort();
  chatAbortController = new AbortController();
  lastChatRequest = { message, mode, sessionId: state.sessionId };
  setStreaming(true);
  const pending = createTypingBubble();
  els.chatPanel.append(pending);
  els.chatPanel.scrollTop = els.chatPanel.scrollHeight;

  try {
    const response = await fetch(apiPath("api/chat/stream"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders()
      },
      body: JSON.stringify({ sessionId: state.sessionId, message, mode }),
      signal: chatAbortController.signal
    });

    if (response.status === 401) {
      showLogin("App password required.");
      return;
    }
    if (!response.ok || !response.body) {
      pending.className = "bubble assistant error";
      pending.textContent = "The tutor could not respond. Check Ollama, then retry.";
      setRetryEnabled(true);
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
  } catch (error) {
    pending.className = "bubble assistant error";
    pending.textContent = error.name === "AbortError" ? "Stopped. You can retry that prompt." : "The tutor connection dropped. Retry when Ollama is ready.";
    setRetryEnabled(true);
  } finally {
    setStreaming(false);
    chatAbortController = null;
  }
}

function handleStreamEvent(rawEvent, pending, mode) {
  const lines = rawEvent.split("\n");
  const event = lines.find(line => line.startsWith("event:"))?.slice(6).trim();
  const dataLine = lines.find(line => line.startsWith("data:"));
  const data = dataLine ? JSON.parse(dataLine.slice(5)) : {};
  if (event === "chunk") {
    pending.className = "bubble assistant";
    pending.textContent += data.chunk || "";
    els.chatPanel.scrollTop = els.chatPanel.scrollHeight;
  }
  if (event === "done") {
    updateSessionMessages(data.sessionId, data.messages, mode);
    renderChat();
  }
  if (event === "error") {
    pending.className = "bubble assistant error";
    pending.textContent = data.error || "Streaming failed. Retry when Ollama is ready.";
    setRetryEnabled(true);
  }
}

function createTypingBubble() {
  const bubble = createBubble("assistant", "");
  bubble.classList.add("typing");
  bubble.innerHTML = `<span></span><span></span><span></span>`;
  return bubble;
}

function setStreaming(isStreaming) {
  els.chatForm.classList.toggle("is-streaming", isStreaming);
  els.chatInput.disabled = isStreaming;
  els.sendChatButton.disabled = isStreaming;
  els.stopChatButton.disabled = !isStreaming;
  if (isStreaming) setRetryEnabled(false);
}

function setRetryEnabled(enabled) {
  els.retryChatButton.disabled = !enabled || !lastChatRequest;
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
  if (chatAbortController) return;
  const message = els.chatInput.value.trim();
  if (!message) return;
  els.chatInput.value = "";
  const session = state.sessions.find(item => item.id === state.sessionId);
  if (session) session.messages.push({ role: "user", content: message });
  renderChat();
  await sendChat(message, "tutor");
});

els.stopChatButton.addEventListener("click", () => {
  if (chatAbortController) chatAbortController.abort();
});

els.retryChatButton.addEventListener("click", async () => {
  if (!lastChatRequest || chatAbortController) return;
  state.sessionId = lastChatRequest.sessionId || state.sessionId;
  setRetryEnabled(false);
  renderChat();
  await sendChat(lastChatRequest.message, lastChatRequest.mode);
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

els.continueChatButton.addEventListener("click", () => {
  state.sessionId = state.sessions[0]?.id || state.sessionId;
  renderChat();
  switchView("chatView");
});

els.logoutButton.addEventListener("click", () => {
  localStorage.removeItem(AUTH_KEY);
  state.token = "";
  showLogin("Logged out.");
});

els.generateLessonButton.addEventListener("click", async () => {
  els.generateLessonButton.textContent = "Generating...";
  const topic = els.lessonTopicInput.value.trim() || state.currentQuest.title || "daily German practice";
  try {
    const result = await api("api/lesson/generate", {
      method: "POST",
      body: JSON.stringify({ topic })
    });
    state.lessons = [result.lesson, ...state.lessons.filter(item => item.id !== result.lesson.id)];
    els.lessonTopicInput.value = "";
    renderLesson(result.lesson);
  } catch (error) {
    els.lessonCard.classList.remove("collapsed");
    els.lessonTitle.textContent = "Lesson unavailable";
    els.lessonWarmup.textContent = error.message;
  } finally {
    els.generateLessonButton.textContent = "Generate Lesson";
  }
});

async function loadDailyStory(force = false) {
  const button = force ? els.refreshStoryButton : els.generateStoryButton;
  button.textContent = force ? "Refreshing..." : "Generating...";
  try {
    const result = await api("api/story/daily", {
      method: "POST",
      body: JSON.stringify({ force })
    });
    state.dailyStory = result.story;
    renderDailyStory();
  } catch (error) {
    els.dailyStorySummary.textContent = error.message;
  } finally {
    els.generateStoryButton.textContent = state.dailyStory ? "Read Today" : "Generate Story";
    els.refreshStoryButton.textContent = "Refresh Today";
  }
}

els.generateStoryButton.addEventListener("click", async () => {
  if (state.dailyStory) {
    els.dailyStoryBody.classList.toggle("collapsed");
    return;
  }
  await loadDailyStory(false);
});

els.refreshStoryButton.addEventListener("click", () => loadDailyStory(true));

els.lessonCoachButton.addEventListener("click", async () => {
  const topic = els.lessonTopicInput.value.trim() || "German from zero";
  await startLessonCoach(topic);
});

async function startLessonCoach(topic) {
  const result = await api("api/chat/new", {
    method: "POST",
    body: JSON.stringify({ mode: "lesson", title: `Lesson Coach: ${topic}` })
  });
  state.sessions.unshift(result.session);
  state.sessionId = result.session.id;
  renderChat();
  switchView("chatView");
  await sendChat(`Teach me a beginner-friendly lesson about ${topic}. Start by defining the words I need first, then give me one tiny practice turn.`, "lesson");
}

async function generateLessonForTopic(topic) {
  els.generateLessonButton.textContent = "Generating...";
  const result = await api("api/lesson/generate", {
    method: "POST",
    body: JSON.stringify({ topic })
  });
  state.lessons = [result.lesson, ...state.lessons.filter(item => item.id !== result.lesson.id)];
  renderLesson(result.lesson);
  els.generateLessonButton.textContent = "Generate Lesson";
}

els.lessonPath.addEventListener("click", async event => {
  const coach = event.target.closest("[data-path-coach]");
  const generate = event.target.closest("[data-path-generate]");
  if (!coach && !generate) return;
  const lesson = starterLessons[Number((coach || generate).dataset.pathCoach ?? (coach || generate).dataset.pathGenerate)];
  if (!lesson) return;
  if (coach) await startLessonCoach(lesson.topic);
  if (generate) {
    try {
      await generateLessonForTopic(lesson.topic);
    } catch (error) {
      els.lessonCard.classList.remove("collapsed");
      els.lessonTitle.textContent = "Lesson unavailable";
      els.lessonWarmup.textContent = error.message;
      els.generateLessonButton.textContent = "Generate Lesson";
    }
  }
});

function renderLesson(lesson) {
  state.activeLessonId = lesson.id || null;
  state.activeLesson = lesson;
  els.lessonCard.classList.remove("collapsed");
  els.lessonTitle.textContent = lesson.title || "Daily lesson";
  els.lessonGoal.textContent = state.profile.level;
  els.lessonWarmup.textContent = lesson.goal || lesson.warmup || "Practice this short lesson.";
  if (els.completeLessonButton) {
    els.completeLessonButton.disabled = Boolean(lesson.completed);
    els.completeLessonButton.textContent = lesson.completed ? "Lesson Complete" : "Complete Lesson";
  }
  const dialogue = Array.isArray(lesson.dialogue) ? lesson.dialogue : [];
  els.lessonDialogue.replaceChildren(...dialogue.map(line => {
    const item = document.createElement("p");
    renderTappableText(item, line);
    return item;
  }));
  const vocab = Array.isArray(lesson.vocabulary) ? lesson.vocabulary : [];
  els.lessonVocab.replaceChildren(...vocab.map(word => {
    const item = document.createElement("button");
    item.type = "button";
    item.innerHTML = `<strong>${word.german || ""}</strong><small>${word.english || ""}</small>`;
    item.addEventListener("click", async () => {
      const saved = await api("api/words", {
        method: "POST",
        body: JSON.stringify({ german: word.german, english: word.english, article: word.article || "" })
      });
      state.words.unshift(saved);
      item.disabled = true;
      item.querySelector("small").textContent = "Saved";
      renderDrills();
    });
    return item;
  }));
  const drill = lesson.drill || {};
  els.lessonDrill.textContent = drill.prompt ? `Drill: ${drill.prompt}` : "";
  if (els.lessonDrillInput) els.lessonDrillInput.value = "";
  if (els.lessonDrillFeedback) els.lessonDrillFeedback.textContent = "Use the drill prompt above.";
  renderPastLessons();
}

function renderPastLessons() {
  if (!els.pastLessons || !els.lessonCount) return;
  els.lessonCount.textContent = String(state.lessons.length);
  if (!state.lessons.length) {
    els.pastLessons.innerHTML = `<div class="empty-state">Generated lessons will appear here.</div>`;
    return;
  }
  els.pastLessons.replaceChildren(...state.lessons.slice(0, 6).map(lesson => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = lesson.completed ? "completed" : "";
    button.innerHTML = `<strong>${lesson.title || "Daily lesson"}</strong><small>${lesson.completed ? "Complete" : "In progress"}</small>`;
    button.addEventListener("click", () => renderLesson(lesson));
    return button;
  }));
}

els.completeLessonButton?.addEventListener("click", async () => {
  if (!state.activeLessonId) return;
  els.completeLessonButton.textContent = "Saving...";
  const result = await api("api/lesson/complete", {
    method: "POST",
    body: JSON.stringify({ id: state.activeLessonId })
  });
  state.profile = result.profile;
  state.lessons = state.lessons.map(lesson => lesson.id === result.lesson.id ? result.lesson : lesson);
  renderHome();
  renderLesson(result.lesson);
});

els.practiceLessonButton?.addEventListener("click", async () => {
  const lesson = state.activeLesson;
  if (!lesson) return;
  const result = await api("api/chat/new", {
    method: "POST",
    body: JSON.stringify({ mode: "lesson", title: `Lesson: ${lesson.title || "Practice"}` })
  });
  state.sessions.unshift(result.session);
  state.sessionId = result.session.id;
  const vocab = (lesson.vocabulary || [])
    .map(word => `${word.article ? `${word.article} ` : ""}${word.german || ""} = ${word.english || ""}`)
    .filter(Boolean)
    .join("; ");
  const prompt = [
    `Practice this German lesson with me: ${lesson.title || "Daily lesson"}.`,
    `Goal: ${lesson.goal || lesson.warmup || "simple conversation"}.`,
    vocab ? `Use these words: ${vocab}.` : "",
    "Ask one short question at a time, correct my German, and keep it at my level."
  ].filter(Boolean).join(" ");
  const session = state.sessions.find(item => item.id === state.sessionId);
  if (session) session.messages.push({ role: "user", content: prompt });
  renderChat();
  switchView("chatView");
  await sendChat(prompt, "lesson");
});

els.checkLessonDrillButton?.addEventListener("click", async () => {
  const lesson = state.activeLesson;
  const answer = els.lessonDrillInput.value.trim();
  if (!lesson || !answer) return;
  const expected = lesson.drill?.answer || lesson.drill?.expected || "";
  if (!expected) {
    els.lessonDrillFeedback.textContent = "No answer key for this drill. Practice it in chat instead.";
    return;
  }
  const result = await api("api/drills/check", {
    method: "POST",
    body: JSON.stringify({ kind: "lesson-drill", answer, expected })
  });
  state.profile = result.profile;
  state.currentQuest = result.currentQuest;
  els.lessonDrillFeedback.textContent = result.correct ? `Richtig! +${result.xpDelta} XP` : `Try: ${result.expected}`;
  renderHome();
});

els.toggleHistoryButton.addEventListener("click", () => {
  const collapsed = els.chatHistory.classList.toggle("collapsed");
  els.toggleHistoryButton.setAttribute("aria-expanded", String(!collapsed));
  renderHistory();
});

async function explainText(text, kind = "word", context = "") {
  const cleanText = String(text || "").trim();
  if (!cleanText) return;
  els.lookupPanel.classList.remove("collapsed");
  els.lookupTitle.textContent = kind === "sentence" ? "Sentence meaning" : cleanText;
  els.lookupOutput.textContent = "Asking the teacher...";
  lastLookup = { text: cleanText, kind, context, answer: "" };
  try {
    const result = await api("api/lookup", {
      method: "POST",
      body: JSON.stringify({ text: cleanText, kind, context })
    });
    lastLookup = { text: cleanText, kind, context, answer: result.answer };
    els.lookupOutput.textContent = result.answer;
  } catch (error) {
    els.lookupOutput.textContent = error.message;
  }
}

async function runMessageTool(tool, text) {
  els.lookupPanel.classList.remove("collapsed");
  els.lookupTitle.textContent = tool === "translate" ? "Translation" : "Simpler explanation";
  els.lookupOutput.textContent = tool === "translate" ? "Translating..." : "Making it simpler...";
  try {
    const result = await api("api/tools", {
      method: "POST",
      body: JSON.stringify({ tool, input: text })
    });
    lastLookup = { text, kind: tool, context: text, answer: result.answer };
    els.lookupOutput.textContent = result.answer;
  } catch (error) {
    els.lookupOutput.textContent = error.message;
  }
}

async function suggestWordsFromText(text) {
  els.vocabSuggestions.textContent = "Finding useful words...";
  const result = await api("api/vocab/suggest", {
    method: "POST",
    body: JSON.stringify({ text })
  });
  renderVocabSuggestions(result.suggestions || []);
}

function renderVocabSuggestions(suggestions) {
  if (!suggestions.length) {
    els.vocabSuggestions.textContent = "No suggestions found.";
    return;
  }
  els.vocabSuggestions.replaceChildren(...suggestions.map(suggestion => {
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
}

els.closeLookupButton.addEventListener("click", () => {
  els.lookupPanel.classList.add("collapsed");
});

els.simplerLookupButton.addEventListener("click", async () => {
  if (!lastLookup) return;
  await explainText(lastLookup.text, lastLookup.kind, `Explain this even more simply. ${lastLookup.context || ""}`);
});

els.saveLookupButton.addEventListener("click", async () => {
  if (!lastLookup?.text) return;
  const word = await api("api/words", {
    method: "POST",
    body: JSON.stringify({
      german: lastLookup.text,
      english: (lastLookup.answer || "Lookup note").replace(/\s+/g, " ").slice(0, 120),
      article: ""
    })
  });
  state.words.unshift(word);
  els.saveLookupButton.textContent = "Saved";
  setTimeout(() => {
    els.saveLookupButton.textContent = "Save";
  }, 900);
  renderDrills();
});

document.addEventListener("click", event => {
  const action = event.target.closest("[data-message-action]");
  if (action) {
    const text = action.dataset.messageText || "";
    if (action.dataset.messageAction === "translate") runMessageTool("translate", text);
    if (action.dataset.messageAction === "simplify") runMessageTool("simplify", text);
    if (action.dataset.messageAction === "save-words") suggestWordsFromText(text);
    return;
  }
  const target = event.target.closest("[data-lookup-text]");
  if (!target) return;
  const bubble = target.closest(".bubble, .lesson-dialogue p, .guide-card");
  explainText(target.dataset.lookupText, target.dataset.lookupKind || "word", bubble?.textContent || "");
});

els.chatPanel.addEventListener("dblclick", event => {
  const bubble = event.target.closest(".bubble");
  if (!bubble) return;
  explainText(bubble.textContent, "sentence", bubble.textContent);
});

document.querySelectorAll("[data-teacher-prompt]").forEach(button => {
  button.addEventListener("click", async () => {
    switchView("chatView");
    els.chatInput.value = button.dataset.teacherPrompt;
    els.chatForm.requestSubmit();
  });
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
  await suggestWordsFromText(text);
});

els.summarizeChatButton.addEventListener("click", async () => {
  els.chatSummary.classList.remove("collapsed");
  els.chatSummary.textContent = "Reviewing this chat...";
  try {
    const result = await api("api/chat/summary", {
      method: "POST",
      body: JSON.stringify({ sessionId: state.sessionId })
    });
    els.chatSummary.textContent = result.summary;
  } catch (error) {
    els.chatSummary.textContent = error.message;
  }
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

function renderRepairDrill() {
  const drill = repairDrills[repairIndex % repairDrills.length];
  els.repairPrompt.textContent = drill.broken;
  els.repairInput.value = "";
}

function renderTranslateDrill() {
  const drill = translateDrills[translateIndex % translateDrills.length];
  els.translatePrompt.textContent = drill.prompt;
  els.translateInput.value = "";
}

function renderReviewQueue() {
  const queue = [...state.words].sort((a, b) => (a.strength || 0) - (b.strength || 0));
  const word = queue[reviewIndex % Math.max(1, queue.length)];
  if (!word) {
    els.reviewWord.textContent = "No saved words";
    els.reviewMeaning.textContent = "Save vocabulary from chat to build a queue.";
    els.reviewButtons.forEach(button => {
      button.disabled = true;
    });
    return;
  }
  els.reviewButtons.forEach(button => {
    button.disabled = false;
  });
  els.reviewWord.textContent = word.german;
  els.reviewMeaning.textContent = `${word.english || "No meaning yet"} · strength ${word.strength}/5`;
}

function currentReviewWord() {
  const queue = [...state.words].sort((a, b) => (a.strength || 0) - (b.strength || 0));
  return queue[reviewIndex % Math.max(1, queue.length)];
}

async function checkGenericDrill(kind, answer, expected, feedbackEl, onCorrect) {
  const result = await api("api/drills/check", {
    method: "POST",
    body: JSON.stringify({ kind, answer, expected })
  });
  state.profile = result.profile;
  state.currentQuest = result.currentQuest;
  feedbackEl.textContent = result.correct ? `Richtig! +${result.xpDelta} XP` : `Try: ${result.expected}`;
  renderHome();
  if (result.correct && onCorrect) setTimeout(onCorrect, 850);
}

els.checkRepairButton.addEventListener("click", () => {
  const drill = repairDrills[repairIndex % repairDrills.length];
  checkGenericDrill("repair", els.repairInput.value, drill.expected, els.repairFeedback, () => {
    repairIndex += 1;
    renderRepairDrill();
  });
});

els.checkTranslateButton.addEventListener("click", () => {
  const drill = translateDrills[translateIndex % translateDrills.length];
  checkGenericDrill("translation", els.translateInput.value, drill.expected, els.translateFeedback, () => {
    translateIndex += 1;
    renderTranslateDrill();
  });
});

els.nextReviewButton.addEventListener("click", () => {
  reviewIndex += 1;
  renderReviewQueue();
});

els.reviewButtons.forEach(button => {
  button.addEventListener("click", async () => {
    const word = currentReviewWord();
    if (!word) return;
    button.disabled = true;
    const result = await api("api/words/review", {
      method: "POST",
      body: JSON.stringify({ wordId: word.id, quality: button.dataset.quality })
    });
    state.profile = result.profile;
    state.words = state.words.map(item => item.id === result.word.id ? result.word : item);
    reviewIndex += 1;
    renderHome();
    renderDrills();
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

async function loadProgress() {
  const progress = await api("api/progress");
  els.progressLevel.textContent = progress.profile.level;
  els.progressXp.textContent = progress.profile.xp;
  els.progressSessions.textContent = progress.totals.sessions;
  els.progressWords.textContent = progress.totals.words;
  els.progressReps.textContent = progress.profile.completedToday || 0;
  if (els.progressLessons) {
    els.progressLessons.textContent = `${progress.totals.completedLessons || 0}/${progress.totals.lessons || 0}`;
  }
  els.weakestWords.replaceChildren(...progress.weakestWords.map(word => {
    const row = document.createElement("article");
    row.className = "word-row";
    row.innerHTML = `<span class="coin">${word.article || "?"}</span><div><h3>${word.german}</h3><p>${word.english || "Saved word"}</p></div><strong>${word.strength}/5</strong>`;
    return row;
  }));
  if (!progress.likelyMistakes.length) {
    els.mistakeList.innerHTML = `<div class="empty-state">No corrections found yet.</div>`;
    return;
  }
  els.mistakeList.replaceChildren(...progress.likelyMistakes.map(text => {
    const item = document.createElement("article");
    item.textContent = text;
    return item;
  }));
}

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
  window.addEventListener("load", () => navigator.serviceWorker.register(`${BASE_PATH}/service-worker.js?v=20260617a`));
}

loadApp().catch(error => {
  setLoaded();
  if (!state.authRequired) document.body.innerHTML = `<main class="app"><h1>DeutschQuest</h1><p>${error.message}</p></main>`;
});

renderConjugationDrill();
