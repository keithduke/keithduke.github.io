/* ════════════════════════════════════════════
   EDITOR-VIEW.JS — The recipe editor form: create, edit, or delete a recipe.
   Save/Delete completion is reported via callbacks (wired by main.js) rather
   than importing detail-view.js/list-view.js directly, since both of those
   already import openEditor from here — importing them back would cycle.
════════════════════════════════════════════ */
import { showView } from './navigation.js';
import { fmt, parseMMSS, parseNum, ratioText } from './helpers.js';
import { addRecipe, replaceRecipe, removeRecipe } from './state.js';

var editingRecipe = null;
var editingId = null;
var editorReturnTo = 'list'; // where Back/Save return to: 'list' or 'detail'
var editorReturnId = null;
var editorBaselineSnapshot = null; // form state as of open, to detect unsaved edits

var onSaved = function(){};
var onDeleted = function(){};

var recipeNameInput = document.getElementById('recipeNameInput');
var recipeMethodInput = document.getElementById('recipeMethodInput');
var doseInput = document.getElementById('doseInput');
var waterInput = document.getElementById('waterInput');
var tempValueInput = document.getElementById('tempValueInput');
var tempUnitSelect = document.getElementById('tempUnitSelect');
var grindInput = document.getElementById('grindInput');
var equipmentInput = document.getElementById('equipmentInput');
var notesInput = document.getElementById('notesInput');
var ratioDisplay = document.getElementById('ratioDisplay');
var stageListEl = document.getElementById('stageList');
var prepListEl = document.getElementById('prepList');
var addPrepBtn = document.getElementById('addPrepBtn');
var addStageBtn = document.getElementById('addStageBtn');
var saveRecipeBtn = document.getElementById('saveRecipeBtn');
var deleteRecipeBtn = document.getElementById('deleteRecipeBtn');

/** Registers navigation callbacks. Call once, before the editor is ever opened. */
export function initEditorView(callbacks){
  onSaved = (callbacks && callbacks.onSaved) || onSaved;
  onDeleted = (callbacks && callbacks.onDeleted) || onDeleted;
}

/**
 * Opens the editor for `recipe` (or a blank new recipe if omitted).
 * `returnTo` ('list' or 'detail') is reported back via getReturnTarget()
 * and passed to onSaved(). `opts.focusName` selects the name field on open —
 * used when duplicating a recipe, so the rename is immediate.
 */
export function openEditor(recipe, returnTo, opts){
  opts = opts || {};
  editorReturnTo = returnTo || 'list';
  editorReturnId = recipe ? recipe.id : null;
  if(recipe){
    editingId = recipe.id;
    editingRecipe = JSON.parse(JSON.stringify(recipe));
    if(!editingRecipe.prep) editingRecipe.prep = [];
  } else {
    editingId = null;
    editingRecipe = { id:null, name:'', method:'', prep:[], stages:[
      {name:'Stage 1', seconds:30, weight:null, note:''}
    ]};
  }
  recipeNameInput.value = editingRecipe.name;
  recipeMethodInput.value = editingRecipe.method;
  doseInput.value = (editingRecipe.coffeeGrams === null || editingRecipe.coffeeGrams === undefined) ? '' : editingRecipe.coffeeGrams;
  waterInput.value = (editingRecipe.waterGrams === null || editingRecipe.waterGrams === undefined) ? '' : editingRecipe.waterGrams;
  tempValueInput.value = (editingRecipe.waterTempValue === null || editingRecipe.waterTempValue === undefined) ? '' : editingRecipe.waterTempValue;
  tempUnitSelect.value = editingRecipe.waterTempUnit || 'C';
  grindInput.value = editingRecipe.grindSize || '';
  equipmentInput.value = editingRecipe.equipment || '';
  notesInput.value = editingRecipe.notes || '';
  deleteRecipeBtn.hidden = !editingId;
  updateRatioDisplay();
  renderPrepList();
  renderStageList();
  showView('editor', editingId ? 'Edit recipe' : 'New recipe');
  editorBaselineSnapshot = snapshotEditorState();
  if(opts.focusName){
    recipeNameInput.focus();
    recipeNameInput.select();
  }
}

/** Where Back/Save should return to: `{ to: 'list'|'detail', id }`. */
export function getReturnTarget(){
  return { to: editorReturnTo, id: editorReturnId };
}

// A plain-object read of every editable field, including the live-mutated
// prep/stage arrays, so leaving the editor can tell whether anything actually
// changed since it opened — without relying on editingRecipe, which only
// picks up the scalar fields (name, dose, notes, ...) at Save time.
function snapshotEditorState(){
  return JSON.stringify({
    name: recipeNameInput.value,
    method: recipeMethodInput.value,
    coffeeGrams: doseInput.value,
    waterGrams: waterInput.value,
    waterTempValue: tempValueInput.value,
    waterTempUnit: tempUnitSelect.value,
    grindSize: grindInput.value,
    equipment: equipmentInput.value,
    notes: notesInput.value,
    prep: editingRecipe.prep,
    stages: editingRecipe.stages.map(function(s){
      return {name:s.name, seconds:s.seconds, weight:s.weight, note:s.note};
    })
  });
}

