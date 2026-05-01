// ============================================================
// FAMILYFLOW — STORAGE (Firebase Realtime Database)
// ============================================================

import { firebaseConfig } from './firebase-config.js';
import { setCustomCategories } from './config.js';

// Firebase v10 modular SDK via CDN
import { initializeApp }                          from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getDatabase, ref, push, set, get,
         remove, update, onValue, off }           from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

let app, db;
let _connected = false;
let _transactionListeners = [];

// ---- Init ----
export async function initFirebase() {
  try {
    app = initializeApp(firebaseConfig);
    db  = getDatabase(app);
    _connected = true;
    console.log('[Firebase] Connected ✓');
    return true;
  } catch (e) {
    console.error('[Firebase] Init error:', e);
    _connected = false;
    return false;
  }
}

export function isConnected() { return _connected; }

// ---- Transactions ----

export async function addTransaction(tx) {
  if (!_connected) return _localAdd('transactions', tx);
  const r = push(ref(db, 'transactions'));
  const data = { ...tx, id: r.key, createdAt: Date.now() };
  await set(r, data);
  return data;
}

export async function updateTransaction(id, tx) {
  if (!_connected) return _localUpdate('transactions', id, tx);
  await update(ref(db, `transactions/${id}`), tx);
}

export async function deleteTransaction(id) {
  if (!_connected) return _localDelete('transactions', id);
  await remove(ref(db, `transactions/${id}`));
}

// Real-time listener — calls callback(transactions[]) on every change
export function listenTransactions(callback) {
  if (!_connected) {
    callback(_localGetAll('transactions'));
    return () => {};
  }
  const r = ref(db, 'transactions');
  const handler = snapshot => {
    const val = snapshot.val() || {};
    const list = Object.values(val).sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    callback(list);
  };
  onValue(r, handler);
  _transactionListeners.push({ ref: r, handler });
  return () => off(r, 'value', handler);
}

// ---- Income settings (per user per month) ----
// key: `YYYY-MM`, userId

export async function saveIncome(userId, yearMonth, card, cash) {
  const data = { card: Number(card) || 0, cash: Number(cash) || 0 };
  if (!_connected) {
    localStorage.setItem(`ff_income_${userId}_${yearMonth}`, JSON.stringify(data));
    return;
  }
  await set(ref(db, `income/${userId}/${yearMonth}`), data);
}

export async function getIncome(userId, yearMonth) {
  if (!_connected) {
    const raw = localStorage.getItem(`ff_income_${userId}_${yearMonth}`);
    return raw ? JSON.parse(raw) : { card: 0, cash: 0 };
  }
  const snap = await get(ref(db, `income/${userId}/${yearMonth}`));
  return snap.val() || { card: 0, cash: 0 };
}

// Real-time income listener for a specific user/month
export function listenIncome(userId, yearMonth, callback) {
  if (!_connected) {
    callback({ card: 0, cash: 0 });
    return () => {};
  }
  const r = ref(db, `income/${userId}/${yearMonth}`);
  const handler = snap => callback(snap.val() || { card: 0, cash: 0 });
  onValue(r, handler);
  return () => off(r, 'value', handler);
}

// ---- Custom Categories ----

export async function saveCustomCategory(cat) {
  if (!_connected) {
    const cats = _localGetAll('customCategories');
    cats.push(cat);
    localStorage.setItem('ff_customCategories', JSON.stringify(cats));
    setCustomCategories(cats);
    return;
  }
  await set(ref(db, `customCategories/${cat.id}`), cat);
}

export async function deleteCustomCategory(id) {
  if (!_connected) {
    const cats = _localGetAll('customCategories').filter(c => c.id !== id);
    localStorage.setItem('ff_customCategories', JSON.stringify(cats));
    setCustomCategories(cats);
    return;
  }
  await remove(ref(db, `customCategories/${id}`));
}

export function listenCustomCategories(callback) {
  if (!_connected) {
    const cats = _localGetAll('customCategories');
    setCustomCategories(cats);
    callback(cats);
    return () => {};
  }
  const r = ref(db, 'customCategories');
  const handler = snap => {
    const val = snap.val() || {};
    const cats = Object.values(val);
    setCustomCategories(cats);
    callback(cats);
  };
  onValue(r, handler);
  return () => off(r, 'value', handler);
}

// ---- Local Storage fallback (offline mode) ----

function _localGetAll(key) {
  try { return JSON.parse(localStorage.getItem(`ff_${key}`) || '[]'); }
  catch { return []; }
}

function _localAdd(key, item) {
  const list = _localGetAll(key);
  const id = 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  const data = { ...item, id, createdAt: Date.now() };
  list.push(data);
  list.sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt - a.createdAt));
  localStorage.setItem(`ff_${key}`, JSON.stringify(list));
  return data;
}

function _localUpdate(key, id, item) {
  const list = _localGetAll(key).map(x => x.id === id ? { ...x, ...item } : x);
  localStorage.setItem(`ff_${key}`, JSON.stringify(list));
}

function _localDelete(key, id) {
  const list = _localGetAll(key).filter(x => x.id !== id);
  localStorage.setItem(`ff_${key}`, JSON.stringify(list));
}
