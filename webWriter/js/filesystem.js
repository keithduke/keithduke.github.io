/* ════════════════════════════════════════════
   FILESYSTEM.JS — Open / Save operations
════════════════════════════════════════════ */
import { state, updateState } from './state.js';
import { saveToIndexedDB, markClean } from './main.js';
import { showToast } from './ui.js';

const HAS_FS_API = 'showOpenFilePicker' in window;

export function initFilesystem(editor) {
  // ── Top bar buttons ──────────────────────
  document.getElementById('btnNew').addEventListener('click', () => handleNew(editor));
  document.getElementById('btnOpen').addEventListener('click', () => handleOpen(editor));
  document.getElementById('btnSave').addEventListener('click', () => handleSave(editor));

  // ── Bottom bar buttons ───────────────────
  document.getElementById('bbNew').addEventListener('click', () => handleNew(editor));
  document.getElementById('bbOpen').addEventListener('click', () => handleOpen(editor));
  document.getElementById('bbSave').addEventListener('click', () => handleSave(editor));

  // ── New document modal ───────────────────
  document.getElementById('modalNewCancel').addEventListener('click', closeNewModal);
  document.getElementById('modalNewConfirm').addEventListener('click', () => {
    closeNewModal();
    doNew(editor);
  });

  // ── Fallback file input ──────────────────
  document.getElementById('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) readFile(file, editor);
    e.target.value = '';
  });
}

// ── New ───────────────────────────────────────
function handleNew(editor) {
  if (state.isDirty) {
    document.getElementById('modalNew').classList.remove('hidden');
  } else {
    doNew(editor);
  }
}

function doNew(editor) {
  editor.setContent('');
  updateState({
    fileName: 'untitled.txt',
    fileHandle: null,
    isDirty: false
  });
  saveToIndexedDB('', 'untitled.txt');
}

function closeNewModal() {
  document.getElementById('modalNew').classList.add('hidden');
}

// ── Open ──────────────────────────────────────
async function handleOpen(editor) {
  if (HAS_FS_API) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'Text files', accept: { 'text/plain': ['.txt', '.md'] } }],
        multiple: false,
      });
      const file = await handle.getFile();
      updateState({ fileHandle: handle });
      await readFile(file, editor);
    } catch (err) {
      if (err.name !== 'AbortError') showToast('Could not open file.', 'error');
    }
  } else {
    document.getElementById('fileInput').click();
  }
}

async function readFile(file, editor) {
  try {
    const text = await file.text();
    editor.setContent(text);
    updateState({
      fileName: file.name,
      isDirty: false
    });
    saveToIndexedDB(text, file.name);
    showToast(`Opened ${file.name}`, 'success');
  } catch (err) {
    showToast('Could not read file.', 'error');
  }
}

// ── Save ──────────────────────────────────────
export async function handleSave(editor) {
  const content = editor.getContent();

  if (HAS_FS_API) {
    try {
      if (state.fileHandle) {
        await writeToHandle(state.fileHandle, content);
        markClean();
        saveToIndexedDB(content, state.fileName);
        showToast('Saved.', 'success');
        return;
      }
      const handle = await window.showSaveFilePicker({
        suggestedName: state.fileName,
        types: [{ description: 'Text files', accept: { 'text/plain': ['.txt', '.md'] } }],
      });
      await writeToHandle(handle, content);
      updateState({
        fileHandle: handle,
        fileName: handle.name
      });
      markClean();
      saveToIndexedDB(content, handle.name);
      showToast('Saved.', 'success');
    } catch (err) {
      if (err.name !== 'AbortError') downloadFile(content);
    }
  } else {
    downloadFile(content);
  }
}

async function writeToHandle(handle, content) {
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
}

function downloadFile(content) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = state.fileName;
  a.click();
  URL.revokeObjectURL(url);
  markClean();
  saveToIndexedDB(content, state.fileName);
  showToast(`Downloaded ${state.fileName}`, 'success');
}
