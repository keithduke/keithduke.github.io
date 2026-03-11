/* ════════════════════════════════════════════
   CONFIG.JS — Global constants and configuration
════════════════════════════════════════════ */

// ── IndexedDB Constants ───────────────────────
export const DB_NAME    = 'typewriter';
export const DB_VERSION = 1;
export const STORE      = 'documents';

// ── Writing Stats ─────────────────────────────
export const READING_WPM = 238; // Average silent reading speed (research-based)

// ── Grammar & Style Rules ─────────────────────
export const GRAMMAR_RULES = [
  {
    pattern: /\b(don't|doesn't|didn't|won't|wouldn't|can't|couldn't|shouldn't)\s+\w+\s+(no|none|nothing|nobody|nowhere|neither|never)\b/gi,
    reason: 'Possible double negative.',
    type: 'grammar',
  },
  {
    pattern: /\bthey\s+is\b/gi,
    reason: '"They is" — consider "they are".',
    type: 'grammar',
  },
  {
    pattern: /\bwe\s+is\b/gi,
    reason: '"We is" — consider "we are".',
    type: 'grammar',
  },
  {
    pattern: /\byour\s+welcome\b/gi,
    reason: '"Your welcome" — did you mean "you\'re welcome"?',
    type: 'grammar',
  },
  {
    pattern: /\bits\s+a\b/gi,
    reason: '"Its a" — did you mean "it\'s a"?',
    type: 'grammar',
  },
  {
    pattern: /\bshould\s+of\b|\bcould\s+of\b|\bwould\s+of\b/gi,
    reason: '"Of" instead of "have" — e.g. "should have".',
    type: 'grammar',
  },
];

export const STYLE_RULES = [
  {
    pattern: /\b(am|is|are|was|were|be|been|being)\s+(\w+ed)\b/gi,
    reason: 'Passive voice — consider rewriting actively.',
    type: 'style',
    skipWords: ['interested', 'excited', 'concerned', 'married', 'tired', 'bored', 'worried', 'surprised', 'pleased', 'annoyed', 'frightened'],
  },
  {
    pattern: /\b(very|quite|rather|somewhat|fairly|pretty|mostly|generally|usually|basically|essentially|literally|actually|honestly|really|simply|just)\b/gi,
    reason: 'Weak qualifier — consider removing or replacing.',
    type: 'style',
  },
  {
    pattern: /\b(at the end of the day|touch base|think outside the box|move the needle|circle back|low hanging fruit|level the playing field|hit the ground running|paradigm shift|synergy|bandwidth)\b/gi,
    reason: 'Cliché — consider a fresher expression.',
    type: 'style',
  },
  {
    pattern: /\b(added bonus|advance planning|brief summary|close proximity|completely destroy|end result|final outcome|free gift|future plans|past history|personal opinion|sudden crisis|unexpected surprise|unintended mistake|various different)\b/gi,
    reason: 'Redundant phrasing.',
    type: 'style',
  },
  {
    pattern: /\b(in order to|in the event that|due to the fact that|at this point in time|for the purpose of|in spite of the fact that|with regard to|in reference to)\b/gi,
    reason: 'Wordy — consider simplifying.',
    type: 'style',
  },
  {
    pattern: /\b(it seems|it appears|it would seem|arguably|perhaps|maybe|possibly|might be|could be|may be)\b/gi,
    reason: 'Hedging language — be more direct if you\'re certain.',
    type: 'style',
  },
];

