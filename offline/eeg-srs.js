/**
 * eeg-srs.js — Spaced Repetition System (SM-2 algorithm)
 * EEG学習ツール Phase 3 — 忘却曲線対応反復学習エンジン
 *
 * SM-2アルゴリズム参考: https://www.supermemo.com/en/blog/application-of-a-computer-to-improve-the-results-obtained-in-working-with-the-supermemo-method
 */

'use strict';

// ===== Storage keys =====
const SRS_CARDS_KEY = 'eeg_srs_cards';
const SRS_META_KEY  = 'eeg_srs_meta';

// ===== Card template =====
// {
//   id: string,         — unique question ID
//   source: string,     — 'quiz'|'artifact'
//   easiness: number,   — E-factor, min 1.3, default 2.5
//   interval: number,   — days until next review
//   repetitions: number,— consecutive correct count
//   dueDate: string,    — 'YYYY-MM-DD'
//   lastScore: number|null,
//   history: [{date, score}], — last 10 entries
// }

// ===== Score constants =====
const SRS_SCORE = {
  PERFECT:   5,
  GOOD:      4,
  HESITANT:  3,
  INCORRECT_EASY: 2,
  INCORRECT_HARD: 1,
  BLACKOUT:  0,
  // Simplified 3-button mapping
  REMEMBERED: 4,
  FUZZY:      2,
  FORGOT:     1,
};
window.SRS_SCORE = SRS_SCORE;

// ===== Date utilities =====
function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return Math.round((db - da) / 86400000);
}

