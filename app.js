let RAW = [], filtered = [];
const cardExpanded = new Set();
const activeFilters = { week: '', recipe: '', ingredient: '' };
const dropdownOptions = { recipe: [], ingredient: [], week: [] };

async function loadData() {
  if (API_URL) {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      RAW = await res.json();
    } catch(e) {
      console.warn('API failed, using embedded data:', e.message);
      RAW = SHEET_DATA;
    }
  } else {
    RAW = SHEET_DATA;
  }
  initFilters();
  applyFilters();
}

// ── INIT FILTERS ──────────────────────────────────────────────────────────────
function initFilters() {
  // Week options
  dropdownOptions.week = [...new Set(RAW.map(r => r.week).filter(Boolean))].sort((a,b) => parseDate(a)-parseDate(b));
  // Recipe options
  dropdownOptions.recipe = [...new Set(RAW.map(r => r.recipe).filter(Boolean))].sort();
  // Ingredient options
  dropdownOptions.ingredient = [...new Set(RAW.map(r => r.ingredient).filter(Boolean))].sort();
}

function fmtWeek(w) {
  if (!w) return w;
  const [d,m,y] = w.split('/');
  const mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `Week of ${d} ${mo[parseInt(m,10)-1]} ${y}`;
}
function parseDate(s) {
  if (!s) return 0;
  const [d,m,y] = s.split('/').map(Number);
  return new Date(y,m-1,d).getTime();
}

// ── DROPDOWN CONTROLS ─────────────────────────────────────────────────────────
function onFilterType(key) {
  const q = document.getElementById(key+'Input').value.toLowerCase().trim();
  renderDropdown(key, q);
  // clear active filter if user clears the input
  if (!q) { activeFilters[key] = ''; applyFilters(); updateActiveBadges(); }
}

function openDropdown(key) {
  renderDropdown(key, document.getElementById(key+'Input').value.toLowerCase().trim());
}

function renderDropdown(key, q) {
  const input = document.getElementById(key+'Input');
  const drop  = document.getElementById(key+'Drop');

  // Cross-filter: narrow each dropdown based on the other two active filters
  let baseOpts = dropdownOptions[key];

  if (key === 'ingredient') {
    let rows = RAW;
    if (activeFilters.recipe) rows = rows.filter(r => r.recipe === activeFilters.recipe);
    if (activeFilters.week)   rows = rows.filter(r => r.week === activeFilters.week);
    const valid = new Set(rows.map(r => r.ingredient));
    baseOpts = baseOpts.filter(o => valid.has(o));
  }

  if (key === 'recipe') {
    let rows = RAW;
    if (activeFilters.ingredient) rows = rows.filter(r => r.ingredient === activeFilters.ingredient);
    if (activeFilters.week)       rows = rows.filter(r => r.week === activeFilters.week);
    const valid = new Set(rows.map(r => r.recipe));
    baseOpts = baseOpts.filter(o => valid.has(o));
  }

  if (key === 'week') {
    let rows = RAW;
    if (activeFilters.ingredient) rows = rows.filter(r => r.ingredient === activeFilters.ingredient);
    if (activeFilters.recipe)     rows = rows.filter(r => r.recipe === activeFilters.recipe);
    const valid = new Set(rows.map(r => r.week));
    baseOpts = baseOpts.filter(o => valid.has(o));
  }

  const opts = key === 'week' ? baseOpts : baseOpts.filter(o => !q || o.toLowerCase().includes(q));
  if (!opts.length) { drop.classList.remove('open'); return; }

  drop._opts = opts;

  const rect = input.getBoundingClientRect();
  drop.style.top   = (rect.bottom + window.scrollY + 4) + 'px';
  drop.style.left  = rect.left + 'px';
  drop.style.width = rect.width + 'px';
  drop.innerHTML = opts.slice(0, 60).map((o, i) =>
    `<div class="filter-option${activeFilters[key]===o?' selected':''}" data-key="${key}" data-idx="${i}" onmousedown="selectByIdx(this)">${esc(key === 'week' ? fmtWeek(o) : o)}</div>`
  ).join('');
  drop.classList.add('open');
}

