/* ═══════════════════════════════════════════════════════════════
   Memovia Web — App-Kern
   Navigation, Start, Fragen, Notizen, Angehörige, Einstellungen,
   Fortschritt. 1:1 nach der iOS-App; Web-Testversion: alles frei.
   ═══════════════════════════════════════════════════════════════ */
"use strict";

/* ─────────── Speicher (localStorage, Keys wie in der App) ─────────── */
const Store = {
  get: (k, d = null) => {
    const v = localStorage.getItem(k);
    return v === null ? d : v;
  },
  set: (k, v) => localStorage.setItem(k, String(v)),
  getJSON: (k, d) => {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }
    catch { return d; }
  },
  setJSON: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  remove: (k) => localStorage.removeItem(k),
};

const userId = () => Store.get("memovia_user_id", "guest");
const userName = () => Store.get("memovia_user_name", "Gast");

/* ─────────── App-Zustand ─────────── */
const App = {
  tab: 0,
  familySeg: 0,
  quiz: {
    exercise: null, answered: false, selected: null,
    orderSelection: [], memorizing: false,
    session: { count: 0, correct: 0 },
    autoTimer: null, memorizeTimer: null,
  },
  settings: {
    theme: Store.get("memovia_app_theme", "standard"),
    difficulty: Store.get("memovia_difficulty", "mittel"),
    gameDifficulty: Store.get("memovia_game_difficulty", "mittel"),
    dementiaStage: parseInt(Store.get("memovia_dementia_stage", "0"), 10) || 0,
    fontScale: Store.get("memovia_font_scale", "mittel"),
    answerPace: Store.get("memovia_answer_pace", "normal"),
    haptics: Store.get("memovia_haptics", "1") === "1",
    sounds: Store.get("memovia_sounds", "1") === "1",
    readAloud: Store.get("memovia_read_aloud", "0") === "1",
  },
  activeCategories: null,   // Set von catIds
  progress: {},             // { catName: {correct, wrong} }
  dailyActivity: {},        // { yyyy-mm-dd: n }
  dailyCorrect: {},
  notes: [],
  people: [],
  memories: [],
};

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

/* ─────────── Hilfsfunktionen ─────────── */
const $ = (sel) => document.querySelector(sel);
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};
const esc = (s) => String(s ?? "").replace(/[&<>"']/g,
  c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const isoDate = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

function dayPhase() {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 0;
  if (h >= 11 && h < 17) return 1;
  if (h >= 17 && h < 22) return 2;
  return 3;
}

/* ─────────── Rückmeldung: Ton, Vibration, Sprache ─────────── */
const Feedback = {
  ctx: null,
  audio() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch { return null; }
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  },
  tone(freq, dur, type = "sine", gain = 0.12) {
    if (!App.settings.sounds) return;
    const ctx = this.audio();
    if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + dur);
  },
  vibrate(pattern) {
    if (App.settings.haptics && navigator.vibrate) navigator.vibrate(pattern);
  },
  success() { this.tone(660, 0.12); setTimeout(() => this.tone(880, 0.18), 110); this.vibrate(30); },
  error() { this.tone(220, 0.28, "square", 0.08); this.vibrate([40, 60, 40]); },
  tap() { this.tone(520, 0.05, "sine", 0.06); this.vibrate(10); },
};

const Speech = {
  speak(text) {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "de-DE"; u.rate = 0.92;
    const voice = speechSynthesis.getVoices().find(v => v.lang.startsWith("de"));
    if (voice) u.voice = voice;
    speechSynthesis.speak(u);
  },
  stop() { if ("speechSynthesis" in window) speechSynthesis.cancel(); },
};
if ("speechSynthesis" in window) speechSynthesis.getVoices();

/* ─────────── Theme anwenden ─────────── */
function applyTheme() {
  document.body.dataset.theme = App.settings.theme;
  document.body.dataset.phase = String(dayPhase());
  const factor = { klein: 0.9, mittel: 1.0, gross: 1.18 }[App.settings.fontScale] || 1;
  document.documentElement.style.setProperty("--font-scale", factor);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = getComputedStyle(document.body).getPropertyValue("--bg-a").trim() || "#1F2647";
}
setInterval(applyTheme, 60000);

function saveSetting(key, storeKey, value) {
  App.settings[key] = value;
  Store.set(storeKey, typeof value === "boolean" ? (value ? "1" : "0") : value);
}

/* ─────────── Fortschritts-Daten ─────────── */
function loadProgress() {
  const uid = userId();
  App.progress = Store.getJSON(`memovia_progress_${uid}`, {});
  App.dailyActivity = Store.getJSON(`memovia_daily_${uid}`, {});
  App.dailyCorrect = Store.getJSON(`memovia_daily_correct_${uid}`, {});
}
function saveProgress() {
  const uid = userId();
  Store.setJSON(`memovia_progress_${uid}`, App.progress);
  Store.setJSON(`memovia_daily_${uid}`, App.dailyActivity);
  Store.setJSON(`memovia_daily_correct_${uid}`, App.dailyCorrect);
}
function recordAnswer(categoryName, wasCorrect) {
  const p = App.progress[categoryName] || { correct: 0, wrong: 0 };
  const today = isoDate();
  if (wasCorrect) {
    p.correct++;
    App.quiz.session.correct++;
    App.dailyCorrect[today] = (App.dailyCorrect[today] || 0) + 1;
  } else p.wrong++;
  App.progress[categoryName] = p;
  App.quiz.session.count++;
  App.dailyActivity[today] = (App.dailyActivity[today] || 0) + 1;
  saveProgress();
}

const Stats = {
  totalSolved: () => Object.values(App.progress).reduce((s, p) => s + p.correct + p.wrong, 0),
  totalCorrect: () => Object.values(App.progress).reduce((s, p) => s + p.correct, 0),
  overallRate() { const t = this.totalSolved(); return t ? Math.round(this.totalCorrect() / t * 100) : 0; },
  todaySolved: () => App.dailyActivity[isoDate()] || 0,
  todayCorrect: () => App.dailyCorrect[isoDate()] || 0,
  todayRate() { const s = this.todaySolved(); return s ? Math.round(this.todayCorrect() / s * 100) : 0; },
  streak() {
    let count = 0;
    const day = new Date();
    if (!(App.dailyActivity[isoDate(day)] > 0)) day.setDate(day.getDate() - 1);
    while (App.dailyActivity[isoDate(day)] > 0) {
      count++; day.setDate(day.getDate() - 1);
    }
    return count;
  },
  lastSevenDays() {
    const out = [];
    const fmt = new Intl.DateTimeFormat("de-DE", { weekday: "short" });
    for (let off = 6; off >= 0; off--) {
      const d = new Date(); d.setDate(d.getDate() - off);
      out.push({ label: fmt.format(d).replace(".", ""), count: App.dailyActivity[isoDate(d)] || 0 });
    }
    return out;
  },
  lastThirtyDays() {
    const out = [];
    for (let off = 29; off >= 0; off--) {
      const d = new Date(); d.setDate(d.getDate() - off);
      out.push(App.dailyActivity[isoDate(d)] || 0);
    }
    return out;
  },
};

