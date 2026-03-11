/* ════════════════════════════════════════════
   EDITOR.JS — contenteditable core
   Pure web platform. No dependencies.
════════════════════════════════════════════ */

// ── Internal state ────────────────────────────
let _surface      = null;   // the contenteditable div
let _updateCb     = null;   // called on doc change
let _decorations  = [];     // active decorations

// ── Init ──────────────────────────────────────
export function initEditor() {
  const mount = document.getElementById('editorMount');

  _surface = document.createElement('div');
  _surface.id = 'editorSurface';
  _surface.className = 'editor-surface';
  _surface.contentEditable = 'true';
  _surface.spellcheck = false;
  _surface.autocorrect = 'off';
  _surface.autocapitalize = 'sentences';
  _surface.setAttribute('role', 'textbox');
  _surface.setAttribute('aria-multiline', 'true');
  _surface.setAttribute('aria-label', 'Document editor');
  _surface.setAttribute('data-placeholder', 'Begin writing…');
  mount.appendChild(_surface);

  _surface.addEventListener('input', onInput);
  _surface.addEventListener('paste', onPaste);
  _surface.addEventListener('focus', () => _surface.classList.add('focused'));
  _surface.addEventListener('blur',  () => _surface.classList.remove('focused'));

  if (window.innerWidth >= 768) {
    setTimeout(() => _surface.focus(), 50);
  }

  return {
    getContent,
    setContent,
    setMode,
    onUpdate:        (cb) => { _updateCb = cb; },
    applyDecorations,
    clearDecorations,
    jumpToPosition,
    setSpellcheck:   (enabled) => {
      if (!_surface) return;
      _surface.spellcheck = enabled;
      
      // Some browsers (Chrome/Safari) need a real "jolt" to re-scan
      // Do this synchronously so we don't overwrite DOM changes that happen immediately after
      const savedHtml = _surface.innerHTML;
      _surface.innerHTML = '';
      _surface.innerHTML = savedHtml;
      updatePlaceholder();
    },
    view:            () => _surface,
  };
}

// ── Input handler ─────────────────────────────
function onInput() {
  updatePlaceholder();
  if (_updateCb) _updateCb();
}

// ── Paste: plain text only ────────────────────
function onPaste(e) {
  e.preventDefault();
  const text = e.clipboardData.getData('text/plain');
  if (!text) return;

  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  range.deleteContents();

  const lines = text.split('\n');
  const frag  = document.createDocumentFragment();
  lines.forEach((line, i) => {
    if (i > 0) frag.appendChild(document.createElement('br'));
    if (line) frag.appendChild(document.createTextNode(line));
  });
  range.insertNode(frag);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
  onInput();
}

// ── Placeholder ───────────────────────────────
function updatePlaceholder() {
  const empty = _surface.textContent.trim() === '';
  _surface.classList.toggle('empty', empty);
}

// ── Get plain text ────────────────────────────
export function getContent() {
  if (!_surface) return '';
  return domToText(_surface);
}

function domToText(node) {
  let text = '';
  for (const child of node.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      text += child.textContent;
    } else if (child.nodeName === 'BR') {
      text += '\n';
    } else if (child.nodeName === 'MARK') {
      text += domToText(child);
    } else if (isBlock(child)) {
      const inner = domToText(child);
      if (text && !text.endsWith('\n')) text += '\n';
      text += inner;
      if (inner && !inner.endsWith('\n')) text += '\n';
    } else {
      text += domToText(child);
    }
  }
  return text;
}

function isBlock(el) {
  if (!el.tagName) return false;
  return /^(DIV|P|H[1-6]|BLOCKQUOTE|LI|UL|OL|PRE)$/.test(el.tagName);
}

// ── Set content ───────────────────────────────
export function setContent(text) {
  if (!_surface) return;
  clearDecorations();

  if (!text) {
    _surface.innerHTML = '';
    updatePlaceholder();
    return;
  }

  const lines = text.split('\n');
  const frag  = document.createDocumentFragment();

  if (lines.length === 1) {
    frag.appendChild(document.createTextNode(text));
  } else {
    lines.forEach(line => {
      const div = document.createElement('div');
      if (line === '') {
        div.appendChild(document.createElement('br'));
      } else {
        div.appendChild(document.createTextNode(line));
      }
      frag.appendChild(div);
    });
  }

  _surface.innerHTML = '';
  _surface.appendChild(frag);
  updatePlaceholder();
}

// ── Mode ──────────────────────────────────────
export function setMode(mode) {
  if (!_surface) return;
  _surface.dataset.mode = mode;
}

// ── Decorations ───────────────────────────────
export function applyDecorations(ranges) {
  if (!_surface) return;
  clearDecorations();
  if (!ranges || ranges.length === 0) return;

  // Sort descending so DOM insertions don't shift offsets
  const sorted = [...ranges].sort((a, b) => b.from - a.from);
  for (const r of sorted) {
    try { wrapRange(r.from, r.to, r.type); } catch(e) { /* skip */ }
  }
}

export function clearDecorations() {
  if (!_surface) return;
  const marks = _surface.querySelectorAll('mark[data-decoration]');
  marks.forEach(mark => {
    const parent = mark.parentNode;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
  });
  _surface.normalize();
}

function wrapRange(from, to, type) {
  const classMap = { spell: 'deco-spell', grammar: 'deco-grammar', style: 'deco-style' };
  const domRange = charOffsetToRange(_surface, from, to);
  if (!domRange) return;

  const mark = document.createElement('mark');
  mark.className = classMap[type] || 'deco-spell';
  mark.dataset.decoration = type;
  mark.dataset.from = from;
  mark.dataset.to   = to;

  try {
    domRange.surroundContents(mark);
  } catch(e) {
    const frag = domRange.extractContents();
    mark.appendChild(frag);
    domRange.insertNode(mark);
  }
}

function charOffsetToRange(root, from, to) {
  const start = findTextPosition(root, from);
  const end   = findTextPosition(root, to);
  if (!start || !end) return null;
  const range = document.createRange();
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);
  return range;
}

function findTextPosition(root, targetOffset) {
  let current = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const len = node.textContent.length;
    if (current + len >= targetOffset) {
      return { node, offset: targetOffset - current };
    }
    current += len;
  }
  return null;
}

// ── Jump to position ──────────────────────────
export function jumpToPosition(charOffset) {
  if (!_surface) return;
  const pos = findTextPosition(_surface, charOffset);
  if (!pos) return;

  const range = document.createRange();
  range.setStart(pos.node, pos.offset);
  range.collapse(true);

  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  const el = pos.node.parentElement || _surface;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  _surface.focus();
}
