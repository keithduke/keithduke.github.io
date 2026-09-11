/* ════════════════════════════════════════════
   WAKE-LOCK.JS — Keeps the screen from sleeping while a brew is actively
   running. Unsupported browsers and denied/erroring requests just no-op
   silently — this is a nice-to-have, never a requirement to function.
════════════════════════════════════════════ */

var wakeLock = null;

export function requestWakeLock(){
  if(!('wakeLock' in navigator)) return;
  navigator.wakeLock.request('screen').then(function(lock){
    wakeLock = lock;
    wakeLock.addEventListener('release', function(){ wakeLock = null; });
  }).catch(function(){ /* denied, unsupported in this context, etc. — not fatal */ });
}

export function releaseWakeLock(){
  if(wakeLock){
    var lock = wakeLock;
    wakeLock = null;
    lock.release().catch(function(){});
  }
}