/* ─────────── Notizen & Angehörige laden/speichern ─────────── */
function loadUserData() {
  const uid = userId();
  App.notes = Store.getJSON(`memovia_notes_${uid}`, []);
  App.people = Store.getJSON(`memovia_people_${uid}`, []);
  App.memories = Store.getJSON(`memovia_memories_${uid}`, []);
  const saved = Store.get("memovia_active_categories");
  const spezial = Generator.CATS.filter(c => Generator.isSpezial(c.id)).map(c => c.id);
  if (saved) {
    const names = saved.split("|");
    const ids = Generator.CATS.filter(c => names.includes(c.name)).map(c => c.id);
    App.activeCategories = new Set(ids.length ? [...ids, ...spezial] : Generator.CATS.map(c => c.id));
  } else {
    App.activeCategories = new Set(Generator.CATS.map(c => c.id));
  }
}
const saveNotes = () => Store.setJSON(`memovia_notes_${userId()}`, App.notes);
const savePeople = () => Store.setJSON(`memovia_people_${userId()}`, App.people);
const saveMemories = () => Store.setJSON(`memovia_memories_${userId()}`, App.memories);
function saveActiveCategories() {
  const names = [...App.activeCategories].map(id => Generator.catById[id].name).join("|");
  Store.set("memovia_active_categories", names);
}

/* ─────────── Onboarding ─────────── */
function initOnboarding() {
  if (Store.get("memovia_user_id")) {
    startApp();
    return;
  }
  $("#onboarding").classList.remove("hidden");
  const begin = (name) => {
    Store.set("memovia_user_id", name ? "u_" + Date.now() : "guest");
    Store.set("memovia_user_name", name || "Gast");
    $("#onboarding").classList.add("hidden");
    startApp();
  };
  $("#onboardStart").onclick = () => begin($("#onboardName").value.trim());
  $("#onboardGuest").onclick = () => begin("");
  $("#onboardName").addEventListener("keydown", (e) => {
    if (e.key === "Enter") begin($("#onboardName").value.trim());
  });
}

function startApp() {
  loadProgress();
  loadUserData();
  applyTheme();
  $("#app").classList.remove("hidden");
  renderHome();
  Games.renderGrid();
  switchTab(0);
}

/* ─────────── Tab-Navigation ─────────── */
const SCREENS = ["screen-start", "screen-fragen", "screen-spiele", "screen-notizen", "screen-familie"];
function switchTab(i) {
  App.tab = i;
  SCREENS.forEach((id, idx) => $("#" + id).classList.toggle("hidden", idx !== i));
  document.querySelectorAll("#tabbar .tab").forEach((t, idx) =>
    t.classList.toggle("active", idx === i));
  Speech.stop();
  if (i === 0) renderHome();
  if (i === 1) { if (!App.quiz.exercise) loadNextExercise(); renderQuiz(); }
  if (i === 3) renderNotes();
  if (i === 4) renderFamily();
  window.scrollTo({ top: 0 });
}

document.querySelectorAll("#tabbar .tab").forEach(t =>
  t.addEventListener("click", () => switchTab(parseInt(t.dataset.tab, 10))));
document.querySelectorAll("[data-goto]").forEach(b =>
  b.addEventListener("click", () => switchTab(parseInt(b.dataset.goto, 10))));

/* ─────────── Start-Seite ─────────── */
const GREETINGS = [
  ["Guten Morgen", "🌅"], ["Schönen Tag", "☀️"],
  ["Guten Abend", "🌇"], ["Gute Nacht", "🌙"],
];
function seasonInfo() {
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 5) return ["Frühling", "🌷", "Die Tage werden länger und heller."];
  if (m >= 6 && m <= 8) return ["Sommer", "☀️", "Die warme, helle Jahreszeit."];
  if (m >= 9 && m <= 11) return ["Herbst", "🍂", "Die Blätter färben sich bunt."];
  return ["Winter", "❄️", "Die ruhige, kalte Jahreszeit."];
}

function renderHome() {
  applyTheme();
  const [greet, icon] = GREETINGS[dayPhase()];
  $("#greetText").textContent = greet;
  $("#greetIcon").textContent = icon;
  $("#greetName").textContent = userName();

  const now = new Date();
  $("#orientWeekday").textContent = new Intl.DateTimeFormat("de-DE", { weekday: "long" }).format(now);
  $("#orientDate").textContent = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric" }).format(now);
  const [sName, sEmoji, sSatz] = seasonInfo();
  $("#orientEmoji").textContent = sEmoji;
  $("#orientSeason").textContent = `${sName} — ${sSatz}`;

  const today = Stats.todaySolved();
  $("#statToday").textContent = today;
  $("#statRate").textContent = today > 0 ? Stats.todayRate() + " %" : "–";
  $("#statTotal").textContent = Stats.totalSolved();
  $("#motivation").textContent =
    today === 0 ? "Noch keine Übung heute — ein guter Moment, um zu starten."
    : today < 5 ? "Schön begonnen! Jede Übung hält den Kopf fit."
    : "Großartig — das war heute schon richtig fleißig!";

  $("#tileGames").textContent = `${Games.list.length} Spiele`;
  $("#tileNotes").textContent = App.notes.length ? String(App.notes.length) : "anlegen";
  $("#tileFamily").textContent =
    (App.people.length || App.memories.length) ? String(App.people.length) : "anlegen";
}
$("#btnRecommend").addEventListener("click", () => switchTab(1));
$("#btnStats").addEventListener("click", openStats);
$("#btnSettings").addEventListener("click", openSettings);
$("#btnLogout").addEventListener("click", () => {
  if (!confirm("Abmelden? Name und Anmeldung werden zurückgesetzt — Fortschritt bleibt auf dem Gerät.")) return;
  Store.remove("memovia_user_id");
  Store.remove("memovia_user_name");
  location.reload();
});

/* ─────────── Fragen / Quiz ─────────── */
const PACE_DELAYS = {
  langsam: { true: 3500, false: 5000 },
  normal: { true: 2000, false: 3000 },
  manuell: null,
};

function loadNextExercise() {
  clearTimeout(App.quiz.autoTimer);
  clearTimeout(App.quiz.memorizeTimer);
  App.quiz.answered = false;
  App.quiz.selected = null;
  App.quiz.orderSelection = [];

  let cats = [...App.activeCategories];
  if (!App.people.length) cats = cats.filter(c => c !== "angehoerige");
  if (!cats.length) cats = ["allgemein"];
  const ex = Generator.generateRandom(cats, App.people);
  App.quiz.exercise = ex;

  if (ex.memorize) {
    App.quiz.memorizing = true;
    const zeilen = ex.memorize.split("\n").length;
    const ms = (2.5 + zeilen * 0.8) * 1000;
    const id = ex.id;
    App.quiz.memorizeTimer = setTimeout(() => {
      if (App.quiz.exercise?.id === id) {
        App.quiz.memorizing = false;
        renderQuiz();
      }
    }, ms);
  } else {
    App.quiz.memorizing = false;
  }
  if (App.settings.readAloud) {
    setTimeout(() => {
      if (App.quiz.exercise?.id === ex.id) Speech.speak(speakableText(ex));
    }, 400);
  }
}

