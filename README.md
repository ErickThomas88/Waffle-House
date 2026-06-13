# Waffle House Order Pad

A personal web app that turns a spoken or typed Waffle House order into a
priced ticket. Built for personal use — not affiliated with Waffle House, Inc.

**Live site (once set up):** `https://erickthomas88.github.io/Waffle-House/`

**Single-file build:** [`waffle-house.html`](waffle-house.html) is the whole app
in one self-contained file (CSS + JS inlined, no external references). Use it to
**prototype as a Claude artifact on your phone**: open `waffle-house.html`, copy
all of it, paste into the Claude app, and ask Claude to "run this as an HTML
artifact." It also works by itself — open the file in any browser, online or off.
Regenerate it after editing the source with `node tools/build-artifact.mjs`.

## What it does

- 🎤 **Voice or typing** — tap the mic and say the order, or type it.
  Finalized speech lands in the text box so you can fix mis-heard words
  before adding it to the ticket.
- 🧾 **Priced ticket** — items are matched against the current price sheet
  (menu code CAT-2P-26-124, effective **5/4/2026**) and shown as a Waffle
  House-style guest check with a price per line and a total.
- 🥔 **Knows the lingo** — scattered / smothered / covered / chunked / diced /
  peppered / capped / topped / country / all-the-way hashbrowns (toppings
  priced at $0.50 each), egg styles, toast choices, "all star with bacon",
  quantities ("two waffles"), and more.
- 🍽 **Dine-in / To-Go** — To-Go adds a **20% upcharge**; the ticket shows
  that half of it (**10% of the food subtotal**) is the server's share.
  Taxes are already included in menu prices, so there is no tax line.
- 👥 **Seats** — say "seat 2" before items to split a ticket between people.
- ✏️ **Manual fixes** — tap any ticket line to change quantity, price, or
  seat, or remove it; add items via the search box if parsing missed one.
- ⚠️ **Edge cases** — e.g. "All-Star, no eggs" triggers a warning that it's
  really just a waffle + sides.
- 📢 **Write it & call it** — renders the order on the official 2026
  "ORDER BEFORE DRINKS!" guest-check grid (one column per customer, packet
  abbreviations, amount per row, total) and generates the exact Three-Part
  Call-In: **PULL** the meats first, **DROP** the hashbrowns
  (scattered / in the ring / light / well / steamed), then **MARK** the
  order top-to-bottom — longest-cooking food first — with the
  **ON / MAKE / LIKE / HOLD / TO-GO** call terms from the training packet.

## Updating prices when Waffle House changes them

Two ways:

1. **Just for your device:** open the **Prices** tab in the app, tap a price,
   type the new one. Changes are saved in your browser (shown in red).
2. **For everyone using the site:** edit [`data/prices.js`](data/prices.js)
   on GitHub (each item is one line with a `price:` value), commit to `main`,
   and the site redeploys automatically. The **Export prices.js** button in
   the Prices tab can generate the updated file for you from your local edits.

## One-time setup (site hosting)

1. Make this repository **Public** (Settings → General → Danger Zone →
   Change visibility) — free GitHub Pages needs a public repo.
2. Merge this branch into `main`.
3. Go to Settings → Pages and set **Source: GitHub Actions** (the included
   workflow will usually enable this automatically on the first run).
4. The site appears at `https://erickthomas88.github.io/Waffle-House/`.
   Open it on your phone, tap Share → **Add to Home Screen** for an app feel.

> The mic needs HTTPS + mic permission; it works in Chrome (Android/desktop)
> and Safari (iPhone/iPad). Everything else works in any modern browser.

## Development

No build step — plain HTML/CSS/JS.

```bash
python3 -m http.server          # then open http://localhost:8000
node tests/parser.test.mjs      # parser smoke tests
node tests/ticket.test.mjs      # ticket writing + call tests
node tools/build-artifact.mjs   # regenerate the single-file waffle-house.html
```

Files:

| File | Purpose |
|---|---|
| `index.html` | App shell (Order + Prices tabs) |
| `data/prices.js` | The price sheet — **edit this when prices change** |
| `js/parser.js` | Free-text → ticket lines |
| `js/ticket.js` | Official ticket abbreviations + Pull/Drop/Mark call |
| `js/speech.js` | Web Speech API mic input |
| `js/app.js` | UI, totals, price editor |
| `tools/build-artifact.mjs` | Bundles everything into `waffle-house.html` |
| `waffle-house.html` | **Generated** single-file build (artifact-ready) |
| `tests/parser.test.mjs` | Parser smoke tests |
| `tests/ticket.test.mjs` | Ticket grid + call-in tests |

> The single-file build installs an in-memory `localStorage` fallback so it
> still runs inside a sandboxed artifact iframe (where browser storage can be
> blocked). In the sandbox the mic and saved tickets may be unavailable, but
> typing orders, pricing, the guest-check grid, and the call all work.

### Ticket-writing cheat sheet (from the training packet)

- **Rows on the 2026 check:** HASHBROWNS (the *drop*), BOWLS, DINNER MEATS,
  SANDWICHES, OMELETS, EGGS, WAFFLES, HAM BACON SAUSAGE, OTHER, BEVERAGES.
  The PULL line across the top tallies meats: K T D P CH CS Q S SS B Kp H.
- **Hashbrowns:** `√` in the ring · `√s` scattered · add `l/w/m` for
  light/well/steamed · then one lower-case letter per topping in
  s-c-h-d-p-a-t-g order (smothered onions, covered cheese, chunked ham,
  diced tomatoes, peppered, capped mushrooms, topped chili, country gravy).
- **Eggs:** UP, OL, OM, OW, SCR, SCRL, SCRW, SCRC — egg meals come with
  grits & white toast automatically; only write toast/grits if different
  (`w` wheat, `r` raisin, `Tx` Texas — white toast gets no abbreviation).
- **Hold = ⊘** around the abbreviation · **on-the-side = circle it** ·
  to-go = "TO-GO" with a line through the check.
- **The call:** stand on the mark → `PULL` meats (count + meat) → `DROP`
  hashbrowns (count + scattered/in-the-ring + light/well/steamed) → `MARK`
  the full order, top to bottom, longest-cooking first; `ON n` for
  duplicates, `MAKE n` for variations, `LIKE n` for same plate.

## Price-sheet notes

Prices were transcribed from photos of the in-store price sheets
(menu code CAT-2P-26-124, effective 5/4/2026) and cross-checked against the
menu's own math (e.g. *Country Ham & Eggs = side price $6.00 + 2-egg
breakfast $6.75 = $12.75*). A couple of featured-special plates were hard to
read on the photos and are flagged with ⚠ in the Prices tab — worth
double-checking against the real sheet:

- Tx Bacon Patty Melt Plate · Tx Bacon Cheesesteak Melt Plate ·
  Tx Bacon Chicken Melt Plate
- "Cheesesteak Deluxe Plate" appeared once on a blurry photo and is not
  included; add it in `data/prices.js` if your store runs it

If you spot a wrong price, fix it in the Prices tab (or `data/prices.js`).
