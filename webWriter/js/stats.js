/* ════════════════════════════════════════════
   STATS.JS — Document statistics
   All pure JS, no libraries needed.
════════════════════════════════════════════ */

import { READING_WPM } from './config.js';

/**
 * Compute all stats for a given text string.
 * Returns an object with all metrics.
 * PURE FUNCTION - No DOM access.
 */
export function computeStats(text) {
  const clean = text.trim();

  if (!clean) {
    return {
      words: 0, chars: 0, charsNoSpace: 0,
      sentences: 0, paragraphs: 0,
      readingMinutes: 0, flesch: null,
      fleschLabel: '—',
    };
  }

  // ── Word count ──────────────────────────────
  const words = clean.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;

  // ── Character counts ────────────────────────
  const charCount        = clean.length;
  const charNoSpaceCount = clean.replace(/\s/g, '').length;

  // ── Sentence count ──────────────────────────
  const sentenceMatches = clean.match(/[^.!?]*[.!?]+/g) || [];
  const sentenceCount = sentenceMatches.length || (wordCount > 0 ? 1 : 0);

  // ── Paragraph count ─────────────────────────
  const paragraphs = clean.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const paraCount  = paragraphs.length || (wordCount > 0 ? 1 : 0);

  // ── Reading time ────────────────────────────
  const readingMinutes = Math.max(1, Math.ceil(wordCount / READING_WPM));

  // ── Flesch Reading Ease ─────────────────────
  const syllableCount = countSyllables(words);
  let flesch = null;
  let fleschLabel = '—';

  if (sentenceCount > 0 && wordCount > 0) {
    const avgWordsPerSentence = wordCount / sentenceCount;
    const avgSyllablesPerWord = syllableCount / wordCount;
    flesch = Math.round(
      206.835
      - 1.015  * avgWordsPerSentence
      - 84.6   * avgSyllablesPerWord
    );
    flesch = Math.max(0, Math.min(100, flesch));
    fleschLabel = fleschToLabel(flesch);
  }

  return {
    words:          wordCount,
    chars:          charCount,
    charsNoSpace:   charNoSpaceCount,
    sentences:      sentenceCount,
    paragraphs:     paraCount,
    readingMinutes,
    flesch,
    fleschLabel,
    syllables:      syllableCount,
  };
}

// ── Syllable counter ──────────────────────────
// Estimates syllable count — not perfect but good enough for readability scoring
function countSyllables(words) {
  return words.reduce((total, word) => {
    return total + syllablesInWord(word.toLowerCase().replace(/[^a-z]/g, ''));
  }, 0);
}

function syllablesInWord(word) {
  if (!word) return 0;
  if (word.length <= 3) return 1;

  // Remove trailing e (silent e)
  word = word.replace(/e$/, '');

  // Count vowel groups
  const vowelGroups = word.match(/[aeiouy]+/g);
  return vowelGroups ? vowelGroups.length : 1;
}

// ── Flesch label ──────────────────────────────
function fleschToLabel(score) {
  if (score >= 90) return 'Very Easy';
  if (score >= 80) return 'Easy';
  if (score >= 70) return 'Fairly Easy';
  if (score >= 60) return 'Standard';
  if (score >= 50) return 'Fairly Difficult';
  if (score >= 30) return 'Difficult';
  return 'Very Difficult';
}

// ── Render stats to DOM ───────────────────────
export function renderStats(stats) {
  document.getElementById('statWords').textContent     = fmt(stats.words);
  document.getElementById('statChars').textContent     = fmt(stats.chars);
  document.getElementById('statSentences').textContent = fmt(stats.sentences);
  document.getElementById('statParas').textContent     = fmt(stats.paragraphs);
  document.getElementById('statReadTime').textContent  = stats.readingMinutes;
  document.getElementById('statFlesch').textContent    =
    stats.flesch !== null ? stats.flesch : '—';
}

function fmt(n) {
  if (n === 0) return '0';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toString();
}
