// Ticket-writing + Pull/Drop/Mark call tests — run with: node tests/ticket.test.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
eval(readFileSync(join(root, "data/prices.js"), "utf8"));
eval(readFileSync(join(root, "js/parser.js"), "utf8"));
eval(readFileSync(join(root, "js/ticket.js"), "utf8"));

const MENU = globalThis.WH_MENU;
const P = globalThis.WHParser;
const T = globalThis.WHTicket;

let failures = 0;
function check(label, cond, extra) {
  if (cond) { console.log("  ok:", label); }
  else { failures++; console.error("  FAIL:", label, extra ?? ""); }
}
function cell(grid, row, seat) {
  const r = grid.rows.find(x => x.name === row);
  return (r.cells[seat] || []).join(" ");
}

// ---- the training-packet 4-top (one customer per seat) ----
console.log("\n1. Four-top: All-Star / T-Bone & Eggs / Tx SEC melt / Cheese N Eggs");
const lines = [];
const add = (txt, seat) => {
  const r = P.parse(txt, MENU);
  r.lines.forEach(l => { l.seat = seat; });
  lines.push(...r.lines);
};
add("all star special with bacon, eggs scrambled, raisin toast, hashbrowns smothered covered, and a coffee", 1);
add("t bone and eggs over medium, hashbrowns, wheat toast, and a sweet tea", 2);
add("sausage egg and cheese texas melt, covered hashbrowns, and a coke", 3);
add("cheese and eggs breakfast scrambled, a waffle, and an orange juice", 4);

const grid = T.buildGrid(lines, MENU);
console.log("   total:", grid.total.toFixed(2));
check("seat 1 hashbrowns √ssc", cell(grid, "HASHBROWNS", 1) === "√ssc", cell(grid, "HASHBROWNS", 1));
check("seat 1 eggs SCR r", cell(grid, "EGGS", 1) === "SCR r", cell(grid, "EGGS", 1));
check("seat 1 bacon B", cell(grid, "HAM BACON SAUSAGE", 1) === "B");
check("seat 1 waffle W", cell(grid, "WAFFLES", 1) === "W");
check("seat 2 T on dinner meats", cell(grid, "DINNER MEATS", 2) === "T");
check("seat 2 eggs OM w", cell(grid, "EGGS", 2) === "OM w", cell(grid, "EGGS", 2));
check("seat 2 hashbrowns √s", cell(grid, "HASHBROWNS", 2) === "√s", cell(grid, "HASHBROWNS", 2));
check("seat 3 TxSEC", cell(grid, "SANDWICHES", 3) === "TxSEC");
check("seat 3 hashbrowns √sc", cell(grid, "HASHBROWNS", 3) === "√sc", cell(grid, "HASHBROWNS", 3));
check("seat 3 coke Ck", cell(grid, "BEVERAGES", 3) === "Ck");
check("seat 4 eggs SCRC", cell(grid, "EGGS", 4) === "SCRC", cell(grid, "EGGS", 4));
check("seat 4 waffle W", cell(grid, "WAFFLES", 4) === "W");
check("seat 4 OJ O", cell(grid, "BEVERAGES", 4) === "O");
check("seat 2 sweet tea ST", cell(grid, "BEVERAGES", 2) === "ST", cell(grid, "BEVERAGES", 2));

const call = T.buildCall(lines, MENU, "dinein");
console.log(call.split("\n").map(l => "   | " + l).join("\n"));
check("pulls T-bone", /PULL.*1 T-bone/.test(call), call);
check("pulls bacon", /PULL.*1 bacon/.test(call));
check("pulls sausage", /PULL.*1 sausage/.test(call));
check("drops 3 scattered", /DROP\s+3 scattered/.test(call), call);
check("T-bone called before All-Star", call.indexOf("T-Bone") < call.indexOf("All-Star"));
check("all-star plate scattered smothered covered",
  /All-Star.*plate scattered smothered covered/.test(call), call);
check("waffle on 2", /waffle on 2/i.test(call), call);

// ---- ON / MAKE: two waffles, one chocolate chip ----
console.log("\n2. Waffle ON / MAKE");
let r = P.parse("a waffle and a chocolate chip waffle", MENU);
let c = T.buildCall(r.lines, MENU, "dinein");
console.log("   |", c.replace(/\n/g, " | "));
check("waffle on 2, make 1 chocolate chip", /waffle on 2, make 1 chocolate chip/.test(c), c);

// ---- HOLD ----
console.log("\n3. HOLD: patty melt no onions");
r = P.parse("texas patty melt no onions", MENU);
c = T.buildCall(r.lines, MENU, "dinein");
console.log("   |", c.replace(/\n/g, " | "));
check("pulls 1 quarter", /PULL\s+1 quarter/.test(c), c);
check("hold the onions", /hold the onions/.test(c), c);
const g3 = T.buildGrid(r.lines, MENU);
check("ticket shows TxPM ⊘onions", cell(g3, "SANDWICHES", 1) === "TxPM ⊘onions", cell(g3, "SANDWICHES", 1));

// ---- TO-GO + double burger pulls 2 patties ----
console.log("\n4. TO-GO double cheeseburger");
r = P.parse("double cheeseburger to go", MENU);
c = T.buildCall(r.lines, MENU, r.orderType);
console.log("   |", c.replace(/\n/g, " | "));
check("pulls 2 quarter", /PULL\s+2 quarter/.test(c), c);
check("marks TO-GO first", /MARK\s+“TO-GO”/.test(c), c);

// ---- hashbrown sizes & in-the-ring drops ----
console.log("\n5. Hashbrowns: double in the ring + scattered well");
const hb1 = P.parse("double hashbrowns", MENU).lines[0];
hb1.notes.push("in the ring");
const hb2 = P.parse("hashbrowns", MENU).lines[0];
hb2.notes.push("well");
c = T.buildCall([hb1, hb2], MENU, "dinein");
console.log("   |", c.replace(/\n/g, " | "));
check("drop 3 total, 2 in the ring", /DROP\s+3 scattered, 2 in the ring/.test(c), c);
check("make 1 well", /make 1 well/.test(c), c);
check("ring abbr √√", T.hbAbbr(hb1, 2) === "√√", T.hbAbbr(hb1, 2));
check("well abbr √sw", T.hbAbbr(hb2, 1) === "√sw", T.hbAbbr(hb2, 1));

// ---- bowls drop hashbrowns and pull their meat ----
console.log("\n6. Bacon hashbrown bowl");
r = P.parse("bacon hashbrown bowl", MENU);
c = T.buildCall(r.lines, MENU, "dinein");
console.log("   |", c.replace(/\n/g, " | "));
check("pulls bacon", /PULL\s+1 bacon/.test(c), c);
check("drops 2 (double in the bowl)", /DROP\s+2 scattered/.test(c), c);
const g6 = T.buildGrid(r.lines, MENU);
check("bowl abbr √√s2c+B", cell(g6, "BOWLS", 1) === "√√s2c+B", cell(g6, "BOWLS", 1));

console.log("");
if (failures) { console.error(failures + " test(s) failed"); process.exit(1); }
console.log("All ticket tests passed ✔");
