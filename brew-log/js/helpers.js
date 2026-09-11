/* ════════════════════════════════════════════
   HELPERS.JS — Formatting, parsing, and small pure utilities.
   No DOM state, no app state — safe to import from anywhere.
════════════════════════════════════════════ */

/** Formats seconds as "m:ss". */
export function fmt(seconds){
  seconds = Math.max(0, Math.round(seconds));
  var m = Math.floor(seconds / 60);
  var s = seconds % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}

/** Parses "mm:ss" or a bare integer of seconds. Returns null if invalid. */
export function parseMMSS(str){
  if(str == null) return null;
  str = String(str).trim();
  if(str === '') return null;
  if(/^\d+$/.test(str)) return parseInt(str, 10);
  var m = str.match(/^(\d+):([0-5]?\d)$/);
  if(m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  return null;
}

/** Parses a decimal number from a form field. Returns null if invalid/empty. */
export function parseNum(str){
  if(str == null) return null;
  str = String(str).trim();
  if(str === '') return null;
  var n = parseFloat(str);
  return isNaN(n) ? null : n;
}

/** "1:16.7" style brew ratio, or '' if either side is missing/invalid. */
export function ratioText(coffee, water){
  if(!coffee || !water || coffee <= 0 || water <= 0) return '';
  var r = water / coffee;
  return '1:' + (Math.round(r * 10) / 10);
}

/** "94°C" style temperature label, or '' if unset. */
export function tempText(value, unit){
  if(value === null || value === undefined || value === '') return '';
  return value + '°' + (unit === 'F' ? 'F' : 'C');
}

/** Sum of every stage's duration, in seconds. */
export function totalDuration(recipe){
  return recipe.stages.reduce(function(sum, st){ return sum + (st.seconds || 0); }, 0);
}

/** A short, likely-unique id for a new recipe. */
export function makeId(){
  return 'r-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Escapes text for safe insertion via innerHTML. */
export function escapeHtml(str){
  var div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

/** "method · 4:30 · 5 stages" — used by both the list card and the recipe detail header. */
export function stageSummary(recipe){
  var stageWord = recipe.stages.length === 1 ? 'stage' : 'stages';
  return escapeHtml(recipe.method || 'custom') +
    '<span class="dot">·</span>' + fmt(totalDuration(recipe)) +
    '<span class="dot">·</span>' + recipe.stages.length + ' ' + stageWord;
}

/** dose/water/ratio/temp/grind/equipment chips — used by the detail view and the timer modal. */
export function specsChipsHtml(recipe){
  var chips = [];
  if(recipe.coffeeGrams) chips.push('<b>' + escapeHtml(recipe.coffeeGrams) + ' g</b> coffee');
  if(recipe.waterGrams) chips.push('<b>' + escapeHtml(recipe.waterGrams) + ' g</b> water');
  var rt = ratioText(recipe.coffeeGrams, recipe.waterGrams);
  if(rt) chips.push(rt);
  var tt = tempText(recipe.waterTempValue, recipe.waterTempUnit);
  if(tt) chips.push(tt);
  if(recipe.grindSize) chips.push(escapeHtml(recipe.grindSize));
  if(recipe.equipment) chips.push(escapeHtml(recipe.equipment));
  return chips.map(function(c){ return '<span class="spec-chip">' + c + '</span>'; }).join('');
}
