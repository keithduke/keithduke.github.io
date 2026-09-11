/* ════════════════════════════════════════════
   STATE.JS — Recipe storage: the local, persisted source of truth.
   Every mutation goes through the exported functions here so persisting to
   localStorage never gets forgotten by a caller.
════════════════════════════════════════════ */
import { makeId } from './helpers.js';

var STORAGE_KEY = 'brewlog:recipes';

var DEFAULT_RECIPES = [
  {
    id: 'v60-4pour',
    name: 'V60, four pour',
    method: 'pour-over',
    coffeeGrams: 20,
    waterGrams: 300,
    waterTempValue: 94,
    waterTempUnit: 'C',
    grindSize: 'medium-fine, like kosher salt',
    equipment: 'Hario V60 02, paper filter',
    notes: 'A balanced, approachable everyday pour-over.',
    prep: [
      'Fold and seat the paper filter in the dripper',
      'Rinse the filter with hot water, then discard the rinse water',
      'Warm the dripper and mug with the rinse water',
      'Add ground coffee and give the bed a level shake',
      'Zero the scale with the dripper and empty mug on it'
    ],
    stages: [
      {name:'Bloom', seconds:45, weight:40, note:'saturate evenly, swirl'},
      {name:'Pour 1', seconds:30, weight:120, note:''},
      {name:'Pour 2', seconds:30, weight:200, note:''},
      {name:'Pour 3', seconds:30, weight:300, note:''},
      {name:'Drawdown', seconds:75, weight:null, note:'let it fully drain'}
    ]
  },
  {
    id: 'french-press',
    name: 'French press',
    method: 'immersion',
    coffeeGrams: 30,
    waterGrams: 500,
    waterTempValue: 96,
    waterTempUnit: 'C',
    grindSize: 'coarse, like sea salt',
    equipment: 'Standard French press',
    notes: '',
    prep: [
      'Preheat the carafe with hot water, then discard',
      'Add ground coffee to the empty carafe',
      'Zero the scale with the carafe on it'
    ],
    stages: [
      {name:'Steep', seconds:240, weight:500, note:'add all water, lid on, do not press'},
      {name:'Break crust', seconds:20, weight:null, note:'stir gently, skim the foam'},
      {name:'Plunge', seconds:20, weight:null, note:'press slowly and evenly'}
    ]
  },
  {
    id: 'aeropress',
    name: 'AeroPress, standard',
    method: 'immersion',
    coffeeGrams: 16,
    waterGrams: 220,
    waterTempValue: 85,
    waterTempUnit: 'C',
    grindSize: 'medium-fine',
    equipment: 'AeroPress, standard orientation, paper filter',
    notes: '',
    prep: [
      'Rinse the paper filter with hot water',
      'Attach the filter cap and set the chamber on your mug',
      'Zero the scale with everything in place'
    ],
    stages: [
      {name:'Bloom', seconds:30, weight:40, note:'stir three times'},
      {name:'Steep', seconds:60, weight:220, note:'insert plunger, do not press yet'},
      {name:'Press', seconds:30, weight:null, note:'press steadily until you hear a hiss'}
    ]
  }
];

function persist(){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes)); }catch(e){ /* storage unavailable, ignore */ }
}

function loadRecipes(){
  try{
    var raw = localStorage.getItem(STORAGE_KEY);
    if(!raw){
      var seeded = JSON.parse(JSON.stringify(DEFAULT_RECIPES));
      recipes = seeded;
      persist();
      return seeded;
    }
    var parsed = JSON.parse(raw);
    if(!Array.isArray(parsed)) throw new Error('bad data');
    return parsed;
  }catch(e){
    var fallback = JSON.parse(JSON.stringify(DEFAULT_RECIPES));
    recipes = fallback;
    persist();
    return fallback;
  }
}

var recipes = [];
recipes = loadRecipes();

/** The live recipes array. Treat as read-only — mutate through the functions below. */
export function getRecipes(){
  return recipes;
}

export function findRecipe(id){
  return recipes.find(function(r){ return r.id === id; });
}

/** Appends a new recipe, assigning it an id if it doesn't have one. Returns it. */
export function addRecipe(recipe){
  if(!recipe.id) recipe.id = makeId();
  recipes.push(recipe);
  persist();
  return recipe;
}

/** Inserts a new recipe right after `afterId` (falls back to appending). Returns it. */
export function insertRecipeAfter(afterId, recipe){
  if(!recipe.id) recipe.id = makeId();
  var idx = recipes.findIndex(function(r){ return r.id === afterId; });
  if(idx >= 0) recipes.splice(idx + 1, 0, recipe); else recipes.push(recipe);
  persist();
  return recipe;
}

/** Replaces the recipe with the given id in place (or appends if not found). Returns it. */
export function replaceRecipe(id, recipe){
  recipe.id = id;
  var idx = recipes.findIndex(function(r){ return r.id === id; });
  if(idx >= 0) recipes[idx] = recipe; else recipes.push(recipe);
  persist();
  return recipe;
}

export function removeRecipe(id){
  recipes = recipes.filter(function(r){ return r.id !== id; });
  persist();
}

/**
 * Validates and imports a raw parsed JSON payload (an array of recipes, or
 * `{ recipes: [...] }`). Every recipe is validated before any are imported.
 * Imported recipes always get a fresh id so they can never collide with (or
 * overwrite) an existing one — including the fixed ids on the seeded defaults.
 * Throws an Error with a user-facing message on anything invalid; returns the
 * array of imported recipes on success.
 */
export function importRecipes(parsed){
  var list = Array.isArray(parsed) ? parsed
    : (parsed && Array.isArray(parsed.recipes)) ? parsed.recipes
    : null;
  if(!list) throw new Error('That doesn’t look like a Brew Log export — expected a list of recipes.');
  var imported = [];
  for(var i = 0; i < list.length; i++){
    var r = list[i];
    if(!r || typeof r !== 'object' || !Array.isArray(r.stages)){
      throw new Error('Recipe ' + (i + 1) + ' in that file is missing its stages — stopped before importing anything.');
    }
    var copy = JSON.parse(JSON.stringify(r));
    copy.id = makeId();
    if(!Array.isArray(copy.prep)) copy.prep = [];
    imported.push(copy);
  }
  if(imported.length === 0) throw new Error('That file has no recipes in it.');
  recipes = recipes.concat(imported);
  persist();
  return imported;
}
