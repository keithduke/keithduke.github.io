/* ════════════════════════════════════════════
   MAIN.JS — Composition root: wires cross-view navigation (Back, New recipe,
   returning to List, unsaved-edit warnings) and does the initial render.
   The view modules never import each other in a cycle — where a module would
   otherwise need to call back "up" (editor-view finishing a Save/Delete), it
   reports out through a callback registered here instead.
════════════════════════════════════════════ */
import { views, backBtn, newRecipeBtn, showView } from './navigation.js';
import { findRecipe } from './state.js';
import { renderList } from './list-view.js';
import { openDetail } from './detail-view.js';
import { openEditor, editorIsDirty, getReturnTarget, initEditorView } from './editor-view.js';
import { endTimerSession } from './timer.js';

// Ends any live brew session (if one exists) before returning to the list —
// every path back to the list goes through here so a session can never be
// left running in the background with no way to reach it again.
function goToList(){
  endTimerSession();
  renderList();
  showView('list');
}

initEditorView({
  onSaved: function(returnTo, saved){
    if(returnTo === 'detail'){
      openDetail(saved);
      return;
    }
    goToList();
  },
  onDeleted: function(){
    goToList();
  }
});

backBtn.addEventListener('click', function(){
  if(!views.editor.hidden){
    if(editorIsDirty() && !confirm('Discard unsaved changes to this recipe?')){
      return;
    }
    var target = getReturnTarget();
    if(target.to === 'detail' && target.id){
      var r = findRecipe(target.id);
      if(r){ openDetail(r); return; }
    }
    goToList();
    return;
  }
  goToList();
});

newRecipeBtn.addEventListener('click', function(){ openEditor(null, 'list'); });

// Covers closing the tab, an OS-level back-swipe, or a reload — none of which
// fire the in-app Back button — while the editor has unsaved changes.
window.addEventListener('beforeunload', function(e){
  if(!views.editor.hidden && editorIsDirty()){
    e.preventDefault();
    e.returnValue = '';
  }
});

/* ---------------- Init ---------------- */

renderList();
showView('list');
