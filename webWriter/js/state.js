/* ════════════════════════════════════════════
   STATE.JS — Reactive application state
════════════════════════════════════════════ */

// ── Initial State ─────────────────────────────
const initialState = {
  fileName: 'untitled.txt',
  isDirty: false,
  fileHandle: null,    // File System Access API handle
};

// ── Internal State & Listeners ────────────────
let _state = { ...initialState };
const _listeners = new Set();

/**
 * Access the current state (read-only)
 */
export const state = _state;

/**
 * Update state and notify subscribers
 * @param {Object} partialState 
 */
export function updateState(partialState) {
  _state = { ..._state, ...partialState };
  _listeners.forEach(cb => cb(_state));
}

/**
 * Subscribe to state changes
 * @param {Function} cb (state) => void
 * @returns {Function} unsubscribe function
 */
export function subscribe(cb) {
  _listeners.add(cb);
  return () => _listeners.delete(cb);
}

/**
 * Reset state to initial (useful for 'New' document)
 */
export function resetState() {
  updateState(initialState);
}
