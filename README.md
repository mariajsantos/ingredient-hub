# Ingredient Hub — Marley Spoon

A multi-region ingredient transparency tool for Marley Spoon. Each region gets its own page where customers can search and filter every ingredient used across all recipes — origin %, allergens, delivery week, and more.

---

## How it works

```
Google Sheet (source of truth)
        ↓
netlify/functions/ingredients.js  (reads sheet securely, returns JSON)
        ↓
app.js  (shared logic — filters, dropdowns, card rendering)
app.css (shared styles)
        ↓
index.html / de.html / gb.html …  (one shell per region — data + config only)
        ↓
Customer visits the page on GitHub Pages
```

1. A customer opens the page
2. `index.html` tries to fetch live data from `API_URL`
3. If the fetch fails (or `API_URL` is empty), it falls back to the embedded `SHEET_DATA`
4. Filters, search, and allergen cards render client-side — no page reload

---

## File structure

```
ingredient-hub/
├── index.html                    ← AU region shell (data + config)
├── app.css                       ← Shared styles — all regions
├── app.js                        ← Shared logic  — all regions
├── DOCUMENTATION.txt             ← Full technical documentation
├── Header-4.jpg                  ← Hero banner image (source file)
├── netlify.toml                  ← Netlify config
├── package.json                  ← Backend dependencies
└── netlify/
    └── functions/
        └── ingredients.js        ← Backend function (reads Google Sheet)
```

---

## File descriptions

### `app.css`
All visual styles for the app. **Shared across every region.**  
Edit once → every region file gets the update automatically.

Covers: brand colour variables, hero/header, filter inputs, dropdowns, ingredient cards, allergen tags, origin badges, responsive layout.

---

### `app.js`
All JavaScript logic. **Shared across every region.**  
Reads `API_URL`, `REGION_LABEL`, and `SHEET_DATA` from whichever region shell loaded it.

Key functions:
- `loadData()` — fetches API or falls back to embedded data
- `renderDropdown()` — cross-filtering: each dropdown narrows based on the other active filters
- `selectByIdx()` — handles selection + cascading filter invalidation
- `applyFilters()` — filters RAW rows and re-renders cards
- `consolidate()` — merges duplicate ingredient rows into one card per ingredient
- `render()` — builds all ingredient cards
- `originBadge()` — shows origin % using `REGION_LABEL` (e.g. "85% AU Origin")
- `clearAllFilters()` — resets all three filters at once

---

### `index.html` (and future `de.html`, `gb.html`, …)
The only file that differs per region. It contains:

1. Page `<title>` with region name
2. `<link>` to `app.css` and `<script src="app.js">`
3. The full HTML layout (filters, cards grid, footer) — identical across regions
4. Hero banner image (base64 embedded)
5. A config `<script>` block with three region-specific values:

```javascript
const API_URL      = '';     // Live data URL, or '' to use embedded data
const REGION_LABEL = 'AU';   // Shown in origin % badges on cards
const SHEET_DATA   = [...];  // Embedded fallback data
```

---

### `netlify/functions/ingredients.js`
Secure backend function — reads the Google Sheet without exposing credentials to the browser.

1. Reads the `GOOGLE_SERVICE_ACCOUNT` env variable
2. Authenticates with the Google Sheets API
3. Fetches all rows from columns A–H
4. Parses allergens, converts origin to a number, deduplicates
5. Returns clean JSON — response cached for 1 hour

Column mapping:

| Column | Field |
|--------|-------|
| A | Recipe Name |
| B | Ingredient Name |
| C | Ingredient List |
| D | Product Contains |
| E | Product May Contain |
| F | Australian Origin % |
| G | Recipe Brand |
| H | Week Start Day |

**Only edit this file if the sheet column structure changes.**

---

### `netlify.toml`
Tells Netlify where the HTML files and backend functions live. No edits needed.

### `package.json`
Lists backend dependencies (`googleapis`). Netlify installs these automatically on deploy. No edits needed.

---

## Environment variables (Netlify dashboard)

Go to **Site settings → Environment variables** and set:

| Variable | Value |
|----------|-------|
| `GOOGLE_SERVICE_ACCOUNT` | Full contents of the JSON key file from Google Cloud |
| `SHEET_ID` | `1fztXeVIoxACyaFv7iWIOLBzj8mjtc1--P5rXPLHkSio` |
| `SHEET_GID` | `1836129965` |

---

## Google Sheet

**File:** AU HUB - Main File  
**Sheet tab:** GID 1836129965

The sheet must be shared with the Service Account email (from the JSON key file) with **Viewer** access:
```
ingredient-hub-reader@your-project.iam.gserviceaccount.com
```

---

## Adding a new region

> Full detail in `DOCUMENTATION.txt`. Quick version:

**1. Duplicate `index.html` → e.g. `de.html`**

**2. Change the `<title>`:**
```html
<title>Ingredient Hub — Marley Spoon DE</title>
```

**3. Update the config block** (bottom of the file, just before `</body>`):
```javascript
const API_URL      = '';      // DE sheet URL or leave empty
const REGION_LABEL = 'DE';   // Appears in origin badges
const SHEET_DATA   = [...];  // Paste DE data here
```

**4. Update the footer text** — change "Australia" to the region name.

**5. Commit and push:**
```bash
git add de.html
git commit -m "add DE region"
git push
```

The new page is live at:
`mariajsantos.github.io/ingredient-hub/de.html`

`app.css` and `app.js` are shared — any UI fix applies to all regions automatically.

---

## Data format

The JSON shape expected by `app.js`:

```json
[
  {
    "recipe":         "Recipe name",
    "ingredient":     "Ingredient name",
    "ingredientList": "Full label text",
    "contains":       ["Gluten", "Milk"],
    "mayContain":     ["Soy", "Egg"],
    "origin":         100,
    "brand":          "ms",
    "week":           "07/04/2026"
  }
]
```

---

## Future: migrating to a Data Warehouse

When moving from Google Sheets to a DWH (BigQuery, Snowflake, etc.), only `ingredients.js` needs to change — replace the Sheets API call with a query that returns the same JSON shape above. `app.js`, `app.css`, and all region files stay untouched.

---

## Built with

- Vanilla HTML / CSS / JavaScript (no frameworks)
- Netlify Functions (Node.js serverless backend)
- Google Sheets API v4
- Hosted on GitHub Pages

---

*May 2026*
