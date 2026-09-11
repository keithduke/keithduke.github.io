/* ════════════════════════════════════════════
   DETAIL-VIEW.JS — Read-only recipe view: the hub between the list, the
   editor, and starting a brew. Also owns Duplicate, so experimenting with a
   variant never risks the original recipe.
════════════════════════════════════════════ */
import { showView } from './navigation.js';
import { fmt, stageSummary, specsChipsHtml } from './helpers.js';
import { findRecipe, insertRecipeAfter } from './state.js';
import { openEditor } from './editor-view.js';
import { openTimer, reopenTimerModal, isSessionActiveFor } from './timer.js';

var viewingId = null;

var detailNameEl = document.getElementById('detailName');
var detailMetaEl = document.getElementById('detailMeta');
var detailSpecsEl = document.getElementById('detailSpecs');
var detailPrepSection = document.getElementById('detailPrepSection');
var detailPrepListEl = document.getElementById('detailPrepList');
var detailStageListEl = document.getElementById('detailStageList');
var detailNotesSection = document.getElementById('detailNotesSection');
var detailNotesEl = document.getElementById('detailNotes');
var detailDuplicateBtn = document.getElementById('detailDuplicateBtn');
var detailEditBtn = document.getElementById('detailEditBtn');
var detailStartBtn = document.getElementById('detailStartBtn');

export function openDetail(recipe){
  viewingId = recipe.id;
  renderDetail(recipe);
  showView('detail', recipe.name || 'Recipe');
}

function renderDetail(recipe){
  detailNameEl.textContent = recipe.name || 'Untitled recipe';
  detailMetaEl.innerHTML = stageSummary(recipe);
  detailSpecsEl.innerHTML = specsChipsHtml(recipe);

  var prep = recipe.prep || [];
  detailPrepListEl.innerHTML = '';
  if(prep.length === 0){
    detailPrepSection.hidden = true;
  } else {
    detailPrepSection.hidden = false;
    prep.forEach(function(step){
      var li = document.createElement('li');
      li.textContent = step;
      detailPrepListEl.appendChild(li);
    });
  }

  detailStageListEl.innerHTML = '';
  recipe.stages.forEach(function(stage, i){
    var row = document.createElement('div');
    row.className = 'stage-view-row';

    var idx = document.createElement('div');
    idx.className = 'stage-view-index';
    idx.textContent = (i+1) + '.';

    var body = document.createElement('div');
    body.className = 'stage-view-body';

    var nameEl = document.createElement('div');
    nameEl.className = 'stage-view-name';
    nameEl.textContent = stage.name || ('Stage ' + (i+1));

    var metaParts = [fmt(stage.seconds || 0)];
    if(stage.weight !== null && stage.weight !== undefined && stage.weight !== ''){
      metaParts.push('to ' + stage.weight + ' g');
    }
    var metaEl = document.createElement('div');
    metaEl.className = 'stage-view-meta';
    metaEl.textContent = metaParts.join(' · ');

    body.appendChild(nameEl);
    body.appendChild(metaEl);

    if(stage.note){
      var noteEl = document.createElement('div');
      noteEl.className = 'stage-view-note';
      noteEl.textContent = stage.note;
      body.appendChild(noteEl);
    }

    row.appendChild(idx);
    row.appendChild(body);
    detailStageListEl.appendChild(row);
  });

  if(recipe.notes){
    detailNotesSection.hidden = false;
    detailNotesEl.textContent = recipe.notes;
  } else {
    detailNotesSection.hidden = true;
  }

  detailStartBtn.disabled = recipe.stages.length === 0;
}

// Copies the current recipe, inserts it right after the original, and drops
// straight into the editor with the name selected — duplicating is almost
// always followed immediately by a rename.
detailDuplicateBtn.addEventListener('click', function(){
  var recipe = findRecipe(viewingId);
  if(!recipe) return;
  var copy = JSON.parse(JSON.stringify(recipe));
  copy.id = null;
  copy.name = (recipe.name || 'Untitled recipe') + ' copy';
  var duplicate = insertRecipeAfter(recipe.id, copy);
  openEditor(duplicate, 'detail', { focusName: true });
});

detailEditBtn.addEventListener('click', function(){
  var recipe = findRecipe(viewingId);
  if(recipe) openEditor(recipe, 'detail');
});

detailStartBtn.addEventListener('click', function(){
  var recipe = findRecipe(viewingId);
  if(!recipe || recipe.stages.length === 0) return;
  if(isSessionActiveFor(recipe.id)){
    reopenTimerModal(detailStartBtn);
  } else {
    openTimer(recipe, detailStartBtn);
  }
});
