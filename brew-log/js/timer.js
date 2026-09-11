/* ════════════════════════════════════════════
   TIMER.JS — The brew timer, shown as a modal overlay on top of the detail
   view. Owns its own DOM, session state, wake lock, and the ready/set/go
   countdown. Exposes just enough (open/reopen/end/isSessionActiveFor) for
   detail-view.js and main.js to drive it without reaching into internals.
════════════════════════════════════════════ */
import { fmt, totalDuration, specsChipsHtml, escapeHtml } from './helpers.js';
import { beep, playStageChangeSound, playFinishSound } from './sound.js';
import { requestWakeLock, releaseWakeLock } from './wake-lock.js';

var timerRecipe = null;
var timerState = null;
var timerIntervalId = null;

var timerModalEl = document.getElementById('timerModal');
var timerModalTitleEl = document.getElementById('timerModalTitle');
var timerCloseBtn = document.getElementById('timerCloseBtn');
var appEl = document.getElementById('app');

var timerStageIndexEl = document.getElementById('timerStageIndex');
var timerStageNameEl = document.getElementById('timerStageName');
var timerDigitsEl = document.getElementById('timerDigits');
var timerTargetEl = document.getElementById('timerTarget');
var timerNoteEl = document.getElementById('timerNote');
var timelineEl = document.getElementById('timeline');
var timerElapsedEl = document.getElementById('timerElapsed');
var timerTotalEl = document.getElementById('timerTotal');
var timerNextEl = document.getElementById('timerNext');
var startPauseBtn = document.getElementById('startPauseBtn');
var nextStageBtn = document.getElementById('nextStageBtn');
var resetBtn = document.getElementById('resetBtn');
var timerViewEl = document.getElementById('view-timer');
var timerSpecsEl = document.getElementById('timerSpecs');
var timerPrepEl = document.getElementById('timerPrep');
var timerPrepListEl = document.getElementById('timerPrepList');

// The element to return focus to when the modal closes (passed in by whoever
// opened it — detail-view's "Start brew" button — so this module doesn't
// need to import detail-view.js just to know what that button is).
var reopenFocusTarget = null;

/** Lets other views ask whether a given recipe already has a live session,
 *  without reaching into this module's internals. */
export function isSessionActiveFor(recipeId){
  return !!(timerRecipe && timerRecipe.id === recipeId);
}

function stageBoundaries(recipe){
  var bounds = [];
  var acc = 0;
  recipe.stages.forEach(function(st){
    bounds.push({start:acc, end:acc + (st.seconds||0)});
    acc += (st.seconds||0);
  });
  return bounds;
}

/**
 * Opens a fresh brew session for `recipe` as the timer modal, replacing any
 * previous session. `focusTarget` (a DOM element) gets focus back when the
 * modal is dismissed via its close button or Escape.
 */
export function openTimer(recipe, focusTarget){
  timerRecipe = recipe;
  timerState = {
    running:false,
    startTs:null,
    accumulatedMs:0,
    stageIndex:0,
    finished:false,
    hasStarted:false
  };
  reopenFocusTarget = focusTarget || null;
  buildTimeline();
  buildPrepChecklist();
  buildSpecsStrip();
  renderTimer(0);
  startPauseBtn.textContent = 'Start';
  timerModalTitleEl.textContent = recipe.name || 'Timer';
  showTimerModal();
}

/**
 * Reopens the modal on an already-running/paused session (e.g. after closing
 * it to glance back at the recipe) without resetting any progress.
 */
export function reopenTimerModal(focusTarget){
  if(!timerRecipe) return;
  reopenFocusTarget = focusTarget || reopenFocusTarget;
  timerModalTitleEl.textContent = timerRecipe.name || 'Timer';
  showTimerModal();
  renderTimer(currentElapsedSeconds());
}

// Shows the modal and makes the page behind it inert — un-clickable and
// untabbable — since it's fully covered. Moves focus into the dialog.
function showTimerModal(){
  timerModalEl.hidden = false;
  document.body.style.overflow = 'hidden';
  appEl.inert = true;
  timerCloseBtn.focus();
}

// Dismisses the modal only — the brew session (and its interval, so stage-
// change beeps still fire) keeps running behind the detail view.
function closeTimerModal(){
  timerModalEl.hidden = true;
  document.body.style.overflow = '';
  appEl.inert = false;
  if(reopenFocusTarget) reopenFocusTarget.focus();
}
timerCloseBtn.addEventListener('click', closeTimerModal);
document.addEventListener('keydown', function(e){
  if(e.key === 'Escape' && !timerModalEl.hidden) closeTimerModal();
});

