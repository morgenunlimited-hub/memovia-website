/* ═══════════════════════════════════════════════════════════════
   Memovia Web — Spiele (Teil 3)
   Wortsuche · Schiffe versenken · Würfelpoker · Mühle
   (erweitert das Games2-Objekt)
   ═══════════════════════════════════════════════════════════════ */
"use strict";

(() => {
  const gDiff = () => App.settings.gameDifficulty;
  const { rnd, pick, shuffled } = Generator;
  const { endBanner, scoreRow, fillZone, fitIn } = Games.helpers;

  /* ══════════════ 15) Wortsuche ══════════════ */
  function wordSearch(api) {
    const SIZE = gDiff() === "schwer" ? 12 : 10;
    const wordCount = { leicht: 5, mittel: 6, schwer: 8 }[gDiff()];
    let grid, words, foundWords, selStart, selCells, over;

    const themeName = el("div", "setting-h");
    themeName.style.marginTop = "0";
    api.area.appendChild(themeName);
    const wordList = el("div", "ws-words");
    api.area.appendChild(wordList);
    const gridEl = el("div", "ws-grid");
    gridEl.style.gridTemplateColumns = `repeat(${SIZE}, 1fr)`;
    fitIn(api, fillZone(api), gridEl, 1);

    const DIRS = [[0,1],[1,0],[1,1],[1,-1],[0,-1],[-1,0],[-1,-1],[-1,1]];
    const easyDirs = [[0,1],[1,0]];

    function newGame() {
      const [tName, tWords] = pick(MEMOVIA_DATA.wordSearchThemes);
      const pool = tWords.filter(w => w.length <= SIZE);
      words = shuffled(pool).slice(0, wordCount).map(w => w.toUpperCase());
      grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(""));
      const dirs = gDiff() === "leicht" ? easyDirs : DIRS.slice(0, gDiff() === "mittel" ? 4 : 8);
      const placedWords = [];
      for (const w of words) {
        let done = false;
        for (let t = 0; t < 300 && !done; t++) {
          const [dr, dc] = pick(dirs);
          const r0 = rnd(SIZE), c0 = rnd(SIZE);
          const rEnd = r0 + dr * (w.length - 1), cEnd = c0 + dc * (w.length - 1);
          if (rEnd < 0 || rEnd >= SIZE || cEnd < 0 || cEnd >= SIZE) continue;
          let ok = true;
          for (let i = 0; i < w.length; i++) {
            const ch = grid[r0 + dr * i][c0 + dc * i];
            if (ch && ch !== w[i]) { ok = false; break; }
          }
          if (!ok) continue;
          for (let i = 0; i < w.length; i++) grid[r0 + dr * i][c0 + dc * i] = w[i];
          placedWords.push(w);
          done = true;
        }
      }
      words = placedWords;
      const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++)
        if (!grid[r][c]) grid[r][c] = ABC[rnd(26)];
      foundWords = new Set(); selStart = null; selCells = []; over = false;
      themeName.textContent = `Thema: ${tName}`;
      render();
      api.setStatus(`Finden Sie ${words.length} Wörter — erst Anfang, dann Ende antippen.`);
    }

    const lineCells = (a, b) => {
      const dr = Math.sign(b[0] - a[0]), dc = Math.sign(b[1] - a[1]);
      const len = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) + 1;
      if (dr !== 0 && dc !== 0 && Math.abs(b[0] - a[0]) !== Math.abs(b[1] - a[1])) return null;
      if (dr === 0 && dc === 0) return [a];
      const out = [];
      for (let i = 0; i < len; i++) out.push([a[0] + dr * i, a[1] + dc * i]);
      return out;
    };

    function render() {
      wordList.innerHTML = "";
      words.forEach(w => {
        wordList.appendChild(el("span",
          "ws-word" + (foundWords.has(w) ? " found" : ""), esc(w)));
      });
      gridEl.innerHTML = "";
      const inSel = (r, c) => selCells.some(([rr, cc]) => rr === r && cc === c);
      for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
        const cell = el("button", "ws-cell"
          + (inSel(r, c) ? " sel" : "")
          + (gridMark[r][c] ? " found" : ""), grid[r][c]);
        cell.disabled = over;
        cell.onclick = () => tap(r, c);
        gridEl.appendChild(cell);
      }
    }

    let gridMark;
    function initMark() {
      gridMark = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
    }

    function tap(r, c) {
      if (over) return;
      if (!selStart) {
        selStart = [r, c]; selCells = [[r, c]];
        Feedback.tap(); render(); return;
      }
      const cells = lineCells(selStart, [r, c]);
      if (!cells) {
        selStart = [r, c]; selCells = [[r, c]];
        Feedback.tap(); render(); return;
      }
      const text = cells.map(([rr, cc]) => grid[rr][cc]).join("");
      const rev = [...text].reverse().join("");
      const hit = words.find(w => (w === text || w === rev) && !foundWords.has(w));
      if (hit) {
        foundWords.add(hit);
        cells.forEach(([rr, cc]) => { gridMark[rr][cc] = true; });
        Feedback.success();
        selStart = null; selCells = [];
        if (foundWords.size === words.length) {
          over = true; render();
          endBanner(api, "🎉 Alle Wörter gefunden!", true);
          return;
        }
        render();
        api.setStatus(`${foundWords.size} von ${words.length} gefunden.`);
      } else {
        selStart = null; selCells = [];
        Feedback.error();
        render();
        api.setStatus("Das war kein gesuchtes Wort — neuer Versuch.");
      }
    }

    initMark();
    newGame();
  }

  /* ══════════════ 16) Schiffe versenken ══════════════ */
  function battleship(api) {
    const N = 8;
    const FLEET = [4, 3, 3, 2, 2];
    let aiBoard, myBoard, aiShots, myShots, over, turn;
    let aiHuntQueue;

    const label1 = el("div", "setting-h", "Gegnerisches Meer — hier schießen Sie");
    label1.style.marginTop = "0";
    api.area.appendChild(label1);
    const enemyEl = el("div", "bs-grid");
    enemyEl.style.gridTemplateColumns = `repeat(${N}, 1fr)`;
    fitIn(api, fillZone(api), enemyEl, 1);
    const label2 = el("div", "setting-h", "Ihre Flotte");
    api.area.appendChild(label2);
    const mineEl = el("div", "bs-grid");
    mineEl.style.gridTemplateColumns = `repeat(${N}, 1fr)`;
    fitIn(api, fillZone(api), mineEl, 1);

    const emptyBoard = () => Array.from({ length: N }, () => Array(N).fill(0)); // 0 Wasser, >0 Schiffs-Id
    const emptyShots = () => Array.from({ length: N }, () => Array(N).fill(null)); // null | "miss" | "hit"

    function placeFleet() {
      const b = emptyBoard();
      FLEET.forEach((len, idx) => {
        const id = idx + 1;
        let done = false;
        while (!done) {
          const horiz = Math.random() < 0.5;
          const r = rnd(N - (horiz ? 0 : len - 1));
          const c = rnd(N - (horiz ? len - 1 : 0));
          let ok = true;
          for (let i = 0; i < len; i++) {
            const rr = r + (horiz ? 0 : i), cc = c + (horiz ? i : 0);
            // Abstand: auch Nachbarn frei
            for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
              const ar = rr + dr, ac = cc + dc;
              if (ar >= 0 && ar < N && ac >= 0 && ac < N && b[ar][ac]) ok = false;
            }
          }
          if (!ok) continue;
          for (let i = 0; i < len; i++)
            b[r + (horiz ? 0 : i)][c + (horiz ? i : 0)] = id;
          done = true;
        }
      });
      return b;
    }

    const shipCells = (b, id) => {
      const out = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++)
        if (b[r][c] === id) out.push([r, c]);
      return out;
    };
    const sunk = (b, shots, id) =>
      shipCells(b, id).every(([r, c]) => shots[r][c] === "hit");
    const allSunk = (b, shots) =>
      FLEET.every((_, i) => sunk(b, shots, i + 1));

    function render() {
      enemyEl.innerHTML = "";
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const s = myShots[r][c];
        const cell = el("button", "bs-cell" + (s === "hit" ? " hit" : s === "miss" ? " miss" : ""),
          s === "hit" ? "✸" : s === "miss" ? "•" : "");
        cell.disabled = over || turn !== "you" || s !== null;
        cell.onclick = () => shoot(r, c);
        enemyEl.appendChild(cell);
      }
      mineEl.innerHTML = "";
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const s = aiShots[r][c];
        const hasShip = myBoard[r][c] > 0;
        const cell = el("div", "bs-cell mine"
          + (hasShip ? " ship" : "")
          + (s === "hit" ? " hit" : s === "miss" ? " miss" : ""));
        cell.textContent = s === "hit" ? "✸" : s === "miss" ? "•" : hasShip ? "▮" : "";
        mineEl.appendChild(cell);
      }
    }

    function shoot(r, c) {
      if (over || turn !== "you" || myShots[r][c]) return;
      const hit = aiBoard[r][c] > 0;
      myShots[r][c] = hit ? "hit" : "miss";
      if (hit) {
        Feedback.success();
        const id = aiBoard[r][c];
        if (sunk(aiBoard, myShots, id)) api.setStatus("💥 Versenkt! Sie dürfen weiter schießen.");
        else api.setStatus("Treffer! Sie dürfen gleich nochmal.");
        if (allSunk(aiBoard, myShots)) {
          over = true; render();
          endBanner(api, "🎉 Sie haben die ganze Flotte versenkt — gewonnen!", true);
          return;
        }
        render();
        return; // Treffer = nochmal
      }
      Feedback.tap();
      api.setStatus("Wasser — der Computer ist dran…");
      turn = "ai"; render();
      setTimeout(aiTurn, 800);
    }

    function aiPickTarget() {
      const d = gDiff();
      // Ziel-Modus: Nachbarn getroffener Zellen
      while (aiHuntQueue.length) {
        const [r, c] = aiHuntQueue.shift();
        if (r >= 0 && r < N && c >= 0 && c < N && aiShots[r][c] === null) return [r, c];
      }
      // Jagd-Modus
      const candidates = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++)
        if (aiShots[r][c] === null) candidates.push([r, c]);
      if (d === "schwer") {
        // Schachbrettmuster bevorzugen
        const parity = candidates.filter(([r, c]) => (r + c) % 2 === 0);
        return pick(parity.length ? parity : candidates);
      }
      return pick(candidates);
    }

    function aiTurn() {
      if (over) return;
      const [r, c] = aiPickTarget();
      const hit = myBoard[r][c] > 0;
      aiShots[r][c] = hit ? "hit" : "miss";
      if (hit) {
        const d = gDiff();
        if (d !== "leicht") {
          aiHuntQueue.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
        }
        if (allSunk(myBoard, aiShots)) {
          over = true; render();
          endBanner(api, "Der Computer hat Ihre Flotte versenkt.", false);
          return;
        }
        render();
        setTimeout(aiTurn, 700); // Treffer = Computer nochmal
        return;
      }
      turn = "you"; render();
      api.setStatus("Sie sind dran — tippen Sie ins gegnerische Meer.");
    }

    aiBoard = placeFleet();
    myBoard = placeFleet();
    aiShots = emptyShots();
    myShots = emptyShots();
    aiHuntQueue = [];
    over = false; turn = "you";
    render();
    api.setStatus("Sie beginnen — tippen Sie ins gegnerische Meer.");
  }

  /* ══════════════ 17) Würfelpoker (Kniffel) ══════════════ */
  function kniffel(api) {
    const CATS = [
      { id: "einser", name: "Einser", calc: (d) => sumOf(d, 1) },
      { id: "zweier", name: "Zweier", calc: (d) => sumOf(d, 2) },
      { id: "dreier", name: "Dreier", calc: (d) => sumOf(d, 3) },
      { id: "vierer", name: "Vierer", calc: (d) => sumOf(d, 4) },
      { id: "fuenfer", name: "Fünfer", calc: (d) => sumOf(d, 5) },
      { id: "sechser", name: "Sechser", calc: (d) => sumOf(d, 6) },
      { id: "dreierpasch", name: "Dreierpasch", calc: (d) => hasN(d, 3) ? total(d) : 0 },
      { id: "viererpasch", name: "Viererpasch", calc: (d) => hasN(d, 4) ? total(d) : 0 },
      { id: "fullhouse", name: "Full House", calc: (d) => isFullHouse(d) ? 25 : 0 },
      { id: "kleine", name: "Kleine Straße", calc: (d) => hasStraight(d, 4) ? 30 : 0 },
      { id: "grosse", name: "Große Straße", calc: (d) => hasStraight(d, 5) ? 40 : 0 },
      { id: "kniffel", name: "Kniffel", calc: (d) => hasN(d, 5) ? 50 : 0 },
      { id: "chance", name: "Chance", calc: (d) => total(d) },
    ];
    const sumOf = (d, v) => d.filter(x => x === v).length * v;
    const total = (d) => d.reduce((a, b) => a + b, 0);
    const counts = (d) => { const c = {}; d.forEach(x => c[x] = (c[x] || 0) + 1); return c; };
    const hasN = (d, n) => Object.values(counts(d)).some(v => v >= n);
    const isFullHouse = (d) => {
      const v = Object.values(counts(d)).sort();
      return (v.length === 2 && v[0] === 2 && v[1] === 3) || v[0] === 5;
    };
    const hasStraight = (d, len) => {
      const u = [...new Set(d)].sort();
      let run = 1, best = 1;
      for (let i = 1; i < u.length; i++) {
        run = u[i] === u[i - 1] + 1 ? run + 1 : 1;
        best = Math.max(best, run);
      }
      return best >= len;
    };

    let dice, held, rollsLeft, mySheet, aiSheet, over, phase;

    const diceRow = el("div", "dice-row");
    api.area.appendChild(diceRow);
    const rollBtn = el("button", "btn-accent", "🎲 Würfeln");
    rollBtn.style.alignSelf = "center";
    api.area.appendChild(rollBtn);
    const table = el("div", "glass score-table g-scroll");
    api.area.appendChild(table);

    const FACES = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

    function newGame() {
      dice = [0, 0, 0, 0, 0]; held = [false, false, false, false, false];
      rollsLeft = 3;
      mySheet = {}; aiSheet = {};
      over = false; phase = "roll";
      renderDice(); renderTable();
      api.setStatus("Würfeln Sie! Bis zu 3 Würfe pro Runde.");
    }

    function renderDice() {
      diceRow.innerHTML = "";
      dice.forEach((v, i) => {
        const b = el("button", "die" + (held[i] ? " held" : ""), v ? FACES[v] : "🎲");
        b.disabled = over || phase !== "roll" || v === 0 || rollsLeft === 3;
        b.onclick = () => { held[i] = !held[i]; Feedback.tap(); renderDice(); };
        diceRow.appendChild(b);
      });
      rollBtn.disabled = over || phase !== "roll" || rollsLeft === 0;
      rollBtn.textContent = rollsLeft > 0 ? `🎲 Würfeln (noch ${rollsLeft})` : "Kategorie wählen ↓";
    }

    function renderTable() {
      const upperMy = CATS.slice(0, 6).reduce((s, c) => s + (mySheet[c.id] ?? 0), 0);
      const upperAi = CATS.slice(0, 6).reduce((s, c) => s + (aiSheet[c.id] ?? 0), 0);
      const bonusMy = upperMy >= 63 ? 35 : 0;
      const bonusAi = upperAi >= 63 ? 35 : 0;
      const totalMy = CATS.reduce((s, c) => s + (mySheet[c.id] ?? 0), 0) + bonusMy;
      const totalAi = CATS.reduce((s, c) => s + (aiSheet[c.id] ?? 0), 0) + bonusAi;

      table.innerHTML = `<div class="st-row st-head">
        <span></span><span>Sie</span><span>PC</span></div>`;
      CATS.forEach(c => {
        const mine = mySheet[c.id];
        const canPick = !over && phase === "roll" && rollsLeft < 3 && mine === undefined;
        const row = el("div", "st-row" + (canPick ? " pickable" : ""));
        const preview = canPick ? c.calc(dice) : null;
        row.innerHTML = `<span>${esc(c.name)}</span>
          <span class="${mine === undefined ? "st-dim" : ""}">${mine !== undefined ? mine : (canPick ? "→ " + preview : "–")}</span>
          <span>${aiSheet[c.id] !== undefined ? aiSheet[c.id] : "–"}</span>`;
        if (canPick) row.onclick = () => choose(c);
        table.appendChild(row);
      });
      table.appendChild(el("div", "st-row st-total",
        `<span>Gesamt ${bonusMy || bonusAi ? "(inkl. Bonus)" : ""}</span><span>${totalMy}</span><span>${totalAi}</span>`));
      return { totalMy, totalAi };
    }

    rollBtn.onclick = () => {
      if (over || rollsLeft === 0) return;
      dice = dice.map((v, i) => (held[i] && v ? v : rnd(6) + 1));
      rollsLeft--;
      Feedback.tap();
      renderDice(); renderTable();
      api.setStatus(rollsLeft > 0
        ? "Würfel antippen zum Behalten — oder nochmal würfeln."
        : "Wählen Sie unten eine Kategorie.");
    };

    function choose(cat) {
      mySheet[cat.id] = cat.calc(dice);
      Feedback.tap();
      phase = "ai";
      renderDice(); renderTable();
      api.setStatus("Der Computer würfelt…");
      setTimeout(aiRound, 900);
    }

    function aiRound() {
      // KI: 3 Würfe, behält die häufigste Zahl; wählt beste offene Kategorie
      let d = Array.from({ length: 5 }, () => rnd(6) + 1);
      const rerolls = gDiff() === "leicht" ? 1 : 2;
      for (let t = 0; t < rerolls; t++) {
        const c = counts(d);
        const best = +Object.entries(c).sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
        d = d.map(x => (x === best ? x : rnd(6) + 1));
      }
      const open = CATS.filter(c => aiSheet[c.id] === undefined);
      let bestCat = open[0], bestVal = -1;
      for (const c of open) {
        const v = c.calc(d);
        const weighted = v + (["kniffel","grosse","kleine","fullhouse"].includes(c.id) && v > 0 ? 8 : 0);
        if (weighted > bestVal) { bestVal = weighted; bestCat = c; }
      }
      if (gDiff() === "leicht" && Math.random() < 0.35) bestCat = pick(open);
      aiSheet[bestCat.id] = bestCat.calc(d);

      const filled = CATS.every(c => mySheet[c.id] !== undefined);
      if (filled) {
        over = true;
        const { totalMy, totalAi } = renderTable();
        renderDice();
        endBanner(api,
          totalMy > totalAi ? `🎉 Sie gewinnen ${totalMy} : ${totalAi}!`
          : totalMy < totalAi ? `Der Computer gewinnt ${totalAi} : ${totalMy}.`
          : `Unentschieden ${totalMy} : ${totalAi}.`,
          totalMy > totalAi ? true : totalMy < totalAi ? false : null);
        return;
      }
      // nächste Runde
      dice = [0, 0, 0, 0, 0]; held = [false, false, false, false, false];
      rollsLeft = 3; phase = "roll";
      renderDice(); renderTable();
      api.setStatus("Ihre Runde — würfeln Sie!");
    }

    newGame();
  }

  /* ══════════════ 18) Mühle ══════════════ */
  function muehle(api) {
    // 24 Punkte, Standard-Adjazenzen und Mühlen-Linien
    const POS = [
      [0,0],[3,0],[6,0], [1,1],[3,1],[5,1], [2,2],[3,2],[4,2],
      [0,3],[1,3],[2,3], [4,3],[5,3],[6,3],
      [2,4],[3,4],[4,4], [1,5],[3,5],[5,5], [0,6],[3,6],[6,6],
    ];
    const ADJ = [
      [1,9],[0,2,4],[1,14],[4,10],[1,3,5,7],[4,13],[7,11],[4,6,8],[7,12],
      [0,10,21],[3,9,11,18],[6,10,15],[8,13,17],[5,12,14,20],[2,13,23],
      [11,16],[15,17,19],[12,16],[10,19],[16,18,20,22],[13,19],[9,22],[19,21,23],[14,22],
    ];
    const MILLS = [
      [0,1,2],[3,4,5],[6,7,8],[9,10,11],[12,13,14],[15,16,17],[18,19,20],[21,22,23],
      [0,9,21],[3,10,18],[6,11,15],[1,4,7],[16,19,22],[8,12,17],[5,13,20],[2,14,23],
    ];

    let board, phasePlaced, turn, removing, sel, over, mode;

    const modeRow = el("div", "game-controls");
    const btnPC = el("button", "pill-btn", "🤖 Gegen den Computer");
    const btn2P = el("button", "pill-btn", "👥 Zu zweit");
    modeRow.appendChild(btnPC); modeRow.appendChild(btn2P);
    api.area.appendChild(modeRow);
    const svgWrap = el("div", "g-grow g-svghost");
    api.area.appendChild(svgWrap);

    const other = (p) => (p === 1 ? 2 : 1);
    const stones = (p) => board.filter(v => v === p).length;
    const inMill = (i, b = board) =>
      MILLS.some(m => m.includes(i) && m.every(x => b[x] === b[i] && b[i] !== 0));
    const placingDone = () => phasePlaced[1] >= 9 && phasePlaced[2] >= 9;
    const canFly = (p) => stones(p) === 3 && placingDone();

    function legalMoves(p, b = board) {
      const out = [];
      if (phasePlaced[p] < 9) {
        b.forEach((v, i) => { if (!v) out.push({ place: i }); });
        return out;
      }
      b.forEach((v, i) => {
        if (v !== p) return;
        const targets = canFly(p)
          ? b.map((x, j) => (!x ? j : -1)).filter(j => j >= 0)
          : ADJ[i].filter(j => !b[j]);
        targets.forEach(j => out.push({ from: i, to: j }));
      });
      return out;
    }
    const removable = (p) => {
      const opp = board.map((v, i) => (v === p ? i : -1)).filter(i => i >= 0);
      const noMill = opp.filter(i => !inMill(i));
      return noMill.length ? noMill : opp;
    };

    function name(p) {
      if (mode === "2p") return p === 1 ? "Weiß ⚪" : "Schwarz ⚫";
      return p === 1 ? "Sie (⚪)" : "der Computer (⚫)";
    }

    function statusText() {
      if (over) return;
      if (removing) api.setStatus(`Mühle! ${name(turn)} ${turn === 1 || mode === "2p" ? "darf" : "darf"} einen gegnerischen Stein entfernen.`);
      else if (phasePlaced[turn] < 9) api.setStatus(`${name(turn)} setzt einen Stein (${9 - phasePlaced[turn]} übrig).`);
      else api.setStatus(`${name(turn)} zieht${canFly(turn) ? " — Springen erlaubt!" : ""}.`);
    }

    function render() {
      const S = 60, PAD = 30;
      let inner = "";
      // Linien: aus MILLS die geraden Verbindungen
      const seen = new Set();
      MILLS.forEach(([a, b2, c]) => {
        const key = `${a}-${c}`;
        if (seen.has(key)) return;
        seen.add(key);
        inner += `<line x1="${PAD + POS[a][0] * S}" y1="${PAD + POS[a][1] * S}"
          x2="${PAD + POS[c][0] * S}" y2="${PAD + POS[c][1] * S}"
          stroke="rgba(255,255,255,0.35)" stroke-width="3"/>`;
      });
      POS.forEach(([x, y], i) => {
        const cx = PAD + x * S, cy = PAD + y * S;
        const v = board[i];
        const isSel = sel === i;
        let fill = "rgba(255,255,255,0.25)", r = 8, stroke = "none";
        if (v === 1) { fill = "#F2EFE8"; r = 15; stroke = "rgba(0,0,0,0.35)"; }
        if (v === 2) { fill = "#20242C"; r = 15; stroke = "rgba(255,255,255,0.5)"; }
        if (isSel) stroke = "#D4A117";
        inner += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"
          stroke="${stroke}" stroke-width="3" data-i="${i}" style="cursor:pointer"/>`;
      });
      svgWrap.innerHTML = `<svg class="os-svg" viewBox="0 0 ${PAD * 2 + 6 * S} ${PAD * 2 + 6 * S}">${inner}</svg>`;
      svgWrap.querySelectorAll("circle[data-i]").forEach(c =>
        c.addEventListener("click", () => tap(parseInt(c.dataset.i, 10))));
      statusText();
    }

    function finishIfOver() {
      for (const p of [1, 2]) {
        const lost = (placingDone() && stones(p) < 3) ||
          (phasePlaced[p] >= 9 && placingDone() && !legalMoves(p).length && turn === p);
        if (lost) {
          over = true;
          const winner = other(p);
          const youWin = mode === "2p" ? null : winner === 1;
          endBanner(api, mode === "2p"
            ? `🎉 ${name(winner)} gewinnt!`
            : winner === 1 ? "🎉 Sie gewinnen!" : "Der Computer gewinnt.",
            youWin);
          return true;
        }
      }
      return false;
    }

    function doMove(m, p) {
      let milled = false;
      if (m.place !== undefined) {
        board[m.place] = p;
        phasePlaced[p]++;
        milled = inMill(m.place);
      } else {
        board[m.from] = 0;
        board[m.to] = p;
        milled = inMill(m.to);
      }
      Feedback.tap();
      if (milled) {
        removing = true;
        render();
        if (mode === "pc" && p === 2) setTimeout(aiRemove, 700);
        return;
      }
      nextTurn();
    }

    function nextTurn() {
      removing = false; sel = null;
      turn = other(turn);
      render();
      if (finishIfOver()) return;
      if (mode === "pc" && turn === 2) setTimeout(aiMove, 750);
    }

    function tap(i) {
      if (over) return;
      if (mode === "pc" && turn === 2) return;
      if (removing) {
        if (board[i] === other(turn) && removable(other(turn)).includes(i)) {
          board[i] = 0;
          Feedback.success();
          nextTurn();
        }
        return;
      }
      if (phasePlaced[turn] < 9) {
        if (!board[i]) doMove({ place: i }, turn);
        return;
      }
      if (board[i] === turn) { sel = i; render(); return; }
      if (sel !== null && !board[i]) {
        const legal = legalMoves(turn).some(m => m.from === sel && m.to === i);
        if (legal) { const from = sel; sel = null; doMove({ from, to: i }, turn); }
      }
    }

    /* KI */
    function aiMove() {
      if (over || turn !== 2) return;
      const moves = legalMoves(2);
      if (!moves.length) { finishIfOver(); return; }
      const makesMill = (m, p) => {
        const b = board.slice();
        if (m.place !== undefined) b[m.place] = p;
        else { b[m.from] = 0; b[m.to] = p; }
        const spot = m.place !== undefined ? m.place : m.to;
        return MILLS.some(mm => mm.includes(spot) && mm.every(x => b[x] === p));
      };
      let m;
      const d = gDiff();
      const myMill = moves.find(x => makesMill(x, 2));
      // blockiere gegnerische Mühle
      const oppMoves = legalMoves(1);
      const oppMillSpot = oppMoves.find(x => makesMill(x, 1));
      const blocker = oppMillSpot
        ? moves.find(x => (x.place ?? x.to) === (oppMillSpot.place ?? oppMillSpot.to))
        : null;
      if (d === "leicht") m = myMill && Math.random() < 0.5 ? myMill : pick(moves);
      else if (d === "mittel") m = myMill || blocker || pick(moves);
      else {
        m = myMill || blocker;
        if (!m) {
          // Zug wählen, der künftige Mühle vorbereitet (2 eigene + 1 frei)
          const prep = moves.filter(x => {
            const b = board.slice();
            if (x.place !== undefined) b[x.place] = 2;
            else { b[x.from] = 0; b[x.to] = 2; }
            return MILLS.some(mm => {
              const vals = mm.map(p => b[p]);
              return vals.filter(v => v === 2).length === 2 && vals.includes(0);
            });
          });
          m = pick(prep.length ? prep : moves);
        }
      }
      doMove(m, 2);
    }
    function aiRemove() {
      if (over || !removing) return;
      const opts = removable(1);
      // schwer: Stein entfernen, der Teil einer fast fertigen Mühle des Spielers ist
      let target = pick(opts);
      if (gDiff() === "schwer") {
        const scored = opts.map(i => {
          const danger = MILLS.filter(mm => mm.includes(i) &&
            mm.filter(x => board[x] === 1).length === 2).length;
          return { i, danger };
        }).sort((a, b) => b.danger - a.danger);
        target = scored[0].i;
      }
      board[target] = 0;
      Feedback.error();
      nextTurn();
    }

    function start(m) {
      mode = m;
      board = Array(24).fill(0);
      phasePlaced = { 1: 0, 2: 0 };
      turn = 1; removing = false; sel = null; over = false;
      btnPC.classList.toggle("btn-accent", m === "pc");
      btn2P.classList.toggle("btn-accent", m === "2p");
      render();
    }
    btnPC.onclick = () => start("pc");
    btn2P.onclick = () => start("2p");
    start("pc");
  }


  /* ══════════════ 19) Uhr stellen ══════════════ */
  function uhrStellen(api) {
    const RUNDEN = 8;
    let totalMin, zielStunde, zielMinute, aufgabe, runde, richtig,
        fehlversuch, geloest, fertig, letzterWinkel = null;

    const kopf = el("div", "gm-task");
    api.area.appendChild(kopf);
    const hz = fillZone(api);
    const svgWrap = el("div", "g-grow g-svghost");
    hz.appendChild(svgWrap);
    const fb = el("div", "gm-feedback");
    api.area.appendChild(fb);
    const stellRow = el("div", "stell-grid");
    [["−1 Std.", -60], ["+1 Std.", 60], ["−5 Min.", -5], ["+5 Min.", 5]].forEach(([t, m]) => {
      const b = el("button", "pill-btn", t);
      b.onclick = () => { drehen(m); render(); };
      stellRow.appendChild(b);
    });
    api.area.appendChild(stellRow);
    const check = el("button", "btn-accent", "✓ Prüfen");
    check.style.alignSelf = "center";
    check.style.minWidth = "220px";
    check.onclick = () => { if (fertig) { neuesSpiel(); } else if (geloest) naechsteRunde(); else pruefen(); };
    api.area.appendChild(check);

    const minute = () => ((totalMin % 60) + 60) % 60;
    const NAMEN = ["", "eins", "zwei", "drei", "vier", "fünf", "sechs",
      "sieben", "acht", "neun", "zehn", "elf", "zwölf"];
    function zeitInWorten(st, mi) {
      const h = NAMEN[st], hP = NAMEN[st % 12 + 1];
      switch (mi) {
        case 0: return st === 1 ? "ein Uhr" : `${h} Uhr`;
        case 5: return `fünf nach ${h}`;
        case 10: return `zehn nach ${h}`;
        case 15: return `Viertel nach ${h}`;
        case 20: return `zwanzig nach ${h}`;
        case 25: return `fünf vor halb ${hP}`;
        case 30: return `halb ${hP}`;
        case 35: return `fünf nach halb ${hP}`;
        case 40: return `zwanzig vor ${hP}`;
        case 45: return `Viertel vor ${hP}`;
        case 50: return `zehn vor ${hP}`;
        case 55: return `fünf vor ${hP}`;
        default: return `${h} Uhr ${mi}`;
      }
    }

    function setFb(text, cls) { fb.textContent = text; fb.className = "gm-feedback" + (cls ? " " + cls : ""); }

    function render() {
      api.setStatus(`Runde ${Math.min(runde, RUNDEN)} von ${RUNDEN} · ${richtig} richtig`);
      kopf.innerHTML = fertig
        ? `<b>Alle Runden geschafft! 🎉</b><br>${richtig} von ${RUNDEN} Uhrzeiten richtig gestellt`
        : `Stellen Sie die Uhr auf:<br><b class="gm-big">${esc(aufgabe)}</b>
           <button class="icon-btn gm-say" aria-label="Vorlesen">🔊</button>`;
      const say = kopf.querySelector(".gm-say");
      if (say) say.onclick = () => Speech.speak(`Stellen Sie die Uhr auf ${aufgabe}.`);
      check.textContent = fertig ? "↺ Neues Spiel" : geloest ? "Weiter →" : "✓ Prüfen";
      stellRow.style.visibility = fertig ? "hidden" : "visible";
      stellRow.querySelectorAll("button").forEach(b => { b.disabled = geloest || fertig; });

      const stundenW = (((totalMin % 720) + 720) % 720) / 720 * 360;
      const minutenW = minute() * 6;
      let ticks = "";
      for (let m = 0; m < 60; m++) {
        const h5 = m % 5 === 0;
        ticks += `<g transform="rotate(${m * 6} 100 100)">
          <line x1="100" y1="6" x2="100" y2="${h5 ? 15 : 11}"
            stroke="rgba(255,255,255,${h5 ? 0.9 : 0.35})" stroke-width="${h5 ? 3 : 1.5}"
            stroke-linecap="round"/></g>`;
      }
      let zahlen = "";
      for (let h = 1; h <= 12; h++) {
        const a = h / 12 * 2 * Math.PI;
        const x = 100 + Math.sin(a) * 75, y = 100 - Math.cos(a) * 75;
        zahlen += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle"
          dominant-baseline="central" font-size="19" font-weight="bold" fill="#fff">${h}</text>`;
      }
      svgWrap.innerHTML = `<svg class="os-svg clock-svg" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="96" fill="rgba(255,255,255,0.08)"
          stroke="rgba(255,255,255,0.35)" stroke-width="3"/>
        ${ticks}${zahlen}
        <g transform="rotate(${stundenW.toFixed(2)} 100 100)">
          <line x1="100" y1="100" x2="100" y2="56" stroke="#D4A117"
            stroke-width="7" stroke-linecap="round"/></g>
        <g transform="rotate(${minutenW} 100 100)">
          <line x1="100" y1="100" x2="100" y2="32" stroke="#fff"
            stroke-width="3.6" stroke-linecap="round"/></g>
        <circle cx="100" cy="100" r="5.5" fill="#D4A117"/>
      </svg>`;
      bindDrag(svgWrap.querySelector("svg"));
    }

    function drehen(min) {
      if (geloest || fertig) return;
      totalMin = (((totalMin + min) % 720) + 720) % 720;
      Feedback.tap();
      if (!fb.textContent.startsWith("Noch nicht")) setFb("Kleiner Zeiger: Stunden · Großer Zeiger: Minuten", "dim");
    }

    function bindDrag(svg) {
      let active = false;
      const winkelAus = (e) => {
        const r = svg.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        if (dx * dx + dy * dy < (r.width * 0.06) ** 2) return null;
        let w = Math.atan2(dx, -dy) * 180 / Math.PI;
        if (w < 0) w += 360;
        return w;
      };
      svg.addEventListener("pointerdown", (e) => {
        if (geloest || fertig) return;
        active = true;
        try { svg.setPointerCapture(e.pointerId); } catch {}
        letzterWinkel = winkelAus(e);
      });
      svg.addEventListener("pointermove", (e) => {
        if (!active || geloest || fertig) return;
        const w = winkelAus(e);
        if (w === null) return;
        if (letzterWinkel !== null) {
          let delta = w - letzterWinkel;
          if (delta > 180) delta -= 360;
          if (delta < -180) delta += 360;
          const md = Math.round(delta / 6);
          if (md !== 0) {
            totalMin = (((totalMin + md) % 720) + 720) % 720;
            letzterWinkel = w;
            render();
          }
        } else letzterWinkel = w;
      });
      const ende = () => {
        if (!active) return;
        active = false;
        letzterWinkel = null;
        totalMin = ((Math.round(totalMin / 5) * 5) % 720 + 720) % 720;
        render();
      };
      svg.addEventListener("pointerup", ende);
      svg.addEventListener("pointercancel", ende);
    }

    function pruefen() {
      const ziel = (zielStunde % 12) * 60 + zielMinute;
      if (((totalMin % 720) + 720) % 720 === ziel) {
        richtig++; geloest = true;
        Feedback.success();
        setFb("Richtig! Sehr gut.", "ok");
      } else {
        fehlversuch++;
        if (fehlversuch >= 2) {
          totalMin = ziel; geloest = true;
          Feedback.tap();
          setFb(`So wäre es richtig: ${aufgabe}.`, "");
        } else {
          Feedback.error();
          setFb("Noch nicht ganz — schauen Sie noch einmal.", "warn");
        }
      }
      render();
    }
    function naechsteRunde() {
      if (runde >= RUNDEN) {
        fertig = true;
        endBanner(api, `${richtig} von ${RUNDEN} Uhrzeiten richtig gestellt`,
          richtig >= 6 ? true : richtig >= 4 ? null : false);
        render();
        return;
      }
      runde++; neueAufgabe(); render();
    }
    function neueAufgabe() {
      geloest = false; fehlversuch = 0;
      setFb("Kleiner Zeiger: Stunden · Großer Zeiger: Minuten", "dim");
      const altS = zielStunde, altM = zielMinute;
      let s = rnd(12) + 1;
      const d = gDiff();
      const m = d === "leicht" ? 0 : d === "mittel" ? pick([0, 15, 30, 45]) : rnd(12) * 5;
      if (s === altS && m === altM) s = s % 12 + 1;
      zielStunde = s; zielMinute = m;
      aufgabe = zeitInWorten(s, m);
      let start = rnd(144) * 5;
      if (start === (s % 12) * 60 + m) start = (start + 60) % 720;
      totalMin = start;
    }
    function neuesSpiel() { runde = 1; richtig = 0; fertig = false; neueAufgabe(); render(); api.setStatus(`Runde 1 von ${RUNDEN} · 0 richtig`); }

    runde = 1; richtig = 0; fertig = false;
    zielStunde = 0; zielMinute = -1;
    neueAufgabe(); render();
  }

  /* ══════════════ 20) Geld zählen ══════════════ */
  function geldZaehlen(api) {
    const RUNDEN = 8, MAX = 14;
    let kasse, zielCent, aufgabe, runde, richtig, fehlversuch,
        geloest, fertig, istRueckgeld;

    const stage = () => parseInt(localStorage.getItem("memovia_dementia_stage") || "0", 10);
    const palette = () => {
      const d = gDiff();
      if (d === "leicht") return [200, 100];
      if (d === "mittel") return [200, 100, 50, 20, 10];
      return stage() <= 2 ? [200, 100, 50, 20, 10, 5, 2, 1] : [200, 100, 50, 20, 10];
    };
    const summe = () => kasse.reduce((a, b) => a + b, 0);
    const alsEuro = (c) => `${Math.floor(c / 100)},${String(c % 100).padStart(2, "0")} €`;

    const kopf = el("div", "gm-task");
    api.area.appendChild(kopf);
    const zone = fillZone(api);
    const kasseEl = el("div", "kasse g-grow");
    zone.appendChild(kasseEl);
    const fb = el("div", "gm-feedback");
    api.area.appendChild(fb);
    const muenzRow = el("div", "muenz-row");
    api.area.appendChild(muenzRow);
    const btnRow = el("div", "game-controls");
    const zurueck = el("button", "pill-btn", "⌫ Alles zurück");
    const check = el("button", "btn-accent", "✓ Prüfen");
    check.style.minWidth = "170px";
    btnRow.appendChild(zurueck); btnRow.appendChild(check);
    api.area.appendChild(btnRow);
    zurueck.onclick = () => { if (!geloest && kasse.length) { kasse = []; setFb("", "dim"); Feedback.tap(); render(); } };
    check.onclick = () => { if (fertig) neuesSpiel(); else if (geloest) naechsteRunde(); else pruefen(); };

    function setFb(t, cls) { fb.textContent = t || "Gelegte Münzen antippen, um sie wieder herauszunehmen."; fb.className = "gm-feedback " + (t ? cls : "dim"); }

    function coinEl(cent, d) {
      const gold = "#D4A117", silber = "#D1D1D1", kupfer = "#B87652";
      let ring, kern;
      if (cent === 200) { ring = silber; kern = gold; }
      else if (cent === 100) { ring = gold; kern = silber; }
      else if (cent <= 5) { ring = kupfer; kern = kupfer; }
      else { ring = gold; kern = gold; }
      const b = el("button", "muenze");
      b.style.cssText = `width:${d}px;height:${d}px;background:${ring}`;
      b.innerHTML = `<span class="kern" style="background:${kern}"></span>
        <span class="lbl" style="font-size:${Math.round(d * (cent >= 100 ? 0.30 : 0.25))}px">
        ${cent >= 100 ? (cent / 100) + " €" : cent + " ct"}</span>`;
      return b;
    }

    function render() {
      api.setStatus(`Runde ${Math.min(runde, RUNDEN)} von ${RUNDEN} · ${richtig} richtig`);
      kopf.innerHTML = fertig
        ? `<b>Alle Runden geschafft! 🎉</b><br>${richtig} von ${RUNDEN} Beträgen richtig gelegt`
        : `${esc(aufgabe)} <button class="icon-btn gm-say" aria-label="Vorlesen">🔊</button>
           <div class="gm-summe">${istRueckgeld ? "Rückgeld" : "In der Kasse"}: ${alsEuro(summe())}</div>`;
      const say = kopf.querySelector(".gm-say");
      if (say) say.onclick = () => Speech.speak(aufgabe);
      check.textContent = fertig ? "↺ Neues Spiel" : geloest ? "Weiter →" : "✓ Prüfen";
      zurueck.disabled = geloest || fertig || !kasse.length;
      muenzRow.style.visibility = fertig ? "hidden" : "visible";

      kasseEl.innerHTML = "";
      if (!kasse.length) {
        kasseEl.appendChild(el("div", "kasse-leer",
          `🪙<br>${istRueckgeld
            ? "Tippen Sie unten auf die Münzen,<br>um das Rückgeld zusammenzulegen."
            : "Tippen Sie unten auf die Münzen,<br>um Geld hineinzulegen."}`));
      } else {
        const inner = el("div", "kasse-inner");
        const d = kasse.length > 8 ? 52 : 62;
        kasse.forEach((cent, idx) => {
          const c = coinEl(cent, d);
          c.disabled = geloest || fertig;
          c.onclick = () => { kasse.splice(idx, 1); setFb("", "dim"); Feedback.tap(); render(); };
          inner.appendChild(c);
        });
        kasseEl.appendChild(inner);
      }
      muenzRow.innerHTML = "";
      const pal = palette();
      const pd = pal.length > 5 ? 42 : 58;
      pal.forEach(cent => {
        const c = coinEl(cent, pd);
        c.disabled = geloest || fertig;
        c.onclick = () => lege(cent);
        muenzRow.appendChild(c);
      });
    }

    function lege(cent) {
      if (geloest || fertig) return;
      if (kasse.length >= MAX) {
        Feedback.error();
        setFb("Mehr Münzen passen nicht — nehmen Sie erst etwas heraus.", "warn");
        return;
      }
      kasse.push(cent);
      Feedback.tap();
      setFb("", "dim");
      render();
    }
    function passendeMuenzen(betrag) {
      let rest = betrag; const out = [];
      for (const w of [200, 100, 50, 20, 10, 5, 2, 1]) while (rest >= w) { out.push(w); rest -= w; }
      return out;
    }
    function pruefen() {
      if (summe() === zielCent) {
        richtig++; geloest = true;
        Feedback.success();
        setFb("Richtig! Sehr gut.", "ok");
      } else {
        fehlversuch++;
        if (fehlversuch >= 2) {
          kasse = passendeMuenzen(zielCent);
          geloest = true;
          Feedback.tap();
          setFb(`So stimmt es: ${alsEuro(zielCent)}.`, "");
        } else {
          Feedback.error();
          setFb(summe() > zielCent
            ? "Das ist zu viel — nehmen Sie etwas heraus."
            : "Das ist noch zu wenig — legen Sie etwas dazu.", "warn");
        }
      }
      render();
    }
    function naechsteRunde() {
      if (runde >= RUNDEN) {
        fertig = true;
        endBanner(api, `${richtig} von ${RUNDEN} Beträgen richtig gelegt`,
          richtig >= 6 ? true : richtig >= 4 ? null : false);
        render();
        return;
      }
      runde++; neueAufgabe(); render();
    }
    function neueAufgabe() {
      geloest = false; fehlversuch = 0; kasse = []; istRueckgeld = false;
      setFb("", "dim");
      const alt = zielCent;
      const d = gDiff();
      if (d === "leicht") {
        let z = (rnd(5) + 1) * 100;
        if (z === alt) z = z % 500 + 100;
        zielCent = z;
        aufgabe = `Legen Sie genau ${alsEuro(z)} in die Kasse.`;
      } else if (d === "mittel") {
        let z = (rnd(39) + 12) * 10;
        if (z === alt) z = z === 500 ? 120 : z + 10;
        zielCent = z;
        aufgabe = `Legen Sie genau ${alsEuro(z)} in die Kasse.`;
      } else {
        istRueckgeld = true;
        let preis;
        if (stage() <= 2) {
          preis = rnd(440) + 60;
          if (500 - preis === alt) preis = preis === 499 ? 60 : preis + 1;
        } else {
          preis = (rnd(44) + 6) * 10;
          if (500 - preis === alt) preis = preis === 490 ? 60 : preis + 10;
        }
        zielCent = 500 - preis;
        aufgabe = `Der Einkauf kostet ${alsEuro(preis)}. Der Kunde bezahlt mit einem 5-€-Schein. Geben Sie das Rückgeld zurück.`;
      }
    }
    function neuesSpiel() { runde = 1; richtig = 0; fertig = false; neueAufgabe(); render(); }

    runde = 1; richtig = 0; fertig = false; zielCent = -1;
    neueAufgabe(); render();
  }

  /* ══════════════ 21) Zahlen verbinden ══════════════ */
  function zahlenVerbinden(api) {
    const RUNDEN = 5, D = 56;
    let knoten, naechster, runde, fehler, geloest, fertig;

    const kopf = el("div", "gm-task");
    api.area.appendChild(kopf);
    const zone = fillZone(api);
    const field = el("div", "zv-field g-grow");
    zone.appendChild(field);
    const fb = el("div", "gm-feedback");
    api.area.appendChild(fb);
    const weiter = el("button", "btn-accent", "Weiter →");
    weiter.style.alignSelf = "center";
    weiter.style.minWidth = "220px";
    weiter.onclick = () => { if (fertig) neuesSpiel(); else if (geloest) naechsteRunde(); };
    api.area.appendChild(weiter);

    const mitRing = () => gDiff() === "leicht";
    const kopfText = () => gDiff() === "schwer"
      ? "Tippen Sie abwechselnd Zahl und Buchstabe: 1, A, 2, B …"
      : "Tippen Sie die Zahlen der Reihe nach an.";

    function setFb(t, cls) { fb.textContent = t; fb.className = "gm-feedback " + cls; }

    function drawLine() {
      const svg = field.querySelector("svg.zv-line");
      if (!svg) return;
      const w = field.clientWidth, h = field.clientHeight;
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      const pts = knoten.filter(k => k.id < naechster)
        .sort((a, b) => a.id - b.id)
        .map(k => `${(k.rx * (w - D) + D / 2).toFixed(1)},${(k.ry * (h - D) + D / 2).toFixed(1)}`);
      svg.innerHTML = pts.length > 1
        ? `<polyline points="${pts.join(" ")}" fill="none" stroke="rgba(255,255,255,0.55)"
             stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` : "";
    }

    function render() {
      api.setStatus(`Runde ${Math.min(runde, RUNDEN)} von ${RUNDEN} · ${fehler} Fehltipps`);
      kopf.innerHTML = fertig
        ? `<b>Alle Runden geschafft! 🎉</b>`
        : `${esc(kopfText())} <button class="icon-btn gm-say" aria-label="Vorlesen">🔊</button>`;
      const say = kopf.querySelector(".gm-say");
      if (say) say.onclick = () => Speech.speak(kopfText());
      weiter.disabled = !geloest && !fertig;
      weiter.textContent = fertig ? "↺ Neues Spiel" : "Weiter →";

      field.innerHTML = `<svg class="zv-line" preserveAspectRatio="none"></svg>`;
      knoten.forEach(k => {
        const done = k.id < naechster;
        const istN = k.id === naechster;
        const b = el("button", "zv-node"
          + (done ? " done" : "")
          + (istN && mitRing() && !geloest ? " next" : ""), esc(k.label));
        b.style.left = `calc(${(k.rx * 100).toFixed(2)}% - ${(k.rx * D).toFixed(1)}px)`;
        b.style.top = `calc(${(k.ry * 100).toFixed(2)}% - ${(k.ry * D).toFixed(1)}px)`;
        b.onclick = () => tippe(k, b);
        field.appendChild(b);
      });
      drawLine();

      if (fertig) setFb(`Nur ${fehler} Fehltipps in ${RUNDEN} Runden — stark!`, "warn");
      else if (geloest) setFb("Geschafft! Alle Punkte verbunden.", "ok");
      else setFb(`Als Nächstes: ${knoten.find(k => k.id === naechster)?.label ?? ""}`, "dim");
    }

    function tippe(k, btn) {
      if (geloest || fertig) return;
      if (k.id === naechster) {
        naechster++;
        Feedback.tap();
        if (naechster === knoten.length) {
          geloest = true;
          Feedback.success();
        }
        render();
      } else if (k.id > naechster) {
        fehler++;
        Feedback.error();
        btn.classList.add("flash");
        setTimeout(() => btn.classList.remove("flash"), 350);
        api.setStatus(`Runde ${Math.min(runde, RUNDEN)} von ${RUNDEN} · ${fehler} Fehltipps`);
      }
    }

    function verteile(anzahl) {
      const pts = [];
      let minAb = anzahl <= 8 ? 0.24 : 0.19, tries = 0;
      while (pts.length < anzahl) {
        const p = [Math.random(), Math.random()];
        const passt = pts.every(q => Math.hypot(p[0] - q[0], p[1] - q[1]) >= minAb);
        if (passt) pts.push(p);
        else if (++tries > 250) { tries = 0; minAb *= 0.92; }
      }
      return pts;
    }
    function neueRunde() {
      geloest = false; naechster = 0;
      let labels;
      const d = gDiff();
      if (d === "leicht") labels = Array.from({ length: 8 }, (_, i) => String(i + 1));
      else if (d === "mittel") labels = Array.from({ length: 12 }, (_, i) => String(i + 1));
      else {
        labels = [];
        const B = ["A", "B", "C", "D", "E", "F"];
        for (let i = 0; i < 6; i++) { labels.push(String(i + 1)); labels.push(B[i]); }
      }
      knoten = verteile(labels.length).map(([rx, ry], idx) =>
        ({ id: idx, label: labels[idx], rx, ry }));
    }
    function naechsteRunde() {
      if (runde >= RUNDEN) {
        fertig = true;
        endBanner(api, `Nur ${fehler} Fehltipps in ${RUNDEN} Runden — stark!`,
          fehler <= 2 ? true : null);
        render();
        return;
      }
      runde++; neueRunde(); render();
    }
    function neuesSpiel() { runde = 1; fehler = 0; fertig = false; neueRunde(); render(); }

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => drawLine());
      ro.observe(field);
      api.onCleanup(() => ro.disconnect());
    }
    runde = 1; fehler = 0; fertig = false;
    neueRunde(); render();
  }

  Object.assign(Games2, { wordSearch, battleship, kniffel, muehle, uhrStellen, geldZaehlen, zahlenVerbinden });
})();
