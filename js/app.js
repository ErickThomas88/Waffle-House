// =====================================================================
// Waffle House Order Pad — UI controller
// =====================================================================
(function () {
  "use strict";

  const MENU = window.WH_MENU;
  const P = window.WHParser;
  const $ = (sel) => document.querySelector(sel);

  const OV_KEY = "wh-price-overrides";
  const TICKET_KEY = "wh-ticket";

  // ---------------- price overrides (this device only) ----------------
  let overrides = {};
  try { overrides = JSON.parse(localStorage.getItem(OV_KEY) || "{}"); } catch (e) { overrides = {}; }

  function applyOverrides() {
    MENU.items.forEach(it => {
      if (it.defaultPrice == null) it.defaultPrice = it.price;
      it.price = overrides[it.id] != null ? overrides[it.id] : it.defaultPrice;
    });
  }
  applyOverrides();

  // ---------------- ticket state ----------------
  let state = { lines: [], orderType: "dinein" };
  try {
    const saved = JSON.parse(localStorage.getItem(TICKET_KEY) || "null");
    if (saved && Array.isArray(saved.lines)) state = saved;
  } catch (e) { /* fresh ticket */ }

  function save() { localStorage.setItem(TICKET_KEY, JSON.stringify(state)); }
  const fmt = (n) => "$" + n.toFixed(2);
  const round2 = (n) => Math.round(n * 100) / 100;

  // ---------------- tabs ----------------
  document.querySelectorAll("nav button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("nav button").forEach(b => b.classList.toggle("active", b === btn));
      document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
      $("#" + btn.dataset.view).classList.add("active");
    });
  });

  // ---------------- order type ----------------
  function renderOrderType() {
    $("#btnDineIn").classList.toggle("active", state.orderType !== "togo");
    $("#btnToGo").classList.toggle("active", state.orderType === "togo");
  }
  $("#btnDineIn").addEventListener("click", () => { state.orderType = "dinein"; save(); renderAll(); });
  $("#btnToGo").addEventListener("click", () => { state.orderType = "togo"; save(); renderAll(); });

  // ---------------- alerts ----------------
  function showAlerts(res) {
    const box = $("#alerts");
    box.innerHTML = "";
    (res.warnings || []).forEach(w => {
      const d = document.createElement("div");
      d.className = "alert warn";
      d.textContent = "⚠ " + w;
      const ok = document.createElement("button");
      ok.className = "btn small secondary";
      ok.textContent = "OK";
      ok.style.marginLeft = "8px";
      ok.onclick = () => d.remove();
      d.appendChild(ok);
      box.appendChild(d);
    });
    (res.unmatched || []).forEach(u => {
      const d = document.createElement("div");
      d.className = "alert miss";
      d.innerHTML = `Didn't understand: <b>“${u.text}”</b>`;
      if (u.suggestions && u.suggestions.length) {
        const s = document.createElement("div");
        s.className = "suggestions";
        s.append("Did you mean: ");
        u.suggestions.forEach(it => {
          const b = document.createElement("button");
          b.textContent = `${it.name} ${fmt(it.price)}`;
          b.onclick = () => { addItem(it); d.remove(); };
          s.appendChild(b);
        });
        d.appendChild(s);
      }
      const ok = document.createElement("button");
      ok.className = "btn small secondary";
      ok.textContent = "Dismiss";
      ok.style.marginTop = "6px";
      ok.onclick = () => d.remove();
      d.appendChild(ok);
      box.appendChild(d);
    });
  }

  // ---------------- parsing ----------------
  $("#parseBtn").addEventListener("click", () => {
    const text = $("#orderText").value.trim();
    if (!text) return;
    const res = P.parse(text, MENU);
    state.lines.push(...res.lines);
    if (res.orderType) state.orderType = res.orderType;
    save();
    showAlerts(res);
    $("#orderText").value = "";
    renderAll();
  });

  function addItem(item) {
    state.lines.push({
      itemId: item.id, name: item.name, price: item.price, qty: 1,
      seat: 1, mods: [], notes: [],
      _hashbrowns: !!item.hashbrowns, _isOmelet: /^om-/.test(item.id),
      _meatSide: item.meatSide || null
    });
    save();
    renderAll();
  }

  // ---------------- ticket rendering ----------------
  let editingIdx = -1;

  function renderTicket() {
    const wrap = $("#ticketLines");
    wrap.innerHTML = "";
    if (!state.lines.length) {
      wrap.innerHTML = `<div class="empty">— ticket is empty —</div>`;
    }

    const seats = [...new Set(state.lines.map(l => l.seat || 1))];
    const showSeats = seats.length > 1;
    let lastSeat = null;

    state.lines.forEach((line, idx) => {
      if (showSeats && line.seat !== lastSeat) {
        lastSeat = line.seat;
        const sl = document.createElement("div");
        sl.className = "seat-label";
        sl.textContent = "SEAT " + line.seat;
        wrap.appendChild(sl);
      }

      const el = document.createElement("div");
      el.className = "tline" + (idx === editingIdx ? " editing" : "");

      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `<span class="qty">${line.qty}×</span>
        <span class="nm">${line.name}</span>
        <span class="amt">${fmt(P.lineTotal(line))}</span>`;
      el.appendChild(row);

      if (line.mods && line.mods.length) {
        const m = document.createElement("div");
        m.className = "mods";
        m.innerHTML = line.mods.map(x => `<span>${x.name} ${fmt(x.price)}</span>`).join("");
        el.appendChild(m);
      }
      if (line.notes && line.notes.length) {
        const n = document.createElement("div");
        n.className = "notes";
        n.textContent = line.notes.join(" · ");
        el.appendChild(n);
      }

      // ----- inline editor -----
      const ed = document.createElement("div");
      ed.className = "edit";
      ed.innerHTML = `
        <div class="erow">
          <label>Qty</label>
          <button class="qbtn" data-d="-1">−</button>
          <b class="qv">${line.qty}</b>
          <button class="qbtn" data-d="1">+</button>
          <label style="margin-left:10px">Price</label>
          <input type="number" step="0.05" min="0" value="${line.price.toFixed(2)}">
          <label>Seat</label>
          <button class="qbtn" data-s="-1">−</button>
          <b class="sv">${line.seat || 1}</b>
          <button class="qbtn" data-s="1">+</button>
        </div>
        <div class="erow">
          <button class="btn small del">Remove line</button>
          <button class="btn small secondary done">Done</button>
        </div>`;
      ed.addEventListener("click", e => e.stopPropagation());
      ed.querySelectorAll(".qbtn[data-d]").forEach(b => b.onclick = () => {
        line.qty = Math.max(1, line.qty + parseInt(b.dataset.d, 10));
        save(); renderAll();
      });
      ed.querySelectorAll(".qbtn[data-s]").forEach(b => b.onclick = () => {
        line.seat = Math.min(8, Math.max(1, (line.seat || 1) + parseInt(b.dataset.s, 10)));
        save(); renderAll();
      });
      ed.querySelector("input").addEventListener("change", (e) => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v) && v >= 0) { line.price = round2(v); save(); renderAll(); }
      });
      ed.querySelector(".del").onclick = () => {
        state.lines.splice(idx, 1); editingIdx = -1; save(); renderAll();
      };
      ed.querySelector(".done").onclick = () => { editingIdx = -1; renderAll(); };
      el.appendChild(ed);

      el.addEventListener("click", () => {
        editingIdx = editingIdx === idx ? -1 : idx;
        renderAll();
      });
      wrap.appendChild(el);
    });

    renderTotals();
    renderCallout();
    $("#ticketDate").textContent = new Date().toLocaleString([], {
      month: "numeric", day: "numeric", year: "2-digit", hour: "numeric", minute: "2-digit"
    }) + " · " + (state.orderType === "togo" ? "TO-GO" : "DINE-IN");
  }

  function totals() {
    const subtotal = round2(state.lines.reduce((s, l) => s + P.lineTotal(l), 0));
    const isTogo = state.orderType === "togo";
    const upcharge = isTogo ? round2(subtotal * MENU.toGoUpchargePct / 100) : 0;
    const serverShare = isTogo ? round2(subtotal * MENU.serverSharePct / 100) : 0;
    return { subtotal, upcharge, serverShare, total: round2(subtotal + upcharge), isTogo };
  }

  function renderTotals() {
    const t = totals();
    const box = $("#totals");
    let html = `<div class="trow"><span>Subtotal</span><span>${fmt(t.subtotal)}</span></div>`;
    if (t.isTogo) {
      html += `<div class="trow"><span>To-Go upcharge (${MENU.toGoUpchargePct}%)</span><span>${fmt(t.upcharge)}</span></div>`;
      html += `<div class="trow note"><span>↳ server's share (${MENU.serverSharePct}%)</span><span>${fmt(t.serverShare)}</span></div>`;
    }
    html += `<div class="trow grand"><span>TOTAL</span><span>${fmt(t.total)}</span></div>`;
    html += `<div class="trow note"><span>Tax already included in menu prices</span><span></span></div>`;
    box.innerHTML = html;
  }

  // ---------------- call-out (pull / drop / mark) ----------------
  function renderCallout() {
    const pulls = [], drops = [], marks = [];
    state.lines.forEach(l => {
      const q = l.qty > 1 ? l.qty + " " : "";
      const cat = (MENU.items.find(i => i.id === l.itemId) || {}).cat;
      if (l._meatSide || cat === "Side Meats") pulls.push(`${l.qty}× ${l.name.replace(/\s*\(.*\)/, "")}`);
      if (cat === "Burgers") pulls.push(`${l.qty}× quarter patty${l.name.toLowerCase().includes("double") ? " (double)" : ""}`);
      if (cat === "Dinners") pulls.push(`${l.qty}× ${l.name.replace(/ dinner.*/i, "")}`);
      (l.notes || []).forEach(n => {
        if (["bacon", "sausage", "chicken sausage", "city ham", "country ham"].includes(n)) pulls.push(`${l.qty}× ${n}`);
        if (n === "hashbrowns") drops.push(l.qty);
      });
      if (/^hb-/.test(l.itemId)) drops.push(l.qty);
      if (/hashbrown bowl/i.test(l.name)) drops.push(l.qty);
      marks.push(`${q}${l.name}${l.notes && l.notes.length ? " — " + l.notes.join(", ") : ""}` +
        (l.mods && l.mods.length ? " — " + l.mods.map(m => m.name).join(", ") : ""));
    });
    const dropCount = drops.reduce((a, b) => a + b, 0);
    let out = "";
    if (pulls.length) out += "PULL:  " + pulls.join(", ") + "\n";
    if (dropCount) out += "DROP:  " + dropCount + " hashbrown" + (dropCount > 1 ? "s" : "") + "\n";
    if (marks.length) out += "MARK:  " + marks.join("\n       ");
    $("#callout").textContent = out || "(nothing yet)";
  }

  // ---------------- ticket actions ----------------
  $("#clearBtn").addEventListener("click", () => {
    if (state.lines.length && !confirm("Clear the whole ticket?")) return;
    state.lines = [];
    editingIdx = -1;
    save();
    $("#alerts").innerHTML = "";
    renderAll();
  });

  $("#copyBtn").addEventListener("click", async () => {
    const t = totals();
    let txt = "WAFFLE HOUSE — " + (t.isTogo ? "TO-GO" : "DINE-IN") + "\n";
    txt += new Date().toLocaleString() + "\n----------------------------\n";
    const seats = [...new Set(state.lines.map(l => l.seat || 1))];
    state.lines.forEach(l => {
      const seatTag = seats.length > 1 ? `[seat ${l.seat}] ` : "";
      txt += `${l.qty}x ${seatTag}${l.name}  ${fmt(P.lineTotal(l))}\n`;
      (l.mods || []).forEach(m => txt += `     ${m.name} ${fmt(m.price)}\n`);
      if (l.notes && l.notes.length) txt += `     (${l.notes.join(", ")})\n`;
    });
    txt += "----------------------------\n";
    txt += `Subtotal  ${fmt(t.subtotal)}\n`;
    if (t.isTogo) {
      txt += `To-Go +${MENU.toGoUpchargePct}%  ${fmt(t.upcharge)}  (server share ${fmt(t.serverShare)})\n`;
    }
    txt += `TOTAL  ${fmt(t.total)}  (tax included)`;
    try {
      await navigator.clipboard.writeText(txt);
      $("#copyBtn").textContent = "Copied ✓";
      setTimeout(() => $("#copyBtn").textContent = "Copy ticket", 1500);
    } catch (e) {
      prompt("Copy the ticket text:", txt);
    }
  });

  // ---------------- manual add search ----------------
  const addSearch = $("#addSearch");
  const addResults = $("#addResults");
  addSearch.addEventListener("input", () => {
    const q = P.normalize(addSearch.value);
    addResults.innerHTML = "";
    if (q.length < 2) return;
    const hits = MENU.items.filter(it =>
      it.name.toLowerCase().includes(q) ||
      (it.aliases || []).some(a => a.includes(q))
    ).slice(0, 12);
    hits.forEach(it => {
      const d = document.createElement("div");
      d.innerHTML = `<span>${it.name}</span><span class="pr">${fmt(it.price)}</span>`;
      d.onclick = () => { addItem(it); addSearch.value = ""; addResults.innerHTML = ""; };
      addResults.appendChild(d);
    });
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".addwrap")) addResults.innerHTML = "";
  });

  // ---------------- prices view ----------------
  function renderPrices() {
    const wrap = $("#priceList");
    const q = P.normalize($("#priceSearch").value || "");
    wrap.innerHTML = "";
    const cats = [];
    MENU.items.forEach(it => { if (!cats.includes(it.cat)) cats.push(it.cat); });
    cats.forEach(cat => {
      const items = MENU.items.filter(it => it.cat === cat &&
        (!q || it.name.toLowerCase().includes(q) || (it.aliases || []).some(a => a.includes(q))));
      if (!items.length) return;
      const h = document.createElement("div");
      h.className = "pcat";
      h.textContent = cat;
      wrap.appendChild(h);
      items.forEach(it => {
        const row = document.createElement("div");
        row.className = "prow" + (overrides[it.id] != null ? " overridden" : "");
        row.innerHTML = `
          <span class="nm">${it.review ? '<span class="flag">⚠</span> ' : ""}${it.name}
            ${it.note ? `<small>${it.note}</small>` : ""}</span>
          <input type="number" step="0.05" min="0" value="${it.price.toFixed(2)}">`;
        row.querySelector("input").addEventListener("change", (e) => {
          const v = parseFloat(e.target.value);
          if (isNaN(v) || v < 0) { e.target.value = it.price.toFixed(2); return; }
          if (round2(v) === it.defaultPrice) delete overrides[it.id];
          else overrides[it.id] = round2(v);
          localStorage.setItem(OV_KEY, JSON.stringify(overrides));
          applyOverrides();
          renderPrices();
        });
        wrap.appendChild(row);
      });
    });
    const n = Object.keys(overrides).length;
    $("#ovCount").textContent = n
      ? `${n} price${n > 1 ? "s" : ""} changed on this device (red). Export or edit data/prices.js to share with everyone.`
      : "No local price changes. Edits here are saved on this device only.";
  }
  $("#priceSearch").addEventListener("input", renderPrices);

  $("#resetPrices").addEventListener("click", () => {
    if (!confirm("Reset all prices to the menu defaults?")) return;
    overrides = {};
    localStorage.setItem(OV_KEY, "{}");
    applyOverrides();
    renderPrices();
  });

  $("#exportPrices").addEventListener("click", () => {
    const clean = MENU.items.map(it => {
      const c = Object.assign({}, it);
      delete c.defaultPrice;
      return c;
    });
    const data = {
      effectiveDate: MENU.effectiveDate, menuCode: MENU.menuCode,
      taxIncluded: MENU.taxIncluded, toGoUpchargePct: MENU.toGoUpchargePct,
      serverSharePct: MENU.serverSharePct, items: clean, mods: MENU.mods,
      hashbrownStyles: MENU.hashbrownStyles, hashbrownToppings: MENU.hashbrownToppings,
      eggStyles: MENU.eggStyles, toastPrefs: MENU.toastPrefs
    };
    const body = "// Waffle House price sheet (exported from the app on " +
      new Date().toLocaleDateString() + ")\n" +
      "(function (root) {\n  root.WH_MENU = " +
      JSON.stringify(data, null, 2).replace(/\n/g, "\n  ") +
      ";\n})(typeof window !== \"undefined\" ? window : globalThis);\n";
    const blob = new Blob([body], { type: "text/javascript" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "prices.js";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  // ---------------- mic ----------------
  WHSpeech.setup($("#micBtn"), $("#orderText"));

  // ---------------- boot ----------------
  $("#effDate").textContent = "prices effective " + MENU.effectiveDate;
  function renderAll() { renderOrderType(); renderTicket(); }
  renderAll();
  renderPrices();
})();
