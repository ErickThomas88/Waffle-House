// =====================================================================
// WHTicket — writes the official guest check and builds the
// Pull · Drop · Mark call, following the Waffle House training packet:
//   * abbreviations (packet pp. 3-8, 12-13) and lower-case topping rules
//   * 2026 "ORDER BEFORE DRINKS!" check rows: HASHBROWNS (drop), BOWLS,
//     DINNER MEATS, SANDWICHES, OMELETS, EGGS, WAFFLES, HAM BACON
//     SAUSAGE, OTHER, BEVERAGES (mark = everything below hashbrowns)
//   * the Three-Part Call-In (p. 9): PULL meats first, DROP hashbrowns,
//     then MARK the order top-to-bottom, longest-cooking food first
//   * call terms ON / MAKE / LIKE (p. 14) and HOLD / TO-GO (p. 15)
// Pure functions; also runs under Node for tests.
// =====================================================================
(function (root) {
  "use strict";

  const ROWS = ["HASHBROWNS", "BOWLS", "DINNER MEATS", "SANDWICHES",
    "OMELETS", "EGGS", "WAFFLES", "HAM BACON SAUSAGE", "OTHER", "BEVERAGES"];

  // hashbrown toppings in the order their letters are written: √ssc
  const TOPPINGS = [
    { key: "onions",    letter: "s", word: "smothered" },
    { key: "cheese",    letter: "c", word: "covered" },
    { key: "ham",       letter: "h", word: "chunked" },
    { key: "tomatoes",  letter: "d", word: "diced" },
    { key: "jalapenos", letter: "p", word: "peppered" },
    { key: "mushrooms", letter: "a", word: "capped" },
    { key: "chili",     letter: "t", word: "topped" },
    { key: "gravy",     letter: "g", word: "country" }
  ];

  const EGG_PREP = {
    "scrambled": "SCR", "scrambled soft": "SCRL", "scrambled light": "SCRL",
    "scrambled hard": "SCRW", "scrambled well": "SCRW",
    "over easy": "OL", "over light": "OL", "over medium": "OM",
    "over well": "OW", "over hard": "OW", "well done": "OW",
    "sunny side up": "UP", "runny": "OL", "basted": "Bst", "poached": "Pch"
  };

  // white toast is the default — it gets no abbreviation (packet p. 8)
  const TOAST = { wheat: "w", raisin: "r", texas: "Tx", white: "" };

  const MEAT_ABBR = { bacon: "B", sausage: "S", "chicken sausage": "Kp",
    "city ham": "H", "country ham": "CH" };

  // Primary abbreviation + ticket row by item id. Combo meals
  // (includes.eggs etc.) are exploded across rows in explode().
  const ABBR = {
    // hashbrowns & grits
    "hb-single": { row: "HASHBROWNS" }, "hb-double": { row: "HASHBROWNS" },
    "hb-triple": { row: "HASHBROWNS" }, "hb-atw": { row: "HASHBROWNS" },
    "grits-reg": { row: "OTHER", abbr: "G" },
    "grits-lg": { row: "OTHER", abbr: "lg G" },
    "grits-cheese": { row: "OTHER", abbr: "CG" },
    "grits-cheese-lg": { row: "OTHER", abbr: "lg CG" },
    // bowls (packet p. 3: hashbrown bowls are √√s2c + meat abbreviation)
    "bowl-bacon-hb": { row: "BOWLS", abbr: "√√s2c+B" },
    "bowl-sausage-hb": { row: "BOWLS", abbr: "√√s2c+S" },
    "bowl-csausage-hb": { row: "BOWLS", abbr: "√√s2c+Kp" },
    "bowl-ham-hb": { row: "BOWLS", abbr: "√√s2c+H" },
    "bowl-patty-melt": { row: "BOWLS", abbr: "√√s2c+PM" },
    "bowl-cheesesteak-melt": { row: "BOWLS", abbr: "√√s2c+CS" },
    "bowl-chicken-melt": { row: "BOWLS", abbr: "√√s2c+KM" },
    "bowl-sausage-grits": { row: "BOWLS", abbr: "SECG" },
    "bowl-csausage-grits": { row: "BOWLS", abbr: "KpECG" },
    "bowl-ham-grits": { row: "BOWLS", abbr: "HECG" },
    "bowl-fiesta": { row: "BOWLS", abbr: "Fiesta" },
    // dinners
    "d-tbone": { row: "DINNER MEATS", abbr: "TD" },
    "d-delmonico": { row: "DINNER MEATS", abbr: "D" },
    "d-cheesesteak": { row: "DINNER MEATS", abbr: "CSD" },
    "d-countryham": { row: "DINNER MEATS", abbr: "CHD" },
    "d-chicken": { row: "DINNER MEATS", abbr: "KD" },
    "d-porkchop": { row: "DINNER MEATS", abbr: "PD" },
    "d-chicken-ml": { row: "DINNER MEATS", abbr: "2KD" },
    "d-porkchop-ml": { row: "DINNER MEATS", abbr: "3PD" },
    "d-papa-joes": { row: "DINNER MEATS", abbr: "PJ PD" },
    // sandwiches & melts (breakfast abbreviations, packet p. 3; Tx = melt)
    "s-grilled-cheese": { row: "SANDWICHES", abbr: "GC" },
    "s-egg": { row: "SANDWICHES", abbr: "E" },
    "s-egg-cheese": { row: "SANDWICHES", abbr: "EC" },
    "s-egg-cheese-tx": { row: "SANDWICHES", abbr: "TxEC" },
    "s-bacon": { row: "SANDWICHES", abbr: "B" },
    "s-bacon-egg": { row: "SANDWICHES", abbr: "BE" },
    "s-bacon-cheese": { row: "SANDWICHES", abbr: "BC" },
    "s-bacon-ec": { row: "SANDWICHES", abbr: "BEC" },
    "s-bacon-ec-tx": { row: "SANDWICHES", abbr: "TxBEC" },
    "s-bacon-chicken": { row: "SANDWICHES", abbr: "BKC" },
    "s-sausage": { row: "SANDWICHES", abbr: "S" },
    "s-sausage-egg": { row: "SANDWICHES", abbr: "SE" },
    "s-sausage-cheese": { row: "SANDWICHES", abbr: "SC" },
    "s-sausage-ec": { row: "SANDWICHES", abbr: "SEC" },
    "s-sausage-ec-tx": { row: "SANDWICHES", abbr: "TxSEC" },
    "s-csausage": { row: "SANDWICHES", abbr: "KpS" },
    "s-csausage-egg": { row: "SANDWICHES", abbr: "KpE" },
    "s-csausage-cheese": { row: "SANDWICHES", abbr: "KpC" },
    "s-csausage-ec": { row: "SANDWICHES", abbr: "KpEC" },
    "s-csausage-ec-tx": { row: "SANDWICHES", abbr: "TxKpEC" },
    "s-ham": { row: "SANDWICHES", abbr: "H" },
    "s-ham-cheese": { row: "SANDWICHES", abbr: "GHC" },
    "s-ham-egg": { row: "SANDWICHES", abbr: "HE" },
    "s-ham-ec": { row: "SANDWICHES", abbr: "HEC" },
    "s-ham-ec-tx": { row: "SANDWICHES", abbr: "TxHEC" },
    "s-chicken": { row: "SANDWICHES", abbr: "K" },
    "s-chicken-cheese": { row: "SANDWICHES", abbr: "KC" },
    "s-chicken-melt": { row: "SANDWICHES", abbr: "KM" },
    "s-patty-melt": { row: "SANDWICHES", abbr: "PM" },
    "s-blt": { row: "SANDWICHES", abbr: "BLT" },
    "s-blt-lovers": { row: "SANDWICHES", abbr: "BL BLT" },
    "s-blt-tx": { row: "SANDWICHES", abbr: "TxBL BLT" },
    "s-tx-patty": { row: "SANDWICHES", abbr: "TxPM" },
    "s-tx-cheesesteak": { row: "SANDWICHES", abbr: "TxCS" },
    "s-tx-chicken": { row: "SANDWICHES", abbr: "TxKM" },
    "s-tx-sausage": { row: "SANDWICHES", abbr: "TxSM" },
    "p-tx-bacon-patty": { row: "SANDWICHES", abbr: "TxB PM Pl" },
    "p-tx-bacon-cheesesteak": { row: "SANDWICHES", abbr: "TxB CS Pl" },
    "p-tx-bacon-chicken": { row: "SANDWICHES", abbr: "TxB KM Pl" },
    "tx-bacon-ec-plate": { row: "SANDWICHES", abbr: "TxB EC Pl" },
    // burgers (quarter = Q)
    "q-hamburger": { row: "SANDWICHES", abbr: "Q" },
    "q-cheeseburger": { row: "SANDWICHES", abbr: "QC" },
    "q-bacon-cheeseburger": { row: "SANDWICHES", abbr: "QBC" },
    "q-double-hamburger": { row: "SANDWICHES", abbr: "dQ" },
    "q-double-cheeseburger": { row: "SANDWICHES", abbr: "dQC" },
    "q-bacon-double-cheeseburger": { row: "SANDWICHES", abbr: "dQBC" },
    "q-patty-side": { row: "SANDWICHES", abbr: "Q pty" },
    "bacon-cb-deluxe": { row: "SANDWICHES", abbr: "QBC Dlx Pl" },
    // omelets
    "om-plain": { row: "OMELETS", abbr: "Om" },
    "om-cheese": { row: "OMELETS", abbr: "C Om" },
    "om-ham": { row: "OMELETS", abbr: "H Om" },
    "om-ham-cheese": { row: "OMELETS", abbr: "HC Om" },
    "om-fiesta": { row: "OMELETS", abbr: "F Om" },
    "om-bacon-cheese": { row: "OMELETS", abbr: "BC Om" },
    "om-cheesesteak": { row: "OMELETS", abbr: "CS Om" },
    "om-chicken-cheese": { row: "OMELETS", abbr: "KC Om" },
    "om-sausage-cheese": { row: "OMELETS", abbr: "SC Om" },
    "om-side": { row: "OMELETS", abbr: "Om (side)" },
    // waffles (lower-case topping letter in front, packet p. 5 rule)
    "waffle": { row: "WAFFLES", abbr: "W" },
    "waffle-double": { row: "WAFFLES", abbr: "dW" },
    "waffle-pecan": { row: "WAFFLES", abbr: "pW" },
    "waffle-choc": { row: "WAFFLES", abbr: "cW" },
    "waffle-pb": { row: "WAFFLES", abbr: "pbW" },
    "waffle-blueberry": { row: "WAFFLES", abbr: "bW" },
    // side meats
    "m-bacon": { row: "HAM BACON SAUSAGE", abbr: "B" },
    "m-bacon-lg": { row: "HAM BACON SAUSAGE", abbr: "1½B" },
    "m-sausage": { row: "HAM BACON SAUSAGE", abbr: "S" },
    "m-sausage-lg": { row: "HAM BACON SAUSAGE", abbr: "1½S" },
    "m-csausage": { row: "HAM BACON SAUSAGE", abbr: "Kp" },
    "m-csausage-lg": { row: "HAM BACON SAUSAGE", abbr: "1½Kp" },
    "m-cityham": { row: "HAM BACON SAUSAGE", abbr: "H" },
    "m-countryham": { row: "HAM BACON SAUSAGE", abbr: "CH" },
    "m-chicken": { row: "HAM BACON SAUSAGE", abbr: "K" },
    "m-chicken-2": { row: "HAM BACON SAUSAGE", abbr: "2K" },
    "m-porkchop": { row: "HAM BACON SAUSAGE", abbr: "P" },
    "m-porkchop-3": { row: "HAM BACON SAUSAGE", abbr: "3P" },
    "m-cheesesteak": { row: "HAM BACON SAUSAGE", abbr: "CS" },
    "m-delmonico": { row: "HAM BACON SAUSAGE", abbr: "D" },
    "m-tbone": { row: "HAM BACON SAUSAGE", abbr: "T" },
    // beverages (packet p. 13; coffee = C)
    "bev-coffee": { row: "BEVERAGES", abbr: "C" },
    "bev-tea": { row: "BEVERAGES", abbr: "T" },
    "bev-hot-tea": { row: "BEVERAGES", abbr: "HT" },
    "bev-soda": { row: "BEVERAGES", abbr: "Ck" },
    "bev-milk": { row: "BEVERAGES", abbr: "M" },
    "bev-choc-milk": { row: "BEVERAGES", abbr: "CM" },
    "bev-water": { row: "BEVERAGES", abbr: "H2O" },
    "bev-oj": { row: "BEVERAGES", abbr: "O" },
    "bev-apple": { row: "BEVERAGES", abbr: "AJ" },
    "bev-simply-lemonade": { row: "BEVERAGES", abbr: "L" },
    "bev-cold-brew": { row: "BEVERAGES", abbr: "CB" },
    "kids-beverage": { row: "BEVERAGES", abbr: "JR bev" },
    "kids-juice": { row: "BEVERAGES", abbr: "JR juice" }
  };

  // soda flavor the customer actually said → packet p. 13 abbreviation
  const SODA = { "coke": "Ck", "coca cola": "Ck", "diet coke": "DCk",
    "coke zero": "Z", "sprite": "S", "pibb": "Pb", "mr pibb": "Pb",
    "lemonade": "L", "minute maid lemonade": "L", "fruit punch": "F", "hi c": "F" };

  function lineTotal(line) {
    const mods = (line.mods || []).reduce((s, m) => s + (m.price || 0), 0);
    return (line.price + mods) * (line.qty || 1);
  }

  function item(menu, line) { return menu.items.find(i => i.id === line.itemId) || {}; }

  function toppingLetters(line) {
    const have = (line.mods || []).map(m => (m.name || "").replace(/^\+\s*/, ""))
      .concat(line.notes || []);
    return TOPPINGS.filter(t => have.includes(t.key)).map(t => t.letter).join("");
  }

  function toppingWords(line) {
    const have = (line.mods || []).map(m => (m.name || "").replace(/^\+\s*/, ""))
      .concat(line.notes || []);
    return TOPPINGS.filter(t => have.includes(t.key)).map(t => t.word).join(" ");
  }

  // √ = in the ring, √s = scattered (l/w/m = light, well, steamed),
  // then one lower-case letter per topping: √ssc
  function hbAbbr(line, size) {
    const notes = line.notes || [];
    const ring = notes.some(n => /ring/.test(n));
    let a = "√".repeat(size || 1);
    if (line.itemId === "hb-atw" || notes.includes("all the way")) return a + "s atw";
    if (!ring) a += "s";
    if (notes.some(n => /light/.test(n))) a += "l";
    else if (notes.some(n => /\bwell\b/.test(n))) a += "w";
    else if (notes.some(n => /steam/.test(n))) a += "m";
    return a + toppingLetters(line);
  }

  function eggAbbr(line, it) {
    const notes = line.notes || [];
    let prep = "";
    notes.forEach(n => { if (EGG_PREP[n]) prep = EGG_PREP[n]; });
    if (!prep) prep = "eggs?";                       // prep never written = recook
    if (/cheese/i.test(it.name || "") && /^(SCR|OL|OM|OW|UP)/.test(prep)) prep += "C";
    const eggs = (it.includes && it.includes.eggs) || it.eggsSide || 2;
    const count = eggs !== 2 ? eggs + " " : "";
    let toast = "";
    notes.forEach(n => {
      const m = n.match(/^(wheat|raisin|texas|white)/);
      if (m && TOAST[m[1]]) toast = " " + TOAST[m[1]];
    });
    return count + prep + toast;
  }

  // ---------------- explode a ticket line into row cells ----------------
  function explode(line, menu) {
    const it = item(menu, line);
    const inc = it.includes || {};
    const parts = [];
    const put = (row, abbr, primary) => parts.push({ row, abbr, primary: !!primary });

    const map = ABBR[line.itemId];
    if (map && map.row === "HASHBROWNS") {
      const size = line.itemId === "hb-double" ? 2 : line.itemId === "hb-triple" ? 3 : 1;
      put("HASHBROWNS", hbAbbr(line, size), true);
    } else if (inc.eggs) {
      // egg meal: eggs row is home base unless a dinner meat anchors it
      const steak = { "tbone-eggs": "T", "delmonico-eggs": "D",
        "pork-chops-eggs": "P", "country-ham-eggs": "CH",
        "cheesesteak-eggs": "CS", "cheesesteak-cheese-eggs": "CS",
        "chicken-bites-eggs": "K" }[line.itemId];
      if (steak) put("DINNER MEATS", steak, true);
      put("EGGS", eggAbbr(line, it), !steak);
      if (line.itemId === "all-star" || line.itemId === "all-star-ch") {
        put("WAFFLES", "W");
        if (line.itemId === "all-star-ch") put("HAM BACON SAUSAGE", "CH");
      }
      (line.notes || []).forEach(n => {
        if (MEAT_ABBR[n]) put("HAM BACON SAUSAGE", MEAT_ABBR[n]);
        if (n === "hashbrowns") put("HASHBROWNS", hbAbbr(line, 1));
      });
    } else if (map) {
      let abbr = map.abbr;
      if (line.itemId === "bev-soda") {
        (line.notes || []).forEach(n => { if (SODA[n]) abbr = SODA[n]; });
      }
      if (line.itemId === "bev-tea" && (line.notes || []).some(n => /sweet/.test(n))) {
        abbr = "ST";
      }
      put(map.row, abbr, true);
    } else {
      // fallback: initials on the OTHER line
      const init = (it.name || line.name || "?").replace(/\(.*?\)/g, "")
        .split(/\s+/).filter(Boolean).map(w => w[0]).join("").toUpperCase();
      put("OTHER", init, true);
    }

    if (line.qty > 1) parts.forEach(p => { p.abbr = line.qty + "× " + p.abbr; });
    (line.notes || []).forEach(n => {
      if (/^NO /.test(n)) parts[0].abbr += " ⊘" + n.slice(3);   // hold symbol
    });
    return parts;
  }

  // ---------------- the written ticket ----------------
  function buildGrid(lines, menu) {
    const seats = [...new Set(lines.map(l => l.seat || 1))].sort((a, b) => a - b);
    const rows = ROWS.map(name => ({ name, cells: {}, amount: 0 }));
    const rowByName = {};
    rows.forEach(r => { rowByName[r.name] = r; });

    lines.forEach(l => {
      const seat = l.seat || 1;
      explode(l, menu).forEach(p => {
        const r = rowByName[p.row];
        if (!r.cells[seat]) r.cells[seat] = [];
        r.cells[seat].push(p.abbr);
        if (p.primary) r.amount += lineTotal(l);    // price rides the home row
      });
    });
    const total = lines.reduce((s, l) => s + lineTotal(l), 0);
    return { seats, rows, total };
  }

  // ---------------- the Three-Part Call-In ----------------
  const MEAT_WORDS = [
    [/t[\s-]?bone/i, "T-bone"], [/delmonico/i, "Delmonico"],
    [/pork chop/i, "pork chops"], [/country ham/i, "country ham"],
    [/cheesesteak/i, "cheesesteak"], [/chicken sausage/i, "chicken sausage"],
    [/\bchicken\b/i, "chicken"], [/\bbacon\b|\bblt\b/i, "bacon"],
    [/\bsausage\b/i, "sausage"], [/\bham\b/i, "ham"],
    [/patty melt|hamburger|cheeseburger|\bpatty\b/i, "quarter"]
  ];

  function meatsIn(line, menu) {
    const it = item(menu, line);
    const found = [];
    const scan = (txt) => {
      for (const [re, word] of MEAT_WORDS) {
        if (re.test(txt)) { found.push(word); return; }   // first match wins
      }
    };
    if (it.meatSide) found.push(it.meatSide === "city ham" ? "ham" : it.meatSide);
    else if (["Dinners", "Burgers", "Sandwiches", "Biscuits", "Bowls",
              "Breakfast"].includes(it.cat)) scan(it.name || "");
    (line.notes || []).forEach(n => {
      if (["bacon", "sausage", "chicken sausage", "city ham", "country ham"].includes(n)) {
        found.push(n === "city ham" ? "ham" : n);
      }
    });
    // a double burger pulls two quarter patties
    return found.map(w =>
      ({ word: w, n: (w === "quarter" && /double/i.test(it.name || "")) ? 2 : 1 }));
  }

  function spoken(line, menu) {
    const it = item(menu, line);
    let base = (it.name || line.name).replace(/\s*\(.*?\)\s*/g, " ")
      .replace(/\s+/g, " ").trim();
    const bits = [];
    (line.notes || []).forEach(n => {
      if (/^NO /.test(n)) bits.push("hold the " + n.slice(3).toLowerCase());
      else if (EGG_PREP[n]) bits.push(n);
      else if (/toast$/.test(n)) bits.push("on " + n.replace(/ toast$/, ""));
      else if (n === "hashbrowns") {
        const w = toppingWords(line);
        bits.push("plate scattered" + (w ? " " + w : ""));
      } else if (n !== "grits" && n !== "scattered") bits.push(n);
    });
    if (/^hb-/.test(line.itemId)) {
      const w = toppingWords(line);
      base = "hashbrowns scattered" + (w ? " " + w : "");
      if (line.itemId === "hb-double") base = "double " + base;
      if (line.itemId === "hb-triple") base = "triple " + base;
      if (line.itemId === "hb-atw") base = "hashbrowns scattered all the way";
      return base + (line.qty > 1 ? " on " + line.qty : "");
    }
    (line.mods || []).forEach(m => {
      const nm = (m.name || "").replace(/^\+\s*/, "");
      if (!TOPPINGS.some(t => t.key === nm)) bits.push(nm.toLowerCase());
      else if (!(line.notes || []).includes("hashbrowns")) {
        bits.push(TOPPINGS.find(t => t.key === nm).word);   // covered, smothered…
      }
    });
    return base + (line.qty > 1 ? " on " + line.qty : "") +
      (bits.length ? " — " + bits.join(", ") : "");
  }

  function buildCall(lines, menu, orderType) {
    const pulls = new Map();
    const drops = [];
    lines.forEach(l => {
      meatsIn(l, menu).forEach(m => {
        pulls.set(m.word, (pulls.get(m.word) || 0) + m.n * (l.qty || 1));
      });
      const it = item(menu, l);
      const hb = /^hb-/.test(l.itemId) || (l.notes || []).includes("hashbrowns") ||
        /hashbrown bowl/i.test(it.name || "");
      if (hb) {
        const size = l.itemId === "hb-double" ? 2 : l.itemId === "hb-triple" ? 3 :
          /hashbrown bowl/i.test(it.name || "") ? 2 : 1;
        const notes = (l.notes || []).join(" ");
        drops.push({
          n: size * (l.qty || 1),
          ring: /ring/.test(notes),
          cook: /light/.test(notes) ? "light" : /\bwell\b/.test(notes) ? "well" :
            /steam/.test(notes) ? "steamed" : null
        });
      }
    });

    const out = [];
    if (pulls.size) {
      out.push("PULL  " + [...pulls].map(([w, n]) => n + " " + w).join(", "));
    }
    const dropN = drops.reduce((s, d) => s + d.n, 0);
    if (dropN) {
      const ringN = drops.filter(d => d.ring).reduce((s, d) => s + d.n, 0);
      let call = "DROP  " + dropN;
      call += ringN === dropN ? " in the ring" : " scattered";
      if (ringN && ringN !== dropN) call += ", " + ringN + " in the ring";
      const makes = {};
      drops.forEach(d => { if (d.cook) makes[d.cook] = (makes[d.cook] || 0) + d.n; });
      const mk = Object.entries(makes).map(([c, n]) => "make " + n + " " + c);
      if (mk.length) call += " — " + mk.join(", ");
      out.push(call);
    }

    // MARK: top to bottom — longest-cooking food first (ticket row order)
    const order = (l) => {
      const p = explode(l, menu).find(x => x.primary);
      const i = ROWS.indexOf(p ? p.row : "OTHER");
      return i === 0 ? ROWS.length : i;     // bare hashbrowns call late, not first
    };
    const food = lines.filter(l => order(l) < ROWS.indexOf("BEVERAGES"))
      .sort((a, b) => order(a) - order(b));

    // ON / MAKE for waffles: combine the order's waffles into one call.
    // Waffles inside meals (All-Star) count too — the grill operator
    // needs the total number going on the irons.
    const waffles = food.filter(l => ABBR[l.itemId] && ABBR[l.itemId].row === "WAFFLES");
    const comboWaffles = food.reduce((s, l) => s + (waffles.includes(l) ? 0 :
      explode(l, menu).some(p => p.row === "WAFFLES") ? (l.qty || 1) : 0), 0);
    const rest = food.filter(l => !waffles.includes(l));
    const marks = rest.map(l => spoken(l, menu));
    if (waffles.length) {
      const n = comboWaffles + waffles.reduce((s, l) => s + (l.qty || 1) *
        (l.itemId === "waffle-double" ? 2 : 1), 0);
      if (n === 1) marks.push(spoken(waffles[0], menu).toLowerCase());
      else {
        let w = "waffle on " + n;
        waffles.forEach(l => {
          const special = { "waffle-pecan": "pecan", "waffle-choc": "chocolate chip",
            "waffle-pb": "peanut butter chip", "waffle-blueberry": "blueberry",
            "waffle-double": "like " + (l.qty || 1) * 2 }[l.itemId];
          if (special && l.itemId !== "waffle-double") {
            w += ", make " + (l.qty || 1) + " " + special;
          } else if (l.itemId === "waffle-double") {
            w += ", " + special;          // doubles share one plate: LIKE
          }
        });
        marks.push(w);
      }
    }
    if (marks.length) {
      const tag = orderType === "togo" ? "“TO-GO” — " : "";
      out.push("MARK  " + tag + marks.join("\n      "));
    }
    return out.join("\n") || "(nothing yet)";
  }

  root.WHTicket = { ROWS, buildGrid, buildCall, explode, hbAbbr };
})(typeof window !== "undefined" ? window : globalThis);
