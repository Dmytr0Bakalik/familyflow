// ============================================================
// FAMILYFLOW — UI (Render Functions)
// ============================================================

import { t, monthName } from './i18n.js';
import { getCurrentUser, USERS } from './auth.js';
import { state, getCurrentMonthTx, getTotals, getTotalsByUser,
         getExpensesByCategory, applyFilters } from './state.js';
import { formatAmount, getCategoryById, getAllCategories } from './config.js';

// lazy-import to avoid circular deps
async function _getDeleteFn() {
  const s = await import('./storage.js');
  return s.deleteTransaction;
}
async function _getFormFns() {
  const f = await import('./form.js');
  return { openEditModal: f.openEditModal };
}

// ---- Apply all i18n text via element IDs ----
export function applyI18nById() {
  const map = {
    loginTitle:       'app_name',
    loginSubtitle:    'login_subtitle',
    lbl_balance:      'dash_balance',
    lbl_income:       'dash_total_income',
    lbl_expense:      'dash_total_expenses',
    lbl_card:         'dash_card',
    lbl_cash:         'dash_cash',
    lbl_who_spent:    'dash_who_spent',
    lbl_who_spent2:   'dash_who_spent',
    lbl_by_category:  'analytics_by_category',
    lbl_expenses:     'dash_total_expenses',
    lbl_recent:       'dash_recent',
    seeAllBtn:        'dash_see_all',
    lbl_history_title:'history_title',
    lbl_analytics_title:'analytics_title',
    lbl_settings_title: 'settings_title',
    lbl_profile:      'settings_profile',
    lbl_switch_user:  'settings_switch_user',
    lbl_theme:        'settings_theme',
    lbl_theme_dark:   'settings_theme_dark',
    lbl_theme_pink:   'settings_theme_pink',
    lbl_language:     'settings_language',
    lbl_income_title: 'settings_income',
    lbl_income_card:  'settings_income_card',
    lbl_income_cash:  'settings_income_cash',
    lbl_save_income:  'settings_income_save',
    lbl_firebase:     'settings_firebase',
    nav_home:         'nav_home',
    nav_history:      'nav_history',
    nav_analytics:    'nav_analytics',
    nav_settings:     'nav_settings',
  };

  Object.entries(map).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = t(key);
  });

  // Placeholders
  const searchEl = document.getElementById('historySearch');
  if (searchEl) searchEl.placeholder = t('history_search');
}

// ---- Toast ----
export function showToast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast--visible'));
  setTimeout(() => {
    toast.classList.remove('toast--visible');
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

// ---- Header ----
export function renderHeader() {
  const user = getCurrentUser();
  if (!user) return;
  const avatarEl = document.getElementById('headerAvatar');
  if (avatarEl) avatarEl.textContent = user.avatar;

  // Greeting
  const greetEl = document.getElementById('dashGreeting');
  if (greetEl) {
    const h   = new Date().getHours();
    const key = h < 12 ? 'dash_greeting_morning' : h < 18 ? 'dash_greeting_afternoon' : 'dash_greeting_evening';
    greetEl.textContent = `${t(key)}, ${user.name} 👋`;
  }
}

// ---- Stat cards ----
export function renderStatCards() {
  const monthTx = getCurrentMonthTx();
  const totals  = getTotals(monthTx);

  _setText('statIncome',  formatAmount(totals.income));
  _setText('statExpense', formatAmount(totals.totalExpense));
  _setText('statCard',    formatAmount(totals.expenseCard));
  _setText('statCash',    formatAmount(totals.expenseCash));

  const balEl = document.getElementById('statBalance');
  if (balEl) {
    balEl.textContent = formatAmount(totals.balance);
    balEl.className   = 'stat-value ' + (totals.balance >= 0 ? 'text-income' : 'text-expense');
  }

  // Donut center total
  _setText('donutTotalVal', formatAmount(totals.totalExpense));
}

// ---- Who spent ----
export function renderWhoSpent() {
  const container = document.getElementById('whoSpentContainer');
  if (!container) return;
  const monthTx = getCurrentMonthTx();
  const byUser  = getTotalsByUser(monthTx);

  container.innerHTML = USERS.map(u => {
    const totals = byUser[u.id] || { totalExpense: 0 };
    return `
      <div class="who-card hover-lift">
        <div class="who-avatar">${u.avatar}</div>
        <div class="who-name">${u.name}</div>
        <div class="who-amount">${formatAmount(totals.totalExpense)}</div>
        <div class="who-label">${t('dash_total_expenses')}</div>
      </div>`;
  }).join('');
}

// ---- Recent transactions ----
export function renderRecentTransactions() {
  const container = document.getElementById('recentList');
  if (!container) return;
  const monthTx = getCurrentMonthTx().slice(0, 7);
  if (!monthTx.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-title">${t('dash_no_transactions')}</div>
        <div class="empty-sub">${t('dash_add_first')}</div>
      </div>`;
    return;
  }
  container.innerHTML = monthTx.map(tx => _txItemHTML(tx)).join('');
  _bindTxActions(container);
}

// ---- Full list ----
export function renderTransactionList() {
  const container = document.getElementById('historyList');
  if (!container) return;
  const filtered = applyFilters(state.transactions);
  _setText('historyCount', filtered.length);

  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <div class="empty-title">${t('history_no_results')}</div>
      </div>`;
    return;
  }

  // Group by date
  const groups = {};
  filtered.forEach(tx => { (groups[tx.date || '?'] = groups[tx.date || '?'] || []).push(tx); });

  container.innerHTML = Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, txs]) => `
      <div class="tx-date-group">
        <div class="tx-date-label">${_fmtDate(date)}</div>
        ${txs.map(tx => _txItemHTML(tx)).join('')}
      </div>`).join('');

  _bindTxActions(container);
}