function selectByIdx(el) {
  const key  = el.dataset.key;
  const idx  = parseInt(el.dataset.idx);
  const drop = document.getElementById(key+'Drop');
  const val  = drop._opts[idx];
  if (!val) return;
  activeFilters[key] = val;
  document.getElementById(key+'Input').value = key === 'week' ? fmtWeek(val) : val;
  drop.classList.remove('open');
  if (key === 'week') {
    const validRecipes = new Set(RAW.filter(r => r.week === val).map(r => r.recipe));
    const validIngreds = new Set(RAW.filter(r => r.week === val).map(r => r.ingredient));
    if (activeFilters.recipe && !validRecipes.has(activeFilters.recipe)) {
      activeFilters.recipe = ''; document.getElementById('recipeInput').value = '';
    }
    if (activeFilters.ingredient && !validIngreds.has(activeFilters.ingredient)) {
      activeFilters.ingredient = ''; document.getElementById('ingredientInput').value = '';
    }
  }
  // Refresh the other dropdown options after selection
  refreshDropdownOptions();
  applyFilters();
  updateActiveBadges();
}

function delayClose(key) {
  setTimeout(() => document.getElementById(key+'Drop').classList.remove('open'), 150);
}

document.addEventListener('click', e => {
  ['recipe','ingredient','week'].forEach(key => {
    if (!e.target.closest(`#${key}Wrap`)) document.getElementById(key+'Drop').classList.remove('open');
  });
});

// ── ACTIVE BADGES ─────────────────────────────────────────────────────────────
function updateActiveBadges() {
  const bar = document.getElementById('activeFilters');
  const badges = [];
  if (activeFilters.week) badges.push(`<span class="active-badge">${esc(fmtWeek(activeFilters.week))}<button class="badge-x" onclick="clearFilter('week')">✕</button></span>`);
  if (activeFilters.recipe) badges.push(`<span class="active-badge">${esc(truncate(activeFilters.recipe,40))}<button class="badge-x" onclick="clearFilter('recipe')">✕</button></span>`);
  if (activeFilters.ingredient) badges.push(`<span class="active-badge">${esc(activeFilters.ingredient)}<button class="badge-x" onclick="clearFilter('ingredient')">✕</button></span>`);
  bar.innerHTML = badges.join('');
}

function refreshDropdownOptions() {
  // When recipe changes, re-populate ingredient options to only matching ones
  // When ingredient changes, re-populate recipe options to only matching ones
  // This keeps both in sync without clearing the other filter
  dropdownOptions.recipe = [...new Set(RAW.map(r => r.recipe).filter(Boolean))].sort();
  dropdownOptions.ingredient = [...new Set(RAW.map(r => r.ingredient).filter(Boolean))].sort();
}

function clearFilter(key) {
  activeFilters[key] = '';
  if (key === 'week') document.getElementById('weekInput').value = '';
  if (key === 'recipe') document.getElementById('recipeInput').value = '';
  if (key === 'ingredient') document.getElementById('ingredientInput').value = '';
  applyFilters();
  updateActiveBadges();
}

function clearAllFilters() {
  activeFilters.week = ''; activeFilters.recipe = ''; activeFilters.ingredient = '';
  document.getElementById('weekInput').value = '';
  document.getElementById('recipeInput').value = '';
  document.getElementById('ingredientInput').value = '';
  applyFilters();
  updateActiveBadges();
}

function truncate(s, n) { return s.length > n ? s.slice(0,n)+'…' : s; }

// ── CONSOLIDATE ───────────────────────────────────────────────────────────────
function consolidate(rows) {
  const map = new Map();
  rows.forEach(r => {
    if (!r.ingredient) return;
    const key = r.ingredient.toLowerCase().trim();
    if (!map.has(key)) {
      map.set(key, {
        ingredient:     r.ingredient,
        ingredientList: r.ingredientList || '',
        origin:         r.origin ?? null,
        contains:       Array.isArray(r.contains)  ? [...r.contains]  : [],
        mayContain:     Array.isArray(r.mayContain) ? [...r.mayContain] : [],
        recipes:        [r.recipe],
        week:           r.week || '',
      });
    } else {
      const e = map.get(key);
      if (!e.recipes.includes(r.recipe)) e.recipes.push(r.recipe);
    }
  });
  return [...map.values()].sort((a,b) => a.ingredient.toLowerCase() < b.ingredient.toLowerCase() ? -1 : 1);
}

// ── APPLY FILTERS ─────────────────────────────────────────────────────────────
function applyFilters() {
  let rows = RAW;
  if (activeFilters.week)       rows = rows.filter(r => r.week === activeFilters.week);
  if (activeFilters.recipe)     rows = rows.filter(r => r.recipe === activeFilters.recipe);
  if (activeFilters.ingredient) rows = rows.filter(r => r.ingredient === activeFilters.ingredient);
  filtered = consolidate(rows);
  render();
}

