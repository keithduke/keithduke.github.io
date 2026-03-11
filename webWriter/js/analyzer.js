/* ════════════════════════════════════════════
   ANALYZER.JS — Refactored to use Web Worker
════════════════════════════════════════════ */
import { renderStats } from './stats.js';
import { initSpellcheck, addToPersonalDictionary } from './spellcheck.js';
import { applyDecorations, clearDecorations, jumpToPosition } from './editor.js';
import { showToast } from './ui.js';

// ── State ─────────────────────────────────────
let isOpen       = false;
let activeTab    = 'spelling';
let lastResults  = { spelling: [], grammar: [], style: [] };
let editorRef    = null;
let analysisWorker = null;
let personalDictionary = new Set();

// ── Init ──────────────────────────────────────
export async function initAnalyzer(editor) {
  editorRef = editor;
  personalDictionary = await initSpellcheck();

  // Initialize Web Worker
  analysisWorker = new Worker('js/analysis-worker.js', { type: 'module' });
  analysisWorker.onmessage = handleWorkerMessage;
  analysisWorker.onerror = (err) => {
    console.error('ANALYSIS WORKER CRASHED:', err.message, err.filename, err.lineno);
    showToast('Analysis worker failed to start.', 'error');
  };

  document.getElementById('bbAnalyze').addEventListener('click', () => {
    if (isOpen) closeAnalyzer();
    else        openAnalyzer();
  });
  document.getElementById('btnCloseAnalyzer').addEventListener('click', closeAnalyzer);
  document.getElementById('btnRunAnalysis').addEventListener('click', runAnalysis);

  document.querySelectorAll('.issue-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.issue-tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      activeTab = tab.dataset.tab;
      renderIssueList();
    });
  });

  initDragHandle();
}

function handleWorkerMessage(e) {
  const data = e.data;
  if (!data.success) {
    console.error('Analysis worker error:', data.error);
    showToast('Analysis failed.', 'error');
    finishAnalysis();
    return;
  }

  const { stats, spellingIssues, grammarAll } = data;

  // 1. Render stats
  renderStats(stats);

  // 2. Process issues
  const grammarIssues = grammarAll.filter(i => i.type === 'grammar');
  const styleIssues   = grammarAll.filter(i => i.type === 'style');

  lastResults = {
    spelling: spellingIssues,
    grammar:  grammarIssues,
    style:    styleIssues,
  };

  // 3. Update badges
  setBadge('badgeSpelling', spellingIssues.length);
  setBadge('badgeGrammar',  grammarIssues.length);
  setBadge('badgeStyle',    styleIssues.length);

  // 4. Apply decorations
  const allDecorations = [
    ...spellingIssues.map(i => ({ ...i, type: 'spell' })),
    ...grammarIssues.map(i => ({ ...i, type: 'grammar' })),
    ...styleIssues.map(i => ({ ...i, type: 'style' })),
  ];
  applyDecorations(allDecorations);

  // 5. Render list
  renderIssueList();

  const total = spellingIssues.length + grammarIssues.length + styleIssues.length;
  showToast(
    total === 0 ? 'No issues found!' : `${total} issue${total > 1 ? 's' : ''} found`,
    total === 0 ? 'success' : 'default'
  );

  finishAnalysis();
}

function finishAnalysis() {
  const btn = document.getElementById('btnRunAnalysis');
  btn.disabled = false;
  btn.textContent = 'Run Analysis';
}

// ── Open / Close ──────────────────────────────
function openAnalyzer() {
  isOpen = true;
  const overlay = document.getElementById('analyzerOverlay');
  overlay.classList.remove('hidden');
  requestAnimationFrame(() => overlay.classList.add('open'));
  
  // Enable browser's native spellcheck only while panel is open
  editorRef.setSpellcheck(true);
  
  runAnalysis();
}

function closeAnalyzer() {
  isOpen = false;
  const overlay = document.getElementById('analyzerOverlay');
  overlay.classList.remove('open');
  
  // Disable browser's native spellcheck for a clean typewriter experience
  editorRef.setSpellcheck(false);

  overlay.addEventListener('transitionend', () => {
    if (!isOpen) overlay.classList.add('hidden');
  }, { once: true });
  clearDecorations();
}

// ── Run Analysis ──────────────────────────────
async function runAnalysis() {
  const btn  = document.getElementById('btnRunAnalysis');
  const list = document.getElementById('issueList');

  btn.disabled = true;
  btn.textContent = 'Analyzing…';

  list.innerHTML = `
    <div class="analyzer-loading">
      <div class="loading-spinner"></div>
      <span>Checking document…</span>
    </div>
  `;

  const text = editorRef.getContent();
  // Send to worker
  analysisWorker.postMessage({
    text,
    personalDictionary: Array.from(personalDictionary)
  });
}

