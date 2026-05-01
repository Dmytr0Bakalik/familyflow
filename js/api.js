// ============================================
// FINTECH DASHBOARD — GOOGLE SHEETS API
// ============================================

import { CONFIG } from './config.js';
import { state } from './state.js';
import { generateId, toSheetDate } from './state.js';
import { showToast } from './ui.js';

// ============================================
// GOOGLE API INITIALIZATION
// ============================================

let gapiReady = false;
let gisReady = false;
let tokenClient = null;

export async function initGoogleAPI() {
  return new Promise((resolve) => {
    // Load GAPI
    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.onload = () => {
      window.gapi.load('client', async () => {
        try {
          await window.gapi.client.init({
            apiKey: state.apiKey,
            discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
          });
          gapiReady = true;
        } catch (e) {
          console.warn('GAPI init error:', e);
        }
        checkReady(resolve);
      });
    };
    gapiScript.onerror = () => { gapiReady = true; checkReady(resolve); };
    document.head.appendChild(gapiScript);

    // Load GIS (Google Identity Services)
    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.onload = () => {
      gisReady = true;
      checkReady(resolve);
    };
    gisScript.onerror = () => { gisReady = true; checkReady(resolve); };
    document.head.appendChild(gisScript);
  });
}

function checkReady(resolve) {
  if (gapiReady && gisReady) resolve();
}

export function setupTokenClient(clientId, callback) {
  if (!window.google?.accounts?.oauth2) {
    callback(null, 'Google Identity Services not loaded');
    return;
  }
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: CONFIG.SCOPES,
    callback: (tokenResponse) => {
      if (tokenResponse.error) {
        callback(null, tokenResponse.error);
        return;
      }
      state.accessToken = tokenResponse.access_token;
      state.isAuthenticated = true;
      if (window.gapi?.client) {
        window.gapi.client.setToken({ access_token: tokenResponse.access_token });
      }
      callback(tokenResponse, null);
    },
  });
}

export function requestAuth() {
  if (tokenClient) {
    tokenClient.requestAccessToken({ prompt: '' });
  }
}

export function signOut() {
  if (state.accessToken && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(state.accessToken);
  }
  state.accessToken = null;
  state.isAuthenticated = false;
}

// ============================================
// SHEETS API BASE
// ============================================

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

async function sheetsFetch(path, options = {}) {
  const url = `${SHEETS_BASE}/${CONFIG.SPREADSHEET_ID}${path}`;
  const headers = { 'Content-Type': 'application/json' };

  if (state.accessToken) {
    headers['Authorization'] = `Bearer ${state.accessToken}`;
  } else if (state.apiKey) {
    const sep = path.includes('?') ? '&' : '?';
    return fetch(`${url}${sep}key=${state.apiKey}`, { ...options, headers });
  } else {
    throw new Error('No authentication method available');
  }

  return fetch(url, { ...options, headers });
}

// ============================================
// READ: FETCH ALL TRANSACTIONS
// ============================================

export async function fetchTransactions() {
  state.isFetching = true;

  try {
    const range = `${CONFIG.SHEET_NAME}!A:G`;
    const res = await sheetsFetch(`/values/${encodeURIComponent(range)}`);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const rows = data.values || [];

    // Skip header row (row index 0 if headers present)
    const startIdx = rows.length > 0 && isHeaderRow(rows[0]) ? 1 : 0;

    state.transactions = rows.slice(startIdx).map((row, i) => ({
      id:          row[CONFIG.COLUMNS.ID]          || generateId(),
      date:        row[CONFIG.COLUMNS.DATE]         || '',
      type:        row[CONFIG.COLUMNS.TYPE]         || 'Expense',
      category:    row[CONFIG.COLUMNS.CATEGORY]     || '',
      subCategory: row[CONFIG.COLUMNS.SUBCATEGORY]  || '',
      amount:      parseFloat(row[CONFIG.COLUMNS.AMOUNT]) || 0,
      notes:       row[CONFIG.COLUMNS.NOTES]        || '',
      _rowIndex:   startIdx + i + 1, // 1-based sheet row (for updates)
    }));

    state.lastFetchTime = Date.now();
    return state.transactions;
  } finally {
    state.isFetching = false;
  }
}

function isHeaderRow(row) {
  const first = (row[0] || '').toLowerCase();
  return first === 'id' || first === '#';
}

// ============================================
// CREATE: APPEND NEW ROW
// ============================================

