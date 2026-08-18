/* ═══════════════════════════════════════════════════════════════
   Memovia Web — Spiele (Teil 2)
   Sudoku · Schiebepuzzle · Linienrätsel · Zahlenjagd
   ═══════════════════════════════════════════════════════════════ */
"use strict";

const Games2 = (() => {
  const gDiff = () => App.settings.gameDifficulty;
  const { rnd, pick, shuffled } = Generator;
  const { endBanner, fillZone, fitIn } = Games.helpers;

  /* ══════════════ 11) Sudoku ══════════════ */
  function sudoku(api) {
    // Lösung per Backtracking erzeugen, dann Zellen entfernen
    function fullGrid() {
      const g = Array.from({ length: 9 }, () => Array(9).fill(0));
      const ok = (r, c, v) => {
        for (let i = 0; i < 9; i++)
          if (g[r][i] === v || g[i][c] === v) return false;
        const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
          if (g[br + i][bc + j] === v) return false;
        return true;
      };
      const fill = (idx) => {
        if (idx === 81) return true;
        const r = Math.floor(idx / 9), c = idx % 9;
        for (const v of shuffled([1,2,3,4,5,6,7,8,9])) {
          if (ok(r, c, v)) {
            g[r][c] = v;
            if (fill(idx + 1)) return true;
            g[r][c] = 0;
          }
        }
        return false;
      };
      fill(0);
      return g;
    }

    const givens = { leicht: 40, mittel: 32, schwer: 26 }[gDiff()];
    let solution, puzzle, fixed, sel, errors, over, notesMode;

    const grid = el("div", "sudoku-grid");
    fitIn(api, fillZone(api), grid, 1);
    const pad = el("div", "numpad");
    api.area.appendChild(pad);

    function newGame() {
      solution = fullGrid();
      puzzle = solution.map(r => r.slice());
      const cells = shuffled(Array.from({ length: 81 }, (_, i) => i));
      let removed = 0;
      for (const i of cells) {
        if (81 - removed <= givens) break;
        const r = Math.floor(i / 9), c = i % 9;
        puzzle[r][c] = 0;
        removed++;
      }
      fixed = puzzle.map(row => row.map(v => v !== 0));
      sel = null; errors = 0; over = false;
      render();
      api.setStatus("Wählen Sie eine Zelle und dann eine Zahl.");
    }

    function conflicts(r, c, v) {
      if (!v) return false;
      for (let i = 0; i < 9; i++) {
        if (i !== c && puzzle[r][i] === v) return true;
        if (i !== r && puzzle[i][c] === v) return true;
      }
      const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
        const rr = br + i, cc = bc + j;
        if ((rr !== r || cc !== c) && puzzle[rr][cc] === v) return true;
      }
      return false;
    }

    function render() {
      grid.innerHTML = "";
      for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
        const v = puzzle[r][c];
        const cell = el("button", "sudoku-cell");
        if (c % 3 === 2 && c !== 8) cell.classList.add("blockR");
        if (r % 3 === 2 && r !== 8) cell.classList.add("blockB");
        if (fixed[r][c]) cell.classList.add("given");
        else if (v) cell.classList.add("user");
        if (sel && sel[0] === r && sel[1] === c) cell.classList.add("sel");
        else if (sel && (sel[0] === r || sel[1] === c)) cell.classList.add("same");
        if (v && !fixed[r][c] && conflicts(r, c, v)) cell.classList.add("err");
        cell.textContent = v || "";
        cell.onclick = () => { if (!over) { sel = [r, c]; render(); } };
        grid.appendChild(cell);
      }
      pad.innerHTML = "";
      for (let n = 1; n <= 9; n++) {
        const remaining = 9 - puzzle.flat().filter(x => x === n).length;
        const b = el("button", null, `${n}<br><small style="font-size:11px;opacity:.7">${remaining || "✓"}</small>`);
        b.disabled = over || remaining === 0;
        b.onclick = () => place(n);
        pad.appendChild(b);
      }
      const erase = el("button", null, "⌫");
      erase.disabled = over;
      erase.onclick = () => place(0);
      pad.appendChild(erase);
    }

    function place(v) {
      if (over || !sel) { api.setStatus("Bitte zuerst eine Zelle wählen."); return; }
      const [r, c] = sel;
      if (fixed[r][c]) { api.setStatus("Diese Zahl ist vorgegeben."); return; }
      if (v !== 0 && solution[r][c] !== v) {
        errors++;
        Feedback.error();
        puzzle[r][c] = v;
        render();
        api.setStatus(`Das passt hier nicht — Fehler: ${errors}`);
        setTimeout(() => {
          if (puzzle[r][c] === v && !over) { puzzle[r][c] = 0; render(); }
        }, 900);
        return;
      }
      puzzle[r][c] = v;
      if (v) Feedback.tap();
      if (puzzle.every((row, ri) => row.every((x, ci) => x === solution[ri][ci]))) {
        over = true; render();
        endBanner(api, `🎉 Sudoku gelöst — mit ${errors} Fehler${errors === 1 ? "" : "n"}!`, true);
        return;
      }
      render();
      api.setStatus(errors ? `Fehler bisher: ${errors}` : "Weiter so!");
    }

    newGame();
  }

  /* ══════════════ 12) Schiebepuzzle ══════════════ */
  function slidePuzzle(api) {
    const N = 4;
    let tiles, moves, over;
    const board = el("div", "slide-grid");
    fitIn(api, fillZone(api), board, 1);

    function neighborsOfBlank() {
      const b = tiles.indexOf(0);
      const r = Math.floor(b / N), c = b % N;
      const out = [];
      if (r > 0) out.push(b - N);
      if (r < N - 1) out.push(b + N);
      if (c > 0) out.push(b - 1);
      if (c < N - 1) out.push(b + 1);
      return out;
    }
    function newGame() {
      tiles = Array.from({ length: N * N }, (_, i) => (i + 1) % (N * N));
      // Mischen durch zufällige gültige Züge → immer lösbar
      let last = -1;
      for (let i = 0; i < 220; i++) {
        const opts = neighborsOfBlank().filter(x => x !== last);
        const mv = pick(opts);
        last = tiles.indexOf(0);
        swap(mv);
      }
      moves = 0; over = false;
      render();
      api.setStatus("Ordnen Sie die Zahlen von 1 bis 15.");
    }
    function swap(i) {
      const b = tiles.indexOf(0);
      [tiles[b], tiles[i]] = [tiles[i], tiles[b]];
    }
    function render() {
      board.innerHTML = "";
      tiles.forEach((v, i) => {
        const cell = el("button", "slide-tile"
          + (v === 0 ? " empty" : v === i + 1 ? " ok" : ""), v || "");
        cell.disabled = over || v === 0 || !neighborsOfBlank().includes(i);
        cell.onclick = () => {
          swap(i); moves++; Feedback.tap(); render();
          if (tiles.every((x, idx) => x === (idx + 1) % (N * N))) {
            over = true;
            endBanner(api, `🎉 Geschafft — in ${moves} Zügen!`, true);
          } else api.setStatus(`${moves} Züge`);
        };
        board.appendChild(cell);
      });
    }
    newGame();
  }

  /* ══════════════ 13) Linienrätsel (OneStroke) ══════════════ */
  function oneStroke(api) {
    const level = { leicht: "easy", mittel: "medium", schwer: "hard" }[gDiff()];
    let fig, drawn, current, over;

    const svgWrap = el("div", "g-grow g-svghost");
    api.area.appendChild(svgWrap);
    const ctrl = el("div", "game-controls");
    const undo = el("button", "pill-btn", "⌫ Schritt zurück");
    const reset = el("button", "pill-btn", "↺ Von vorn");
    const next = el("button", "btn-accent", "Nächste Figur →");
    next.style.display = "none";
    ctrl.appendChild(undo); ctrl.appendChild(reset); ctrl.appendChild(next);
    api.area.appendChild(ctrl);

    const edgeKey = (a, b) => a < b ? `${a}-${b}` : `${b}-${a}`;

    function newFigure() {
      const F = ONESTROKE_FIGURES;
      const pools = {
        easy: F.easy || [],
        medium: (F.easy || []).concat(F.medium || []),
        hard: (F.medium || []).concat(F.hard || []),
      };
      const all = (F.easy || []).concat(F.medium || [], F.hard || []);
      const pool = pools[level] || [];
      fig = pick(pool.length ? pool : all);
      drawn = new Set(); current = null; over = false;
      next.style.display = "none";
      render();
      api.setStatus(`„${fig.name}" — tippen Sie einen Startpunkt an.`);
    }

    function render() {
      // Koordinaten sind normiert (0–1) → auf 360er-Raster skalieren;
      // nur Punkte zeichnen, die in Kanten vorkommen.
      const S = 360;
      const pts = fig.points.map(([x, y]) => [x * S, y * S]);
      const used = new Set();
      fig.edges.forEach(([a, b]) => { used.add(a); used.add(b); });
      const uxs = [...used].map(i => pts[i][0]), uys = [...used].map(i => pts[i][1]);
      const minX = Math.min(...uxs) - 30, maxX = Math.max(...uxs) + 30;
      const minY = Math.min(...uys) - 30, maxY = Math.max(...uys) + 30;
      let inner = "";
      fig.edges.forEach(([a, b]) => {
        const done = drawn.has(edgeKey(a, b));
        inner += `<line x1="${pts[a][0]}" y1="${pts[a][1]}"
          x2="${pts[b][0]}" y2="${pts[b][1]}"
          stroke="${done ? "#D4A117" : "rgba(255,255,255,0.28)"}"
          stroke-width="${done ? 7 : 4}" stroke-linecap="round"/>`;
      });
      [...used].forEach((i) => {
        const [x, y] = pts[i];
        const active = current === i;
        inner += `<circle cx="${x}" cy="${y}" r="${active ? 17 : 13}"
          fill="${active ? "#D4A117" : "#fff"}" stroke="rgba(0,0,0,0.25)" stroke-width="2"
          data-p="${i}" style="cursor:pointer"/>`;
      });
      svgWrap.innerHTML = `<svg class="os-svg" viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}">${inner}</svg>`;
      svgWrap.querySelectorAll("circle[data-p]").forEach(c =>
        c.addEventListener("click", () => tap(parseInt(c.dataset.p, 10))));
    }

    function tap(i) {
      if (over) return;
      if (current === null) { current = i; Feedback.tap(); render(); api.setStatus("Und weiter zum nächsten Punkt…"); return; }
      if (i === current) return;
      const isEdge = fig.edges.some(([a, b]) =>
        (a === current && b === i) || (b === current && a === i));
      const key = edgeKey(current, i);
      if (!isEdge) { Feedback.error(); api.setStatus("Diese Punkte sind nicht direkt verbunden."); return; }
      if (drawn.has(key)) { Feedback.error(); api.setStatus("Diese Linie wurde schon gezeichnet."); return; }
      drawn.add(key);
      current = i;
      Feedback.tap();
      render();
      if (drawn.size === fig.edges.length) {
        over = true;
        next.style.display = "";
        endBanner(api, `🎉 „${fig.name}" in einem Zug geschafft!`, true);
      } else {
        api.setStatus(`${drawn.size} von ${fig.edges.length} Linien`);
      }
    }

    undo.onclick = () => {
      if (over || !drawn.size) return;
      // letzte Linie entfernen: wir merken uns die Reihenfolge separat
      const arr = [...drawn];
      const lastKey = arr[arr.length - 1];
      drawn.delete(lastKey);
      const [a, b] = lastKey.split("-").map(Number);
      current = (a === current) ? b : a;
      render();
      api.setStatus(`${drawn.size} von ${fig.edges.length} Linien`);
    };
    reset.onclick = () => { if (!over) { drawn = new Set(); current = null; render(); api.setStatus("Von vorn — wählen Sie einen Startpunkt."); } };
    next.onclick = newFigure;

    newFigure();
  }

  /* ══════════════ 14) Zahlenjagd ══════════════ */
  function numberHunt(api) {
    const count = { leicht: 6, mittel: 9, schwer: 12 }[gDiff()];
    const HUES = ["#E4574C","#4C7DE4","#4DA65A","#E9C33B","#9B59D0","#E88A2E","#3BB7C4","#D45FA0"];
    let items, expectIdx, over, startT, mistakes;

    const field = el("div", "hunt-field g-grow");
    api.area.appendChild(field);

    function newGame() {
      const nums = new Set();
      while (nums.size < count) nums.add(rnd(99) + 1);
      const sorted = [...nums].sort((a, b) => b - a);
      // Positionen ohne Überlappung
      const placed = [];
      items = sorted.map((n) => {
        const size = 52 + rnd(30);
        let x, y, tries = 0;
        do {
          x = 4 + Math.random() * (92 - size / 4);
          y = 4 + Math.random() * (88 - size / 4);
          tries++;
        } while (tries < 60 && placed.some(p =>
          Math.hypot(p.x - x, p.y - y) < (p.size + size) / 5.2));
        placed.push({ x, y, size });
        return { n, x, y, size, color: pick(HUES), found: false };
      });
      expectIdx = 0; over = false; mistakes = 0;
      startT = Date.now();
      render();
      api.setStatus(`Tippen Sie die Zahlen von GROSS nach KLEIN an — ${count} Stück.`);
    }

    function render() {
      field.innerHTML = "";
      items.forEach((it, i) => {
        if (it.found) return;
        const b = el("button", "hunt-bubble", String(it.n));
        b.style.cssText = `left:${it.x}%;top:${it.y}%;width:${it.size}px;height:${it.size}px;
          background:${it.color};font-size:${Math.round(it.size * 0.38)}px`;
        b.onclick = () => tap(i);
        field.appendChild(b);
      });
    }

    function tap(i) {
      if (over) return;
      if (i === expectIdx) {
        items[i].found = true;
        expectIdx++;
        Feedback.tap();
        if (expectIdx === items.length) {
          over = true;
          const secs = ((Date.now() - startT) / 1000).toFixed(1);
          render();
          endBanner(api, `🎉 Alle ${count} Zahlen in ${secs} s — ${mistakes} Fehlgriffe!`, true);
          return;
        }
        render();
        api.setStatus(`Noch ${items.length - expectIdx} Zahlen…`);
      } else {
        mistakes++;
        Feedback.error();
        api.setStatus(`Ups — es kommt eine größere Zahl zuerst. (${mistakes} Fehlgriffe)`);
      }
    }
    newGame();
  }

  return { sudoku, slidePuzzle, oneStroke, numberHunt };
})();