const speakableText = (ex) =>
  `${ex.prompt.replace(/\n/g, ", ")}. Die Möglichkeiten sind: ${ex.options.join(", ")}.`;

function renderQuiz() {
  $("#quizSession").textContent =
    `${App.quiz.session.count} gelöst · ${App.quiz.session.correct} richtig`;
  const area = $("#quizArea");
  area.innerHTML = "";
  const ex = App.quiz.exercise;
  if (!ex) return;

  const card = el("div", "quiz-card");

  // Symbol / Foto / Uhr
  if (ex.clock) {
    card.appendChild(clockSVG(ex.clock));
  } else if (ex.photo) {
    const img = el("img", "quiz-photo");
    img.src = "data:image/jpeg;base64," + ex.photo;
    img.alt = "Foto eines Angehörigen";
    card.appendChild(img);
  } else {
    card.appendChild(el("div", "quiz-symbol", esc(ex.symbol)));
  }
  card.appendChild(el("div", "quiz-category", esc(ex.category)));

  if (App.quiz.memorizing && ex.memorize) {
    const box = el("div", "memorize-box");
    box.appendChild(el("div", "memorize-title", "Merken Sie sich:"));
    box.appendChild(el("div", "memorize-content", esc(ex.memorize)));
    const btn = el("button", "btn-accent", "Verstanden — weiter");
    btn.onclick = () => {
      clearTimeout(App.quiz.memorizeTimer);
      App.quiz.memorizing = false;
      renderQuiz();
    };
    box.appendChild(btn);
    box.appendChild(el("div", "memorize-note", "Wird in wenigen Sekunden ausgeblendet…"));
    card.appendChild(box);
    area.appendChild(card);
    return;
  }

  card.appendChild(el("div", "quiz-prompt", esc(ex.prompt)));

  const speak = el("button", "quiz-speak", "🔊 Vorlesen");
  speak.onclick = () => Speech.speak(speakableText(ex));
  card.appendChild(speak);

  if (ex.correctOrder) {
    card.appendChild(renderOrdering(ex));
  } else {
    const wrap = el("div", "quiz-options" + (ex.options.length >= 5 ? " grid2" : ""));
    ex.options.forEach(opt => {
      const b = el("button", "answer-btn", esc(opt));
      if (App.quiz.answered) {
        b.disabled = true;
        if (opt === ex.correct) b.classList.add("correct");
        else if (opt === App.quiz.selected) b.classList.add("wrong");
      } else {
        b.onclick = () => answer(opt);
      }
      wrap.appendChild(b);
    });
    card.appendChild(wrap);
  }

  if (App.quiz.answered) card.appendChild(renderFeedback(ex));
  else {
    const skip = el("button", "skip-btn", "Frage überspringen →");
    skip.onclick = () => { loadNextExercise(); renderQuiz(); };
    card.appendChild(skip);
  }
  area.appendChild(card);
}

function renderOrdering(ex) {
  const wrap = el("div", "quiz-options");
  if (!App.quiz.answered) wrap.appendChild(el("div", "order-hint", "Tippen Sie der Reihe nach."));
  ex.options.forEach(item => {
    const pos = App.quiz.orderSelection.indexOf(item);
    const b = el("button", "order-btn");
    const badge = el("span", "order-badge", pos >= 0 ? String(pos + 1) : "");
    b.appendChild(badge);
    b.appendChild(el("span", "order-label", esc(item)));
    if (App.quiz.answered) {
      const up = App.quiz.orderSelection.indexOf(item);
      const cp = ex.correctOrder.indexOf(item);
      b.classList.add(up === cp ? "res-ok" : "res-bad");
      badge.textContent = String(up + 1);
      b.disabled = true;
    } else {
      if (pos >= 0) b.classList.add("picked");
      b.onclick = () => {
        if (pos >= 0) {
          App.quiz.orderSelection.splice(pos, 1);
          Feedback.tap();
          renderQuiz();
          return;
        }
        App.quiz.orderSelection.push(item);
        Feedback.tap();
        if (App.quiz.orderSelection.length === ex.options.length) {
          answer(App.quiz.orderSelection.join(" → "));
        } else renderQuiz();
      };
    }
    wrap.appendChild(b);
  });
  if (!App.quiz.answered && App.quiz.orderSelection.length) {
    const reset = el("button", "skip-btn", "↺ Nochmal");
    reset.onclick = () => { App.quiz.orderSelection = []; renderQuiz(); };
    wrap.appendChild(reset);
  }
  return wrap;
}

function renderFeedback(ex) {
  const box = el("div", "quiz-feedback");
  const correct = App.quiz.selected === ex.correct;
  box.appendChild(el("div", correct ? "fb-correct" : "fb-wrong",
    correct ? `✓ Richtig, ${esc(userName())}!` : "Leider falsch"));
  if (!correct) {
    box.appendChild(el("div", "fb-solution", "Richtige Antwort: " + esc(ex.correct)));
  }
  if (ex.hint) box.appendChild(el("div", "fb-solution", esc(ex.hint)));
  const next = el("button", "btn-primary", "Weiter →");
  next.onclick = () => { loadNextExercise(); renderQuiz(); };
  box.appendChild(next);
  if (App.settings.answerPace !== "manuell") {
    box.appendChild(el("div", "fb-auto", "Geht gleich automatisch weiter…"));
  }
  return box;
}

function answer(option) {
  if (App.quiz.answered) return;
  const ex = App.quiz.exercise;
  App.quiz.selected = option;
  App.quiz.answered = true;
  const wasCorrect = option === ex.correct;
  recordAnswer(ex.category, wasCorrect);
  if (wasCorrect) Feedback.success(); else Feedback.error();
  checkStreakMilestone();
  renderQuiz();
  if (App.tab === 0) renderHome();

  const pace = PACE_DELAYS[App.settings.answerPace];
  if (pace) {
    const id = ex.id;
    App.quiz.autoTimer = setTimeout(() => {
      if (App.quiz.answered && App.quiz.exercise?.id === id) {
        loadNextExercise(); renderQuiz();
      }
    }, pace[wasCorrect]);
  }
}

function checkStreakMilestone() {
  const key = `memovia_last_streak_reward_${userId()}`;
  const current = Stats.streak();
  const lastShown = parseInt(Store.get(key, "0"), 10) || 0;
  if (current < lastShown) { Store.set(key, current); return; }
  if (current > lastShown && STREAK_MILESTONES.includes(current)) {
    Store.set(key, current);
    showStreakReward(current);
  }
}

