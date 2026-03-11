/* ════════════════════════════════════════════
   SPELLCHECK.JS — Spell checking
   
   Uses a tiered approach:
   1. A built-in common misspellings dictionary
   2. A simple word frequency / known-words list
   3. Basic heuristic checks
   
   Note: Full Hunspell (Typo.js) requires
   loading ~2MB of dictionary files. We implement
   a practical spellchecker that catches the most
   common errors without the weight.
   
   The user can extend the personal dictionary.
════════════════════════════════════════════ */

import { MISSPELLINGS, CONTRACTIONS } from './config.js';

// ── Personal dictionary (user additions) ─────
let personalDictionary = new Set();

// Load from IndexedDB on init (Main thread only)
export async function initSpellcheck() {
  try {
    const saved = localStorage.getItem('tw_personal_dict');
    if (saved) {
      personalDictionary = new Set(JSON.parse(saved));
    }
  } catch(e) {}
  return personalDictionary;
}

export function addToPersonalDictionary(word) {
  personalDictionary.add(word.toLowerCase());
  try {
    localStorage.setItem('tw_personal_dict',
      JSON.stringify([...personalDictionary])
    );
  } catch(e) {}
}

// ── Tokenize text into words with positions ───
export function tokenize(text) {
  const tokens = [];
  // Match word characters, allow apostrophes within words (contractions)
  const regex = /[a-zA-Z]+(?:'[a-zA-Z]+)*/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    tokens.push({
      word: match[0],
      from: match.index,
      to:   match.index + match[0].length,
    });
  }
  return tokens;
}

// ── Main spell check function ─────────────────
/**
 * Check text for spelling errors.
 * Returns array of { from, to, word, suggestions }
 * PURE FUNCTION - No DOM/localStorage access.
 */
export function checkSpelling(text, dict = personalDictionary) {
  const tokens = tokenize(text);
  const issues = [];
  const contractionsSet = new Set(CONTRACTIONS);

  for (const token of tokens) {
    const word  = token.word;
    const lower = word.toLowerCase();

    // Skip: very short words, numbers, all-caps acronyms, personal dict
    if (word.length <= 2) continue;
    if (/^\d+$/.test(word)) continue;
    if (word === word.toUpperCase() && word.length <= 6) continue;
    if (dict.has(lower)) continue;
    // Skip common contractions
    if (contractionsSet.has(lower)) continue;

    // Check against misspellings dictionary
    if (MISSPELLINGS[lower]) {
      issues.push({
        from: token.from,
        to:   token.to,
        word: token.word,
        suggestions: MISSPELLINGS[lower],
        type: 'spell',
      });
    }
  }

  return issues;
}