// ===== Storage =====
function loadCards() {
  try {
    const raw = localStorage.getItem(SRS_CARDS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch(e) { return {}; }
}

function saveCards(cards) {
  try { localStorage.setItem(SRS_CARDS_KEY, JSON.stringify(cards)); } catch(e) {}
}

function loadMeta() {
  const defaults = {
    lastStudyDate: null,
    streak: 0,
    longestStreak: 0,
    totalReviews: 0,
    totalCards: 0,
    dailyLog: {}, // { 'YYYY-MM-DD': reviewCount }
  };
  try {
    const raw = localStorage.getItem(SRS_META_KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch(e) { return defaults; }
}

function saveMeta(meta) {
  try { localStorage.setItem(SRS_META_KEY, JSON.stringify(meta)); } catch(e) {}
}

// ===== SM-2 core =====
function sm2Update(card, score) {
  const newCard = { ...card };

  // Update E-factor
  let ef = newCard.easiness + (0.1 - (5 - score) * (0.08 + (5 - score) * 0.02));
  ef = Math.max(1.3, Math.min(2.5 + 0.5, ef)); // clamp 1.3 - 3.0

  if (score >= 3) {
    // Correct response
    if (newCard.repetitions === 0) {
      newCard.interval = 1;
    } else if (newCard.repetitions === 1) {
      newCard.interval = 6;
    } else {
      newCard.interval = Math.round(newCard.interval * ef);
    }
    newCard.repetitions += 1;
  } else {
    // Incorrect — reset
    newCard.repetitions = 0;
    newCard.interval = 1;
  }

  newCard.easiness = Math.round(ef * 100) / 100;
  newCard.dueDate = addDays(todayStr(), newCard.interval);
  newCard.lastScore = score;

  if (!newCard.history) newCard.history = [];
  newCard.history.push({ date: todayStr(), score });
  if (newCard.history.length > 20) newCard.history = newCard.history.slice(-20);

  return newCard;
}

// ===== Public API =====

/**
 * Register a new card (first encounter with a question).
 * Idempotent: if card already exists, no-op.
 */
function srsRegister(id, source) {
  const cards = loadCards();
  if (cards[id]) return cards[id]; // already registered
  const newCard = {
    id,
    source: source || 'quiz',
    easiness: 2.5,
    interval: 0,
    repetitions: 0,
    dueDate: todayStr(), // due immediately (new card)
    lastScore: null,
    history: [],
  };
  cards[id] = newCard;
  saveCards(cards);
  updateMetaTotalCards(cards);
  return newCard;
}

/**
 * Record answer and update SRS schedule.
 * score: 0-5 (use SRS_SCORE constants)
 */
function srsAnswer(id, score, source) {
  const cards = loadCards();
  if (!cards[id]) srsRegister(id, source);
  cards[id] = sm2Update(cards[id], score);
  saveCards(cards);
  updateMetaAfterReview(score);
  return cards[id];
}

/**
 * Get today's due cards (sorted: overdue first, then new).
 * maxNew: max new cards to include per session (default 10)
 */
function srsDueToday(maxNew = 10) {
  const cards = loadCards();
  const today = todayStr();
  const due = [];
  const newCards = [];

  Object.values(cards).forEach(card => {
    if (card.repetitions === 0 && card.lastScore === null) {
      newCards.push(card);
    } else if (card.dueDate <= today) {
      due.push(card);
    }
  });

  // Sort overdue by dueDate (most overdue first)
  due.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  // Limit new cards
  const newToday = newCards.slice(0, maxNew);
  return [...due, ...newToday];
}

/**
 * Get count of due cards today.
 */
function srsDueTodayCount() {
  return srsDueToday(999).length;
}

/**
 * Get all cards.
 */
function srsGetAllCards() {
  return loadCards();
}

/**
 * Get a single card by ID.
 */
function srsGetCard(id) {
  return loadCards()[id] || null;
}

/**
 * Categorize cards for stats display.
 */
function srsGetStats() {
  const cards = Object.values(loadCards());
  const today = todayStr();
  let newCount = 0, learningCount = 0, matureCount = 0, dueCount = 0;

  cards.forEach(c => {
    if (c.repetitions === 0 && c.lastScore === null) {
      newCount++;
    } else if (c.interval >= 21) {
      matureCount++;
    } else {
      learningCount++;
    }
    if (c.dueDate <= today && !(c.repetitions === 0 && c.lastScore === null)) {
      dueCount++;
    }
  });

  const meta = loadMeta();
  return { total: cards.length, newCount, learningCount, matureCount, dueCount, meta };
}

/**
 * Get next 7 days forecast (how many cards due each day).
 */
function srsForecast7() {
  const cards = Object.values(loadCards());
  const result = {};
  for (let i = 0; i <= 6; i++) {
    const d = addDays(todayStr(), i);
    result[d] = 0;
  }
  cards.forEach(c => {
    if (c.dueDate && result[c.dueDate] !== undefined) {
      result[c.dueDate]++;
    }
  });
  return result;
}

/**
 * Get accuracy for each card (% correct in history).
 */
function srsCardAccuracy(card) {
  if (!card.history || card.history.length === 0) return null;
  const correct = card.history.filter(h => h.score >= 3).length;
  return Math.round((correct / card.history.length) * 100);
}

/**
 * Reset all SRS data (with confirmation).
 */
function srsReset() {
  localStorage.removeItem(SRS_CARDS_KEY);
  localStorage.removeItem(SRS_META_KEY);
}

// ===== Meta helpers =====
function updateMetaTotalCards(cards) {
  const meta = loadMeta();
  meta.totalCards = Object.keys(cards).length;
  saveMeta(meta);
}

function updateMetaAfterReview(score) {
  const meta = loadMeta();
  const today = todayStr();

  meta.totalReviews = (meta.totalReviews || 0) + 1;

  // Daily log
  if (!meta.dailyLog) meta.dailyLog = {};
  meta.dailyLog[today] = (meta.dailyLog[today] || 0) + 1;

  // Streak
  if (meta.lastStudyDate === today) {
    // already counted today
  } else if (meta.lastStudyDate === addDays(today, -1)) {
    meta.streak = (meta.streak || 0) + 1;
  } else if (meta.lastStudyDate !== today) {
    meta.streak = 1; // reset streak
  }

  if (meta.streak > (meta.longestStreak || 0)) {
    meta.longestStreak = meta.streak;
  }

  meta.lastStudyDate = today;
  saveMeta(meta);
}

// ===== Question metadata registry =====
// Maps question IDs to display info (used in review page)
const SRS_QUESTION_META = {};

function srsRegisterMeta(id, meta) {
  SRS_QUESTION_META[id] = meta;
}
window.SRS_QUESTION_META = SRS_QUESTION_META;

// ===== Export to window =====
window.srsRegister    = srsRegister;
window.srsAnswer      = srsAnswer;
window.srsDueToday    = srsDueToday;
window.srsDueTodayCount = srsDueTodayCount;
window.srsGetAllCards = srsGetAllCards;
window.srsGetCard     = srsGetCard;
window.srsGetStats    = srsGetStats;
window.srsForecast7   = srsForecast7;
window.srsCardAccuracy = srsCardAccuracy;
window.srsReset       = srsReset;
window.srsRegisterMeta = srsRegisterMeta;
window.todayStr       = todayStr;
window.addDays        = addDays;
window.daysBetween    = daysBetween;
