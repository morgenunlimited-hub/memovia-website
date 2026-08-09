/* ═══════════════════════════════════════════════════════════════
   Memovia Web — Spiele (Teil 1: Rahmen + 9 Spiele)
   Alle 18 Spiele der iOS-App, kostenlos. KI-Stärke folgt der
   Einstellung "Schwierigkeit der Spiele".
   ═══════════════════════════════════════════════════════════════ */
"use strict";

const Games = (() => {
  const gDiff = () => App.settings.gameDifficulty;   // leicht | mittel | schwer
  const { rnd, rndIn, pick, shuffled } = Generator;

  /* ── Spiel-Liste (Reihenfolge & Texte wie GamesView.swift) ── */
  const list = [
    { emoji: "🃏", title: "Paare", subtitle: "Kartenpaare finden gegen den Computer.",
      howTo: ["Decken Sie abwechselnd zwei Karten auf.", "Finden Sie zusammengehörende Paare.", "Wer mehr Paare findet, gewinnt."], run: memoryGame },
    { emoji: "🔴", title: "Vier in einer Reihe", subtitle: "Vier Steine in einer Reihe gegen den Computer.",
      howTo: ["Werfen Sie abwechselnd Steine in die Spalten.", "Bringen Sie vier Steine in eine Reihe.", "Waagerecht, senkrecht oder schräg zählt."], run: connectFour },
    { emoji: "🌈", title: "Farben-Test", subtitle: "Erkennen Sie die Schriftfarbe der Wörter.",
      howTo: ["Ein Farbwort erscheint in einer Farbe.", "Wählen Sie die Schriftfarbe — nicht das Wort.", "Das trainiert die Konzentration."], run: stroopTest },
    { emoji: "🔗", title: "Wortkette", subtitle: "Wörter aneinanderreihen gegen den Computer.",
      howTo: ["Nennen Sie ein Wort.", "Das nächste beginnt mit dessen letztem Buchstaben.", "Wer kein Wort mehr weiß, verliert."], run: wordChain },
    { emoji: "🎨", title: "Super-Hirn", subtitle: "Knacken Sie den geheimen Farbcode des Computers.",
      howTo: ["Stellen Sie aus den Farben einen Code zusammen.", "Schwarzer Punkt: richtige Farbe an richtiger Stelle.", "Weißer Punkt: richtige Farbe, falsche Stelle."], run: superHirn },
    { emoji: "❌⭕️", title: "Tic Tac Toe", subtitle: "Drei in einer Reihe gegen den Computer.",
      howTo: ["Setzen Sie abwechselnd Ihr Zeichen.", "Bringen Sie drei in eine Reihe.", "Waagerecht, senkrecht oder schräg gewinnt."], run: ticTacToe },
    { emoji: "🔤", title: "Galgenmännchen", subtitle: "Wörter erraten, Buchstabe für Buchstabe.",
      howTo: ["Erraten Sie das gesuchte Wort.", "Wählen Sie Buchstaben aus.", "Zu viele Fehler — und das Spiel ist verloren."], run: hangman },
    { emoji: "⚫️⚪️", title: "Dame", subtitle: "Klassisches Brettspiel gegen den Computer.",
      howTo: ["Ziehen Sie Ihre Steine diagonal vorwärts.", "Springen Sie über gegnerische Steine.", "Wer alle Steine verliert, verliert das Spiel."], run: checkers },
    { emoji: "⚡️", title: "Reaktionsspiel", subtitle: "Tippen Sie schnell, sobald es grün wird.",
      howTo: ["Warten Sie, bis das Feld grün wird.", "Tippen Sie dann so schnell wie möglich.", "Ihre Reaktionszeit wird gemessen."], run: reactionGame },
    { emoji: "✊✋✌️", title: "Schere Stein Papier", subtitle: "Best of 5 gegen den Computer.",
      howTo: ["Wählen Sie Schere, Stein oder Papier.", "Stein schlägt Schere, Schere schlägt Papier.", "Papier schlägt Stein. Best of 5 gewinnt."], run: rockPaperScissors },
    { emoji: "🔢", title: "Sudoku", subtitle: "Zahlenrätsel — füllen Sie das Gitter.",
      howTo: ["Wählen Sie eine leere Zelle.", "Tragen Sie die richtige Zahl ein.", "Jede Zeile, Spalte und 3×3-Box hat 1–9."], run: (a) => Games2.sudoku(a) },
    { emoji: "🧩", title: "Schiebepuzzle", subtitle: "Bringen Sie die Steine in die richtige Reihenfolge.",
      howTo: ["Tippen Sie einen Stein neben der Lücke.", "Der Stein rutscht in die freie Stelle.", "Ordnen Sie 1 bis 15 in die Reihenfolge."], run: (a) => Games2.slidePuzzle(a) },
    { emoji: "✏️", title: "Linienrätsel", subtitle: "Eine Figur in einem Zug nachzeichnen.",
      howTo: ["Tippen Sie einen Punkt an, um zu starten.", "Tippen Sie nacheinander verbundene Punkte an.", "Zeichnen Sie jede Linie genau einmal."], run: (a) => Games2.oneStroke(a) },
    { emoji: "🔟", title: "Zahlenjagd", subtitle: "Zahlen von groß nach klein antippen.",
      howTo: ["Zahlen erscheinen in bunten Kreisen.", "Tippen Sie sie von GROSS nach KLEIN an.", "Die Farben sollen Sie bewusst ablenken."], run: (a) => Games2.numberHunt(a) },
    { emoji: "🔠", title: "Wortsuche", subtitle: "Versteckte Wörter im Buchstabengitter finden.",
      howTo: ["Wörter sind im Gitter versteckt.", "Ziehen Sie vom ersten zum letzten Buchstaben.", "Waagerecht, senkrecht und diagonal möglich."], run: (a) => Games2.wordSearch(a) },
    { emoji: "🚢", title: "Schiffe versenken", subtitle: "Finden Sie die Schiffe des Computers.",
      howTo: ["Tippen Sie ein Feld an, um dorthin zu schießen.", "Rot bedeutet Treffer, Blau bedeutet Wasser.", "Wer zuerst alle Schiffe versenkt, gewinnt."], run: (a) => Games2.battleship(a) },
    { emoji: "🎲", title: "Würfelpoker", subtitle: "Würfelspiel gegen den Computer.",
      howTo: ["Würfeln Sie mit fünf Würfeln.", "Behalten Sie gute Würfel, würfeln Sie neu.", "Tragen Sie Ihr Ergebnis in die Tabelle ein."], run: (a) => Games2.kniffel(a) },
    { emoji: "⚪", title: "Mühle", subtitle: "Der Klassiker — gegen den Computer oder zu zweit.",
      howTo: ["Setzen Sie abwechselnd Ihre neun Steine.", "Drei Steine in einer Reihe sind eine Mühle.", "Mit einer Mühle entfernen Sie einen gegnerischen Stein."], run: (a) => Games2.muehle(a) },
  ];

  /* ── Spiele-Raster ── */
  function renderGrid() {
    const grid = $("#gamesGrid");
    grid.innerHTML = "";
    list.forEach(game => {
      const tile = el("button", "glass game-tile",
        `<span class="emoji">${game.emoji}</span><span class="title">${esc(game.title)}</span>`);
      tile.onclick = () => open(game);
      grid.appendChild(tile);
    });
  }

  /* ── Vollbild-Overlay ── */
  let cleanup = null;
  function open(game) {
    Speech.stop();
    const ov = $("#gameOverlay");
    ov.innerHTML = "";
    const head = el("div", "game-head");
    const back = el("button", "pill-btn", "‹ Zurück");
    back.onclick = close;
    head.appendChild(back);
    head.appendChild(el("h3", "", esc(game.title)));
    const again = el("button", "icon-btn", "↺");
    again.title = "Neu starten";
    again.setAttribute("aria-label", "Neu starten");
    head.appendChild(again);
    ov.appendChild(head);

    const body = el("div", "game-body");
    ov.appendChild(body);
    ov.classList.remove("hidden");

    const start = () => {
      if (cleanup) { try { cleanup(); } catch {} cleanup = null; }
      body.innerHTML = "";
      // "So geht's"-Box (einklappbar)
      const howBox = el("details", "glass card");
      howBox.innerHTML = `<summary style="cursor:pointer;font-weight:600">So geht's</summary>
        <ul class="howto" style="margin-top:8px">${game.howTo.map(h => `<li>${esc(h)}</li>`).join("")}</ul>`;
      body.appendChild(howBox);
      const status = el("div", "game-status");
      body.appendChild(status);
      const area = el("div");
      area.style.cssText = "display:flex;flex-direction:column;gap:12px";
      body.appendChild(area);
      const api = {
        area, status,
        setStatus: (t) => { status.textContent = t; },
        onCleanup: (fn) => { cleanup = fn; },
        restart: start,
      };
      game.run(api);
    };
    again.onclick = start;
    start();
  }
  function close() {
    if (cleanup) { try { cleanup(); } catch {} cleanup = null; }
    $("#gameOverlay").classList.add("hidden");
    $("#gameOverlay").innerHTML = "";
  }

  /* Gemeinsame Bausteine */
  function scoreRow(entries) {
    const row = el("div", "score-row");
    const chips = entries.map(([label]) => {
      const c = el("span", "score-chip", label);
      row.appendChild(c);
      return c;
    });
    return { row, chips };
  }
  const endBanner = (api, text, won) => {
    api.setStatus(text);
    if (won === true) Feedback.success();
    else if (won === false) Feedback.error();
  };

  /* ══════════════ 1) Paare (Memory) ══════════════ */
  const MEMORY_SYMBOLS_GAME = ["🌻","🍎","🐶","🚗","⭐️","🎈","🦋","🍀","🐱","🌹",
    "🍓","🚲","🌙","🎁","🐢","🍋","🐝","🌵"];

  function memoryGame(api) {
    let boardSize = parseInt(Store.get(`memovia_memory_size_${userId()}`, "4"), 10);
    if (![4, 6].includes(boardSize)) boardSize = 4;
    let cards, first, lock, current, youPairs, aiPairs, aiMemory, done;

    const sizeRow = el("div", "game-controls");
    [4, 6].forEach(s => {
      const b = el("button", "pill-btn", `${s} × ${s}`);
      b.onclick = () => {
        boardSize = s;
        Store.set(`memovia_memory_size_${userId()}`, s);
        newGame();
      };
      sizeRow.appendChild(b);
    });
    api.area.appendChild(sizeRow);

    const { row: scores, chips } = scoreRow([["Sie"], ["Computer"]]);
    api.area.appendChild(scores);
    const board = el("div", "board tight");
    api.area.appendChild(board);

    function newGame() {
      const pairCount = boardSize * boardSize / 2;
      const syms = MEMORY_SYMBOLS_GAME.slice(0, pairCount);
      cards = shuffled([...syms, ...syms]).map(s => ({ s, open: false, done: false }));
      first = null; lock = false; current = "you";
      youPairs = 0; aiPairs = 0; aiMemory = {}; done = false;
      render();
    }

    function render() {
      board.style.gridTemplateColumns = `repeat(${boardSize}, 1fr)`;
      board.innerHTML = "";
      cards.forEach((c, i) => {
        const cell = el("button", "cell memory-card" + (c.open || c.done ? " open" : "") + (c.done ? " done" : ""));
        cell.style.padding = "0";
        cell.innerHTML = `<span class="memory-inner">
          <span class="memory-face memory-back">?</span>
          <span class="memory-face memory-front">${c.s}</span></span>`;
        cell.disabled = done || lock || current !== "you" || c.open || c.done;
        cell.onclick = () => flip(i);
        board.appendChild(cell);
      });
      chips[0].textContent = `Sie: ${youPairs}`;
      chips[1].textContent = `Computer: ${aiPairs}`;
      chips[0].classList.toggle("active", current === "you" && !done);
      chips[1].classList.toggle("active", current === "ai" && !done);
      if (!done) api.setStatus(current === "you" ? "Sie sind dran." : "Der Computer überlegt…");
    }

    function remember(i) {
      const p = { leicht: 0.35, mittel: 0.65, schwer: 0.95 }[gDiff()];
      if (Math.random() < p) aiMemory[i] = cards[i].s;
    }

    function flip(i) {
      if (lock || cards[i].open || cards[i].done) return;
      cards[i].open = true;
      remember(i);
      Feedback.tap();
      if (first === null) { first = i; render(); return; }
      lock = true; render();
      const a = first, b = i;
      first = null;
      setTimeout(() => resolvePair(a, b), 750);
    }

    function resolvePair(a, b) {
      const match = cards[a].s === cards[b].s;
      if (match) {
        cards[a].done = cards[b].done = true;
        delete aiMemory[a]; delete aiMemory[b];
        if (current === "you") youPairs++; else aiPairs++;
      } else {
        cards[a].open = cards[b].open = false;
        current = current === "you" ? "ai" : "you";
      }
      lock = false;
      const pairCount = boardSize * boardSize / 2;
      if (youPairs + aiPairs === pairCount) {
        done = true; render();
        endBanner(api,
          youPairs > aiPairs ? `🎉 Sie gewinnen ${youPairs} : ${aiPairs}!`
          : youPairs < aiPairs ? `Der Computer gewinnt ${aiPairs} : ${youPairs}.`
          : `Unentschieden ${youPairs} : ${aiPairs}.`,
          youPairs > aiPairs ? true : youPairs < aiPairs ? false : null);
        return;
      }
      render();
      if (current === "ai") aiTurnSoon();
    }

    function aiTurnSoon() {
      if (done || current !== "ai") return;
      setTimeout(aiTurn, 800);
    }

    function aiTurn() {
      if (done || current !== "ai") return;
      const closedIdx = cards.map((c, i) => (!c.open && !c.done ? i : -1)).filter(i => i >= 0);
      // Bekanntes Paar?
      let a = null, b = null;
      const known = Object.entries(aiMemory).filter(([i]) => closedIdx.includes(+i));
      for (let x = 0; x < known.length && a === null; x++) {
        for (let y = x + 1; y < known.length; y++) {
          if (known[x][1] === known[y][1]) { a = +known[x][0]; b = +known[y][0]; break; }
        }
      }
      if (a === null) {
        a = pick(closedIdx);
        // Kennt die KI einen Partner der ersten Karte?
        const partner = known.find(([i, s]) => +i !== a && s === cards[a].s);
        b = partner ? +partner[0] : pick(closedIdx.filter(i => i !== a));
      }
      cards[a].open = true; remember(a); render();
      setTimeout(() => {
        cards[b].open = true; remember(b); render();
        setTimeout(() => resolvePair(a, b), 800);
      }, 550);
    }

    newGame();
  }

  /* ══════════════ 2) Vier in einer Reihe ══════════════ */
  function connectFour(api) {
    const COLS = 7, ROWS = 6;
    let grid, over, turn;
    const board = el("div", "board tight");
    board.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
    board.style.maxWidth = "440px";
    api.area.appendChild(board);

    const reset = () => { grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0)); over = false; turn = 1; render(); api.setStatus("Sie beginnen — Rot."); };

    const winner = (g) => {
      const dirs = [[0,1],[1,0],[1,1],[1,-1]];
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const v = g[r][c]; if (!v) continue;
        for (const [dr, dc] of dirs) {
          let ok = true;
          for (let k = 1; k < 4; k++) {
            const nr = r + dr * k, nc = c + dc * k;
            if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || g[nr][nc] !== v) { ok = false; break; }
          }
          if (ok) return v;
        }
      }
      return 0;
    };
    const validCols = (g) => Array.from({ length: COLS }, (_, c) => c).filter(c => g[0][c] === 0);
    const drop = (g, c, v) => {
      for (let r = ROWS - 1; r >= 0; r--) if (g[r][c] === 0) { g[r][c] = v; return r; }
      return -1;
    };

    function render() {
      board.innerHTML = "";
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const cell = el("button", "cell");
        cell.style.background = "rgba(20,40,90,0.55)";
        const disc = el("span", "c4-disc" + (grid[r][c] === 1 ? " p1" : grid[r][c] === 2 ? " p2" : ""));
        cell.appendChild(disc);
        cell.disabled = over || turn !== 1 || grid[0][c] !== 0;
        cell.onclick = () => userMove(c);
        board.appendChild(cell);
      }
    }

    function finish(w) {
      over = true; render();
      endBanner(api, w === 1 ? "🎉 Sie gewinnen!" : w === 2 ? "Der Computer gewinnt." : "Unentschieden — das Brett ist voll.", w === 1 ? true : w === 2 ? false : null);
    }

    function userMove(c) {
      if (over || turn !== 1) return;
      if (drop(grid, c, 1) < 0) return;
      Feedback.tap();
      const w = winner(grid);
      if (w || !validCols(grid).length) return finish(w);
      turn = 2; render(); api.setStatus("Der Computer überlegt…");
      setTimeout(aiMove, 600);
    }

    function score(g, v) {
      // einfache Heuristik: Fenster zählen
      let s = 0;
      const lineVal = (cells) => {
        const mine = cells.filter(x => x === v).length;
        const opp = cells.filter(x => x && x !== v).length;
        if (mine && opp) return 0;
        if (mine === 4) return 100000;
        if (opp === 4) return -100000;
        if (mine === 3) return 120;
        if (mine === 2) return 12;
        if (opp === 3) return -140;
        return 0;
      };
      const dirs = [[0,1],[1,0],[1,1],[1,-1]];
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++)
        for (const [dr, dc] of dirs) {
          const cells = [];
          for (let k = 0; k < 4; k++) {
            const nr = r + dr * k, nc = c + dc * k;
            if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) { cells.length = 0; break; }
            cells.push(g[nr][nc]);
          }
          if (cells.length === 4) s += lineVal(cells);
        }
      // Mitte bevorzugen
      for (let r = 0; r < ROWS; r++) if (g[r][3] === v) s += 6;
      return s;
    }

    function minimax(g, depth, maximizing, alpha, beta) {
      const w = winner(g);
      if (w === 2) return 100000 + depth;
      if (w === 1) return -100000 - depth;
      const cols = validCols(g);
      if (!cols.length || depth === 0) return score(g, 2);
      if (maximizing) {
        let best = -Infinity;
        for (const c of cols) {
          const g2 = g.map(r => r.slice()); drop(g2, c, 2);
          best = Math.max(best, minimax(g2, depth - 1, false, alpha, beta));
          alpha = Math.max(alpha, best);
          if (beta <= alpha) break;
        }
        return best;
      }
      let best = Infinity;
      for (const c of cols) {
        const g2 = g.map(r => r.slice()); drop(g2, c, 1);
        best = Math.min(best, minimax(g2, depth - 1, true, alpha, beta));
        beta = Math.min(beta, best);
        if (beta <= alpha) break;
      }
      return best;
    }

    function aiMove() {
      if (over) return;
      const cols = validCols(grid);
      let choice;
      const winningCol = (v) => cols.find(c => {
        const g2 = grid.map(r => r.slice()); drop(g2, c, v);
        return winner(g2) === v;
      });
      const d = gDiff();
      if (d === "leicht") {
        choice = winningCol(2) ?? (Math.random() < 0.5 ? winningCol(1) : undefined) ?? pick(cols);
      } else if (d === "mittel") {
        choice = winningCol(2) ?? winningCol(1) ?? pick(cols.filter(c => Math.abs(c - 3) <= 2)) ?? pick(cols);
      } else {
        let best = -Infinity; choice = cols[0];
        for (const c of shuffled(cols)) {
          const g2 = grid.map(r => r.slice()); drop(g2, c, 2);
          const v = minimax(g2, 4, false, -Infinity, Infinity);
          if (v > best) { best = v; choice = c; }
        }
      }
      drop(grid, choice, 2);
      const w = winner(grid);
      if (w || !validCols(grid).length) return finish(w);
      turn = 1; render(); api.setStatus("Sie sind dran — Rot.");
    }

    reset();
  }

  /* ══════════════ 3) Farben-Test (Stroop) ══════════════ */
  function stroopTest(api) {
    const COLORS = [
      ["ROT", "#E4574C"], ["BLAU", "#4C7DE4"], ["GRÜN", "#4DA65A"],
      ["GELB", "#E9C33B"], ["LILA", "#9B59D0"], ["ORANGE", "#E88A2E"],
    ];
    const roundsTotal = 10;
    let round, points, word, color, startT, times;

    const wordEl = el("div", "stroop-word");
    api.area.appendChild(wordEl);
    const btnRow = el("div", "color-row");
    api.area.appendChild(btnRow);

    function next() {
      if (round >= roundsTotal) {
        wordEl.textContent = "✔";
        wordEl.style.color = "#fff";
        btnRow.innerHTML = "";
        const avg = times.length ? Math.round(times.reduce((a, b) => a + b) / times.length) : 0;
        endBanner(api, `Fertig! ${points} von ${roundsTotal} richtig · Ø ${(avg / 1000).toFixed(1)} s`, points >= roundsTotal * 0.7);
        return;
      }
      round++;
      const n = gDiff() === "leicht" ? 4 : COLORS.length;
      const pool = COLORS.slice(0, n);
      word = pick(pool);
      do { color = pick(pool); } while (gDiff() !== "leicht" && color[0] === word[0] && Math.random() < 0.7);
      wordEl.textContent = word[0];
      wordEl.style.color = color[1];
      api.setStatus(`Runde ${round} / ${roundsTotal} · ${points} richtig — Welche FARBE hat das Wort?`);
      btnRow.innerHTML = "";
      shuffled(pool).forEach(([name, hex]) => {
        const b = el("button", "color-btn", name);
        b.style.background = hex;
        b.onclick = () => {
          const ok = hex === color[1];
          if (ok) { points++; times.push(Date.now() - startT); Feedback.success(); }
          else Feedback.error();
          next();
        };
        btnRow.appendChild(b);
      });
      startT = Date.now();
    }

    round = 0; points = 0; times = [];
    next();
  }

  /* ══════════════ 4) Wortkette ══════════════ */
  function wordChain(api) {
    const dictSet = new Set(MEMOVIA_DATA.wordChainDict.map(w => w.toUpperCase()));
    let used, lastLetter, over;

    const log = el("div", "wc-log");
    api.area.appendChild(log);
    const inputRow = el("div");
    inputRow.style.cssText = "display:flex;gap:8px";
    const input = el("input");
    input.placeholder = "Ihr Wort…";
    input.autocapitalize = "characters";
    const send = el("button", "btn-accent", "Senden");
    send.style.flex = "none";
    inputRow.appendChild(input); inputRow.appendChild(send);
    api.area.appendChild(inputRow);
    const giveUp = el("button", "skip-btn", "Ich weiß keins mehr — aufgeben");
    giveUp.style.alignSelf = "center";
    api.area.appendChild(giveUp);

    const norm = (w) => w.trim().toUpperCase()
      .replace(/Ä/g, "Ä").replace(/ß/g, "SS");
    const lastOf = (w) => {
      // Umlaute am Ende: nächster Buchstabe wie Grundbuchstabe erlaubt (freundlich)
      const map = { "Ä": "A", "Ö": "O", "Ü": "U" };
      const ch = w[w.length - 1];
      return map[ch] || ch;
    };
    const addLog = (word, who) => {
      const item = el("div", `wc-item ${who}`, esc(word));
      log.appendChild(item);
      log.scrollTop = log.scrollHeight;
    };

    function aiAnswer() {
      const candidates = [...dictSet].filter(w =>
        w[0] === lastLetter && !used.has(w));
      if (!candidates.length) {
        over = true;
        input.disabled = send.disabled = true;
        endBanner(api, "🎉 Dem Computer fällt nichts mehr ein — Sie gewinnen!", true);
        return;
      }
      // schwer: langes Wort mit seltenem Endbuchstaben; leicht: kurzes Wort
      let choice;
      const d = gDiff();
      if (d === "leicht") choice = candidates.sort((a, b) => a.length - b.length)[rnd(Math.min(4, candidates.length))];
      else if (d === "schwer") {
        const rare = candidates.filter(w => "QXYÄÖÜCEIN".includes(lastOf(w)) === false);
        choice = pick(rare.length ? rare : candidates);
      } else choice = pick(candidates);
      used.add(choice);
      lastLetter = lastOf(choice);
      addLog(choice, "ai");
      api.setStatus(`Ihr Wort mit „${lastLetter}" …`);
    }

    function submit() {
      if (over) return;
      const w = norm(input.value);
      if (!w) return;
      if (lastLetter && w[0] !== lastLetter) {
        api.setStatus(`Das Wort muss mit „${lastLetter}" beginnen.`);
        Feedback.error(); return;
      }
      if (used.has(w)) { api.setStatus("Dieses Wort war schon dran."); Feedback.error(); return; }
      if (w.length < 2) { api.setStatus("Bitte ein richtiges Wort eingeben."); return; }
      used.add(w);
      addLog(w, "you");
      Feedback.tap();
      input.value = "";
      lastLetter = lastOf(w);
      api.setStatus("Der Computer überlegt…");
      setTimeout(aiAnswer, 700);
    }
    send.onclick = submit;
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    giveUp.onclick = () => {
      if (over) return;
      over = true;
      input.disabled = send.disabled = true;
      endBanner(api, "Der Computer gewinnt diese Runde — beim nächsten Mal klappt's!", false);
    };

    used = new Set(); lastLetter = null; over = false;
    api.setStatus("Nennen Sie das erste Wort.");
  }

  /* ══════════════ 5) Super-Hirn ══════════════ */
  function superHirn(api) {
    const PALETTE = ["#E4574C", "#4C7DE4", "#4DA65A", "#E9C33B", "#9B59D0", "#E88A2E"];
    const codeLen = 4;
    const maxTries = gDiff() === "leicht" ? 12 : gDiff() === "mittel" ? 10 : 8;
    const secret = Array.from({ length: codeLen }, () => rnd(PALETTE.length));
    let current = [], tries = [], over = false;

    const history = el("div");
    history.style.cssText = "display:flex;flex-direction:column;gap:8px";
    api.area.appendChild(history);
    const curRow = el("div", "sh-row");
    api.area.appendChild(curRow);
    const palRow = el("div", "sh-row");
    PALETTE.forEach((hex, i) => {
      const b = el("button", "sh-peg");
      b.style.background = hex;
      b.setAttribute("aria-label", "Farbe " + (i + 1));
      b.onclick = () => {
        if (over || current.length >= codeLen) return;
        current.push(i); Feedback.tap(); renderCurrent();
      };
      palRow.appendChild(b);
    });
    api.area.appendChild(palRow);
    const ctrl = el("div", "game-controls");
    const undo = el("button", "pill-btn", "⌫ Zurück");
    undo.onclick = () => { if (!over) { current.pop(); renderCurrent(); } };
    const check = el("button", "btn-accent", "Prüfen");
    check.onclick = () => submitGuess();
    ctrl.appendChild(undo); ctrl.appendChild(check);
    api.area.appendChild(ctrl);

    function renderCurrent() {
      curRow.innerHTML = "";
      for (let i = 0; i < codeLen; i++) {
        const p = el("span", "sh-peg");
        if (current[i] !== undefined) p.style.background = PALETTE[current[i]];
        curRow.appendChild(p);
      }
    }
    function pins(guess) {
      let black = 0;
      const restS = [], restG = [];
      for (let i = 0; i < codeLen; i++) {
        if (guess[i] === secret[i]) black++;
        else { restS.push(secret[i]); restG.push(guess[i]); }
      }
      let white = 0;
      for (const g of restG) {
        const idx = restS.indexOf(g);
        if (idx >= 0) { white++; restS.splice(idx, 1); }
      }
      return { black, white };
    }
    function submitGuess() {
      if (over || current.length < codeLen) return;
      const { black, white } = pins(current);
      tries.push({ guess: current.slice(), black, white });
      const row = el("div", "sh-row");
      current.forEach(ci => {
        const p = el("span", "sh-peg small");
        p.style.background = PALETTE[ci];
        row.appendChild(p);
      });
      const pinBox = el("span", "sh-pins");
      for (let i = 0; i < codeLen; i++) {
        const pin = el("span", "sh-pin" + (i < black ? " black" : i < black + white ? " white" : ""));
        pinBox.appendChild(pin);
      }
      row.appendChild(pinBox);
      history.appendChild(row);
      current = []; renderCurrent();
      if (black === codeLen) {
        over = true;
        endBanner(api, `🎉 Code geknackt — in ${tries.length} Versuchen!`, true);
        return;
      }
      if (tries.length >= maxTries) {
        over = true;
        const sol = el("div", "sh-row");
        sol.appendChild(el("span", "", "Lösung:&nbsp;"));
        secret.forEach(ci => {
          const p = el("span", "sh-peg small"); p.style.background = PALETTE[ci];
          sol.appendChild(p);
        });
        history.appendChild(sol);
        endBanner(api, "Alle Versuche aufgebraucht — nächstes Mal klappt's!", false);
        return;
      }
      api.setStatus(`Versuch ${tries.length + 1} von ${maxTries}`);
    }
    renderCurrent();
    api.setStatus(`Versuch 1 von ${maxTries} — stellen Sie ${codeLen} Farben zusammen.`);
  }

  /* ══════════════ 6) Tic Tac Toe ══════════════ */
  function ticTacToe(api) {
    let cells, over, turn;
    const board = el("div", "board");
    board.style.gridTemplateColumns = "repeat(3, 1fr)";
    board.style.maxWidth = "340px";
    api.area.appendChild(board);

    const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    const winnerOf = (c) => {
      for (const [a, b, d] of LINES)
        if (c[a] && c[a] === c[b] && c[a] === c[d]) return c[a];
      return c.every(Boolean) ? "draw" : null;
    };

    function render() {
      board.innerHTML = "";
      cells.forEach((v, i) => {
        const cell = el("button", "cell", v === "X" ? "❌" : v === "O" ? "⭕️" : "");
        cell.disabled = over || turn !== "X" || !!v;
        cell.onclick = () => move(i, "X");
        board.appendChild(cell);
      });
    }
    function finish(w) {
      over = true; render();
      endBanner(api, w === "X" ? "🎉 Sie gewinnen!" : w === "O" ? "Der Computer gewinnt." : "Unentschieden!", w === "X" ? true : w === "O" ? false : null);
    }
    function move(i, who) {
      if (over || cells[i]) return;
      cells[i] = who;
      if (who === "X") Feedback.tap();
      const w = winnerOf(cells);
      if (w) return finish(w);
      turn = who === "X" ? "O" : "X";
      render();
      if (turn === "O") {
        api.setStatus("Der Computer überlegt…");
        setTimeout(aiMove, 550);
      } else api.setStatus("Sie sind dran — ❌.");
    }
    function bestMove() {
      const mm = (c, player) => {
        const w = winnerOf(c);
        if (w === "O") return { score: 10 };
        if (w === "X") return { score: -10 };
        if (w === "draw") return { score: 0 };
        const moves = [];
        c.forEach((v, i) => {
          if (!v) {
            c[i] = player;
            moves.push({ i, score: mm(c, player === "O" ? "X" : "O").score });
            c[i] = null;
          }
        });
        return player === "O"
          ? moves.reduce((a, b) => (b.score > a.score ? b : a))
          : moves.reduce((a, b) => (b.score < a.score ? b : a));
      };
      return mm(cells.slice(), "O").i;
    }
    function aiMove() {
      if (over) return;
      const empty = cells.map((v, i) => (v ? -1 : i)).filter(i => i >= 0);
      const winningFor = (p) => empty.find(i => {
        const c = cells.slice(); c[i] = p; return winnerOf(c) === p;
      });
      let i;
      const d = gDiff();
      if (d === "leicht") i = winningFor("O") ?? pick(empty);
      else if (d === "mittel") i = winningFor("O") ?? winningFor("X") ?? (empty.includes(4) ? 4 : pick(empty));
      else i = bestMove();
      move(i, "O");
    }

    cells = Array(9).fill(null); over = false; turn = "X";
    render();
    api.setStatus("Sie beginnen — ❌.");
  }

  /* ══════════════ 7) Galgenmännchen ══════════════ */
  function hangman(api) {
    const [word, hint] = pick(MEMOVIA_DATA.hangmanWords);
    const maxErr = gDiff() === "leicht" ? 8 : 6;
    let errors = 0, guessed = new Set(), over = false;

    const svgWrap = el("div");
    svgWrap.style.cssText = "max-width:220px;margin:0 auto;width:60%";
    api.area.appendChild(svgWrap);
    const hintEl = el("div", "setting-sub", "💡 " + esc(hint));
    hintEl.style.textAlign = "center";
    api.area.appendChild(hintEl);
    const wordEl = el("div", "hang-word");
    api.area.appendChild(wordEl);
    const kb = el("div", "keyboard");
    api.area.appendChild(kb);

    const parts = (n) => {
      // Galgen + 6 Körperteile; bei 8 Fehlern zwei Extra-Stufen (Hügel, Querstütze)
      const steps8 = maxErr === 8;
      const showAt = (need) => (steps8 ? n >= need : n >= need - 2);
      return `<svg viewBox="0 0 120 140" class="os-svg" aria-hidden="true">
        ${steps8 && n >= 1 ? '<path d="M10 130 Q60 110 110 130" stroke="#fff" stroke-width="3" fill="none"/>' : ""}
        ${showAt(2) ? '<line x1="30" y1="130" x2="30" y2="15" stroke="#fff" stroke-width="4"/>' : ""}
        ${showAt(2) ? '<line x1="28" y1="15" x2="80" y2="15" stroke="#fff" stroke-width="4"/>' : ""}
        ${showAt(3) ? '<line x1="80" y1="15" x2="80" y2="30" stroke="#fff" stroke-width="3"/>' : ""}
        ${showAt(4) ? '<circle cx="80" cy="41" r="11" stroke="#fff" stroke-width="3" fill="none"/>' : ""}
        ${showAt(5) ? '<line x1="80" y1="52" x2="80" y2="88" stroke="#fff" stroke-width="3"/>' : ""}
        ${showAt(6) ? '<line x1="80" y1="60" x2="64" y2="76" stroke="#fff" stroke-width="3"/><line x1="80" y1="60" x2="96" y2="76" stroke="#fff" stroke-width="3"/>' : ""}
        ${showAt(7) ? '<line x1="80" y1="88" x2="66" y2="112" stroke="#fff" stroke-width="3"/>' : ""}
        ${showAt(8) ? '<line x1="80" y1="88" x2="94" y2="112" stroke="#fff" stroke-width="3"/>' : ""}
      </svg>`;
    };

    function render() {
      svgWrap.innerHTML = parts(errors);
      wordEl.innerHTML = [...word].map(ch =>
        `<span class="hang-letter">${guessed.has(ch) || over ? ch : "&nbsp;"}</span>`).join("");
      api.setStatus(over ? api.status.textContent : `Fehler: ${errors} von ${maxErr}`);
    }

    const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ".split("");
    LETTERS.forEach(L => {
      const k = el("button", "key", L);
      k.onclick = () => guess(L, k);
      kb.appendChild(k);
    });

    function guess(L, btn) {
      if (over || guessed.has(L)) return;
      guessed.add(L);
      btn.disabled = true;
      if (word.includes(L)) {
        btn.classList.add("good");
        Feedback.tap();
        if ([...word].every(ch => guessed.has(ch))) {
          over = true; render();
          endBanner(api, `🎉 Richtig — das Wort war ${word}!`, true);
          return;
        }
      } else {
        btn.classList.add("bad");
        errors++;
        Feedback.error();
        if (errors >= maxErr) {
          over = true; render();
          endBanner(api, `Verloren — das Wort war ${word}.`, false);
          return;
        }
      }
      render();
    }
    render();
  }

  /* ══════════════ 8) Dame ══════════════ */
  function checkers(api) {
    // 8x8, Sie = Weiß (unten, zieht nach oben), Computer = Schwarz.
    // Schlagzwang, Mehrfachsprung, Dame am gegnerischen Rand.
    const N = 8;
    let board, sel, over, turn, mustJumpFrom;

    const boardEl = el("div", "board tight");
    boardEl.style.gridTemplateColumns = `repeat(${N}, 1fr)`;
    api.area.appendChild(boardEl);

    const inB = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
    const P = { EMPTY: 0, W: 1, WQ: 2, B: 3, BQ: 4 };
    const isW = (v) => v === P.W || v === P.WQ;
    const isB = (v) => v === P.B || v === P.BQ;
    const isQ = (v) => v === P.WQ || v === P.BQ;

    function init() {
      board = Array.from({ length: N }, () => Array(N).fill(0));
      for (let r = 0; r < 3; r++) for (let c = 0; c < N; c++)
        if ((r + c) % 2 === 1) board[r][c] = P.B;
      for (let r = N - 3; r < N; r++) for (let c = 0; c < N; c++)
        if ((r + c) % 2 === 1) board[r][c] = P.W;
      sel = null; over = false; turn = "w"; mustJumpFrom = null;
      render(); api.setStatus("Sie sind dran — Weiß ⚪.");
    }

    function movesFor(b, r, c) {
      const v = b[r][c];
      if (!v) return { steps: [], jumps: [] };
      const dirs = isQ(v) ? [[-1,-1],[-1,1],[1,-1],[1,1]]
        : isW(v) ? [[-1,-1],[-1,1]] : [[1,-1],[1,1]];
      const steps = [], jumps = [];
      for (const [dr, dc] of dirs) {
        const r1 = r + dr, c1 = c + dc;
        if (inB(r1, c1) && !b[r1][c1]) steps.push({ to: [r1, c1] });
        const r2 = r + 2 * dr, c2 = c + 2 * dc;
        if (inB(r2, c2) && !b[r2][c2] && b[r1]?.[c1] &&
            (isW(v) ? isB(b[r1][c1]) : isW(b[r1][c1])))
          jumps.push({ to: [r2, c2], cap: [r1, c1] });
      }
      return { steps, jumps };
    }
    function allMoves(b, side) {
      const jumps = [], steps = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const v = b[r][c];
        if (!v || (side === "w" ? !isW(v) : !isB(v))) continue;
        const m = movesFor(b, r, c);
        m.jumps.forEach(j => jumps.push({ from: [r, c], ...j }));
        m.steps.forEach(s => steps.push({ from: [r, c], ...s }));
      }
      return jumps.length ? { moves: jumps, jumping: true } : { moves: steps, jumping: false };
    }
    function applyMove(b, m) {
      const [r, c] = m.from, [r2, c2] = m.to;
      let v = b[r][c];
      b[r][c] = 0;
      if (m.cap) b[m.cap[0]][m.cap[1]] = 0;
      if (v === P.W && r2 === 0) v = P.WQ;
      if (v === P.B && r2 === N - 1) v = P.BQ;
      b[r2][c2] = v;
      // Weitersprung?
      if (m.cap) {
        const more = movesFor(b, r2, c2).jumps;
        if (more.length) return [r2, c2];
      }
      return null;
    }
    const count = (b, side) => b.flat().filter(v => side === "w" ? isW(v) : isB(v)).length;

    function render() {
      boardEl.innerHTML = "";
      const legal = turn === "w" && !over ? allMoves(board, "w") : { moves: [] };
      const fromSel = legal.moves.filter(m =>
        sel && m.from[0] === sel[0] && m.from[1] === sel[1]);
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const dark = (r + c) % 2 === 1;
        const v = board[r][c];
        const cell = el("button", "cell" + (dark ? " dark" : ""));
        if (v) cell.textContent = isQ(v) ? (isW(v) ? "👑" : "♛") : (isW(v) ? "⚪" : "⚫");
        if (isQ(v) && isB(v)) cell.style.color = "#111";
        if (sel && sel[0] === r && sel[1] === c) cell.classList.add("sel");
        if (fromSel.some(m => m.to[0] === r && m.to[1] === c)) cell.classList.add("hint-move");
        cell.disabled = over || turn !== "w";
        cell.onclick = () => click(r, c, legal, fromSel);
        boardEl.appendChild(cell);
      }
    }

    function click(r, c, legal, fromSel) {
      if (over || turn !== "w") return;
      const v = board[r][c];
      const target = fromSel.find(m => m.to[0] === r && m.to[1] === c);
      if (target) {
        Feedback.tap();
        const again = applyMove(board, target);
        if (again && target.cap) {
          sel = again; mustJumpFrom = again; render();
          api.setStatus("Weiterspringen!");
          return;
        }
        sel = null; mustJumpFrom = null;
        endTurnCheck("b");
        return;
      }
      if (mustJumpFrom) return; // während Mehrfachsprung nichts anderes wählen
      if (isW(v) && legal.moves.some(m => m.from[0] === r && m.from[1] === c)) {
        sel = [r, c]; render();
      } else { sel = null; render(); }
    }

    function endTurnCheck(nextSide) {
      if (count(board, "b") === 0) { over = true; render(); return endBanner(api, "🎉 Sie gewinnen — alle schwarzen Steine geschlagen!", true); }
      if (count(board, "w") === 0) { over = true; render(); return endBanner(api, "Der Computer gewinnt — Ihre Steine sind geschlagen.", false); }
      const next = allMoves(board, nextSide);
      if (!next.moves.length) {
        over = true; render();
        return endBanner(api,
          nextSide === "b" ? "🎉 Der Computer kann nicht mehr ziehen — Sie gewinnen!"
                           : "Sie können nicht mehr ziehen — der Computer gewinnt.",
          nextSide === "b");
      }
      turn = nextSide; render();
      if (nextSide === "b") { api.setStatus("Der Computer überlegt…"); setTimeout(aiMove, 700); }
      else api.setStatus("Sie sind dran — Weiß ⚪.");
    }

    function evalBoard(b) {
      let s = 0;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const v = b[r][c];
        if (v === P.B) s += 10 + r * 0.3;
        if (v === P.BQ) s += 22;
        if (v === P.W) s -= 10 + (N - 1 - r) * 0.3;
        if (v === P.WQ) s -= 22;
      }
      return s;
    }

    function aiMove() {
      if (over) return;
      const runFullMove = (b, m) => {
        let cur = m;
        while (true) {
          const again = applyMove(b, cur);
          if (!again || !cur.cap) break;
          const more = movesFor(b, again[0], again[1]).jumps;
          if (!more.length) break;
          cur = { from: again, ...more[0] };
        }
      };
      const { moves } = allMoves(board, "b");
      let chosen;
      const d = gDiff();
      if (d === "leicht") chosen = pick(moves);
      else if (d === "mittel") {
        chosen = pick(moves.filter(m => m.cap)) || pick(moves);
      } else {
        let best = -Infinity;
        for (const m of shuffled(moves)) {
          const b2 = board.map(r => r.slice());
          runFullMove(b2, m);
          // Antwort des Spielers (bester Gegenschlag) einrechnen
          const reply = allMoves(b2, "w").moves;
          let worst = Infinity;
          if (!reply.length) worst = evalBoard(b2) + 50;
          for (const rm of reply) {
            const b3 = b2.map(r => r.slice());
            runFullMove(b3, rm);
            worst = Math.min(worst, evalBoard(b3));
          }
          if (worst > best) { best = worst; chosen = m; }
        }
      }
      runFullMove(board, chosen);
      endTurnCheck("w");
    }

    init();
  }

  /* ══════════════ 9) Reaktionsspiel ══════════════ */
  function reactionGame(api) {
    const roundsTotal = 5;
    let round, times, timer, state, goTime;
    const pad = el("button", "reaction-pad");
    api.area.appendChild(pad);
    const best = parseInt(Store.get(`memovia_reaction_best_${userId()}`, "0"), 10);
    if (best) api.area.appendChild(el("div", "setting-sub",
      `Ihre Bestzeit: ${best} ms`)).style.textAlign = "center";

    // KI-Vergleichswert je Schwierigkeit
    const aiAvg = { leicht: 520, mittel: 380, schwer: 270 }[gDiff()];

    function idle() {
      state = "idle";
      pad.className = "reaction-pad";
      pad.innerHTML = `Runde ${round + 1} von ${roundsTotal}<br><span style="font-size:15px;font-weight:500">Zum Starten tippen</span>`;
    }
    function arm() {
      state = "wait";
      pad.className = "reaction-pad wait";
      pad.innerHTML = "Warten…<br><span style='font-size:15px;font-weight:500'>Tippen, sobald es GRÜN wird</span>";
      timer = setTimeout(() => {
        state = "go";
        goTime = performance.now();
        pad.className = "reaction-pad go";
        pad.textContent = "JETZT!";
      }, 1200 + rnd(2300));
    }
    pad.onclick = () => {
      if (state === "idle") { arm(); return; }
      if (state === "wait") {
        clearTimeout(timer);
        Feedback.error();
        pad.className = "reaction-pad";
        pad.innerHTML = "Zu früh!<br><span style='font-size:15px;font-weight:500'>Warten Sie auf Grün — nochmal tippen</span>";
        state = "idle";
        return;
      }
      if (state === "go") {
        const t = Math.round(performance.now() - goTime);
        times.push(t);
        Feedback.success();
        round++;
        if (round >= roundsTotal) {
          const avg = Math.round(times.reduce((a, b) => a + b) / times.length);
          const bestNow = Math.min(...times);
          const prevBest = parseInt(Store.get(`memovia_reaction_best_${userId()}`, "999999"), 10);
          if (bestNow < prevBest) Store.set(`memovia_reaction_best_${userId()}`, bestNow);
          state = "done";
          pad.className = "reaction-pad";
          pad.innerHTML = `Ø ${avg} ms<br><span style="font-size:15px;font-weight:500">Beste Runde: ${bestNow} ms</span>`;
          endBanner(api,
            avg <= aiAvg ? `🎉 Sie schlagen den Computer (Ø ${aiAvg} ms)!`
                         : `Der Computer war mit Ø ${aiAvg} ms schneller.`,
            avg <= aiAvg);
          return;
        }
        pad.className = "reaction-pad";
        pad.innerHTML = `${t} ms<br><span style="font-size:15px;font-weight:500">Weiter — zum Starten tippen</span>`;
        state = "idle";
        api.setStatus(`Runde ${round} von ${roundsTotal} geschafft`);
      }
    };
    api.onCleanup(() => clearTimeout(timer));
    round = 0; times = [];
    idle();
    api.setStatus(`Schlagen Sie den Computer (Ø ${aiAvg} ms)?`);
  }

  /* ══════════════ 10) Schere Stein Papier ══════════════ */
  function rockPaperScissors(api) {
    const OPTS = [["✊", "Stein"], ["✋", "Papier"], ["✌️", "Schere"]];
    let you = 0, ai = 0, over = false;
    const stage = el("div", "rps-stage", "❔&nbsp;&nbsp;&nbsp;❔");
    api.area.appendChild(stage);
    const { row, chips } = scoreRow([["Sie: 0"], ["Computer: 0"]]);
    api.area.appendChild(row);
    const btns = el("div", "rps-row");
    OPTS.forEach(([e, name], i) => {
      const b = el("button", "rps-btn", e);
      b.setAttribute("aria-label", name);
      b.onclick = () => play(i);
      btns.appendChild(b);
    });
    api.area.appendChild(btns);

    function play(i) {
      if (over) return;
      const c = rnd(3);
      stage.innerHTML = `${OPTS[i][0]}&nbsp;&nbsp;⚡&nbsp;&nbsp;${OPTS[c][0]}`;
      if (i === c) { api.setStatus("Unentschieden — gleich nochmal!"); Feedback.tap(); return; }
      const win = (i === 0 && c === 2) || (i === 1 && c === 0) || (i === 2 && c === 1);
      if (win) { you++; Feedback.success(); } else { ai++; Feedback.error(); }
      chips[0].textContent = `Sie: ${you}`;
      chips[1].textContent = `Computer: ${ai}`;
      if (you === 3 || ai === 3) {
        over = true;
        endBanner(api, you === 3 ? `🎉 Sie gewinnen ${you} : ${ai}!` : `Der Computer gewinnt ${ai} : ${you}.`, you === 3);
      } else {
        api.setStatus(win ? `${OPTS[i][1]} gewinnt die Runde!` : `${OPTS[c][1]} des Computers gewinnt.`);
      }
    }
    api.setStatus("Best of 5 — wählen Sie!");
  }

  return { list, renderGrid, open, close,
           helpers: { gDiff, scoreRow, endBanner } };
})();
