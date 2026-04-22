# Ingredient Hub — Marley Spoon

A customer-facing ingredient transparency page for Marley Spoon. Customers can search every ingredient used across all recipes.


## What this project does

Replaces the existing Looker Studio embed on `marleyspoon.com.au/ingredients/ingredient-hub` with a faster, more professional, and mobile-friendly page that reads live data directly from the internal Google Sheet.


## How it works

```
Google Sheet (source of truth)
        ↓
ingredients.js (Netlify Function — reads sheet securely)
        ↓
index.html (frontend — fetches data, renders table)
        ↓
Customer visits the live Netlify URL
```

1. A customer opens the page
2. `index.html` calls the Netlify Function at `/.netlify/functions/ingredients`
3. The function authenticates with Google using the Service Account credentials stored in Netlify environment variables
4. It fetches all rows from the Google Sheet and returns clean JSON
5. The page renders a searchable, filterable table — no page reload needed
6. If the function ever fails, the page falls back to embedded data so customers never see an error

---

## File structure

```
ingredient-hub/
├── index.html                        ← Frontend page (the customer-facing UI)
├── netlify.toml                      ← Netlify configuration
├── package.json                      ← Backend dependencies
└── netlify/
    └── functions/
        └── ingredients.js            ← Backend function (reads Google Sheet)
```

---

## File descriptions

### `index.html`
The complete frontend. Contains all HTML, CSS and JavaScript in a single file.

- Search bar — customers search by ingredient name, allergen, or recipe
- 4 filter dropdowns — delivery week, recipe, Australian origin %, allergen
- Sortable table — ingredient, ingredient list, Australian origin %, product contains, product may contain, recipes
- Recipe expand — click the recipe count pill on any row to see which recipes use that ingredient
- Falls back to embedded data if the API is unreachable
- Fully responsive — works on desktop, tablet and mobile/app

To connect to live data, find this line near the top of the script and paste the Netlify Function URL:
```javascript
const API_URL = 'https://your-site.netlify.app/.netlify/functions/ingredients';
```

---

### `netlify.toml`
Netlify configuration file. Tells Netlify two things:
1. Where the website files are (`publish = "."` — the root folder where `index.html` lives)
2. Where the backend functions are (`functions = "netlify/functions"` — the folder containing `ingredients.js`)

Without this file, Netlify would deploy the HTML page but completely ignore the backend function, and live data would not work.

**You do not need to edit this file.**

---

### `package.json`
Lists the external code libraries the backend needs before it can run. The only dependency is `googleapis` — Google's official Node.js library that handles authentication and reading from Google Sheets.

Netlify reads this file automatically during every deployment and installs everything listed under `dependencies`.

**You do not need to edit this file.**

---

### `netlify/functions/ingredients.js`
The secure backend function. This is the critical piece that makes live data work without exposing any credentials to the browser.

Step by step:
1. Reads the `GOOGLE_SERVICE_ACCOUNT` environment variable (the JSON key file you saved in Netlify settings)
2. Uses it to authenticate with the Google Sheets API
3. Fetches all rows from columns A–H of the Google Sheet
4. Deduplicates rows, parses allergen tags, converts origin to a number
5. Returns clean JSON to the HTML page
6. Caches the response for 1 hour to keep things fast

Column mapping from the sheet:
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

**You do not need to edit this file** unless the column structure of the Google Sheet changes.

---

## Environment variables (set in Netlify dashboard)

Go to **Site settings → Environment variables** and add these 3 variables:

| Variable | Value |
|----------|-------|
| `GOOGLE_SERVICE_ACCOUNT` | Paste the entire contents of the JSON key file downloaded from Google Cloud |
| `SHEET_ID` | `1fztXeVIoxACyaFv7iWIOLBzj8mjtc1--P5rXPLHkSio` |
| `SHEET_GID` | `1836129965` |

---

## Google Sheet

**File:** AU HUB - Main File  
**Link:** https://docs.google.com/spreadsheets/d/1fztXeVIoxACyaFv7iWIOLBzj8mjtc1--P5rXPLHkSio  
**Sheet tab:** GID 1836129965

The sheet must be shared with the Service Account email (from the JSON key file) with **Viewer** access. The Service Account email looks like:
```
ingredient-hub-reader@your-project.iam.gserviceaccount.com
```

---

## Refreshing the data

The page fetches live data from the sheet on every load — no manual refresh needed. If a new week is added to the sheet, it appears on the page automatically.

If the Netlify Function is unavailable for any reason, the page silently falls back to the last embedded dataset so customers always see something.

---

## Future: migrating to a Data Warehouse

When the team moves from Google Sheets to a DWH (e.g. BigQuery or Snowflake), only `ingredients.js` needs to change — replace the Google Sheets API call with a DWH query that returns the same JSON shape. The HTML frontend does not need to change at all.

The JSON shape the frontend expects:
```json
[
  {
    "recipe": "Recipe name",
    "ingredient": "Ingredient name",
    "ingredientList": "Full ingredient list text",
    "contains": ["Gluten", "Milk"],
    "mayContain": ["Soy", "Egg"],
    "origin": 100,
    "brand": "ms",
    "week": "07/04/2026"
  }
]
```

---

## Built with

- Vanilla HTML / CSS / JavaScript (no frameworks)
- Netlify Functions (Node.js serverless)
- Google Sheets API v4
- Hosted on Netlify

---

*April 2026*
