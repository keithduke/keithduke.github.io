/* ════════════════════════════════════════════
   LIST-VIEW.JS — Recipe list, plus export/import backup.
   localStorage is the only place recipes live, so export/import is the one
   thing standing between a cleared browser and losing every custom recipe.
════════════════════════════════════════════ */
import { fmt, ratioText, tempText, escapeHtml, stageSummary } from './helpers.js';
import { getRecipes, removeRecipe, importRecipes } from './state.js';
import { openDetail } from './detail-view.js';
import { openEditor } from './editor-view.js';

var recipeListEl = document.getElementById('recipeList');
var emptyStateEl = document.getElementById('emptyState');
var emptyNewBtn = document.getElementById('emptyNewBtn');
var exportBtn = document.getElementById('exportBtn');
var importBtn = document.getElementById('importBtn');
var importFileInput = document.getElementById('importFileInput');

export function renderList(){
  var recipes = getRecipes();
  recipeListEl.innerHTML = '';
  if(recipes.length === 0){
    emptyStateEl.hidden = false;
    return;
  }
  emptyStateEl.hidden = true;

  recipes.forEach(function(recipe){
    var card = document.createElement('div');
    card.className = 'recipe-card';

    var top = document.createElement('div');
    top.className = 'recipe-card-top';

    var openBtn = document.createElement('button');
    openBtn.className = 'recipe-card-btn';
    openBtn.setAttribute('aria-label', 'View ' + (recipe.name || 'recipe'));
    openBtn.addEventListener('click', function(){ openDetail(recipe); });

    var nameEl = document.createElement('span');
    nameEl.className = 'recipe-name';
    nameEl.textContent = recipe.name || 'Untitled recipe';
    var metaEl = document.createElement('div');
    metaEl.className = 'recipe-meta';
    metaEl.innerHTML = stageSummary(recipe);
    openBtn.appendChild(nameEl);
    openBtn.appendChild(metaEl);

    var ingParts = [];
    if(recipe.coffeeGrams && recipe.waterGrams){
      ingParts.push(recipe.coffeeGrams + 'g : ' + recipe.waterGrams + 'g');
      var rt = ratioText(recipe.coffeeGrams, recipe.waterGrams);
      if(rt) ingParts.push(rt);
    } else if(recipe.coffeeGrams){
      ingParts.push(recipe.coffeeGrams + 'g coffee');
    } else if(recipe.waterGrams){
      ingParts.push(recipe.waterGrams + 'g water');
    }
    var tt = tempText(recipe.waterTempValue, recipe.waterTempUnit);
    if(tt) ingParts.push(tt);
    if(recipe.grindSize) ingParts.push(recipe.grindSize);
    if(ingParts.length){
      var ingEl = document.createElement('div');
      ingEl.className = 'recipe-ingredients';
      ingEl.innerHTML = ingParts.map(escapeHtml).join('<span class="dot">·</span>');
      openBtn.appendChild(ingEl);
    }
    if(recipe.notes){
      var notesEl = document.createElement('div');
      notesEl.className = 'recipe-notes';
      notesEl.textContent = recipe.notes;
      openBtn.appendChild(notesEl);
    }

    var removeBtn = document.createElement('button');
    removeBtn.className = 'recipe-remove';
    removeBtn.setAttribute('aria-label', 'Delete ' + (recipe.name || 'recipe'));
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', function(){
      if(confirm('Delete "' + (recipe.name || 'this recipe') + '"?')){
        removeRecipe(recipe.id);
        renderList();
      }
    });

    top.appendChild(openBtn);
    top.appendChild(removeBtn);
    card.appendChild(top);

    recipeListEl.appendChild(card);
  });
}

emptyNewBtn.addEventListener('click', function(){ openEditor(null, 'list'); });

/* ---------------- Backup: export / import ---------------- */

exportBtn.addEventListener('click', function(){
  var data = JSON.stringify(getRecipes(), null, 2);
  var blob = new Blob([data], {type:'application/json'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'brew-log-recipes-' + new Date().toISOString().slice(0,10) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

importBtn.addEventListener('click', function(){
  importFileInput.value = ''; // clear so re-picking the same file still fires 'change'
  importFileInput.click();
});

importFileInput.addEventListener('change', function(){
  var file = importFileInput.files && importFileInput.files[0];
  if(!file) return;
  var reader = new FileReader();
  reader.onload = function(){
    var parsed;
    try{
      parsed = JSON.parse(String(reader.result));
    }catch(e){
      alert('That file isn’t valid JSON.');
      return;
    }
    try{
      var imported = importRecipes(parsed);
      renderList();
      alert('Imported ' + imported.length + ' recipe' + (imported.length === 1 ? '' : 's') + '.');
    }catch(e){
      alert(e.message);
    }
  };
  reader.readAsText(file);
});
