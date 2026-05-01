// ============================================================
// FAMILYFLOW — FILTERS
// ============================================================

import { state } from './state.js';
import { t } from './i18n.js';
import { USERS } from './config.js';
import { renderTransactionList } from './ui.js';

export function setupFilters() {
  // Search input
  const searchEl = document.getElementById('historySearch');
  searchEl?.addEventListener('input', e => {
    state.filter.search = e.target.value.trim();
    renderTransactionList();
  });

  // Type filter chips
  const typeChips = document.getElementById('typeChips');
  if (typeChips) {
    typeChips.innerHTML = [
      { key: 'all',     label: t('history_filter_all') },
      { key: 'expense', label: t('add_expense') },
      { key: 'income',  label: t('add_income') },
    ].map(f => `
      <button class="filter-chip ${state.filter.type === f.key ? 'active' : ''}" data-type="${f.key}">
        ${f.label}
      </button>
    `).join('');

    typeChips.querySelectorAll('.filter-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        typeChips.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.filter.type = btn.dataset.type;
        renderTransactionList();
      });
    });
  }

  // User filter chips (all / Dmytro / Markian / Mama)
  const userChips = document.getElementById('userChips');
  if (userChips) {
    const all = [{ id: 'all', name: t('history_filter_all'), avatar: '👥' }, ...USERS];
    userChips.innerHTML = all.map(u => `
      <button class="filter-chip ${String(state.filter.userId) === String(u.id) ? 'active' : ''}" 
              data-uid="${u.id}">
        ${u.avatar} ${u.name}
      </button>
    `).join('');

    userChips.querySelectorAll('.filter-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        userChips.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.filter.userId = btn.dataset.uid === 'all' ? 'all' : Number(btn.dataset.uid);
        renderTransactionList();
      });
    });
  }

  // Date range
  document.getElementById('dateFrom')?.addEventListener('change', e => {
    state.filter.dateFrom = e.target.value;
    renderTransactionList();
  });
  document.getElementById('dateTo')?.addEventListener('change', e => {
    state.filter.dateTo = e.target.value;
    renderTransactionList();
  });

  // Clear filters
  document.getElementById('clearFilters')?.addEventListener('click', () => {
    state.filter = { userId: 'all', type: 'all', search: '', dateFrom: '', dateTo: '' };
    if (searchEl) searchEl.value = '';
    const df = document.getElementById('dateFrom');
    const dt = document.getElementById('dateTo');
    if (df) df.value = '';
    if (dt) dt.value = '';
    setupFilters(); // re-render chips
    renderTransactionList();
  });
}