export async function createTransaction(tx) {
  state.isSaving = true;

  try {
    const row = buildRow(tx);
    const range = `${CONFIG.SHEET_NAME}!A:G`;

    const res = await sheetsFetch(
      `/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        body: JSON.stringify({ values: [row] }),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${res.status}`);
    }

    // Add to local state immediately
    state.transactions.push({ ...tx, _rowIndex: null });
    return true;
  } finally {
    state.isSaving = false;
  }
}

// ============================================
// UPDATE: MODIFY EXISTING ROW
// ============================================

export async function updateTransaction(tx) {
  state.isSaving = true;

  try {
    if (!tx._rowIndex) throw new Error('Row index missing — refetch first');

    const range = `${CONFIG.SHEET_NAME}!A${tx._rowIndex}:G${tx._rowIndex}`;
    const row = buildRow(tx);

    const res = await sheetsFetch(
      `/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        body: JSON.stringify({ values: [row] }),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${res.status}`);
    }

    // Update local state
    const idx = state.transactions.findIndex(t => t.id === tx.id);
    if (idx !== -1) state.transactions[idx] = tx;
    return true;
  } finally {
    state.isSaving = false;
  }
}

// ============================================
// DELETE: CLEAR ROW (or shift up)
// ============================================

export async function deleteTransaction(tx) {
  state.isSaving = true;

  try {
    if (!tx._rowIndex) throw new Error('Row index missing — refetch first');

    // Get sheet ID (needed for batchUpdate to delete actual rows)
    const sheetIdRes = await sheetsFetch('');
    const sheetData = await sheetIdRes.json();
    const sheet = sheetData.sheets?.find(s =>
      s.properties.title === CONFIG.SHEET_NAME
    );
    const sheetId = sheet?.properties?.sheetId ?? 0;

    const res = await sheetsFetch(':batchUpdate', {
      method: 'POST',
      body: JSON.stringify({
        requests: [{
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: tx._rowIndex - 1, // 0-based
              endIndex:   tx._rowIndex,
            }
          }
        }]
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${res.status}`);
    }

    // Remove from local state
    state.transactions = state.transactions.filter(t => t.id !== tx.id);
    return true;
  } finally {
    state.isSaving = false;
  }
}

// ============================================
// ENSURE HEADERS (first-run setup)
// ============================================

export async function ensureHeaders() {
  try {
    const range = `${CONFIG.SHEET_NAME}!A1:G1`;
    const res = await sheetsFetch(`/values/${encodeURIComponent(range)}`);
    const data = await res.json();
    const row = (data.values || [])[0] || [];

    if (row.length === 0 || !((row[0] || '').toLowerCase() === 'id')) {
      // Write headers
      await sheetsFetch(
        `/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          body: JSON.stringify({
            values: [['ID', 'Date', 'Type', 'Category', 'Sub-Category', 'Amount', 'Notes']]
          }),
        }
      );
    }
  } catch (e) {
    console.warn('Could not ensure headers:', e);
  }
}

// ============================================
// HELPERS
// ============================================

function buildRow(tx) {
  return [
    tx.id          || generateId(),
    tx.date        || '',
    tx.type        || 'Expense',
    tx.category    || '',
    tx.subCategory || '',
    tx.amount      || 0,
    tx.notes       || '',
  ];
}

// ============================================
// DEMO DATA (No auth fallback)
// ============================================