function showStreakReward(days) {
  const ov = $("#streakOverlay");
  ov.innerHTML = "";
  const card = el("div", "glass streak-card");
  card.appendChild(el("div", "streak-flame", "🔥"));
  card.appendChild(el("div", "streak-days", `${days} Tage in Folge!`));
  card.appendChild(el("p", "", "Wunderbar — dranbleiben lohnt sich. Jeder Tag Training tut dem Kopf gut."));
  const ok = el("button", "btn-accent", "Weiter so!");
  ok.onclick = () => ov.classList.add("hidden");
  card.appendChild(ok);
  ov.appendChild(card);
  ov.classList.remove("hidden");
}

/* Analoge Uhr als SVG (clockView-Port) */
function clockSVG(time) {
  const [hStr, mStr] = time.split(":");
  const hour = parseInt(hStr, 10) || 12;
  const minute = parseInt(mStr, 10) || 0;
  const S = 240, C = S / 2, numberR = 94, hourLen = 58, minLen = 84;
  const hourAngle = ((hour % 12) + minute / 60) * 30 * Math.PI / 180;
  const minAngle = minute * 6 * Math.PI / 180;
  const tip = (len, ang) => [C + len * Math.sin(ang), C - len * Math.cos(ang)];
  const [hx, hy] = tip(hourLen, hourAngle);
  const [mx, my] = tip(minLen, minAngle);
  let nums = "";
  for (let i = 1; i <= 12; i++) {
    const a = i * 30 * Math.PI / 180;
    nums += `<text x="${C + numberR * Math.sin(a)}" y="${C - numberR * Math.cos(a)}"
      text-anchor="middle" dominant-baseline="central"
      font-size="20" font-weight="700" fill="#fff">${i}</text>`;
  }
  const wrap = el("div", "clock-wrap");
  wrap.innerHTML = `<svg viewBox="0 0 ${S} ${S}" role="img"
    aria-label="Analoge Uhr. Bitte die angezeigte Uhrzeit ablesen.">
    <circle cx="${C}" cy="${C}" r="${C - 4}" fill="rgba(255,255,255,0.10)"
      stroke="rgba(255,255,255,0.85)" stroke-width="4"/>
    ${nums}
    <line x1="${C}" y1="${C}" x2="${mx}" y2="${my}" stroke="#fff"
      stroke-width="4" stroke-linecap="round"/>
    <line x1="${C}" y1="${C}" x2="${hx}" y2="${hy}" stroke="#D4A117"
      stroke-width="6" stroke-linecap="round"/>
    <circle cx="${C}" cy="${C}" r="7" fill="#D4A117"/>
  </svg>`;
  return wrap;
}

$("#btnQuizSettings").addEventListener("click", openQuizSettings);

/* ─────────── Sheet-Helfer ─────────── */
function buildSheet(container, title, onDone) {
  container.innerHTML = "";
  const inner = el("div", "sheet-inner");
  const head = el("div", "sheet-head");
  const done = el("button", "sheet-done", "Fertig");
  done.onclick = () => { container.classList.add("hidden"); if (onDone) onDone(); };
  head.appendChild(done);
  head.appendChild(el("h2", "", esc(title)));
  head.appendChild(el("span", "", "&nbsp;"));
  inner.appendChild(head);
  container.appendChild(inner);
  container.classList.remove("hidden");
  container.scrollTop = 0;
  return inner;
}

function optionRow(icon, title, sub, selected, onclick) {
  const b = el("button", "option-row" + (selected ? " selected" : ""));
  b.innerHTML = `<span class="o-icon">${icon}</span>
    <span class="o-texts"><span class="o-title">${esc(title)}</span>
    ${sub ? `<span class="o-sub">${esc(sub)}</span>` : ""}</span>
    <span class="o-check">${selected ? "●" : "○"}</span>`;
  b.onclick = onclick;
  return b;
}

function toggleRow(icon, title, sub, checked, gold, onchange) {
  const row = el("div", "option-row");
  row.innerHTML = `<span class="o-icon">${icon}</span>
    <span class="o-texts"><span class="o-title">${esc(title)}</span>
    ${sub ? `<span class="o-sub">${esc(sub)}</span>` : ""}</span>
    <label class="switch"><input type="checkbox" ${checked ? "checked" : ""}>
    <span class="knob${gold ? " gold" : ""}"></span></label>`;
  row.querySelector("input").addEventListener("change", (e) => onchange(e.target.checked));
  return row;
}

