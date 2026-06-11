// =====================================================================
// WHParser — turns free text ("all star with bacon, hashbrowns
// smothered covered, sweet tea, to go") into structured ticket lines
// priced from WH_MENU. Pure functions; also runs under Node for tests.
// =====================================================================
(function (root) {
  "use strict";

  const NUM_WORDS = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
    nine: 9, ten: 10, eleven: 11, twelve: 12, couple: 2
  };

  const FILLER = new Set(["and", "with", "a", "an", "of", "the", "please",
    "on", "it", "for", "i", "id", "want", "would", "like", "can", "get",
    "me", "my", "us", "we", "order", "orders", "have", "ill", "lets",
    "also", "then", "plus", "that", "some", "gonna", "wanna", "her",
    "him", "he", "she", "they", "them", "wants", "needs", "side"]);

  function normalize(text) {
    return (text || "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/omelette/g, "omelet")
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function tokenize(text) { return normalize(text) ? normalize(text).split(" ") : []; }

  // token match with cheap plural tolerance ("waffles" matches "waffle")
  function tokEq(textTok, aliasTok) {
    return textTok === aliasTok || textTok === aliasTok + "s" || textTok + "s" === aliasTok;
  }

  // ---------------- matcher index ----------------
  let _index = null, _indexMenu = null;

  function buildIndex(menu) {
    const entries = [];
    const add = (alias, type, ref) => {
      const toks = tokenize(alias);
      if (toks.length) entries.push({ toks, type, ref, alias });
    };
    menu.items.forEach(it => (it.aliases || []).forEach(a => add(a, "item", it)));
    menu.mods.forEach(m => (m.aliases || []).forEach(a => add(a, "mod", m)));
    menu.hashbrownStyles.forEach(s => add(s.word, "style", s));
    menu.hashbrownToppings.forEach(t => {
      add(t, "topping", t);
      add("with " + t, "topping", t);
      if (t === "onions") { add("onion", "topping", t); add("grilled onions", "topping", t); }
      if (t === "jalapenos") add("peppers", "topping", t);
    });
    menu.eggStyles.forEach(s => add(s, "eggstyle", s));
    menu.toastPrefs.forEach(t => add(t, "toastpref", t));
    ["to go", "takeout", "take out", "carry out", "carryout", "togo"]
      .forEach(a => add(a, "directive", "togo"));
    ["dine in", "for here", "dinein", "eat in", "eating here"]
      .forEach(a => add(a, "directive", "dinein"));
    ["no", "hold", "without", "hold the"].forEach(a => add(a, "negation", a));
    ["seat", "guest", "customer", "person"].forEach(a => add(a, "seatword", a));

    const byFirst = new Map();
    entries.forEach(e => {
      const k = e.toks[0];
      if (!byFirst.has(k)) byFirst.set(k, []);
      byFirst.get(k).push(e);
    });
    // also key plural/singular variants of first token
    entries.forEach(e => {
      const k = e.toks[0];
      [k + "s", k.replace(/s$/, "")].forEach(v => {
        if (v && v !== k) {
          if (!byFirst.has(v)) byFirst.set(v, []);
          byFirst.get(v).push(e);
        }
      });
    });
    byFirst.forEach(list => list.sort((a, b) => b.toks.length - a.toks.length));
    return byFirst;
  }

  function matchAt(tokens, i, index) {
    const cands = index.get(tokens[i]);
    if (!cands) return null;
    for (const e of cands) {
      if (i + e.toks.length > tokens.length) continue;
      let ok = true;
      for (let j = 0; j < e.toks.length; j++) {
        if (!tokEq(tokens[i + j], e.toks[j])) { ok = false; break; }
      }
      if (ok) return e;
    }
    return null;
  }

  // ---------------- suggestions for unmatched text ----------------
  function suggest(menu, phrase, n) {
    const toks = tokenize(phrase).filter(t => !FILLER.has(t));
    if (!toks.length) return [];
    const scored = menu.items.map(it => {
      const hay = tokenize(it.name + " " + (it.aliases || []).join(" "));
      let score = 0;
      toks.forEach(t => { if (hay.some(h => tokEq(t, h))) score++; });
      return { it, score };
    }).filter(s => s.score > 0);
    scored.sort((a, b) => b.score - a.score || a.it.price - b.it.price);
    return scored.slice(0, n || 3).map(s => s.it);
  }

  // ---------------- line helpers ----------------
  function newLine(item, qty, seat) {
    return {
      itemId: item.id, name: item.name, price: item.price, qty: qty || 1,
      seat: seat || 1, mods: [], notes: [],
      _includes: item.includes || null,
      _hashbrowns: !!item.hashbrowns || item.id === "hb-atw",
      _isOmelet: /^om-/.test(item.id),
      _meatSide: item.meatSide || null
    };
  }

  function lineTotal(line) {
    const mods = (line.mods || []).reduce((s, m) => s + (m.price || 0), 0);
    return (line.price + mods) * (line.qty || 1);
  }

  function hasMod(line, name) { return line.mods.some(m => m.name === name); }

  function addTopping(line, topping, price) {
    const label = "+ " + topping;
    if (line.itemId === "hb-atw") {           // already has everything
      if (!line.notes.includes(topping)) line.notes.push(topping);
      return;
    }
    if (!hasMod(line, label)) line.mods.push({ name: label, price });
  }

  // find most recent line satisfying pred
  function findBack(lines, pred) {
    for (let i = lines.length - 1; i >= 0; i--) if (pred(lines[i])) return lines[i];
    return null;
  }

  // ---------------- main parse ----------------
  function parse(text, menu) {
    if (!_index || _indexMenu !== menu) { _index = buildIndex(menu); _indexMenu = menu; }
    const tokens = tokenize(text);
    const lines = [];
    const warnings = [];
    const unmatched = [];
    let orderType = null;
    let seat = 1;
    let pendingQty = null;
    let pendingStyles = [];   // styles spoken before the hashbrowns
    let run = [];             // current unmatched token run

    const flushRun = () => {
      const phrase = run.filter(t => !FILLER.has(t)).join(" ");
      if (phrase) unmatched.push({ text: run.join(" "), suggestions: suggest(menu, phrase, 3) });
      run = [];
    };

    let i = 0;
    while (i < tokens.length) {
      const tok = tokens[i];

      const m = matchAt(tokens, i, _index);
      if (!m) {
        // numbers set quantity for the next item (only when the token
        // isn't the start of an alias like "two eggs" or "2 egg plate")
        if (/^\d+$/.test(tok) || NUM_WORDS[tok] != null) {
          const n = NUM_WORDS[tok] != null ? NUM_WORDS[tok] : parseInt(tok, 10);
          if (n >= 1 && n <= 24) { pendingQty = n; i++; continue; }
        }
        if (!FILLER.has(tok)) run.push(tok);
        i++;
        continue;
      }

      // ----- apply the match -----
      if (m.type === "seatword") {
        const nxt = tokens[i + m.toks.length];
        const n = nxt && (NUM_WORDS[nxt] != null ? NUM_WORDS[nxt] : parseInt(nxt, 10));
        if (n >= 1 && n <= 8) { seat = n; pendingQty = null; i += m.toks.length + 1; continue; }
        i += m.toks.length; continue;
      }

      flushRun();

      if (m.type === "directive") {
        orderType = m.ref === "togo" ? "togo" : "dinein";
        i += m.toks.length; continue;
      }

      if (m.type === "negation") {
        const nxt = tokens[i + m.toks.length];
        const last = lines[lines.length - 1];
        if (nxt && last) {
          last.notes.push("NO " + nxt);
          if (last.itemId === "all-star" && /^eggs?$/.test(nxt)) {
            warnings.push("All-Star with no eggs: corporate says that's just a waffle + sides, not an All-Star. Double-check pricing with the customer.");
          }
          i += m.toks.length + 1; continue;
        }
        i += m.toks.length; continue;
      }

      if (m.type === "item") {
        const item = m.ref;
        const explicitQty = pendingQty != null;
        const qty = pendingQty || 1;
        pendingQty = null;

        // --- combo-absorption heuristics (free inclusions) ---
        const comboMeat = !explicitQty && item.meatSide &&
          findBack(lines, l => l._includes && l._includes.meatChoice && !l._meatNote);
        if (comboMeat) {
          if (comboMeat.itemId === "all-star" && item.meatSide === "country ham") {
            const sub = menu.items.find(x => x.id === "all-star-ch");
            if (sub) { comboMeat.itemId = sub.id; comboMeat.name = sub.name; comboMeat.price = sub.price; }
          }
          comboMeat._meatNote = true;
          comboMeat.notes.push(item.meatSide);
          i += m.toks.length; continue;
        }

        const comboToast = !explicitQty && item.toast &&
          findBack(lines, l => l._includes && l._includes.toast && !l._toastNote);
        if (comboToast) {
          comboToast._toastNote = true;
          comboToast.notes.push(m.alias.replace(/\s*\(.*\)/, ""));
          i += m.toks.length; continue;
        }

        const comboHb = !explicitQty && (item.id === "hb-single" || item.id === "grits-reg") &&
          findBack(lines, l => l._includes && l._includes.hbChoice && !l._hbNote);
        if (comboHb) {
          comboHb._hbNote = true;
          comboHb._hashbrowns = item.id === "hb-single"; // styles may now attach (priced)
          comboHb.notes.push(item.id === "hb-single" ? "hashbrowns" : "grits");
          i += m.toks.length; continue;
        }

        if (item.eggsSide) {
          const comboEggs = !explicitQty &&
            findBack(lines, l => l._includes && l._includes.eggs && !l._eggNote);
          if (comboEggs) {
            comboEggs._eggNote = true;
            const extra = item.eggsSide - comboEggs._includes.eggs;
            if (extra > 0) {
              for (let k = 0; k < extra; k++) comboEggs.mods.push({ name: "+ extra egg", price: 0.75 });
            }
            i += m.toks.length; continue;
          }
        }

        // --- normal new line ---
        const line = newLine(item, qty, seat);
        if (item.captureAlias && !item.name.toLowerCase().includes(m.alias)) {
          line.notes.push(m.alias);
        }
        if (item.note) line._info = item.note;
        // styles that were spoken before the hashbrowns
        if (pendingStyles.length && (line._hashbrowns || line._isOmelet)) {
          pendingStyles.forEach(s => {
            if (s.topping) addTopping(line, s.topping, s.price);
            else line.notes.push(s.word);
          });
        }
        pendingStyles = [];
        lines.push(line);
        i += m.toks.length; continue;
      }

      if (m.type === "style") {
        const s = m.ref;
        const target = findBack(lines, l => l._hashbrowns || l.itemId === "hb-atw");
        if (target) {
          if (s.topping) addTopping(target, s.topping, s.price);
          else if (!target.notes.includes(s.word)) target.notes.push(s.word);
        } else {
          pendingStyles.push(s);
        }
        i += m.toks.length; continue;
      }

      if (m.type === "topping") {
        const target = findBack(lines, l => l._hashbrowns || l._isOmelet);
        if (target) addTopping(target, m.ref, 0.50);
        else run.push(m.ref);
        i += m.toks.length; continue;
      }

      if (m.type === "eggstyle") {
        const target = findBack(lines, l =>
          (l._includes && l._includes.eggs) || /^egg/.test(l.itemId) ||
          l.itemId === "cheese-eggs-side" || l._isOmelet) || lines[lines.length - 1];
        if (target) { if (!target.notes.includes(m.alias)) target.notes.push(m.alias); }
        i += m.toks.length; continue;
      }

      if (m.type === "toastpref") {
        const target = findBack(lines, l => l._includes && l._includes.toast && !l._toastNote);
        if (target) { target._toastNote = true; target.notes.push(m.alias + " toast"); }
        else run.push(m.alias);
        i += m.toks.length; continue;
      }

      if (m.type === "mod") {
        const mod = m.ref;
        const last = lines[lines.length - 1];
        if (!last) { run.push(m.alias); i += m.toks.length; continue; }
        if (mod.id === "mod-add-cheese" && last._hashbrowns) {
          addTopping(last, "cheese", 0.50);
        } else if (mod.id === "mod-add-cheese" &&
                   (last.itemId === "egg-side-2" || last.itemId === "om-plain")) {
          last.mods.push({ name: mod.name, price: 1.00 });
        } else {
          last.mods.push({ name: mod.name, price: mod.price });
        }
        i += m.toks.length; continue;
      }

      i += m.toks.length || 1;
    }
    flushRun();

    // strip parser-internal fields for output cleanliness
    lines.forEach(l => {
      delete l._includes; delete l._meatNote; delete l._toastNote;
      delete l._hbNote; delete l._eggNote;
    });

    return { lines, orderType, warnings, unmatched };
  }

  root.WHParser = { parse, normalize, tokenize, suggest, lineTotal, buildIndex };
})(typeof window !== "undefined" ? window : globalThis);
