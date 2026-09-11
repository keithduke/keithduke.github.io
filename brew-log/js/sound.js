/* ════════════════════════════════════════════
   SOUND.JS — Web Audio beeps for the ready/set/go countdown, stage changes,
   and finishing a brew.
════════════════════════════════════════════ */

var audioCtx = null;

function ensureAudio(){
  if(!audioCtx){
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if(Ctx) audioCtx = new Ctx();
  }
  return audioCtx;
}

/** Plays a short sine-wave tone. No-ops if Web Audio isn't available. */
export function beep(freq, dur, delay){
  var ctx = ensureAudio();
  if(!ctx) return;
  delay = delay || 0;
  var t0 = ctx.currentTime + delay;
  var osc = ctx.createOscillator();
  var gain = ctx.createGain();
  osc.frequency.value = freq;
  osc.type = 'sine';
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(0.28, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export function playStageChangeSound(){
  beep(880, 0.12, 0);
  beep(1046, 0.14, 0.14);
}

export function playFinishSound(){
  beep(660, 0.15, 0);
  beep(880, 0.15, 0.18);
  beep(1318, 0.3, 0.36);
}