/* ─────────── App-Einstellungen ─────────── */
function openSettings() {
  const inner = buildSheet($("#sheetSettings"), "Einstellungen", () => {
    renderHome();
    if (App.tab === 1) { loadNextExercise(); renderQuiz(); }
  });
  const add = (n) => inner.appendChild(n);

  // Hinweis Web-Testversion (ersetzt den Tester-Modus der App)
  const info = el("div", "glass card");
  info.style.borderColor = "rgba(212,161,23,0.4)";
  info.innerHTML = `<div style="display:flex;gap:14px;align-items:flex-start">
    <span class="o-icon">🛠️</span>
    <div><div class="o-title" style="font-weight:600">Web-Testversion</div>
    <div class="o-sub">Alle Funktionen sind kostenlos freigeschaltet. Diese Version dient
    zum Ausprobieren — die vollständige App gibt es im App Store für iPhone und iPad.</div></div></div>`;
  add(info);

  // Demenz-Stadium
  add(el("div", "setting-h", "Demenz-Stadium"));
  add(el("div", "setting-sub", "Bestimmt, welche Art von Fragen Memovia stellt. Bei niedrigem Stadium kommen anspruchsvolle Fragen wie Mathe und Hauptstädte. Bei hohem Stadium eher persönliche und einfache Aufgaben."));
  const stageCard = el("div", "glass card");
  const renderStage = () => {
    const s = App.settings.dementiaStage;
    const label = s <= 3 ? "Kein bis leicht" : s <= 7 ? "Mittel" : "Fortgeschritten";
    const desc = s <= 3
      ? "Anspruchsvolle Fragen: Hauptstädte, Mathe, Sprichwörter, berühmte Personen. Keine persönlichen Fragen über Angehörige."
      : s <= 7
      ? "Ausgewogener Mix aus Wissensfragen und persönlichen Fragen über die eigene Familie."
      : "Vorwiegend einfache und persönliche Inhalte: Familie, Farben, Tiere, Tageszeiten.";
    stageCard.innerHTML = `
      <div class="stage-top"><span class="stage-num">${s}</span>
        <span class="stage-of">/ 10</span>
        <span class="stage-chip">${label}</span></div>
      <input type="range" min="0" max="10" step="1" value="${s}"
        aria-label="Demenz-Stadium" style="width:100%;margin:14px 0 8px">
      <div class="stage-scale"><span>0</span><span>5</span><span>10</span></div>
      <div class="stage-desc">${desc}</div>`;
    stageCard.querySelector("input").addEventListener("input", (e) => {
      saveSetting("dementiaStage", "memovia_dementia_stage", parseInt(e.target.value, 10));
      renderStage();
    });
  };
  renderStage();
  add(stageCard);

  // Erscheinungsbild
  add(el("div", "setting-h", "Erscheinungsbild"));
  add(el("div", "setting-sub", "Wählen Sie aus, wie Memovia aussehen soll."));
  const themes = [
    ["standard", "✨", "Standard", "Passt sich der Tageszeit an"],
    ["hell", "☀️", "Tag", "Heller blau-lila Verlauf"],
    ["dunkel", "🌙", "Nacht", "Tiefes Schwarz für entspannte Augen"],
  ];
  const themeWrap = el("div");
  themeWrap.style.cssText = "display:flex;flex-direction:column;gap:10px";
  const renderThemes = () => {
    themeWrap.innerHTML = "";
    themes.forEach(([id, icon, titel, sub]) =>
      themeWrap.appendChild(optionRow(icon, titel, sub, App.settings.theme === id, () => {
        saveSetting("theme", "memovia_app_theme", id);
        applyTheme(); renderThemes();
      })));
  };
  renderThemes();
  add(themeWrap);

  // Schwierigkeiten
  const DIFFS = [
    ["leicht", "🍃", "Leicht", "Kleinere Zahlen, kürzere Reihen — für den Einstieg."],
    ["mittel", "🔥", "Mittel", "Ausgewogen — empfohlen für tägliche Übung."],
    ["schwer", "⚡", "Schwer", "Größere Zahlen und längere Folgen für eine Herausforderung."],
  ];
  const diffBlock = (h, sub, key, storeKey) => {
    add(el("div", "setting-h", h));
    add(el("div", "setting-sub", sub));
    const wrap = el("div");
    wrap.style.cssText = "display:flex;flex-direction:column;gap:10px";
    const render = () => {
      wrap.innerHTML = "";
      DIFFS.forEach(([id, icon, titel, s]) =>
        wrap.appendChild(optionRow(icon, titel, s, App.settings[key] === id, () => {
          saveSetting(key, storeKey, id); render();
        })));
    };
    render();
    add(wrap);
  };
  diffBlock("Schwierigkeit der Fragen",
    "Anzahl Antwortmöglichkeiten, Größe der Zahlen und Länge der Folgen.",
    "difficulty", "memovia_difficulty");
  diffBlock("Schwierigkeit der Spiele",
    "Wie stark der Computer in Paare, Vier in einer Reihe, Dame und im Reaktionsspiel spielt.",
    "gameDifficulty", "memovia_game_difficulty");

  // Schriftgröße
  add(el("div", "setting-h", "Schriftgröße"));
  add(el("div", "setting-sub", "Wie groß die Texte in der App dargestellt werden."));
  const SCALES = [["klein", "🔤", "Klein"], ["mittel", "🔠", "Mittel"], ["gross", "🔡", "Groß"]];
  const scaleWrap = el("div");
  scaleWrap.style.cssText = "display:flex;flex-direction:column;gap:10px";
  const renderScales = () => {
    scaleWrap.innerHTML = "";
    SCALES.forEach(([id, icon, titel]) =>
      scaleWrap.appendChild(optionRow(icon, titel, "", App.settings.fontScale === id, () => {
        saveSetting("fontScale", "memovia_font_scale", id);
        applyTheme(); renderScales();
      })));
  };
  renderScales();
  add(scaleWrap);

  // Antwort-Tempo
  add(el("div", "setting-h", "Antwort-Tempo"));
  add(el("div", "setting-sub", "Wie schnell nach einer Antwort zur nächsten Frage gewechselt wird."));
  const PACES = [
    ["langsam", "🐢", "Langsam", "Mehr Zeit zum Lesen, bevor es weitergeht."],
    ["normal", "🐇", "Normal", "Wechselt nach kurzer Zeit automatisch weiter."],
    ["manuell", "👆", "Nur per Knopf", "Bleibt stehen, bis Sie auf Weiter tippen."],
  ];
  const paceWrap = el("div");
  paceWrap.style.cssText = "display:flex;flex-direction:column;gap:10px";
  const renderPaces = () => {
    paceWrap.innerHTML = "";
    PACES.forEach(([id, icon, titel, sub]) =>
      paceWrap.appendChild(optionRow(icon, titel, sub, App.settings.answerPace === id, () => {
        saveSetting("answerPace", "memovia_answer_pace", id); renderPaces();
      })));
  };
  renderPaces();
  add(paceWrap);

  // Rückmeldung
  add(el("div", "setting-h", "Rückmeldung"));
  add(el("div", "setting-sub", "Vibration und kurzer Ton beim Antworten."));
  const fbCard = el("div", "glass");
  fbCard.style.cssText = "display:flex;flex-direction:column;gap:0;overflow:hidden";
  fbCard.appendChild(toggleRow("📳", "Vibration", "Kurzes Vibrieren beim Antworten (falls das Gerät es unterstützt)",
    App.settings.haptics, false, (v) => saveSetting("haptics", "memovia_haptics", v)));
  fbCard.appendChild(toggleRow("🔊", "Töne", "Leiser Ton bei richtig oder falsch",
    App.settings.sounds, false, (v) => saveSetting("sounds", "memovia_sounds", v)));
  add(fbCard);

  add(el("div", "version-line", "Memovia · Web-Testversion 1.0 · Alle Daten bleiben auf diesem Gerät"));
}

/* ─────────── Fragen-Einstellungen (Kategorien) ─────────── */
function openQuizSettings() {
  const inner = buildSheet($("#sheetQuizSettings"), "Einstellungen", () => {
    saveActiveCategories();
    Store.set("memovia_read_aloud", App.settings.readAloud ? "1" : "0");
    if (App.quiz.exercise && !App.activeCategories.has(App.quiz.exercise.catId)) {
      loadNextExercise();
    }
    renderQuiz();
  });
  const add = (n) => inner.appendChild(n);

  add(el("div", "setting-h", "Sprachmodus"));
  const sm = el("div", "glass");
  sm.style.overflow = "hidden";
  sm.appendChild(toggleRow("🔊", "Fragen vorlesen", "", App.settings.readAloud, false,
    (v) => { App.settings.readAloud = v; }));
  add(sm);
  add(el("div", "setting-sub", "Wenn aktiv, wird jede neue Frage automatisch vorgelesen."));

  add(el("div", "setting-h", "Welche Aufgaben sollen drankommen?"));
  const list = el("div", "glass cat-list");
  const visible = Generator.CATS.filter(c => !Generator.isSpezial(c.id));
  const renderList = () => {
    list.innerHTML = "";
    visible.forEach(c => {
      const active = App.activeCategories.has(c.id);
      const row = el("button", "cat-row",
        `<span class="c-emoji">${c.symbol}</span>
         <span class="c-name">${esc(c.name)}</span>
         <span class="c-check">${active ? "✓" : ""}</span>`);
      row.onclick = () => {
        if (active) {
          const count = visible.filter(v => App.activeCategories.has(v.id)).length;
          if (count > 1) App.activeCategories.delete(c.id);
        } else App.activeCategories.add(c.id);
        renderList();
      };
      list.appendChild(row);
    });
  };
  renderList();
  add(list);
  add(el("div", "setting-sub", "Alle Kategorien sind standardmäßig an. Mindestens eine muss aktiv bleiben."));

  add(el("div", "setting-h", "Fortschritt"));
  const prog = el("div", "glass cat-list");
  visible.forEach(c => {
    const p = App.progress[c.name] || { correct: 0, wrong: 0 };
    const total = p.correct + p.wrong;
    const rate = total ? Math.round(p.correct / total * 100) : 0;
    prog.appendChild(el("div", "cat-row",
      `<span class="c-name">${esc(c.name)}</span>
       <span class="c-stat">${total ? `${rate} % · ${total} Aufgaben` : "noch nichts"}</span>`));
  });
  add(prog);
}

