# Waffle House Order Pad

A personal web app that turns a spoken or typed Waffle House order into a
priced ticket. Built for personal use — not affiliated with Waffle House, Inc.

**Live site (once set up):** `https://erickthomas88.github.io/Waffle-House/`

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
- 📢 **Kitchen call-out** — a simple Pull / Drop / Mark cheat line.

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
```

Files:

| File | Purpose |
|---|---|
| `index.html` | App shell (Order + Prices tabs) |
| `data/prices.js` | The price sheet — **edit this when prices change** |
| `js/parser.js` | Free-text → ticket lines |
| `js/speech.js` | Web Speech API mic input |
| `js/app.js` | UI, totals, price editor |
| `tests/parser.test.mjs` | Parser smoke tests |

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