export function editorIsDirty(){
  return snapshotEditorState() !== editorBaselineSnapshot;
}

function updateRatioDisplay(){
  var coffee = parseNum(doseInput.value);
  var water = parseNum(waterInput.value);
  var rt = ratioText(coffee, water);
  ratioDisplay.textContent = rt ? ('Ratio ' + rt) : '';
}
doseInput.addEventListener('input', updateRatioDisplay);
waterInput.addEventListener('input', updateRatioDisplay);

function renderPrepList(){
  prepListEl.innerHTML = '';
  editingRecipe.prep.forEach(function(step, i){
    var row = document.createElement('div');
    row.className = 'prep-row';

    var label = document.createElement('label');
    label.className = 'sr-only';
    label.setAttribute('for', 'prep-text-' + i);
    label.textContent = 'Prep step ' + (i+1);

    var input = document.createElement('input');
    input.type = 'text';
    input.id = 'prep-text-' + i;
    input.className = 'prep-text';
    input.placeholder = 'e.g. rinse the paper filter';
    input.value = step || '';
    input.addEventListener('input', function(){ editingRecipe.prep[i] = input.value; });

    var controls = document.createElement('div');
    controls.className = 'stage-controls';

    var upBtn = document.createElement('button');
    upBtn.className = 'stage-mini-btn';
    upBtn.setAttribute('aria-label', 'Move prep step ' + (i+1) + ' up');
    upBtn.textContent = '↑';
    upBtn.disabled = (i === 0);
    upBtn.addEventListener('click', function(){
      var arr = editingRecipe.prep;
      var tmp = arr[i-1]; arr[i-1] = arr[i]; arr[i] = tmp;
      renderPrepList();
    });

    var downBtn = document.createElement('button');
    downBtn.className = 'stage-mini-btn';
    downBtn.setAttribute('aria-label', 'Move prep step ' + (i+1) + ' down');
    downBtn.textContent = '↓';
    downBtn.disabled = (i === editingRecipe.prep.length - 1);
    downBtn.addEventListener('click', function(){
      var arr = editingRecipe.prep;
      var tmp = arr[i+1]; arr[i+1] = arr[i]; arr[i] = tmp;
      renderPrepList();
    });

    var removeBtn = document.createElement('button');
    removeBtn.className = 'stage-mini-btn remove';
    removeBtn.setAttribute('aria-label', 'Remove prep step ' + (i+1));
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', function(){
      editingRecipe.prep.splice(i, 1);
      renderPrepList();
    });

    controls.appendChild(upBtn);
    controls.appendChild(downBtn);
    controls.appendChild(removeBtn);

    row.appendChild(label);
    row.appendChild(input);
    row.appendChild(controls);
    prepListEl.appendChild(row);
  });
}

addPrepBtn.addEventListener('click', function(){
  editingRecipe.prep.push('');
  renderPrepList();
  var inputs = prepListEl.querySelectorAll('.prep-text');
  if(inputs.length) inputs[inputs.length - 1].focus();
});