/** Fully ends the current brew session — called when leaving the detail view. */
export function endTimerSession(){
  cancelPreroll();
  stopTimerLoop();
  timerModalEl.hidden = true;
  document.body.style.overflow = '';
  appEl.inert = false;
  timerRecipe = null;
}

function buildPrepChecklist(){
  timerPrepListEl.innerHTML = '';
  var items = timerRecipe.prep || [];
  if(items.length === 0){ timerPrepEl.hidden = true; return; }
  timerPrepEl.hidden = false;
  items.forEach(function(step, i){
    var row = document.createElement('div');
    row.className = 'prep-check-row';

    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = 'prepcheck-' + i;

    var lbl = document.createElement('label');
    lbl.setAttribute('for', 'prepcheck-' + i);
    lbl.textContent = step;

    cb.addEventListener('change', function(){
      row.classList.toggle('checked', cb.checked);
    });

    row.appendChild(cb);
    row.appendChild(lbl);
    timerPrepListEl.appendChild(row);
  });
}

function buildSpecsStrip(){
  timerSpecsEl.innerHTML = specsChipsHtml(timerRecipe);
}

function buildTimeline(){
  timelineEl.innerHTML = '';
  var total = totalDuration(timerRecipe) || 1;
  timerRecipe.stages.forEach(function(st){
    var seg = document.createElement('div');
    seg.className = 'timeline-seg';
    var grow = Math.max((st.seconds||0) / total, 0.02);
    seg.style.flexGrow = grow;
    seg.style.flexBasis = '0';
    var fill = document.createElement('div');
    fill.className = 'timeline-seg-fill';
    seg.appendChild(fill);
    timelineEl.appendChild(seg);
  });
}

function currentElapsedSeconds(){
  var ms = timerState.accumulatedMs;
  if(timerState.running && timerState.startTs){
    ms += (Date.now() - timerState.startTs);
  }
  return ms / 1000;
}

function renderTimer(elapsedSec){
  var bounds = stageBoundaries(timerRecipe);
  var total = totalDuration(timerRecipe);
  var idx = timerState.stageIndex;
  var stage = timerRecipe.stages[idx];

  timerStageIndexEl.textContent = 'Stage ' + (idx+1) + ' of ' + timerRecipe.stages.length;
  timerStageNameEl.textContent = stage.name || ('Stage ' + (idx+1));

  var remaining;
  if(timerState.finished){
    remaining = 0;
  } else {
    remaining = Math.max(0, bounds[idx].end - elapsedSec);
  }
  timerDigitsEl.textContent = fmt(remaining);

  timerTargetEl.textContent = (stage.weight !== null && stage.weight !== undefined && stage.weight !== '')
    ? ('pour to ' + stage.weight + ' g') : '';
  timerNoteEl.textContent = stage.note || '';

  // timeline fill
  var segs = timelineEl.children;
  for(var i=0;i<timerRecipe.stages.length;i++){
    var segEl = segs[i];
    var fillEl = segEl.querySelector('.timeline-seg-fill');
    var b = bounds[i];
    var segDur = Math.max(b.end - b.start, 0.0001);
    var pct;
    if(elapsedSec >= b.end){ pct = 100; segEl.classList.add('done'); }
    else if(elapsedSec <= b.start){ pct = 0; segEl.classList.remove('done'); }
    else { pct = ((elapsedSec - b.start) / segDur) * 100; segEl.classList.remove('done'); }
    fillEl.style.width = pct + '%';
  }

  timerElapsedEl.textContent = fmt(Math.min(elapsedSec, total));
  timerTotalEl.textContent = fmt(total);

  if(timerState.finished){
    timerNextEl.textContent = 'Brew complete.';
    timerViewEl.classList.add('timer-finished');
  } else {
    timerViewEl.classList.remove('timer-finished');
    var nextStage = timerRecipe.stages[idx+1];
    timerNextEl.innerHTML = nextStage
      ? ('next: <b>' + escapeHtml(nextStage.name) + '</b> · ' + fmt(nextStage.seconds))
      : 'next: <b>done</b>';
  }
}

function tick(){
  var elapsedSec = currentElapsedSeconds();
  var bounds = stageBoundaries(timerRecipe);
  var total = totalDuration(timerRecipe);

  if(elapsedSec >= total){
    elapsedSec = total;
    if(!timerState.finished){
      timerState.finished = true;
      timerState.running = false;
      stopTimerLoop();
      playFinishSound();
      if(navigator.vibrate) navigator.vibrate([120,80,120,80,200]);
      startPauseBtn.textContent = 'Start';
    }
    renderTimer(elapsedSec);
    return;
  }

  var newIdx = timerState.stageIndex;
  for(var i=0;i<bounds.length;i++){
    if(elapsedSec >= bounds[i].start && elapsedSec < bounds[i].end){ newIdx = i; break; }
  }
  if(newIdx !== timerState.stageIndex){
    timerState.stageIndex = newIdx;
    playStageChangeSound();
    if(navigator.vibrate) navigator.vibrate(180);
    flashTimer();
  }
  renderTimer(elapsedSec);
}

