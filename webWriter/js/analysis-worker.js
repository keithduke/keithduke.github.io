/* ════════════════════════════════════════════
   ANALYSIS-WORKER.JS — Professional Analysis
   Uses Compromise.js (NLP) and Typo.js (Hunspell)
════════════════════════════════════════════ */

// In a { type: 'module' } worker, use import instead of importScripts
// These libraries will attach themselves to the 'self' global
import './vendor/compromise.min.js';
import './vendor/typo.js';

// Import our pure utility logic
import { computeStats } from './stats.js';
import { GRAMMAR_RULES, STYLE_RULES, MISSPELLINGS, CONTRACTIONS } from './config.js';

let typo = null;

// Grab from self (since vendor scripts attach to global)
const nlp = self.nlp;
const Typo = self.Typo;

async function initTypo() {
  if (typo && typo.loaded) return typo;

  try {
    console.log('[Worker] Loading dictionary files...');
    const [affData, dicData] = await Promise.all([
      fetch('vendor/en_US.aff').then(r => r.text()),
      fetch('vendor/en_US.dic').then(r => r.text())
    ]);

    console.log('[Worker] Initializing Typo object...');
    typo = new Typo('en_US', affData, dicData);
    
    console.log('[Worker] Typo initialized. Loaded:', typo.loaded);
    return typo;
  } catch (err) {
    console.error('[Worker] Typo.js init failed:', err);
    return null;
  }
}

self.onmessage = async (e) => {
  const { text, personalDictionary } = e.data;
  console.log('[Worker] Message received, starting analysis...');
  
  await initTypo();

  try {
    // 1. Compute basic stats
    const stats = computeStats(text);

    // 2. Natural Language Processing (Compromise.js)
    const doc = nlp(text);
    
    // Identify proper nouns to ignore for spelling
    const properNouns = new Set(
      doc.topics().out('array').map(t => t.toLowerCase())
    );

    // 3. Spell Checking (Hybrid: Typo.js + our Instant Fixes)
    const spellingIssues = runSpellCheck(text, personalDictionary, properNouns);

    // 4. Grammar & Style (Hybrid: Compromise + our Rules)
    const grammarAll = runGrammarAnalysis(text, doc);

    console.log('[Worker] Analysis finished. Spelling issues:', spellingIssues.length);
    self.postMessage({
      success: true,
      stats,
      spellingIssues,
      grammarAll,
    });
  } catch (err) {
    console.error('[Worker] Analysis loop failed:', err);
    self.postMessage({
      success: false,
      error: err.message
    });
  }
};

function runSpellCheck(text, personalDict, properNouns) {
  const issues = [];
  const dictSet = new Set(personalDict.map(w => w.toLowerCase()));
  const contractionsSet = new Set(CONTRACTIONS.map(w => w.toLowerCase()));

  const regex = /[a-zA-Z]+(?:'[a-zA-Z]+)*/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const word = match[0];
    const lower = word.toLowerCase();

    if (word.length <= 2) continue;
    if (dictSet.has(lower)) continue;
    if (contractionsSet.has(lower)) continue;
    if (properNouns.has(lower)) continue;

    if (MISSPELLINGS[lower]) {
      issues.push({
        from: match.index,
        to: match.index + word.length,
        word,
        suggestions: MISSPELLINGS[lower],
        type: 'spell',
        reason: 'Common misspelling.'
      });
      continue;
    }

    if (typo && !typo.check(word)) {
      const suggestions = typo.suggest(word);
      issues.push({
        from: match.index,
        to: match.index + word.length,
        word,
        suggestions: suggestions.slice(0, 5),
        type: 'spell',
        reason: 'Unrecognized word.'
      });
    }
  }
  return issues;
}

function runGrammarAnalysis(text, doc) {
  const issues = [];

  const passive = doc.match('#Passive').json({ offset: true });
  passive.forEach(m => {
    if (m.offset) {
      issues.push({
        from: m.offset.start,
        to: m.offset.start + m.offset.length,
        type: 'style',
        word: m.text,
        reason: 'Passive voice — consider an active construction.'
      });
    }
  });

  const weakAdverbs = ['really', 'very', 'extremely', 'basically', 'actually', 'literally'];
  const adverbs = doc.adverbs().json({ offset: true });
  adverbs.forEach(m => {
    if (m.offset && weakAdverbs.includes(m.text.toLowerCase().trim())) {
      issues.push({
        from: m.offset.start,
        to: m.offset.start + m.offset.length,
        type: 'style',
        word: m.text,
        reason: 'Weak adverb.'
      });
    }
  });

  for (const rule of [...GRAMMAR_RULES, ...STYLE_RULES]) {
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      const from = match.index;
      const to = from + match[0].length;
      const overlaps = issues.some(i => (from >= i.from && from < i.to));
      if (!overlaps) {
        issues.push({
          from, to,
          type: rule.type,
          word: match[0],
          reason: rule.reason
        });
      }
    }
  }
  return issues.sort((a, b) => a.from - b.from);
}