// ── Spellcheck Data ───────────────────────────
export const MISSPELLINGS = {
  'teh': ['the'], 'hte': ['the'], 'taht': ['that'], 'thier': ['their'],
  'recieve': ['receive'], 'beleive': ['believe'], 'wierd': ['weird'],
  'occured': ['occurred'], 'occurence': ['occurrence'], 'seperate': ['separate'],
  'definately': ['definitely'], 'defiantly': ['definitely'], 'goverment': ['government'],
  'occassion': ['occasion'], 'accomodate': ['accommodate'], 'embarass': ['embarrass'],
  'existance': ['existence'], 'independant': ['independent'], 'neccessary': ['necessary'],
  'persistance': ['persistence'], 'privelege': ['privilege'], 'refering': ['referring'],
  'responsibilty': ['responsibility'], 'succesful': ['successful'],
  'tendancy': ['tendency'], 'untill': ['until'], 'usefull': ['useful'],
  'wether': ['whether', 'weather'], 'wich': ['which', 'witch'],
  'writting': ['writing'], 'youre': ["you're", 'your'], 'its': ["it's", 'its'],
  'alot': ['a lot'], 'alright': ['all right'], 'anywho': ['anyhow'],
  'becuase': ['because'], 'begining': ['beginning'], 'busines': ['business'],
  'calender': ['calendar'], 'camara': ['camera'], 'cemetary': ['cemetery'],
  'commitee': ['committee'], 'concious': ['conscious'], 'definitly': ['definitely'],
  'desparate': ['desperate'], 'dilemna': ['dilemma'], 'dissapear': ['disappear'],
  'dissappoint': ['disappoint'], 'equiped': ['equipped'], 'exilerate': ['exhilarate'],
  'facination': ['fascination'], 'finaly': ['finally'], 'florescent': ['fluorescent'],
  'foriegn': ['foreign'], 'fourty': ['forty'], 'freind': ['friend'],
  'grammer': ['grammar'], 'gaurd': ['guard'], 'hapiness': ['happiness'],
  'harrass': ['harass'], 'hieght': ['height'], 'hygene': ['hygiene'],
  'imediate': ['immediate'], 'incidently': ['incidentally'], 'innoculate': ['inoculate'],
  'intelligance': ['intelligence'], 'jist': ['gist'], 'knowlege': ['knowledge'],
  'liason': ['liaison'], 'lightening': ['lightning', 'lightening'],
  'lisence': ['license'], 'maintenence': ['maintenance'], 'millenium': ['millennium'],
  'mischevious': ['mischievous'], 'missle': ['missile'], 'misspell': ['misspell'],
  'naieve': ['naive'], 'neice': ['niece'], 'noticable': ['noticeable'],
  'occassionally': ['occasionally'], 'omision': ['omission'], 'paralell': ['parallel'],
  'parliment': ['parliament'], 'passtime': ['pastime'], 'peice': ['piece'],
  'perceive': ['perceive'], 'pharase': ['phrase'], 'playright': ['playwright'],
  'posession': ['possession'], 'precede': ['precede'], 'prejudice': ['prejudice'],
  'presense': ['presence'], 'pronounciation': ['pronunciation'], 'publically': ['publicly'],
  'questionaire': ['questionnaire'], 'realy': ['really'], 'reccomend': ['recommend'],
  'rythm': ['rhythm'], 'sacrilegious': ['sacrilegious'], 'scedule': ['schedule'],
  'seige': ['siege'], 'sence': ['sense', 'since'], 'sieze': ['seize'],
  'similiar': ['similar'], 'speach': ['speech'], 'succumb': ['succumb'],
  'suprise': ['surprise'], 'temperture': ['temperature'], 'tommorow': ['tomorrow'],
  'tounge': ['tongue'], 'truely': ['truly'], 'tyrany': ['tyranny'],
  'vaccum': ['vacuum'], 'visable': ['visible'], 'weild': ['wield'],
  'worryed': ['worried'], 'writeing': ['writing'],
};

export const CONTRACTIONS = [
  "i'm", "i've", "i'll", "i'd", "you're", "you've", "you'll", "you'd",
  "he's", "he'll", "he'd", "she's", "she'll", "she'd", "it's", "it'll",
  "we're", "we've", "we'll", "we'd", "they're", "they've", "they'll", "they'd",
  "that's", "that'll", "that'd", "what's", "what'll", "what'd",
  "who's", "who'll", "who'd", "where's", "when's", "why's", "how's",
  "isn't", "aren't", "wasn't", "weren't", "hasn't", "haven't", "hadn't",
  "doesn't", "don't", "didn't", "won't", "wouldn't", "can't", "couldn't",
  "shouldn't", "mustn't", "let's", "there's", "here's",
];