// ---- Settings ----
export function renderSettings() {
  const user = getCurrentUser();
  if (!user) return;
  _setText('settingsUserName', user.name);
  const av = document.getElementById('settingsAvatar');
  if (av) av.textContent = user.avatar;
}

// ---- Render all ----
export function renderAll() {
  renderHeader();
  applyI18nById();
  renderStatCards();
  renderWhoSpent();
  renderRecentTransactions();
}

// ---- Single tx HTML ----
function _txItemHTML(tx) {
  const cat     = getCategoryById(tx.category);
  const color   = tx.categoryColor || cat?.color   || '#94A3B8';
  const emoji   = tx.categoryEmoji || cat?.emoji   || '💸';
  const label   = tx.categoryLabel || (cat?.labelKey ? t(cat.labelKey) : tx.category) || '—';
  const isExp   = tx.type === 'expense';
  const user    = USERS.find(u => u.id === Number(tx.userId));
  const method  = tx.method === 'cash' ? '💵' : '💳';

  return `
    <div class="tx-item" data-id="${tx.id}">
      <div class="tx-cat-icon" style="background:${color}22;color:${color}">${emoji}</div>
      <div class="tx-info">
        <div class="tx-label">${label}</div>
        <div class="tx-meta">
          <span class="tx-user">${user?.avatar || ''} ${user?.name || ''}</span>
          <span class="tx-method">${method}</span>
          ${tx.note ? `<span class="tx-note">${tx.note}</span>` : ''}
        </div>
      </div>
      <div class="tx-right">
        <div class="tx-amount ${isExp ? 'text-expense' : 'text-income'}">
          ${isExp ? '−' : '+'}${formatAmount(tx.amount)}
        </div>
        <div class="tx-actions">
          <button class="tx-btn tx-edit"   data-id="${tx.id}">✏️</button>
          <button class="tx-btn tx-delete" data-id="${tx.id}">🗑️</button>
        </div>
      </div>
    </div>`;
}

function _bindTxActions(container) {
  container.querySelectorAll('.tx-edit').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const tx = state.transactions.find(t => t.id === btn.dataset.id);
      if (!tx) return;
      const { openEditModal } = await _getFormFns();
      openEditModal(tx);
    });
  });
  container.querySelectorAll('.tx-delete').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      if (!confirm(t('history_delete_confirm'))) return;
      const del = await _getDeleteFn();
      await del(btn.dataset.id);
      // Remove from local state immediately
      state.transactions = state.transactions.filter(tx => tx.id !== btn.dataset.id);
      renderStatCards(); renderWhoSpent(); renderRecentTransactions(); renderTransactionList();
      showToast(t('deleted_ok'), 'info');
    });
  });
}

// ---- Helpers ----
function _setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function _fmtDate(dateStr) {
  if (!dateStr || dateStr === '?') return '?';
  try {
    const [y, m, d] = dateStr.split('-');
    return `${Number(d)} ${monthName(Number(m) - 1)} ${y}`;
  } catch { return dateStr; }
}
