/* ═══════════════════════════════════════════════════════════════
   Memovia Web — Fragen-Generator
   1:1-Port von ExerciseGenerator.swift (App-Version 43-5).
   Nutzt MEMOVIA_DATA aus data.js.
   ═══════════════════════════════════════════════════════════════ */
"use strict";

const Generator = (() => {
  const D = MEMOVIA_DATA;

  // ── Zufalls-Helfer ──
  const rnd = (n) => Math.floor(Math.random() * n);
  const rndIn = (lo, hi) => lo + rnd(hi - lo + 1);          // inklusiv
  const pick = (arr) => arr[rnd(arr.length)];
  const shuffled = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // ── Einstellungen (aus Storage; werden von app.js gesetzt) ──
  const difficulty = () => (localStorage.getItem("memovia_difficulty") || "mittel");
  const dementiaStage = () => {
    const v = parseInt(localStorage.getItem("memovia_dementia_stage") || "0", 10);
    return Math.max(0, Math.min(10, isNaN(v) ? 0 : v));
  };

  // ── Kategorien (rawValue, Symbol, Flags) — wie ExerciseCategory ──
  const CATS = [
    ["allgemein","Allgemeinwissen","🌍"],["farben","Farben","🎨"],
    ["jahreszeit","Jahreszeiten","🍂"],["zeit","Zeit & Uhr","🕐"],
    ["uhrzeit","Uhrzeit ablesen","🕰️"],["gegenteil","Gegenteile","⇄"],
    ["rechnen","Kopfrechnen","🔢"],["tiere","Tierwissen","🐾"],
    ["natur","Natur & Umwelt","🌳"],["sprichwort","Sprichwörter","💬"],
    ["reim","Reimwörter","🎵"],["zusammen","Was gehört zusammen","🧩"],
    ["passtNicht","Was passt nicht","❓"],["oberbegriff","Oberbegriffe","🗂️"],
    ["zuordnung","Zuordnen","🎯"],["reihenfolgeLegen","Reihenfolge bilden","📊"],
    ["zahlenreihe","Zahlenreihen","🔢"],["wortsalat","Wortsalat","🔡"],
    ["synonym","Synonyme","🔤"],["reihenfolge","Reihenfolge merken","🧠"],
    ["zahlenpyramide","Zahlenpyramide","🔺"],["geografie","Erdkunde","🗺️"],
    ["personen","Berühmte Personen","👤"],["erfindungen","Erfindungen","💡"],
    ["lieder","Lieder & Schlager","🎶"],["musik","Musik & Instrumente","🎹"],
    ["bauwerke","Bauwerke & Wahrzeichen","🏛️"],["feste","Feste & Feiertage","🎉"],
    ["haushalt","Im Haushalt","🏠"],["garten","Im Garten","🌷"],
    ["kleidung","Kleidung & Mode","👕"],["reisen","Auf Reisen","✈️"],
    ["essen","Essen & Trinken","🍲"],["berufe","Berufe","👷"],
    ["koerper","Körper & Gesundheit","❤️"],["historie","Historische Daten","🎓"],
    ["wissenschaft","Wissenschaft","🔬"],["fremdwoerter","Fremdwörter","📖"],
    ["maerchen","Märchen","🧚"],["werkzeuge","Werkzeuge","🔧"],
    ["sport","Sport","⚽"],["verkehr","Verkehr & Technik","🚗"],
    ["sprache","Sprache & Grammatik","📚"],["geld","Geld & Wirtschaft","💰"],
    ["einkaufen","Einkaufen","🛒"],["pflanzen","Blumen & Pflanzen","🌸"],
    ["wetter","Wetter & Natur","🌦️"],["nostalgie","Früher & Damals","📻"],
    ["schulzeitFrueher","Schulzeit von früher","✏️"],
    ["dingeVonDamals","Dinge von damals","📞"],
    ["spielzeugFrueher","Spielzeug von früher","🪀"],
    ["alteBerufe","Alte Berufe","⚒️"],["fernsehRadio","Fernsehen & Radio","📺"],
    ["filmklassiker","Filmklassiker & Stars","🎬"],["sagen","Sagen & Legenden","🐉"],
    ["volkslieder","Volkslieder & Gedichte","🎼"],["obstGemuese","Obst & Gemüse","🍎"],
    ["masseGewichte","Gewichte & Maße","⚖️"],["religion","Religion & Feste","⛪"],
    ["kochenBacken","Kochen & Backen","🥧"],["handarbeit","Handarbeit & Werken","🧶"],
    ["hausmittel","Hausmittel von früher","🍵"],
    ["verkehrsschilder","Verkehrsschilder","🚦"],["sicherheit","Sicherheit im Alltag","🦺"],
    ["koerperEinfach","Körper ganz einfach","👋"],["miteinander","Miteinander ganz einfach","🤝"],
    ["angehoerige","Angehörige","👨‍👩‍👧"],
  ].map(([id, name, symbol]) => ({ id, name, symbol }));

  const catById = Object.fromEntries(CATS.map(c => [c.id, c]));
  const SPEZIAL = new Set(["verkehrsschilder","sicherheit","koerperEinfach","miteinander"]);
  const isSpezial = (id) => SPEZIAL.has(id);

  // Stufen-Filter (categoriesForStage)
  const EINFACH_PERSOENLICH = new Set([
    "angehoerige","farben","tiere","natur","jahreszeit","zeit","essen","berufe",
    "werkzeuge","maerchen","oberbegriff","zuordnung","einkaufen","uhrzeit",
    "haushalt","garten","kleidung","reisen","feste","pflanzen","wetter","nostalgie",
    "schulzeitFrueher","dingeVonDamals","spielzeugFrueher","volkslieder",
    "obstGemuese","religion","kochenBacken","handarbeit","hausmittel",
    "verkehrsschilder","sicherheit","koerperEinfach","miteinander",
  ]);

  function categoriesForStage(all) {
    const stage = dementiaStage();
    let filtered;
    if (stage <= 3) filtered = all.filter(id => id !== "angehoerige" && !isSpezial(id));
    else if (stage >= 8) filtered = all.filter(id => EINFACH_PERSOENLICH.has(id));
    else filtered = all.filter(id => !isSpezial(id));
    return filtered.length ? filtered : all;
  }

  // ── Options-Helfer ──
  const optionCount = () => (difficulty() === "leicht" ? 3 : 4);

  function looksLikePeer(cand, correct) {
    if (cand.includes("(") || cand.includes("/")) return false;
    const cw = cand.split(" ").length, kw = correct.split(" ").length;
    if (kw <= 2 && cw > 3) return false;
    const tol = Math.max(10, correct.length + 5);
    if (Math.abs(cand.length - correct.length) > tol) return false;
    return true;
  }

  function makeOptions(correct, distractors, count, pool = []) {
    const target = Math.max(count, optionCount());
    let picked = shuffled(distractors);
    if (picked.length < target - 1 && pool.length) {
      const extras = shuffled(pool).filter(c =>
        c !== correct && !picked.includes(c) && looksLikePeer(c, correct));
      picked = picked.concat(extras);
    }
    return shuffled([correct, ...picked.slice(0, target - 1)]);
  }

  // Aufgabe zusammenbauen
  const Ex = (catId, prompt, options, correct, extra = {}) => ({
    id: Math.random().toString(36).slice(2),
    catId, category: catById[catId].name, symbol: catById[catId].symbol,
    prompt, options, correct,
    hint: extra.hint || null, memorize: extra.memorize || null,
    photo: extra.photo || null, correctOrder: extra.correctOrder || null,
    clock: extra.clock || null,
  });

  // Pools (richtige Antworten je DB)
  const poolOf = (db) => db.map(t => t[1]);

  // ── Standard-Generator für DB-Kategorien mit fertiger Frage ──
  const dbGen = (catId, db) => () => {
    const [q, a, wrong] = pick(db);
    return Ex(catId, q, makeOptions(a, wrong, 4, poolOf(db)), a);
  };

  // ── Spezial-Generatoren ──

  function genAllgemein() {
    const v = rnd(4);
    if (v === 0) {
      const [land, stadt] = pick(D.laender);
      const others = D.laender.filter(t => t[1] !== stadt).map(t => t[1]);
      return Ex("allgemein", `Was ist die Hauptstadt von ${land}?`,
        makeOptions(stadt, shuffled(others), 4), stadt);
    }
    if (v === 1) {
      const [land, stadt] = pick(D.laender);
      const others = D.laender.filter(t => t[0] !== land).map(t => t[0]);
      return Ex("allgemein", `In welchem Land liegt ${stadt}?`,
        makeOptions(land, shuffled(others), 4), land);
    }
    if (v === 2) {
      const [land, stadt] = pick(D.bundeslaender);
      const others = D.bundeslaender.filter(t => t[1] !== stadt).map(t => t[1]);
      return Ex("allgemein", `Was ist die Hauptstadt des Bundeslandes ${land}?`,
        makeOptions(stadt, shuffled(others), 4), stadt);
    }
    const [q, a, wrong] = pick(D.allgemeinDB);
    return Ex("allgemein", q, makeOptions(a, wrong, 4), a);
  }

  function genFarben() {
    const [thing, color, wrong] = pick(D.farben);
    return Ex("farben", `Welche Farbe hat ${thing}?`,
      makeOptions(color, wrong, 4, poolOf(D.farben)), color);
  }

  function genJahreszeit() {
    const [event, a, wrong] = pick(D.jahreszeiten);
    return Ex("jahreszeit", `In welche Jahreszeit passt: ${event}?`,
      makeOptions(a, wrong, 4, poolOf(D.jahreszeiten)), a);
  }

  function genGegenteil() {
    const [word, opp, wrong] = pick(D.gegenteile);
    return Ex("gegenteil", `Was ist das Gegenteil von \u201E${word}\u201C?`,
      makeOptions(opp, wrong, 4, poolOf(D.gegenteile)), opp);
  }

  function genSprichwort() {
    const [q, a, wrong] = pick(D.sprichwoerter);
    return Ex("sprichwort", `Wie geht das Sprichwort weiter?\n\n\u201E${q}\u201C`,
      makeOptions(a, wrong, 4, poolOf(D.sprichwoerter)), a);
  }

  function genReim() {
    const [word, rhyme, wrong] = pick(D.reime);
    return Ex("reim", `Welches Wort reimt sich auf \u201E${word}\u201C?`,
      makeOptions(rhyme, wrong, 4, poolOf(D.reime)), rhyme);
  }

  function genZusammen() {
    const [first, partner, wrong] = pick(D.zusammenPaare);
    return Ex("zusammen", `Was gehört zu \u201E${first}\u201C?`,
      makeOptions(partner, wrong, 4, poolOf(D.zusammenPaare)), partner);
  }

  function genSynonym() {
    const [word, syn, wrong] = pick(D.synonyme);
    return Ex("synonym", `Welches Wort bedeutet dasselbe wie \u201E${word}\u201C?`,
      makeOptions(syn, wrong, 4, poolOf(D.synonyme)), syn);
  }

  function genPasstNicht() {
    const cats = Object.keys(D.wortGruppen);
    const main = pick(cats);
    const other = pick(cats.filter(c => c !== main));
    const three = shuffled(D.wortGruppen[main]).slice(0, 3);
    const odd = pick(D.wortGruppen[other]);
    return Ex("passtNicht", "Was passt nicht dazu?",
      shuffled([...three, odd]), odd);
  }

  function genOberbegriff() {
    const target = optionCount();
    const kat = pick(D.kategorien);                    // [name, frage, [woerter]]
    const beispiele = shuffled(kat[2]).slice(0, 3);
    const opts = new Set([kat[0]]);
    for (const other of shuffled(D.kategorien)) {
      if (opts.size >= target) break;
      if (other[0] !== kat[0]) opts.add(other[0]);
    }
    return Ex("oberbegriff", `Was sind das?\n\n${beispiele.join(", ")}`,
      shuffled([...opts]), kat[0]);
  }

  function genZuordnung() {
    const target = optionCount();
    const kat = pick(D.kategorien);
    const richtig = pick(kat[2]);
    const opts = new Set([richtig]);
    const fremde = D.kategorien.filter(k => k[0] !== kat[0]).flatMap(k => k[2]);
    for (const w of shuffled(fremde)) {
      if (opts.size >= target) break;
      opts.add(w);
    }
    return Ex("zuordnung", `Welches Wort ${kat[1]}?`, shuffled([...opts]), richtig);
  }

  function genReihenfolgeLegen() {
    const diff = difficulty();
    const count = diff === "leicht" ? 3 : diff === "mittel" ? 4 : 5;
    const variante = rnd(7);
    let prompt = "", order = [];

    if (variante === 0) {
      const range = diff === "leicht" ? [1, 20] : diff === "mittel" ? [1, 100] : [1, 999];
      const nums = new Set();
      while (nums.size < count) nums.add(rndIn(range[0], range[1]));
      const sorted = [...nums].sort((a, b) => a - b);
      const desc = Math.random() < 0.5;
      order = (desc ? sorted.slice().reverse() : sorted).map(String);
      prompt = desc ? "Tippen Sie die Zahlen von GROSS nach klein:"
                    : "Tippen Sie die Zahlen von KLEIN nach groß:";
    } else if (variante === 1) {
      const reihe = pick(D.groessenReihen);
      const n = Math.min(count, reihe.length);
      const start = rnd(reihe.length - n + 1);
      const fenster = reihe.slice(start, start + n);
      const desc = Math.random() < 0.5;
      order = desc ? fenster.slice().reverse() : fenster;
      prompt = desc ? "Ordnen Sie von GROSS nach klein:"
                    : "Ordnen Sie von KLEIN nach groß:";
    } else if (variante === 2) {
      const [titel, schritte] = pick(D.ablaufReihen);
      order = schritte;
      prompt = `${titel}\nBringen Sie es in die richtige Reihenfolge.`;
    } else if (variante === 3) {
      const woerter = shuffled(D.alphabetWoerter).slice(0, count);
      order = woerter.slice().sort((a, b) => a.localeCompare(b, "de"));
      prompt = "Ordnen Sie nach dem Alphabet (A → Z):";
    } else if (variante === 4) {
      const reihe = pick(D.geschichteReihen);
      const n = Math.min(count, reihe.length);
      const start = rnd(reihe.length - n + 1);
      order = reihe.slice(start, start + n);
      prompt = "Was geschah wann?\nBringen Sie die Ereignisse in die richtige zeitliche Reihenfolge (früher → später).";
    } else if (variante === 5) {
      const n = Math.min(count, D.kanzlerReihe.length);
      const start = rnd(D.kanzlerReihe.length - n + 1);
      order = D.kanzlerReihe.slice(start, start + n);
      prompt = "Welcher Bundeskanzler kam wann?\nBringen Sie sie in die richtige Reihenfolge (früher → später).";
    } else {
      const n = Math.min(count, D.erfindungenReihe.length);
      const start = rnd(D.erfindungenReihe.length - n + 1);
      order = D.erfindungenReihe.slice(start, start + n);
      prompt = "Was wurde zuerst erfunden?\nOrdnen Sie von früher nach später.";
    }

    let gemischt = shuffled(order), tries = 0;
    while (gemischt.join("|") === order.join("|") && order.length > 1 && tries < 20) {
      gemischt = shuffled(order); tries++;
    }
    return Ex("reihenfolgeLegen", prompt, gemischt, order.join(" → "),
      { correctOrder: order });
  }

  function genZahlenreihe() {
    const diff = difficulty();
    const start = rndIn(1, 9);
    const type = diff === "leicht" ? 0 : diff === "mittel" ? rnd(2) : rnd(3);
    const visible = diff === "leicht" ? 4 : 5;
    let reihe = [], answer = 0, regel = "";

    if (type === 0) {
      const sr = diff === "leicht" ? [1, 4] : diff === "mittel" ? [2, 9] : [3, 12];
      const step = rndIn(sr[0], sr[1]);
      reihe = Array.from({ length: visible }, (_, i) => start + i * step);
      answer = start + visible * step;
      regel = `Es wird immer ${step} addiert.`;
    } else if (type === 1) {
      reihe = Array.from({ length: visible }, (_, i) => start * 2 ** i);
      answer = start * 2 ** visible;
      regel = "Jede Zahl wird verdoppelt.";
    } else {
      const values = [start]; let cur = start;
      for (let i = 1; i <= visible; i++) { cur += i; values.push(cur); }
      reihe = values.slice(0, visible);
      answer = values[visible];
      regel = "Der Abstand wächst jedes Mal um 1.";
    }
    const prompt = "Wie geht die Reihe weiter?\n\n" + reihe.join("  ,  ") + "  ,  ?";
    const opts = new Set([String(answer)]);
    while (opts.size < 4) {
      const w = answer + rndIn(-8, 8);
      if (w > 0 && w !== answer) opts.add(String(w));
    }
    return Ex("zahlenreihe", prompt, shuffled([...opts]), String(answer), { hint: regel });
  }

  function genWortsalat() {
    const [word, hint] = pick(D.salatWoerter);
    let letters;
    do { letters = shuffled([...word]); }
    while (letters.join("") === word && word.length > 1);
    const salat = letters.join(" ");
    const opts = new Set([word]);
    const all = D.salatWoerter.map(t => t[0]).filter(w => w !== word);
    for (let tol = 0; tol <= 3 && opts.size < 4; tol++) {
      for (const w of shuffled(all.filter(w => Math.abs(w.length - word.length) <= tol))) {
        if (opts.size >= 4) break;
        opts.add(w);
      }
    }
    return Ex("wortsalat", `Welches Wort ergeben diese Buchstaben?\n\n${salat}`,
      shuffled([...opts]), word, { hint: `Tipp: ${hint}` });
  }

  function genReihenfolge() {
    const diff = difficulty();
    const dinge = ["Apfel","Hund","Sonne","Tisch","Blume","Auto","Stern","Buch",
                   "Katze","Ball","Haus","Baum","Wolke","Brot","Vogel","Mond"];
    const laenge = diff === "leicht" ? 3 : diff === "mittel" ? 4 : 5;
    const folge = shuffled(dinge).slice(0, laenge);
    const frage = rnd(laenge);
    const positionen = ["erste","zweite","dritte","vierte","fünfte"];
    const answer = folge[frage];
    const merken = folge.map((w, i) => `${i + 1}. ${w}`).join("\n");
    const opts = new Set(folge);
    for (const d of shuffled(dinge)) {
      if (opts.size >= 4) break;
      opts.add(d);
    }
    return Ex("reihenfolge", `Welches war das ${positionen[frage]} Wort?`,
      shuffled([...opts]), answer, { memorize: merken });
  }

  function genZahlenpyramide() {
    const a = rndIn(1, 9), b = rndIn(1, 9), c = rndIn(1, 9);
    const ab = a + b, bc = b + c, top = ab + bc;
    const prompt = "Zahlenpyramide: Zwei Zahlen ergeben zusammen die Zahl darüber.\n\n"
      + "        [ ? ]\n" + `     ${ab}     ${bc}\n` + `   ${a}   ${b}   ${c}\n\n`
      + "Welche Zahl gehört in die Spitze?";
    const opts = new Set([String(top)]);
    while (opts.size < 4) {
      const w = top + rndIn(-6, 6);
      if (w > 0 && w !== top) opts.add(String(w));
    }
    return Ex("zahlenpyramide", prompt, shuffled([...opts]), String(top),
      { hint: `Rechnen Sie ${ab} + ${bc}.` });
  }

  function genGeografie() {
    const type = rnd(4);
    if (type === 0) {
      const [land, stadt] = pick(D.laender);
      const opts = new Set([stadt]);
      while (opts.size < 4) opts.add(pick(D.laender)[1]);
      return Ex("geografie", `Wie heißt die Hauptstadt von ${land}?`,
        shuffled([...opts]), stadt);
    }
    if (type === 1) {
      const [land, stadt] = pick(D.laender);
      const opts = new Set([land]);
      while (opts.size < 4) opts.add(pick(D.laender)[0]);
      return Ex("geografie", `In welchem Land liegt die Stadt ${stadt}?`,
        shuffled([...opts]), land);
    }
    if (type === 2) {
      const [q, a, wrong] = pick(D.geografieFakten);
      return Ex("geografie", q, shuffled([a, ...wrong]), a);
    }
    const kontinente = [
      ["Europa", ["Deutschland","Frankreich","Italien","Spanien","Polen","Norwegen","Griechenland","Portugal"]],
      ["Asien", ["Japan","China","Indien","Thailand","Vietnam","Südkorea","Indonesien"]],
      ["Afrika", ["Ägypten","Marokko","Südafrika","Kenia"]],
      ["Nordamerika", ["USA","Kanada","Mexiko","Kuba"]],
      ["Südamerika", ["Brasilien","Argentinien","Chile","Peru"]],
    ];
    const [kontinent, laenderListe] = pick(kontinente);
    const land = pick(laenderListe);
    const opts = new Set([kontinent]);
    while (opts.size < 4) opts.add(pick(kontinente)[0]);
    return Ex("geografie", `Auf welchem Kontinent liegt ${land}?`,
      shuffled([...opts]), kontinent);
  }

  function genRechnen() {
    const diff = difficulty();
    const opCount = diff === "schwer" ? 5 : 3;
    const op = rnd(opCount);
    let a, b, result, sign;
    if (op === 0) {
      if (diff === "leicht") { a = rndIn(2, 10); b = rndIn(2, 10); }
      else if (diff === "mittel") { a = rndIn(5, 30); b = rndIn(5, 30); }
      else { a = rndIn(50, 250); b = rndIn(50, 250); }
      result = a + b; sign = "+";
    } else if (op === 1) {
      if (diff === "leicht") { a = rndIn(5, 15); b = rndIn(1, a); }
      else if (diff === "mittel") { a = rndIn(10, 40); b = rndIn(2, a); }
      else { a = rndIn(100, 500); b = rndIn(30, a); }
      result = a - b; sign = "−";
    } else if (op === 2) {
      if (diff === "leicht") { a = rndIn(2, 5); b = rndIn(2, 5); }
      else if (diff === "mittel") { a = rndIn(2, 9); b = rndIn(2, 9); }
      else if (Math.random() < 0.5) { a = rndIn(11, 25); b = rndIn(11, 20); }
      else { a = rndIn(12, 99); b = rndIn(3, 9); }
      result = a * b; sign = "×";
    } else if (op === 3) {
      const div = rndIn(3, 12), res = rndIn(4, 25);
      a = div * res; b = div; result = res; sign = "÷";
    } else {
      const p = pick([10, 20, 25, 50, 75]);
      const faktor = { 10: 10, 20: 5, 25: 4, 50: 2, 75: 4 };
      const basis = rndIn(2, 12) * faktor[p];
      a = p; b = basis; result = basis * p / 100; sign = "% von";
    }
    const spread = diff === "leicht" ? 3 : diff === "mittel" ? 5 : Math.max(10, Math.floor(result / 5));
    const wrong = new Set();
    while (wrong.size < 3) {
      const cand = result + rndIn(-spread, spread);
      if (cand !== result && cand >= 0) wrong.add(cand);
    }
    const prompt = sign === "% von"
      ? `Wie viel ergibt ${a} % von ${b}?`
      : `Wie viel ergibt ${a} ${sign} ${b}?`;
    return Ex("rechnen", prompt, shuffled([result, ...wrong].map(String)), String(result));
  }

  const euro = (cents) =>
    `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, "0")} €`;

  function geldOptionen(correct) {
    const step = correct % 100 === 0 ? 100 : 10;
    const werte = new Set([correct]);
    let tries = 0;
    while (werte.size < optionCount() && tries < 200) {
      tries++;
      const delta = rndIn(1, 4) * step * (Math.random() < 0.5 ? 1 : -1);
      if (correct + delta > 0) werte.add(correct + delta);
    }
    let extra = step;
    while (werte.size < optionCount()) { werte.add(correct + extra); extra += step; }
    return shuffled([...werte].map(euro));
  }

  function genEinkaufen() {
    const diff = difficulty();
    const artikel = ["Brot","Milch","Butter","Käse","Kaffee","die Zeitung","Brötchen",
      "Eier","Marmelade","Schokolade","Saft","Honig","einen Kuchen","Blumen",
      "Äpfel","Wurst","Tee","Seife"];
    const preis = () => diff === "leicht" ? rndIn(1, 5) * 100
      : diff === "mittel" ? rndIn(8, 39) * 10 : rndIn(25, 95) * 10;
    if (Math.random() < 0.5) {
      const p = preis();
      const scheine = [500, 1000, 2000];
      const gezahlt = scheine.find(s => s > p) ?? (Math.floor(p / 500) + 1) * 500;
      const rueck = gezahlt - p;
      const name = pick(artikel);
      return Ex("einkaufen",
        `Sie kaufen ${name} für ${euro(p)} und zahlen mit ${euro(gezahlt)}. Wie viel bekommen Sie zurück?`,
        geldOptionen(rueck), euro(rueck));
    }
    const p1 = preis(), p2 = preis(), summe = p1 + p2;
    const a1 = pick(artikel);
    let a2 = pick(artikel);
    while (a2 === a1) a2 = pick(artikel);
    return Ex("einkaufen",
      `Sie kaufen ${a1} für ${euro(p1)} und ${a2} für ${euro(p2)}. Was kostet alles zusammen?`,
      geldOptionen(summe), euro(summe));
  }

  function genUhrzeit() {
    const diff = difficulty();
    const minuteSteps = diff === "leicht"
      ? [0, 15, 30, 45] : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
    const hour = diff === "leicht" ? rndIn(6, 20) : rndIn(0, 23);
    const minute = pick(minuteSteps);
    const label = (h, m) => `${h}:${String(m).padStart(2, "0")} Uhr`;
    const correct = label(hour, minute);
    const tageszeit = hour >= 5 && hour < 12 ? "vormittags"
      : hour >= 12 && hour < 18 ? "nachmittags"
      : hour >= 18 && hour < 22 ? "abends" : "nachts";
    const twin = (hour + 12) % 24;
    const set = new Set([correct]);
    let tries = 0;
    while (set.size < optionCount() && tries < 400) {
      tries++;
      const dh = pick([1, -1, 2, -2, 3, -3]);
      const h = (hour + dh + 24) % 24;
      const m = pick(minuteSteps);
      if ((h === hour && m === minute) || (h === twin && m === minute)) continue;
      set.add(label(h, m));
    }
    let addH = 1;
    while (set.size < optionCount() && addH < 30) {
      const h = (hour + addH) % 24;
      if (h !== twin) set.add(label(h, minute));
      addH++;
    }
    const analog = hour % 12 === 0 ? 12 : hour % 12;
    return Ex("uhrzeit", `Wie spät ist es? (${tageszeit})`,
      shuffled([...set]), correct,
      { clock: `${analog}:${String(minute).padStart(2, "0")}` });
  }

  // ── Angehörige (persönliche Fragen) ──
  function genBiografie(people) {
    const kandidaten = [];
    for (const p of people) {
      const t = (s) => (s || "").trim();
      if (t(p.birthPlace)) kandidaten.push([`Wo wurde ${p.name} geboren?`, t(p.birthPlace), D.bioStaedte]);
      if (t(p.profession)) kandidaten.push([`Was war ${p.name} von Beruf?`, t(p.profession), D.bioBerufe]);
      if (t(p.hometown)) kandidaten.push([`Wo hat ${p.name} früher gelebt?`, t(p.hometown), D.bioStaedte]);
      if (t(p.weddingYear) && !isNaN(parseInt(t(p.weddingYear), 10)))
        kandidaten.push([`In welchem Jahr hat ${p.name} geheiratet?`, t(p.weddingYear), []]);
    }
    if (!kandidaten.length) return null;
    const [frage, korrekt, pool] = pick(kandidaten);
    const opts = new Set([korrekt]);
    if (!pool.length) {
      const jahr = parseInt(korrekt, 10);
      let tries = 0;
      while (opts.size < optionCount() && tries < 100) {
        tries++;
        const k = jahr + rndIn(-8, 8);
        if (k !== jahr && k > 1900 && k <= 2025) opts.add(String(k));
      }
    } else {
      for (const x of shuffled(pool)) {
        if (opts.size >= optionCount()) break;
        if (x !== korrekt) opts.add(x);
      }
    }
    let fill = 1;
    while (opts.size < optionCount()) {
      opts.add(String((parseInt(korrekt, 10) || 1950) + fill)); fill++;
    }
    return Ex("angehoerige", frage, shuffled([...opts]), korrekt);
  }

  function genAngehoerige(people) {
    if (!people.length) return null;
    const stage = dementiaStage();
    const mitFoto = people.filter(p => p.photoData);
    if (stage >= 7 && mitFoto.length && rnd(3) === 0) {
      const person = pick(mitFoto);
      const opts = new Set([person.name]);
      for (const p of shuffled(people)) {
        if (opts.size >= 4) break;
        if (p.name !== person.name) opts.add(p.name);
      }
      for (const s of shuffled(["Anna","Maria","Peter","Hans","Eva","Lisa","Klaus","Karin"])) {
        if (opts.size >= 4) break;
        if (s !== person.name) opts.add(s);
      }
      return Ex("angehoerige", "Wer ist das?", shuffled([...opts]), person.name,
        { photo: person.photoData });
    }
    if (rnd(5) < 2) {
      const bio = genBiografie(people);
      if (bio) return bio;
    }
    const person = pick(people);
    const typen = [];
    if (person.relation) typen.push(0);
    const mitRelation = people.filter(p => p.relation);
    if (mitRelation.length >= 2) typen.push(1);
    if (person.symbol) typen.push(2);
    if (!typen.length) {
      const n = people.length;
      const opts = new Set([String(n)]);
      for (const off of [-2, -1, 1, 2, 3]) {
        if (n + off >= 0 && opts.size < 4) opts.add(String(n + off));
      }
      return Ex("angehoerige", "Wie viele Angehörige sind in Ihrem Profil gespeichert?",
        shuffled([...opts]), String(n));
    }
    const typ = pick(typen);
    if (typ === 0) {
      const opts = new Set([person.relation]);
      for (const r of shuffled(people.filter(p => p.id !== person.id && p.relation).map(p => p.relation))) {
        if (opts.size >= 4) break;
        opts.add(r);
      }
      const std = ["Mutter","Vater","Tochter","Sohn","Schwester","Bruder","Ehefrau",
        "Ehemann","Freundin","Freund","Enkelin","Enkel","Tante","Onkel"];
      for (const r of shuffled(std)) {
        if (opts.size >= 4) break;
        if (r !== person.relation) opts.add(r);
      }
      return Ex("angehoerige", `Wer ist ${person.name} für Sie?`,
        shuffled([...opts]), person.relation);
    }
    if (typ === 1) {
      const groups = {};
      for (const p of mitRelation) (groups[p.relation] ??= []).push(p);
      const unique = Object.values(groups).filter(g => g.length === 1);
      if (!unique.length) return genAngehoerige(people);
      const gesuchte = pick(unique)[0];
      const opts = new Set([gesuchte.name]);
      for (const p of shuffled(people)) {
        if (opts.size >= 4) break;
        if (p.id !== gesuchte.id) opts.add(p.name);
      }
      for (const n of shuffled(["Maria","Peter","Anna","Klaus","Hans","Lisa","Karl","Erika","Helga","Werner"])) {
        if (opts.size >= 4) break;
        opts.add(n);
      }
      const weiblich = ["Mutter","Tochter","Schwester","Ehefrau","Freundin","Enkelin","Tante","Nichte","Oma"];
      const artikel = weiblich.includes(gesuchte.relation) ? "Ihre" : "Ihr";
      return Ex("angehoerige", `Wer ist ${artikel} ${gesuchte.relation}?`,
        shuffled([...opts]), gesuchte.name);
    }
    const opts = new Set([person.symbol]);
    for (const s of shuffled(people.filter(p => p.id !== person.id && p.symbol).map(p => p.symbol))) {
      if (opts.size >= 4) break;
      opts.add(s);
    }
    for (const s of shuffled(["🌻","⭐️","🎈","❤️","🌸","🍀","🐶","🎵","🎨"])) {
      if (opts.size >= 4) break;
      if (s !== person.symbol) opts.add(s);
    }
    return Ex("angehoerige", `Welches Symbol gehört zu ${person.name}?`,
      shuffled([...opts]), person.symbol);
  }

  // ── Dispatch ──
  const GEN = {
    allgemein: genAllgemein,
    farben: genFarben, jahreszeit: genJahreszeit, zeit: dbGen("zeit", D.zeitFragen),
    uhrzeit: genUhrzeit, gegenteil: genGegenteil, rechnen: genRechnen,
    tiere: dbGen("tiere", D.tiere), natur: dbGen("natur", D.natur),
    sprichwort: genSprichwort, reim: genReim, zusammen: genZusammen,
    passtNicht: genPasstNicht, oberbegriff: genOberbegriff, zuordnung: genZuordnung,
    reihenfolgeLegen: genReihenfolgeLegen, zahlenreihe: genZahlenreihe,
    wortsalat: genWortsalat, synonym: genSynonym, reihenfolge: genReihenfolge,
    zahlenpyramide: genZahlenpyramide, geografie: genGeografie,
    personen: dbGen("personen", D.personenDB),
    erfindungen: dbGen("erfindungen", D.erfindungenDB),
    lieder: dbGen("lieder", D.liederDB), essen: dbGen("essen", D.essenDB),
    musik: dbGen("musik", D.musikDB), bauwerke: dbGen("bauwerke", D.bauwerkeDB),
    feste: dbGen("feste", D.festeDB), haushalt: dbGen("haushalt", D.haushaltDB),
    garten: dbGen("garten", D.gartenDB), kleidung: dbGen("kleidung", D.kleidungDB),
    reisen: dbGen("reisen", D.reisenDB), berufe: dbGen("berufe", D.berufeDB),
    koerper: dbGen("koerper", D.koerperDB), historie: dbGen("historie", D.historieDB),
    wissenschaft: dbGen("wissenschaft", D.wissenschaftDB),
    fremdwoerter: dbGen("fremdwoerter", D.fremdwoerterDB),
    maerchen: dbGen("maerchen", D.maerchenDB),
    werkzeuge: dbGen("werkzeuge", D.werkzeugeDB),
    sport: dbGen("sport", D.sportDB), verkehr: dbGen("verkehr", D.verkehrDB),
    sprache: dbGen("sprache", D.spracheDB), geld: dbGen("geld", D.geldDB),
    einkaufen: genEinkaufen, pflanzen: dbGen("pflanzen", D.pflanzenDB),
    wetter: dbGen("wetter", D.wetterDB), nostalgie: dbGen("nostalgie", D.nostalgieDB),
    schulzeitFrueher: dbGen("schulzeitFrueher", D.schulzeitFrueherDB),
    dingeVonDamals: dbGen("dingeVonDamals", D.dingeVonDamalsDB),
    spielzeugFrueher: dbGen("spielzeugFrueher", D.spielzeugFrueherDB),
    alteBerufe: dbGen("alteBerufe", D.alteBerufeDB),
    fernsehRadio: dbGen("fernsehRadio", D.fernsehRadioDB),
    filmklassiker: dbGen("filmklassiker", D.filmklassikerDB),
    sagen: dbGen("sagen", D.sagenDB),
    volkslieder: dbGen("volkslieder", D.volksliederDB),
    obstGemuese: dbGen("obstGemuese", D.obstGemueseDB),
    masseGewichte: dbGen("masseGewichte", D.masseGewichteDB),
    religion: dbGen("religion", D.religionDB),
    kochenBacken: dbGen("kochenBacken", D.kochenBackenDB),
    handarbeit: dbGen("handarbeit", D.handarbeitDB),
    hausmittel: dbGen("hausmittel", D.hausmittelDB),
    verkehrsschilder: dbGen("verkehrsschilder", D.verkehrsschilderDB),
    sicherheit: dbGen("sicherheit", D.sicherheitDB),
    koerperEinfach: dbGen("koerperEinfach", D.koerperEinfachDB),
    miteinander: dbGen("miteinander", D.miteinanderDB),
  };

  function generate(catId, people = []) {
    if (catId === "angehoerige") {
      return genAngehoerige(people) || genAllgemein();
    }
    return (GEN[catId] || genAllgemein)();
  }

  function generateRandom(catIds, people = []) {
    const nachStadium = categoriesForStage(catIds);
    const diff = difficulty();
    let filtered;
    if (diff === "leicht") {
      const einfach = new Set(["farben","tiere","jahreszeit","zeit"]);
      filtered = nachStadium.concat(nachStadium.filter(c => einfach.has(c)));
    } else if (diff === "mittel") {
      filtered = nachStadium.filter(c => !isSpezial(c));
    } else {
      const zuLeicht = new Set(["farben","tiere","jahreszeit","zeit","uhrzeit",
        "reim","gegenteil","zusammen","passtNicht","essen","berufe","werkzeuge",
        "maerchen","haushalt","garten","kleidung","reisen","feste","oberbegriff",
        "zuordnung","einkaufen","natur","koerper","pflanzen","wetter","nostalgie",
        "schulzeitFrueher","dingeVonDamals","spielzeugFrueher","volkslieder",
        "obstGemuese","religion","kochenBacken","handarbeit","hausmittel"]);
      let schwer = nachStadium.filter(c => !zuLeicht.has(c) && !isSpezial(c));
      if (dementiaStage() <= 2) {
        const bevorzugt = new Set(["allgemein","geld","historie","geografie","rechnen"]);
        const extra = schwer.filter(c => bevorzugt.has(c));
        schwer = schwer.concat(extra, extra);
      }
      filtered = schwer.length ? schwer : nachStadium;
    }
    const cat = filtered.length ? pick(filtered) : "allgemein";
    return generate(cat, people);
  }

  return { CATS, catById, isSpezial, generate, generateRandom,
           rnd, rndIn, pick, shuffled };
})();
