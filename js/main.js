// ============================================================
// FAMILYFLOW — MAIN
// ============================================================

import { getCurrentUser, loginAs, logout, toggleTheme,
         setTheme, isLoggedIn, USERS } from './auth.js';
import { state } from './state.js';
import { setCustomCategories } from './config.js';
import { getLang, setLang, t } from './i18n.js';
import { renderAll, showToast, applyI18nById,
         renderStatCards, renderWhoSpent, renderRecentTransactions,
         renderTransactionList, renderHeader, renderSettings } from './ui.js';
import { openAddModal, setupModal } from './form.js';
import { setupFilters } from './filters.js';
import { renderAllCharts, destroyCharts } from './charts.js';
import { renderCalendar, setupCalendar } from './calendar.js';

let _activeTab = 'home';
let _unsubscribeTx   = null;
let _unsubscribeCats = null;

// ============================================================
// BOOTSTRAP
// ============================================================
async function bootstrap() {
  // Language
  setLang(localStorage.getItem('ff_lang') || 'ua');

  setupLoginScreen();
  applyI18nById();

  if (isLoggedIn()) {
    await enterApp(getCurrentUser().id);
  }
  // loginScreen is visible by default (CSS), nothing extra needed
}

// ============================================================
// LOGIN
// ============================================================
function setupLoginScreen() {
  USERS.forEach(u => {
    document.getElementById(`loginBtn${u.id}`)?.addEventListener('click', () => enterApp(u.id));
  });

  document.getElementById('loginLangToggle')?.addEventListener('click', () => {
    const next = getLang() === 'ua' ? 'de' : 'ua';
    setLang(next);
    applyI18nById();
    updateLangBtns();
  });
  updateLangBtns();
}

function updateLangBtns() {
  const label = getLang() === 'ua' ? '🇩🇪 DE' : '🇺🇦 UA';
  const appLabel = getLang() === 'ua' ? '🇩🇪 DE' : '🇺🇦 UA';
  document.getElementById('loginLangToggle'  )?.setAttribute('textContent', label);
  const ll = document.getElementById('loginLangToggle');
  if (ll) ll.textContent = appLabel;
  const al = document.getElementById('appLangToggle');
  if (al) al.textContent = appLabel;
  const sl = document.getElementById('settingsLangToggle');
  if (sl) sl.textContent = getLang() === 'ua' ? '🇺🇦 UA' : '🇩🇪 DE';
}

// ============================================================
// ENTER APP
// ============================================================
async function enterApp(userId) {
  loginAs(userId);

  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appShell'   ).style.display = 'block';

  setupAppShell();
  applyI18nById();
  renderHeader();
  renderMonthLabel();

  await connectData();

  renderAll();
  renderAllCharts();
  switchTab('home');
}

// ============================================================
// DATA
// ============================================================
async function connectData() {
  // Lazy-import storage to handle Firebase config errors gracefully
  let storage;
  try {
    storage = await import('./storage.js');
    const ok = await storage.initFirebase();
    state.firebaseConnected = ok;
  } catch (e) {
    console.warn('[Firebase] Not configured or error:', e.message);
    state.firebaseConnected = false;
  }

  const statusEl = document.getElementById('firebaseStatus');
  if (statusEl) {
    statusEl.textContent   = state.firebaseConnected ? '✅ ' + t('settings_firebase_status') : '⚠️ Offline mode (localStorage)';
    statusEl.className     = state.firebaseConnected ? 'badge badge-green' : 'badge badge-gray';
  }

  if (storage) {
    // Custom categories
    _unsubscribeCats = storage.listenCustomCategories(cats => setCustomCategories(cats));

    // Transactions (real-time)
    _unsubscribeTx = storage.listenTransactions(txList => {
      state.transactions = txList;
      renderStatCards();
      renderWhoSpent();
      renderRecentTransactions();
      if (_activeTab === 'history')   { renderHistoryMonthLabel(); renderTransactionList(); }
      if (_activeTab === 'analytics') { destroyCharts(); renderAllCharts(); }
    });

    // Load income
    const user = getCurrentUser();
    if (user) {
      state.income = await storage.getIncome(user.id, state.currentMonth);
    }
  } else {
    // Offline — use localStorage transactions
    const raw = localStorage.getItem('ff_transactions');
    if (raw) {
      try { state.transactions = JSON.parse(raw); } catch {}
    }
  }
}

// ============================================================
// APP SHELL
// ============================================================
function setupAppShell() {
  setupModal();
  setupMonthNav();
  setupBottomNav();
  setupFAB();
  setupHeaderActions();
}

function setupBottomNav() {
  document.querySelectorAll('.bottom-nav-item[data-tab]').forEach(el => {
    el.addEventListener('click', () => switchTab(el.dataset.tab));
  });
}

