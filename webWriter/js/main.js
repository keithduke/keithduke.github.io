/* ════════════════════════════════════════════
   MAIN.JS — Boot sequence refactored
════════════════════════════════════════════ */
import { initEditor }     from './editor.js';
import { initFilesystem } from './filesystem.js';
import { initAnalyzer }   from './analyzer.js';
import { state, updateState, subscribe } from './state.js';
import { DB_NAME, DB_VERSION, STORE } from './config.js';

// ── Boot ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const editor = initEditor();
  initFilesystem(editor);
  initAnalyzer(editor);

  // Service worker registration
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }

  // Restore last session from IndexedDB
  await restoreSession(editor);

  // Mark dirty on changes
  editor.onUpdate(() => {
    if (!state.isDirty) {
      updateState({ isDirty: true });
    }
    // Auto-save to IndexedDB on every change (debounced)
    scheduleAutoSave(editor);
  });

  // Subscribe to state changes for UI updates
  subscribe((newState) => {
    document.getElementById('fileName').textContent = newState.fileName;
    const dirtyEl = document.getElementById('fileDirty');
    if (newState.isDirty) dirtyEl.classList.add('visible');
    else                  dirtyEl.classList.remove('visible');
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key === 's') {
      e.preventDefault();
      document.getElementById('btnSave').click();
    }
    if (mod && e.key === 'o') {
      e.preventDefault();
      document.getElementById('btnOpen').click();
    }
    if (mod && e.key === 'n') {
      e.preventDefault();
      document.getElementById('btnNew').click();
    }
  });

  // Warn on close if dirty
  window.addEventListener('beforeunload', (e) => {
    if (state.isDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
});

// ── Auto-save to IndexedDB ────────────────────
let autoSaveTimer = null;
function scheduleAutoSave(editor) {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    saveToIndexedDB(editor.getContent(), state.fileName);
  }, 1500);
}

// ── IndexedDB helpers ─────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

export async function saveToIndexedDB(content, fileName) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({
      id: 'current',
      content,
      fileName,
      savedAt: Date.now(),
    });
  } catch(err) {
    console.warn('Auto-save failed:', err);
  }
}

export async function loadFromIndexedDB() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get('current');
      req.onsuccess = e => resolve(e.target.result || null);
      req.onerror   = e => reject(e.target.error);
    });
  } catch(err) {
    return null;
  }
}

async function restoreSession(editor) {
  const saved = await loadFromIndexedDB();
  if (saved && saved.content) {
    editor.setContent(saved.content);
    if (saved.fileName) {
      updateState({
        fileName: saved.fileName,
        isDirty: false
      });
    }
  }
}

export function markClean() {
  updateState({ isDirty: false });
}