/* ─────────── Fortschritt / Statistik ─────────── */
function openStats() {
  const inner = buildSheet($("#sheetStats"), "Fortschritt");
  const add = (n) => inner.appendChild(n);

  const kpis = el("div", "kpi-row");
  const kpi = (icon, value, unit, label, color) => {
    const k = el("div", "glass kpi",
      `<span class="k-icon" style="color:${color}">${icon}</span>
       <span class="k-value">${value}</span>
       <span class="k-unit">${unit}</span><span class="k-label">${label}</span>`);
    return k;
  };
  kpis.appendChild(kpi("🔥", Stats.streak(), "Tage", "Streak", "#F78C4D"));
  kpis.appendChild(kpi("📅", Stats.todaySolved(), "Aufgaben", "Heute", "#73C773"));
  kpis.appendChild(kpi("◎", Stats.overallRate(), "%", "Quote", "#D4A117"));
  add(kpis);

  // Diese Woche
  const week = el("div", "glass card");
  week.appendChild(el("div", "o-title", "Diese Woche"));
  const days = Stats.lastSevenDays();
  const maxV = Math.max(...days.map(d => d.count), 1);
  const chart = el("div", "week-chart");
  days.forEach(d => {
    const col = el("div", "week-col");
    col.appendChild(el("div", "week-num", String(d.count)));
    const bar = el("div", "week-bar" + (d.count === 0 ? " zero" : ""));
    bar.style.height = Math.max(d.count / maxV * 100, 8) + "px";
    col.appendChild(bar);
    col.appendChild(el("div", "week-day", esc(d.label)));
    chart.appendChild(col);
  });
  week.appendChild(chart);
  add(week);

  // Letzte 30 Tage
  const month = el("div", "glass card");
  const m = Stats.lastThirtyDays();
  const activeDays = m.filter(v => v > 0).length;
  month.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:baseline">
    <span class="o-title">Letzte 30 Tage</span>
    <span class="o-sub">${activeDays} aktive Tage</span></div>`;
  const mChart = el("div", "month-chart");
  const mMax = Math.max(...m, 1);
  m.forEach(v => {
    const bar = el("div", "month-bar" + (v === 0 ? " zero" : ""));
    bar.style.height = Math.max(v / mMax * 66, 4) + "px";
    mChart.appendChild(bar);
  });
  month.appendChild(mChart);
  add(month);

  // Stärken & Verbesserungspotenzial
  const ranked = Object.entries(App.progress)
    .map(([name, p]) => ({ name, total: p.correct + p.wrong,
      rate: (p.correct + p.wrong) ? Math.round(p.correct / (p.correct + p.wrong) * 100) : 0 }))
    .filter(r => r.total >= 3);
  const catSymbol = (name) => (Generator.CATS.find(c => c.name === name) || {}).symbol || "•";
  const rankCard = (title, rows, emptyText) => {
    const c = el("div", "glass card");
    c.appendChild(el("div", "o-title", title));
    if (!rows.length) c.appendChild(el("div", "o-sub", emptyText));
    rows.forEach(r => c.appendChild(el("div", "rank-row",
      `<span class="rank-emoji">${catSymbol(r.name)}</span>
       <span class="rank-name">${esc(r.name)}</span>
       <span class="rank-val">${r.rate} % · ${r.total} Aufgaben</span>`)));
    return c;
  };
  add(rankCard("Stärken",
    ranked.slice().sort((a, b) => b.rate - a.rate).slice(0, 5),
    "Lösen Sie ein paar Aufgaben, dann zeigt sich hier, was besonders gut klappt."));
  add(rankCard("Verbesserungspotenzial",
    ranked.slice().sort((a, b) => a.rate - b.rate).slice(0, 5),
    "Noch nicht genug Aufgaben gelöst, um Schwächen zu erkennen."));
}

/* ─────────── Notizen ─────────── */
const NOTE_SYMBOLS = ["📝","❤️","📞","💊","📅","🏥","🛒","🔑","🏠","🚌","☕","🎂",
  "⏰","💡","📖","🎵","🌻","✝️","👓","🧺","💶","🐶"];

function renderNotes() {
  const list = $("#notesList");
  list.innerHTML = "";
  if (!App.notes.length) {
    const empty = el("div", "empty-state",
      `<div class="e-icon">📝</div><h3>Noch keine Notizen</h3>
       <p>Halten Sie wichtige Dinge fest: Telefonnummern, Termine, Medikamente oder Erinnerungen.</p>`);
    const cta = el("button", "e-cta", "＋ Erste Notiz anlegen");
    cta.onclick = () => openNoteEditor(null);
    empty.appendChild(cta);
    list.appendChild(empty);
    return;
  }
  App.notes.forEach(note => {
    const card = el("button", "glass note-card");
    card.innerHTML = `<span class="note-symbol">${esc(note.symbol || "📝")}</span>
      <span style="flex:1"><span class="note-title">${esc(note.title)}</span>
      ${note.body ? `<div class="note-body">${esc(note.body)}</div>` : ""}</span>
      <span class="chevron">›</span>`;
    card.onclick = () => openNoteEditor(note);
    list.appendChild(card);
  });
}

function openNoteEditor(note) {
  const inner = buildSheet($("#sheetEditor"), note ? "Notiz bearbeiten" : "Neue Notiz");
  const add = (n) => inner.appendChild(n);

  add(el("div", "form-label", "Titel"));
  const title = el("input");
  title.placeholder = "z.B. Hausarzt";
  title.value = note?.title || "";
  add(title);

  add(el("div", "form-label", "Inhalt"));
  const body = el("textarea");
  body.rows = 4;
  body.placeholder = "z.B. Dr. Weber, Telefon 07451 …";
  body.value = note?.body || "";
  add(body);

  add(el("div", "form-label", "Symbol"));
  const grid = el("div", "symbol-grid");
  let symbol = note?.symbol || "📝";
  const renderSym = () => {
    grid.innerHTML = "";
    NOTE_SYMBOLS.forEach(s => {
      const b = el("button", "symbol-pick" + (s === symbol ? " selected" : ""), s);
      b.onclick = () => { symbol = s; renderSym(); };
      grid.appendChild(b);
    });
  };
  renderSym();
  add(grid);

  const save = el("button", "btn-primary", "Speichern");
  save.style.marginTop = "10px";
  save.onclick = () => {
    const t = title.value.trim();
    if (!t) { title.focus(); return; }
    if (note) {
      note.title = t; note.body = body.value.trim(); note.symbol = symbol;
    } else {
      App.notes.unshift({ id: "n_" + Date.now(), title: t,
        body: body.value.trim(), symbol });
    }
    saveNotes();
    $("#sheetEditor").classList.add("hidden");
    renderNotes(); renderHome();
  };
  add(save);

  if (note) {
    const del = el("button", "danger-btn", "🗑 Notiz löschen");
    del.style.marginTop = "6px";
    del.onclick = () => {
      if (!confirm("Diese Notiz wirklich löschen?")) return;
      App.notes = App.notes.filter(n => n.id !== note.id);
      saveNotes();
      $("#sheetEditor").classList.add("hidden");
      renderNotes(); renderHome();
    };
    add(del);
  }
}
$("#btnAddNote").addEventListener("click", () => openNoteEditor(null));

/* ─────────── Angehörige ─────────── */
const PERSON_SYMBOLS = ["🙂","👵","👴","👩","👨","👧","👦","👶","🌻","⭐","🎈","❤️","🌸","🍀","🐶","🎵"];
const MEMORY_SYMBOLS = ["💭","💍","🏡","🌊","🎄","🎂","✈️","🚂","🐕","🎼","⛪","🌻","📷","🏆","👶","🍎"];

document.querySelectorAll("#familySegments .seg").forEach(b =>
  b.addEventListener("click", () => {
    App.familySeg = parseInt(b.dataset.seg, 10);
    document.querySelectorAll("#familySegments .seg").forEach(s =>
      s.classList.toggle("active", parseInt(s.dataset.seg, 10) === App.familySeg));
    $("#btnAddFamily").style.visibility = App.familySeg === 2 ? "hidden" : "visible";
    renderFamily();
  }));

$("#btnAddFamily").addEventListener("click", () => {
  if (App.familySeg === 0) openPersonEditor(null);
  else if (App.familySeg === 1) openMemoryEditor(null);
});

function renderFamily() {
  const box = $("#familyContent");
  box.innerHTML = "";
  box.style.cssText = "display:flex;flex-direction:column;gap:10px";

  if (App.familySeg === 0) {
    if (!App.people.length) {
      box.appendChild(el("div", "empty-state",
        `<div class="e-icon">👤➕</div><h3>Noch keine Personen</h3>
         <p>Legen Sie nahestehende Personen an — z.B. Kinder, Enkel oder Freunde.</p>
         <div class="e-cta">Tippen Sie oben rechts auf +</div>`));
      return;
    }
    App.people.forEach(p => {
      const card = el("button", "glass person-card");
      const avatar = p.photoData
        ? `<span class="person-avatar"><img src="data:image/jpeg;base64,${p.photoData}" alt=""></span>`
        : `<span class="person-avatar">${esc(p.symbol || "🙂")}</span>`;
      card.innerHTML = `${avatar}
        <span style="flex:1"><span class="person-name">${esc(p.name)}</span>
        ${p.relation ? `<div class="person-rel">${esc(p.relation)}</div>` : ""}
        ${p.note ? `<div class="person-note">${esc(p.note)}</div>` : ""}</span>
        <span class="chevron">›</span>`;
      card.onclick = () => openPersonEditor(p);
      box.appendChild(card);
    });
    return;
  }

  if (App.familySeg === 1) {
    if (!App.memories.length) {
      box.appendChild(el("div", "empty-state",
        `<div class="e-icon">💭</div><h3>Noch keine Erinnerungen</h3>
         <p>Halten Sie schöne Momente und wichtige Lebensstationen fest — z.B. die Hochzeit oder den ersten Urlaub.</p>
         <div class="e-cta">Tippen Sie oben rechts auf +</div>`));
      return;
    }
    App.memories.forEach(mem => {
      const card = el("button", "glass note-card");
      card.innerHTML = `<span class="note-symbol">${esc(mem.symbol || "💭")}</span>
        <span style="flex:1"><span class="note-title">${esc(mem.title)}</span>
        ${mem.detail ? `<div class="note-body">${esc(mem.detail)}</div>` : ""}</span>
        <span class="chevron">›</span>`;
      card.onclick = () => openMemoryEditor(mem);
      box.appendChild(card);
    });
    return;
  }

  // Einblick
  const intro = el("div", "glass card");
  intro.innerHTML = `<div class="o-sub">Ein ruhiger Überblick, wie es zuletzt lief — als Anregung
    für gemeinsame Gespräche, nicht als Bewertung.</div>`;
  box.appendChild(intro);

  const insights = [];
  const streak = Stats.streak();
  const today = Stats.todaySolved();
  const total = Stats.totalSolved();
  if (total === 0) {
    insights.push("Es wurden noch keine Übungen gemacht — vielleicht ein schöner Anlass, gemeinsam die erste Frage zu lösen.");
  } else {
    if (streak >= 2) insights.push(`Seit ${streak} Tagen wird jeden Tag geübt — eine schöne Routine.`);
    if (today > 0) insights.push(`Heute wurden bereits ${today} Aufgaben gelöst (${Stats.todayRate()} % richtig).`);
    else insights.push("Heute wurde noch nicht geübt.");
    insights.push(`Insgesamt wurden ${total} Aufgaben bearbeitet, davon ${Stats.overallRate()} % richtig.`);
    const ranked = Object.entries(App.progress)
      .map(([name, p]) => ({ name, total: p.correct + p.wrong,
        rate: (p.correct + p.wrong) ? Math.round(p.correct / (p.correct + p.wrong) * 100) : 0 }))
      .filter(r => r.total >= 3);
    if (ranked.length) {
      const best = ranked.slice().sort((a, b) => b.rate - a.rate)[0];
      insights.push(`Besonders gut klappt zurzeit „${best.name}" (${best.rate} % richtig).`);
      const worst = ranked.slice().sort((a, b) => a.rate - b.rate)[0];
      if (worst.name !== best.name && worst.rate < 60)
        insights.push(`Etwas schwerer fällt gerade „${worst.name}" — hier hilft gemeinsames Üben ohne Druck.`);
    }
  }
  const list = el("div", "glass card insight-list");
  insights.forEach(t => list.appendChild(el("div", "insight-item",
    `<span class="dot">•</span><span>${esc(t)}</span>`)));
  box.appendChild(list);

  box.appendChild(el("div", "setting-sub",
    "Hinweis: Dies ist kein medizinischer Befund. Schwankungen sind ganz normal und hängen von Tagesform, ausgewählten Aufgaben und vielem mehr ab."));
}