function switchTab(tab) {
  _activeTab = tab;
  document.querySelectorAll('.bottom-nav-item[data-tab]').forEach(el =>
    el.classList.toggle('active', el.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach(p =>
    p.classList.toggle('active', p.dataset.panel === tab));

  if (tab === 'home') {
    renderStatCards(); renderWhoSpent(); renderRecentTransactions();
    destroyCharts(); renderAllCharts();
  } else if (tab === 'history') {
    renderHistoryMonthLabel(); setupFilters(); renderTransactionList();
  } else if (tab === 'analytics') {
    destroyCharts(); renderAllCharts();
  } else if (tab === 'calendar') {
    setupCalendar(); renderCalendar();
  } else if (tab === 'settings') {
    renderSettings(); setupSettingsActions();
  }
}

function setupFAB() {
  document.getElementById('fab')?.addEventListener('click', () => openAddModal('expense'));
}

function setupHeaderActions() {
  document.getElementById('appLangToggle')?.addEventListener('click', () => {
    const next = getLang() === 'ua' ? 'de' : 'ua';
    setLang(next);
    applyI18nById();
    updateLangBtns();
    renderAll();
    destroyCharts(); renderAllCharts();
    setupFilters();
  });

  document.getElementById('appThemeToggle')?.addEventListener('click', () => {
    const next = toggleTheme();
    updateThemeBtn(next);
    destroyCharts(); renderAllCharts();
  });

  document.getElementById('headerAvatar')?.addEventListener('click', () => switchTab('settings'));
  document.getElementById('seeAllBtn')?.addEventListener('click', () => switchTab('history'));

  updateThemeBtn(document.documentElement.getAttribute('data-theme'));
}

function updateThemeBtn(theme) {
  const btn = document.getElementById('appThemeToggle');
  if (btn) btn.textContent = theme === 'pink' ? '🌙' : '🌸';
}

function setupSettingsActions() {
  const user = getCurrentUser();
  if (!user) return;

  document.getElementById('btnSwitchUser')?.addEventListener('click', () => {
    if (_unsubscribeTx)   _unsubscribeTx();
    if (_unsubscribeCats) _unsubscribeCats();
    logout();
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('appShell'   ).style.display = 'none';
    applyI18nById();
  });

  const cardEl = document.getElementById('settingsIncomeCard');
  const cashEl = document.getElementById('settingsIncomeCash');
  if (cardEl && state.income) cardEl.value = state.income.card || '';
  if (cashEl && state.income) cashEl.value = state.income.cash || '';

  document.getElementById('btnSaveIncome')?.addEventListener('click', async () => {
    const card = parseFloat(cardEl?.value) || 0;
    const cash = parseFloat(cashEl?.value) || 0;
    state.income = { card, cash };
    try {
      const storage = await import('./storage.js');
      await storage.saveIncome(user.id, state.currentMonth, card, cash);
    } catch {}
    renderStatCards();
    showToast(t('saved_ok'));
  });

  document.getElementById('btnThemeDark')?.addEventListener('click', () => {
    setTheme('dark'); updateThemeBtn('dark'); destroyCharts(); renderAllCharts();
  });
  document.getElementById('btnThemePink')?.addEventListener('click', () => {
    setTheme('pink'); updateThemeBtn('pink'); destroyCharts(); renderAllCharts();
  });

  document.getElementById('settingsLangToggle')?.addEventListener('click', () => {
    document.getElementById('appLangToggle')?.click();
    updateLangBtns();
  });
}

// ---- Month navigation ----
function _toYYYYMM(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function setupMonthNav() {
  document.getElementById('prevMonth')?.addEventListener('click', () => {
    const [y, m] = state.currentMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    state.currentMonth = _toYYYYMM(d.getFullYear(), d.getMonth() + 1);
    renderMonthLabel(); renderStatCards(); renderWhoSpent();
    renderRecentTransactions(); destroyCharts(); renderAllCharts();
  });
  document.getElementById('nextMonth')?.addEventListener('click', () => {
    const [y, m] = state.currentMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    if (d > new Date()) return;
    state.currentMonth = _toYYYYMM(d.getFullYear(), d.getMonth() + 1);
    renderMonthLabel(); renderStatCards(); renderWhoSpent();
    renderRecentTransactions(); destroyCharts(); renderAllCharts();
  });

  // History tab month nav
  document.getElementById('historyPrevMonth')?.addEventListener('click', () => {
    const [y, m] = state.historyMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    state.historyMonth = _toYYYYMM(d.getFullYear(), d.getMonth() + 1);
    renderHistoryMonthLabel(); renderTransactionList();
  });
  document.getElementById('historyNextMonth')?.addEventListener('click', () => {
    const [y, m] = state.historyMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    if (d > new Date()) return;
    state.historyMonth = _toYYYYMM(d.getFullYear(), d.getMonth() + 1);
    renderHistoryMonthLabel(); renderTransactionList();
  });
}

function renderMonthLabel() {
  const el = document.getElementById('monthLabel');
  if (!el) return;
  const [y, m] = state.currentMonth.split('-');
  el.textContent = `${t('month_' + (Number(m) - 1))} ${y}`;
}

function renderHistoryMonthLabel() {
  const el = document.getElementById('historyMonthLabel');
  if (!el) return;
  const [y, m] = state.historyMonth.split('-');
  el.textContent = `${t('month_' + (Number(m) - 1))} ${y}`;
}

// ============================================================
document.addEventListener('DOMContentLoaded', bootstrap);
