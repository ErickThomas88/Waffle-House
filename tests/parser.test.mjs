// Parser smoke tests — run with: node tests/parser.test.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
eval(readFileSync(join(root, "data/prices.js"), "utf8"));
eval(readFileSync(join(root, "js/parser.js"), "utf8"));

const MENU = globalThis.WH_MENU;
const P = globalThis.WHParser;

let failures = 0;
function check(label, cond, extra) {
  if (cond) { console.log("  ok:", label); }
  else { failures++; console.error("  FAIL:", label, extra ?? ""); }
}
function total(res) {
  return res.lines.reduce((s, l) => s + P.lineTotal(l), 0);
}
function show(res) {
  return res.lines.map(l =>
    `${l.qty}x ${l.name} $${P.lineTotal(l).toFixed(2)}` +
    (l.mods.length ? ` [${l.mods.map(m => m.name + " " + m.price).join(", ")}]` : "") +
    (l.notes.length ? ` (${l.notes.join("; ")})` : "")).join(" | ");
}

console.log("\n1. All-Star with bacon, scrambled, wheat toast, hashbrowns + coffee");
let r = P.parse("all star special with bacon, eggs scrambled, wheat toast, hashbrowns smothered and covered, and a coffee", MENU);
console.log("  ", show(r));
check("2 lines (all-star + coffee)", r.lines.length === 2, show(r));
check("all-star is first", r.lines[0].itemId === "all-star");
check("bacon absorbed as note", r.lines[0].notes.includes("bacon"));
check("toast absorbed", r.lines[0].notes.some(n => n.includes("wheat")));
check("hashbrowns absorbed", r.lines[0].notes.includes("hashbrowns"));
check("smothered+covered charged $1.00", Math.abs(P.lineTotal(r.lines[0]) - 13.25) < 0.001, P.lineTotal(r.lines[0]));
check("coffee 2.50", Math.abs(P.lineTotal(r.lines[1]) - 2.50) < 0.001);

console.log("\n2. Hashbrowns scattered smothered covered (styles before item)");
r = P.parse("scattered smothered covered hashbrowns", MENU);
console.log("  ", show(r));
check("one line", r.lines.length === 1, show(r));
check("price 3.50 + 1.00", Math.abs(total(r) - 4.50) < 0.001, total(r));

console.log("\n3. Double cheeseburger and a sweet tea to go");
r = P.parse("double cheeseburger and a sweet tea to go", MENU);
console.log("  ", show(r));
check("two lines", r.lines.length === 2, show(r));
check("burger 9.00", Math.abs(P.lineTotal(r.lines[0]) - 9.00) < 0.001);
check("tea noted sweet", r.lines[1].notes.includes("sweet tea"));
check("order type togo", r.orderType === "togo");

console.log("\n4. Quantities: 2 waffles and 3 coffees");
r = P.parse("2 waffles and 3 coffees", MENU);
console.log("  ", show(r));
check("waffle qty 2", r.lines[0] && r.lines[0].qty === 2, show(r));
check("coffee qty 3", r.lines[1] && r.lines[1].qty === 3, show(r));
check("total 17.50", Math.abs(total(r) - 17.50) < 0.001, total(r));

console.log("\n5. All the way hashbrowns");
r = P.parse("hashbrowns all the way", MENU);
console.log("  ", show(r));
check("atw item", r.lines[0] && r.lines[0].itemId === "hb-atw", show(r));
check("price 6.25", Math.abs(total(r) - 6.25) < 0.001);

console.log("\n6. T-bone and eggs over medium with texas toast");
r = P.parse("t bone and eggs over medium with texas toast", MENU);
console.log("  ", show(r));
check("tbone-eggs item", r.lines[0] && r.lines[0].itemId === "tbone-eggs", show(r));
check("over medium note", r.lines[0] && r.lines[0].notes.includes("over medium"));
check("texas toast absorbed", r.lines[0] && r.lines[0].notes.some(n => n.includes("texas")));
check("total 16.75", Math.abs(total(r) - 16.75) < 0.001, total(r));

console.log("\n7. All-Star no eggs warning");
r = P.parse("all star special no eggs", MENU);
console.log("  ", show(r), "warnings:", r.warnings);
check("warning emitted", r.warnings.length === 1, r.warnings);
check("NO eggs note", r.lines[0] && r.lines[0].notes.some(n => n.startsWith("NO")));

console.log("\n8. Unknown item suggests");
r = P.parse("one flux capacitor", MENU);
check("unmatched captured", r.unmatched.length >= 1, JSON.stringify(r.unmatched));

console.log("\n9. Seats");
r = P.parse("seat 1 cheeseburger seat 2 grilled cheese and a chocolate milk", MENU);
console.log("  ", show(r));
check("seat1 burger", r.lines[0] && r.lines[0].seat === 1);
check("seat2 grilled cheese", r.lines[1] && r.lines[1].seat === 2, show(r));
check("seat2 choc milk", r.lines[2] && r.lines[2].seat === 2 && r.lines[2].itemId === "bev-choc-milk");

console.log("\n10. Bacon egg and cheese biscuit (multiword wins over side bacon)");
r = P.parse("bacon egg and cheese biscuit", MENU);
console.log("  ", show(r));
check("single line b-bacon-ec", r.lines.length === 1 && r.lines[0].itemId === "b-bacon-ec", show(r));
check("price 4.00", Math.abs(total(r) - 4.00) < 0.001);

console.log("\n11. Country ham sub on All-Star");
r = P.parse("all star with country ham", MENU);
console.log("  ", show(r));
check("upgraded to all-star-ch", r.lines[0] && r.lines[0].itemId === "all-star-ch", show(r));
check("price 14.00", Math.abs(total(r) - 14.00) < 0.001, total(r));

console.log("\n12. Two eggs over easy with bacon and white toast (a la carte)");
r = P.parse("two eggs over easy with a side of bacon and white toast", MENU);
console.log("  ", show(r));
check("3 lines", r.lines.length === 3, show(r));
check("total 3.25+4.25+2.50", Math.abs(total(r) - 10.00) < 0.001, total(r));

console.log("\n13. Cheese on hashbrowns via 'with cheese'");
r = P.parse("hashbrowns with cheese", MENU);
console.log("  ", show(r));
check("covered 0.50", Math.abs(total(r) - 4.00) < 0.001, total(r));

console.log("\n14. Pork chop dinner and a coke");
r = P.parse("pork chop dinner and a coke", MENU);
console.log("  ", show(r));
check("dinner + soda", r.lines.length === 2 && r.lines[0].itemId === "d-porkchop" && r.lines[1].itemId === "bev-soda", show(r));
check("coke alias noted", r.lines[1] && r.lines[1].notes.includes("coke"));
check("total 14.00", Math.abs(total(r) - 14.00) < 0.001, total(r));

console.log(failures ? `\n${failures} FAILURES` : "\nAll tests passed");
process.exit(failures ? 1 : 0);