export function loadDemoData() {
  const now = new Date();
  const fmt = (d) => {
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
  };

  const daysAgo = (n) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return fmt(d);
  };

  state.transactions = [
    { id:'tx_demo_1',  date: daysAgo(0),  type:'Income',  category:'salary',        subCategory:'Monthly',       amount: 35000, notes:'April salary', _rowIndex:2 },
    { id:'tx_demo_2',  date: daysAgo(1),  type:'Expense', category:'groceries',     subCategory:'Weekly shop',   amount: 1850,  notes:'Silpo', _rowIndex:3 },
    { id:'tx_demo_3',  date: daysAgo(1),  type:'Expense', category:'transport',     subCategory:'Fuel',          amount: 620,   notes:'', _rowIndex:4 },
    { id:'tx_demo_4',  date: daysAgo(2),  type:'Expense', category:'food',          subCategory:'Restaurant',    amount: 780,   notes:'Dinner with friends', _rowIndex:5 },
    { id:'tx_demo_5',  date: daysAgo(3),  type:'Expense', category:'utilities',     subCategory:'Electricity',   amount: 540,   notes:'', _rowIndex:6 },
    { id:'tx_demo_6',  date: daysAgo(5),  type:'Expense', category:'shopping',      subCategory:'Clothes',       amount: 2300,  notes:'New jeans', _rowIndex:7 },
    { id:'tx_demo_7',  date: daysAgo(5),  type:'Income',  category:'freelance',     subCategory:'Design',        amount: 8500,  notes:'Logo project', _rowIndex:8 },
    { id:'tx_demo_8',  date: daysAgo(6),  type:'Expense', category:'entertainment', subCategory:'Cinema',        amount: 320,   notes:'', _rowIndex:9 },
    { id:'tx_demo_9',  date: daysAgo(7),  type:'Expense', category:'health',        subCategory:'Pharmacy',      amount: 460,   notes:'', _rowIndex:10 },
    { id:'tx_demo_10', date: daysAgo(8),  type:'Expense', category:'groceries',     subCategory:'',              amount: 1220,  notes:'Novus', _rowIndex:11 },
    { id:'tx_demo_11', date: daysAgo(9),  type:'Expense', category:'subscriptions', subCategory:'Netflix',       amount: 245,   notes:'', _rowIndex:12 },
    { id:'tx_demo_12', date: daysAgo(10), type:'Expense', category:'housing',       subCategory:'Rent',          amount: 8000,  notes:'April rent', _rowIndex:13 },
    { id:'tx_demo_13', date: daysAgo(12), type:'Expense', category:'food',          subCategory:'Cafe',          amount: 290,   notes:'Coffee & work', _rowIndex:14 },
    { id:'tx_demo_14', date: daysAgo(13), type:'Income',  category:'investment',    subCategory:'Dividends',     amount: 1200,  notes:'', _rowIndex:15 },
    { id:'tx_demo_15', date: daysAgo(14), type:'Expense', category:'personal',      subCategory:'Haircut',       amount: 350,   notes:'', _rowIndex:16 },
    { id:'tx_demo_16', date: daysAgo(15), type:'Expense', category:'transport',     subCategory:'Taxi',          amount: 180,   notes:'', _rowIndex:17 },
    { id:'tx_demo_17', date: daysAgo(16), type:'Expense', category:'education',     subCategory:'Udemy',         amount: 399,   notes:'React course', _rowIndex:18 },
    { id:'tx_demo_18', date: daysAgo(18), type:'Expense', category:'food',          subCategory:'Delivery',      amount: 560,   notes:'Glovo', _rowIndex:19 },
    { id:'tx_demo_19', date: daysAgo(20), type:'Expense', category:'shopping',      subCategory:'Electronics',   amount: 4200,  notes:'Headphones', _rowIndex:20 },
    { id:'tx_demo_20', date: daysAgo(22), type:'Income',  category:'salary',        subCategory:'Bonus',         amount: 5000,  notes:'Q1 bonus', _rowIndex:21 },
    // Last month data
    { id:'tx_demo_21', date: daysAgo(35), type:'Income',  category:'salary',        subCategory:'Monthly',       amount: 33000, notes:'March salary', _rowIndex:22 },
    { id:'tx_demo_22', date: daysAgo(36), type:'Expense', category:'housing',       subCategory:'Rent',          amount: 8000,  notes:'March rent', _rowIndex:23 },
    { id:'tx_demo_23', date: daysAgo(38), type:'Expense', category:'groceries',     subCategory:'',              amount: 1700,  notes:'', _rowIndex:24 },
    { id:'tx_demo_24', date: daysAgo(40), type:'Expense', category:'transport',     subCategory:'Fuel',          amount: 580,   notes:'', _rowIndex:25 },
    { id:'tx_demo_25', date: daysAgo(42), type:'Expense', category:'entertainment', subCategory:'Concert',       amount: 800,   notes:'', _rowIndex:26 },
    { id:'tx_demo_26', date: daysAgo(44), type:'Expense', category:'food',          subCategory:'Restaurant',    amount: 650,   notes:'', _rowIndex:27 },
    { id:'tx_demo_27', date: daysAgo(45), type:'Expense', category:'utilities',     subCategory:'Internet',      amount: 299,   notes:'', _rowIndex:28 },
    { id:'tx_demo_28', date: daysAgo(48), type:'Expense', category:'health',        subCategory:'Gym',           amount: 800,   notes:'', _rowIndex:29 },
    { id:'tx_demo_29', date: daysAgo(50), type:'Expense', category:'shopping',      subCategory:'',              amount: 1500,  notes:'', _rowIndex:30 },
    { id:'tx_demo_30', date: daysAgo(52), type:'Income',  category:'freelance',     subCategory:'Web dev',       amount: 6000,  notes:'', _rowIndex:31 },
  ];
  state.lastFetchTime = Date.now();
}
