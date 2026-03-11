/* ════════════════════════════════════════════
   GRAMMAR.JS — Grammar & style analysis
   
   Implements common writing rules in pure JS.
   No external library required for the basics.
   write-good patterns adapted and expanded.
════════════════════════════════════════════ */

import { GRAMMAR_RULES, STYLE_RULES } from './config.js';

// ── Main analysis function ────────────────────
/**
 * Analyze text for grammar and style issues.
 * Returns array of { from, to, type, word, reason }
 * PURE FUNCTION - No DOM access.
 */
export function analyzeGrammar(text) {
  const issues = [];

  for (const rule of [...GRAMMAR_RULES, ...STYLE_RULES]) {
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    let match;

    while ((match = regex.exec(text)) !== null) {
      const word = match[0];

      // Skip if in skipWords list
      if (rule.skipWords && rule.skipWords.some(sw =>
        word.toLowerCase().includes(sw.toLowerCase())
      )) continue;

      // Avoid duplicate overlapping ranges
      const from = match.index;
      const to   = match.index + word.length;

      const overlaps = issues.some(i =>
        (from >= i.from && from < i.to) ||
        (to   > i.from && to  <= i.to)
      );

      if (!overlaps) {
        issues.push({
          from,
          to,
          type: rule.type,
          word,
          reason: rule.reason,
        });
      }

      // Prevent infinite loop on zero-length matches
      if (match.index === regex.lastIndex) regex.lastIndex++;
    }
  }

  // Sort by position
  return issues.sort((a, b) => a.from - b.from);
}