// ── Render Issue List ─────────────────────────
function renderIssueList() {
  const list   = document.getElementById('issueList');
  const issues = lastResults[activeTab] || [];

  if (issues.length === 0) {
    list.innerHTML = `
      <div class="issue-empty">
        <span>No ${activeTab} issues found.</span>
      </div>
    `;
    return;
  }

  list.innerHTML = issues.map((issue, idx) => {
    const dotClass = activeTab === 'spelling' ? 'issue-dot--spell'
                   : activeTab === 'grammar'  ? 'issue-dot--grammar'
                   : 'issue-dot--style';

    const suggestions = issue.suggestions && issue.suggestions.length > 0
      ? issue.suggestions.slice(0, 4).map(s =>
          `<button class="suggestion-chip" data-idx="${idx}" data-suggestion="${escHtml(s)}">${escHtml(s)}</button>`
        ).join('')
      : '';

    const addBtn = activeTab === 'spelling'
      ? `<button class="suggestion-chip" data-idx="${idx}" data-add="${escHtml(issue.word)}">+ Add to dictionary</button>`
      : '';

    return `
      <div class="issue-item" data-idx="${idx}" data-from="${issue.from}" data-to="${issue.to}">
        <div class="issue-dot ${dotClass}"></div>
        <div class="issue-body">
          <div class="issue-word">${escHtml(issue.word)}</div>
          <div class="issue-reason">${escHtml(issue.reason || (activeTab === 'spelling' ? 'Unrecognized word' : 'Writing issue'))}</div>
          ${suggestions || addBtn ? `<div class="issue-suggestions">${suggestions}${addBtn}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');

  list.onclick = (e) => {
    const chip = e.target.closest('.suggestion-chip');
    const item = e.target.closest('.issue-item');

    if (chip) {
      e.stopPropagation();
      const idx = parseInt(chip.dataset.idx);
      const issue = lastResults[activeTab][idx];

      if (chip.dataset.add) {
        addToPersonalDictionary(chip.dataset.add);
        personalDictionary.add(chip.dataset.add.toLowerCase());
        showToast(`"${chip.dataset.add}" added to dictionary.`, 'success');
        runAnalysis();
        return;
      }

      if (chip.dataset.suggestion && issue) {
        applySuggestion(issue, chip.dataset.suggestion);
      }
      return;
    }

    if (item) {
      const from = parseInt(item.dataset.from);
      jumpToPosition(from);
    }
  };
}

function applySuggestion(issue, suggestion) {
  jumpToPosition(issue.from);
  const surface = editorRef.view();
  if (!surface) return;

  const { findAndSelect } = getSelectionHelpers(surface);
  findAndSelect(issue.from, issue.to, suggestion);

  setTimeout(runAnalysis, 150);
}

function getSelectionHelpers(surface) {
  return {
    findAndSelect(from, to, replacement) {
      let current = 0;
      const walker = document.createTreeWalker(surface, NodeFilter.SHOW_TEXT);
      let startNode = null, startOff = 0, endNode = null, endOff = 0;
      let node;

      while ((node = walker.nextNode())) {
        const len = node.textContent.length;
        if (!startNode && current + len >= from) {
          startNode = node;
          startOff  = from - current;
        }
        if (!endNode && current + len >= to) {
          endNode = node;
          endOff  = to - current;
        }
        if (startNode && endNode) break;
        current += len;
      }

      if (!startNode || !endNode) return;

      const range = document.createRange();
      range.setStart(startNode, startOff);
      range.setEnd(endNode, endOff);

      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);

      document.execCommand('insertText', false, replacement);
    }
  };
}

function setBadge(id, count) {
  const el = document.getElementById(id);
  el.textContent = count;
  if (count > 0) el.classList.add('has-issues');
  else           el.classList.remove('has-issues');
}

function initDragHandle() {
  const handle  = document.getElementById('analyzerHandle');
  const overlay = document.getElementById('analyzerOverlay');
  const stage   = document.getElementById('stage');

  let startY   = 0;
  let startH   = 0;
  let dragging = false;

  handle.addEventListener('pointerdown', (e) => {
    dragging = true;
    startY   = e.clientY;
    startH   = overlay.offsetHeight;
    handle.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  handle.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const delta  = startY - e.clientY;
    const stageH = stage.offsetHeight;
    const newH   = Math.min(Math.max(startH + delta, 160), stageH * 0.85);
    overlay.style.height = newH + 'px';
  });

  handle.addEventListener('pointerup', () => { dragging = false; });
  handle.addEventListener('pointercancel', () => { dragging = false; });
}

function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