// ── SET RECIPE FILTER (from card click) ───────────────────────────────────────
function filterByRecipe(idx) {
  const recipeName = window._recipeClickMap[idx];
  if (!recipeName) return;
  // Clear all other filters first
  activeFilters.ingredient = '';
  activeFilters.week = '';
  document.getElementById('ingredientInput').value = '';
  document.getElementById('weekInput').value = '';
  // Set recipe filter
  activeFilters.recipe = recipeName;
  document.getElementById('recipeInput').value = truncate(recipeName, 50);
  refreshDropdownOptions();
  applyFilters();
  updateActiveBadges();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function originBadge(v) {
  if (v===null||v===undefined) return `<span class="ob ob-na">Origin N/A</span>`;
  if (v===0)   return `<span class="ob ob-zero">Imported</span>`;
  if (v>=80)   return `<span class="ob ob-high">${v}% ${REGION_LABEL} Origin</span>`;
  if (v>=50)   return `<span class="ob ob-mid">${v}% ${REGION_LABEL} Origin</span>`;
               return `<span class="ob ob-zero">${v}% ${REGION_LABEL} Origin</span>`;
}

function scoreTags(arr) {
  if (!arr||!arr.length) return '';
  return arr.map(c=>`<span class="stag">${esc(c)}</span>`).join('');
}



// ── RENDER ────────────────────────────────────────────────────────────────────
function render() {
  const n = filtered.length;
  document.getElementById('resultCount').innerHTML = `Showing <strong>${n}</strong> ingredient${n!==1?'s':''}`;
  const grid  = document.getElementById('cardsGrid');
  const empty = document.getElementById('emptyState');
  if (!n) { grid.innerHTML=''; empty.style.display='block'; return; }
  empty.style.display='none';

  grid.innerHTML = filtered.map((row, idx) => {    const isOpen  = cardExpanded.has(idx);
    const hasC    = row.contains   && row.contains.length>0;
    const hasMC   = row.mayContain && row.mayContain.length>0;
    const isClean = !hasC && !hasMC;

    let scoreHtml = '';
    if (isClean) {
      scoreHtml = `<div class="score-row"><div class="score-block sb-clean">
        <div class="score-lbl">Allergen free</div>
        <span class="clean-txt">No allergens detected</span>
      </div></div>`;
    } else {
      const blocks = [];
      if (hasC)  blocks.push(`<div class="score-block sb-contains"><div class="score-lbl">Contains</div><div class="score-tags">${scoreTags(row.contains)}</div></div>`);
      if (hasMC) blocks.push(`<div class="score-block sb-may"><div class="score-lbl">May contain</div><div class="score-tags">${scoreTags(row.mayContain)}</div></div>`);
      scoreHtml = `<div class="score-row">${blocks.join('')}</div>`;
    }

    // Store recipe names safely for click handler (avoids quote escaping)
    window._recipeClickMap = window._recipeClickMap || {};
    const recipesHtml = row.recipes.map((r, ri) => {
      const mapIdx = idx * 1000 + ri;
      window._recipeClickMap[mapIdx] = r;
      return `<div class="recipe-item" onclick="filterByRecipe(${mapIdx})">
        <span class="recipe-arrow">↳</span>
        <span class="recipe-name">${esc(r)}</span>
      </div>`;
    }).join('') + `<span class="recipe-hint">tap a recipe to filter by it</span>`;

    return `<div class="score-card">
      <div class="card-header">
        <div class="card-top">
          <span class="card-name">${esc(row.ingredient)}</span>
          ${originBadge(row.origin)}
        </div>
        <div class="card-list">${esc(row.ingredientList)}</div>
      </div>
      ${scoreHtml}
      <div class="card-foot">
        <span class="foot-count">${row.recipes.length} recipe${row.recipes.length!==1?'s':''}</span>
        <button class="expand-btn ${isOpen?'open':''}" onclick="toggleCard(${idx})">
          View recipes <span class="chev">${isOpen?'↑':'↓'}</span>
        </button>
      </div>
      <div class="recipe-list ${isOpen?'open':''}">${recipesHtml}</div>
    </div>`;
  }).join('');
}

function toggleCard(idx) {
  if (cardExpanded.has(idx)) cardExpanded.delete(idx); else cardExpanded.add(idx);
  render();
}



loadData();
