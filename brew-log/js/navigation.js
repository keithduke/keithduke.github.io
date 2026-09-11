/* ════════════════════════════════════════════
   NAVIGATION.JS — The shared app shell: which of the three full-page views
   (list / detail / editor) is showing, and the topbar around it.
   The timer is a modal on top of these, not one of these — see timer.js.
════════════════════════════════════════════ */

export var views = {
  list: document.getElementById('view-list'),
  detail: document.getElementById('view-detail'),
  editor: document.getElementById('view-editor')
};

export var backBtn = document.getElementById('backBtn');
export var newRecipeBtn = document.getElementById('newRecipeBtn');

var titleText = document.getElementById('titleText');

/**
 * Shows one of the three views and updates the topbar to match.
 * `title` is used for the 'detail' and 'editor' topbar title; ignored for
 * 'list', which is always "Brew Log".
 */
export function showView(name, title){
  Object.keys(views).forEach(function(k){ views[k].hidden = (k !== name); });
  if(name === 'list'){
    backBtn.hidden = true;
    newRecipeBtn.hidden = false;
    titleText.textContent = 'Brew Log';
  } else {
    backBtn.hidden = false;
    newRecipeBtn.hidden = true;
    titleText.textContent = title || '';
  }
}