/* Bild verkleinern → Base64-JPEG (PhotoHelper-Port, max. 320 px) */
function encodePhoto(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const maxSize = 320;
      let { width, height } = img;
      const longest = Math.max(width, height);
      if (longest > maxSize) {
        const scale = maxSize / longest;
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
      URL.revokeObjectURL(img.src);
      resolve(dataUrl.split(",")[1]);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function openPersonEditor(person) {
  const inner = buildSheet($("#sheetEditor"), person ? "Person bearbeiten" : "Neue Person");
  const add = (n) => inner.appendChild(n);
  let photoData = person?.photoData || null;
  let symbol = person?.symbol || "🙂";

  add(el("div", "form-label", "Foto"));
  const photoRow = el("div");
  photoRow.style.cssText = "display:flex;align-items:center;gap:14px;flex-wrap:wrap";
  const renderPhoto = () => {
    photoRow.innerHTML = "";
    if (photoData) {
      const img = el("img", "photo-preview");
      img.src = "data:image/jpeg;base64," + photoData;
      img.alt = "Foto";
      photoRow.appendChild(img);
    } else {
      photoRow.appendChild(el("div", "person-avatar", esc(symbol)));
    }
    const pickLabel = el("label", "file-btn", "📷 Foto wählen");
    const input = el("input");
    input.type = "file"; input.accept = "image/*";
    input.addEventListener("change", async () => {
      if (input.files[0]) {
        try { photoData = await encodePhoto(input.files[0]); renderPhoto(); }
        catch { alert("Das Foto konnte nicht geladen werden."); }
      }
    });
    pickLabel.appendChild(input);
    photoRow.appendChild(pickLabel);
    if (photoData) {
      const rm = el("button", "btn-ghost", "Foto entfernen");
      rm.style.width = "auto";
      rm.onclick = () => { photoData = null; renderPhoto(); };
      photoRow.appendChild(rm);
    }
  };
  renderPhoto();
  add(photoRow);

  add(el("div", "form-label", "Oder ein Symbol wählen"));
  const symGrid = el("div", "symbol-grid");
  const renderSym = () => {
    symGrid.innerHTML = "";
    PERSON_SYMBOLS.forEach(s => {
      const b = el("button", "symbol-pick" + (s === symbol ? " selected" : ""), s);
      b.onclick = () => { symbol = s; renderSym(); if (!photoData) renderPhoto(); };
      symGrid.appendChild(b);
    });
  };
  renderSym();
  add(symGrid);

  add(el("div", "form-label", "Angaben"));
  const name = el("input"); name.placeholder = "Name (z.B. Anna)";
  name.value = person?.name || ""; add(name);
  const relation = el("input"); relation.placeholder = "Beziehung (z.B. Tochter)";
  relation.style.marginTop = "8px";
  relation.value = person?.relation || ""; add(relation);

  add(el("div", "form-label", "Notiz (optional)"));
  const note = el("input"); note.placeholder = "z.B. Wohnt in Köln, ruft sonntags an";
  note.value = person?.note || ""; add(note);

  add(el("div", "form-label", "Lebensgeschichte (optional)"));
  add(el("div", "form-hint", "Daraus entstehen persönliche Erinnerungs-Fragen, z.B. „Wo wurde Anna geboren?“"));
  const birthPlace = el("input"); birthPlace.placeholder = "Geburtsort (z.B. München)";
  birthPlace.value = person?.birthPlace || ""; add(birthPlace);
  const profession = el("input"); profession.placeholder = "Früherer Beruf (z.B. Lehrerin)";
  profession.style.marginTop = "8px";
  profession.value = person?.profession || ""; add(profession);
  const weddingYear = el("input"); weddingYear.placeholder = "Hochzeitsjahr (z.B. 1965)";
  weddingYear.inputMode = "numeric"; weddingYear.style.marginTop = "8px";
  weddingYear.value = person?.weddingYear || ""; add(weddingYear);
  const hometown = el("input"); hometown.placeholder = "Früherer Wohnort (z.B. Hamburg)";
  hometown.style.marginTop = "8px";
  hometown.value = person?.hometown || ""; add(hometown);

  const save = el("button", "btn-primary", "Speichern");
  save.style.marginTop = "12px";
  save.onclick = () => {
    const n = name.value.trim();
    if (!n) { name.focus(); return; }
    const data = {
      name: n, relation: relation.value.trim(), symbol,
      note: note.value.trim(), photoData,
      birthPlace: birthPlace.value.trim(), profession: profession.value.trim(),
      weddingYear: weddingYear.value.trim(), hometown: hometown.value.trim(),
    };
    if (person) Object.assign(person, data);
    else App.people.push({ id: "p_" + Date.now(), ...data });
    savePeople();
    $("#sheetEditor").classList.add("hidden");
    renderFamily(); renderHome();
  };
  add(save);

  if (person) {
    const del = el("button", "danger-btn", "🗑 Person löschen");
    del.style.marginTop = "6px";
    del.onclick = () => {
      if (!confirm(`${person.name} wirklich löschen?`)) return;
      App.people = App.people.filter(p => p.id !== person.id);
      savePeople();
      $("#sheetEditor").classList.add("hidden");
      renderFamily(); renderHome();
    };
    add(del);
  }
}

function openMemoryEditor(memory) {
  const inner = buildSheet($("#sheetEditor"), memory ? "Erinnerung bearbeiten" : "Neue Erinnerung");
  const add = (n) => inner.appendChild(n);
  let symbol = memory?.symbol || "💭";

  add(el("div", "form-label", "Symbol"));
  const grid = el("div", "symbol-grid");
  const renderSym = () => {
    grid.innerHTML = "";
    MEMORY_SYMBOLS.forEach(s => {
      const b = el("button", "symbol-pick" + (s === symbol ? " selected" : ""), s);
      b.onclick = () => { symbol = s; renderSym(); };
      grid.appendChild(b);
    });
  };
  renderSym();
  add(grid);

  add(el("div", "form-label", "Erinnerung"));
  const title = el("input"); title.placeholder = "Titel (z.B. Hochzeit 1965)";
  title.value = memory?.title || ""; add(title);
  const detail = el("textarea"); detail.rows = 3;
  detail.placeholder = "Beschreibung"; detail.style.marginTop = "8px";
  detail.value = memory?.detail || ""; add(detail);

  const save = el("button", "btn-primary", "Speichern");
  save.style.marginTop = "12px";
  save.onclick = () => {
    const t = title.value.trim();
    if (!t) { title.focus(); return; }
    if (memory) { memory.title = t; memory.detail = detail.value.trim(); memory.symbol = symbol; }
    else App.memories.unshift({ id: "m_" + Date.now(), title: t,
      detail: detail.value.trim(), symbol });
    saveMemories();
    $("#sheetEditor").classList.add("hidden");
    renderFamily(); renderHome();
  };
  add(save);

  if (memory) {
    const del = el("button", "danger-btn", "🗑 Erinnerung löschen");
    del.style.marginTop = "6px";
    del.onclick = () => {
      if (!confirm("Diese Erinnerung wirklich löschen?")) return;
      App.memories = App.memories.filter(m => m.id !== memory.id);
      saveMemories();
      $("#sheetEditor").classList.add("hidden");
      renderFamily(); renderHome();
    };
    add(del);
  }
}

/* ─────────── Start ─────────── */
document.addEventListener("DOMContentLoaded", initOnboarding);