function renderStageList(){
  stageListEl.innerHTML = '';
  editingRecipe.stages.forEach(function(stage, i){
    var row = document.createElement('div');
    row.className = 'stage-row';

    var row1 = document.createElement('div');
    row1.className = 'row1';

    var nameLabel = document.createElement('label');
    nameLabel.className = 'sr-only';
    nameLabel.setAttribute('for', 'stage-name-' + i);
    nameLabel.textContent = 'Stage ' + (i+1) + ' name';

    var nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = 'stage-name-' + i;
    nameInput.className = 'stage-name';
    nameInput.placeholder = 'Stage name';
    nameInput.value = stage.name || '';
    nameInput.addEventListener('input', function(){ stage.name = nameInput.value; });

    var durLabel = document.createElement('label');
    durLabel.className = 'sr-only';
    durLabel.setAttribute('for', 'stage-dur-' + i);
    durLabel.textContent = 'Stage ' + (i+1) + ' duration, minutes and seconds';

    var durInput = document.createElement('input');
    durInput.type = 'text';
    durInput.id = 'stage-dur-' + i;
    durInput.className = 'stage-duration';
    durInput.placeholder = 'mm:ss';
    durInput.value = fmt(stage.seconds || 0);
    durInput.addEventListener('change', function(){
      var parsed = parseMMSS(durInput.value);
      if(parsed === null || parsed <= 0){
        durInput.classList.add('invalid');
      } else {
        durInput.classList.remove('invalid');
        stage.seconds = parsed;
        durInput.value = fmt(parsed);
      }
    });

    var weightLabel = document.createElement('label');
    weightLabel.className = 'sr-only';
    weightLabel.setAttribute('for', 'stage-weight-' + i);
    weightLabel.textContent = 'Stage ' + (i+1) + ' target weight in grams';

    var weightInput = document.createElement('input');
    weightInput.type = 'text';
    weightInput.id = 'stage-weight-' + i;
    weightInput.className = 'stage-weight';
    weightInput.placeholder = 'g (optional)';
    weightInput.inputMode = 'numeric';
    weightInput.value = (stage.weight === null || stage.weight === undefined) ? '' : stage.weight;
    weightInput.addEventListener('input', function(){
      var v = weightInput.value.trim();
      if(v === ''){ stage.weight = null; return; }
      var n = parseInt(v, 10);
      stage.weight = isNaN(n) ? null : n;
    });

    row1.appendChild(nameLabel);
    row1.appendChild(nameInput);
    row1.appendChild(durLabel);
    row1.appendChild(durInput);
    row1.appendChild(weightLabel);
    row1.appendChild(weightInput);

    var row2 = document.createElement('div');
    row2.className = 'row2';

    var noteLabel = document.createElement('label');
    noteLabel.className = 'sr-only';
    noteLabel.setAttribute('for', 'stage-note-' + i);
    noteLabel.textContent = 'Stage ' + (i+1) + ' note';

    var noteInput = document.createElement('input');
    noteInput.type = 'text';
    noteInput.id = 'stage-note-' + i;
    noteInput.className = 'stage-note';
    noteInput.placeholder = 'note, e.g. swirl gently (optional)';
    noteInput.value = stage.note || '';
    noteInput.addEventListener('input', function(){ stage.note = noteInput.value; });

    var controls = document.createElement('div');
    controls.className = 'stage-controls';

    var upBtn = document.createElement('button');
    upBtn.className = 'stage-mini-btn';
    upBtn.setAttribute('aria-label', 'Move stage ' + (i+1) + ' up');
    upBtn.textContent = '↑';
    upBtn.disabled = (i === 0);
    upBtn.addEventListener('click', function(){
      var arr = editingRecipe.stages;
      var tmp = arr[i-1]; arr[i-1] = arr[i]; arr[i] = tmp;
      renderStageList();
    });

    var downBtn = document.createElement('button');
    downBtn.className = 'stage-mini-btn';
    downBtn.setAttribute('aria-label', 'Move stage ' + (i+1) + ' down');
    downBtn.textContent = '↓';
    downBtn.disabled = (i === editingRecipe.stages.length - 1);
    downBtn.addEventListener('click', function(){
      var arr = editingRecipe.stages;
      var tmp = arr[i+1]; arr[i+1] = arr[i]; arr[i] = tmp;
      renderStageList();
    });

    var removeBtn = document.createElement('button');
    removeBtn.className = 'stage-mini-btn remove';
    removeBtn.setAttribute('aria-label', 'Remove stage ' + (i+1));
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', function(){
      editingRecipe.stages.splice(i, 1);
      renderStageList();
    });

    controls.appendChild(upBtn);
    controls.appendChild(downBtn);
    controls.appendChild(removeBtn);

    row2.appendChild(noteLabel);
    row2.appendChild(noteInput);
    row2.appendChild(controls);

    row.appendChild(row1);
    row.appendChild(row2);
    stageListEl.appendChild(row);
  });
}

addStageBtn.addEventListener('click', function(){
  editingRecipe.stages.push({name:'New stage', seconds:30, weight:null, note:''});
  renderStageList();
});

saveRecipeBtn.addEventListener('click', function(){
  editingRecipe.name = recipeNameInput.value.trim() || 'Untitled recipe';
  editingRecipe.method = recipeMethodInput.value.trim() || 'custom';
  editingRecipe.coffeeGrams = parseNum(doseInput.value);
  editingRecipe.waterGrams = parseNum(waterInput.value);
  editingRecipe.waterTempValue = parseNum(tempValueInput.value);
  editingRecipe.waterTempUnit = tempUnitSelect.value;
  editingRecipe.grindSize = grindInput.value.trim();
  editingRecipe.equipment = equipmentInput.value.trim();
  editingRecipe.notes = notesInput.value.trim();
  editingRecipe.prep = (editingRecipe.prep || [])
    .map(function(s){ return (s || '').trim(); })
    .filter(function(s){ return s !== ''; });
  // re-parse each duration input directly, rather than trusting the 'invalid'
  // class, which only updates on blur and could be stale for a focused field
  var durInputs = stageListEl.querySelectorAll('.stage-duration');
  var hasInvalid = false;
  durInputs.forEach(function(inp, i){
    var parsed = parseMMSS(inp.value);
    if(parsed === null || parsed <= 0){
      hasInvalid = true;
      inp.classList.add('invalid');
    } else {
      inp.classList.remove('invalid');
      editingRecipe.stages[i].seconds = parsed;
      inp.value = fmt(parsed);
    }
  });
  if(hasInvalid){
    alert('One or more stage durations are not valid. Use mm:ss, like 1:30.');
    return;
  }
  if(editingRecipe.stages.length === 0){
    alert('Add at least one stage before saving.');
    return;
  }
  var saved = editingId ? replaceRecipe(editingId, editingRecipe) : addRecipe(editingRecipe);
  onSaved(editorReturnTo, saved);
});

deleteRecipeBtn.addEventListener('click', function(){
  if(!editingId) return;
  if(confirm('Delete "' + (editingRecipe.name || 'this recipe') + '"?')){
    removeRecipe(editingId);
    onDeleted();
  }
});