function flashTimer(){
  timerViewEl.classList.remove('flash');
  void timerViewEl.offsetWidth; // reflow to restart animation
  timerViewEl.classList.add('flash');
}

function startTimerLoop(){
  if(timerIntervalId) return;
  timerIntervalId = setInterval(tick, 200);
  requestWakeLock();
}
function stopTimerLoop(){
  if(timerIntervalId){ clearInterval(timerIntervalId); timerIntervalId = null; }
  releaseWakeLock();
}

// The OS releases the wake lock whenever the tab/screen goes out of view;
// re-acquire it if a brew is still actively running when visible again.
document.addEventListener('visibilitychange', function(){
  if(document.visibilityState === 'visible' && timerState && timerState.running){
    requestWakeLock();
  }
});

/* ---------------- Ready, set, go ---------------- */
// A short countdown before the very first start (and before any restart from
// finished/reset) so there's a beat to get in position before the clock runs.
// Resuming from a pause skips it, since you're already mid-brew.

var PREROLL_STEPS = [
  {label:'Ready', freq:660},
  {label:'Set', freq:660},
  {label:'Go!', freq:988}
];
var PREROLL_STEP_MS = 700;
var prerollTimeoutId = null;

function cancelPreroll(){
  if(prerollTimeoutId){ clearTimeout(prerollTimeoutId); prerollTimeoutId = null; }
  timerViewEl.classList.remove('counting');
  startPauseBtn.disabled = false;
  nextStageBtn.disabled = false;
}

function runPreroll(onDone){
  timerViewEl.classList.add('counting');
  startPauseBtn.disabled = true;
  nextStageBtn.disabled = true;
  var i = 0;
  function step(){
    if(i >= PREROLL_STEPS.length){
      prerollTimeoutId = null;
      timerViewEl.classList.remove('counting');
      startPauseBtn.disabled = false;
      nextStageBtn.disabled = false;
      onDone();
      return;
    }
    var s = PREROLL_STEPS[i];
    timerDigitsEl.textContent = s.label;
    beep(s.freq, 0.12, 0);
    i++;
    prerollTimeoutId = setTimeout(step, PREROLL_STEP_MS);
  }
  step();
}

startPauseBtn.addEventListener('click', function(){
  if(!timerRecipe) return;
  if(timerState.finished){
    // treat as restart+start
    timerState.finished = false;
    timerState.accumulatedMs = 0;
    timerState.stageIndex = 0;
    timerState.hasStarted = false;
    buildTimeline();
  }
  if(timerState.running){
    timerState.accumulatedMs += (Date.now() - timerState.startTs);
    timerState.startTs = null;
    timerState.running = false;
    stopTimerLoop();
    startPauseBtn.textContent = 'Resume';
    return;
  }
  timerPrepEl.hidden = true;
  if(timerState.hasStarted){
    // resuming after a pause: go immediately
    timerState.startTs = Date.now();
    timerState.running = true;
    startTimerLoop();
    startPauseBtn.textContent = 'Pause';
    tick();
  } else {
    runPreroll(function(){
      timerState.hasStarted = true;
      timerState.startTs = Date.now();
      timerState.running = true;
      startTimerLoop();
      startPauseBtn.textContent = 'Pause';
      tick();
    });
  }
});

nextStageBtn.addEventListener('click', function(){
  if(!timerRecipe || timerState.finished) return;
  var bounds = stageBoundaries(timerRecipe);
  var idx = timerState.stageIndex;
  var targetSec = (idx < bounds.length - 1) ? bounds[idx+1].start : totalDuration(timerRecipe);
  timerState.accumulatedMs = targetSec * 1000;
  if(timerState.running){ timerState.startTs = Date.now(); }
  tick();
});

resetBtn.addEventListener('click', function(){
  if(!timerRecipe) return;
  cancelPreroll();
  stopTimerLoop();
  timerState.running = false;
  timerState.startTs = null;
  timerState.accumulatedMs = 0;
  timerState.stageIndex = 0;
  timerState.finished = false;
  timerState.hasStarted = false;
  startPauseBtn.textContent = 'Start';
  timerViewEl.classList.remove('flash');
  buildTimeline();
  buildPrepChecklist();
  renderTimer(0);
});
