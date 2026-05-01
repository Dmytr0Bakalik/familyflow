// ============================================================
// FAMILYFLOW — CALENDAR VIEW
// ============================================================

import { state, getMonthTransactions } from './state.js';
import { formatAmount } from './config.js';
import { t, monthName } from './i18n.js';
import { USERS } from './auth.js';
import { openAddModal } from './form.js';

let _calView = 'month'; // 'month' | 'week'

export function renderCalendar() {
  updateCalViewBtns();
  if (_calView === 'month') renderMonthCalendar();
  else renderWeekCalendar();
}

function updateCalViewBtns() {
  document.getElementById('calBtnMonth')?.classList.toggle('active', _calView === 'month');
  document.getElementById('calBtnWeek') ?.classList.toggle('active', _calView === 'week');
}

export function setupCalendar() {
  document.getElementById('calBtnMonth')?.addEventListener('click', () => {
    _calView = 'month'; renderCalendar();
  });
  document.getElementById('calBtnWeek')?.addEventListener('click', () => {
    _calView = 'week'; renderCalendar();
  });
}

// ---- MONTH CALENDAR ----
function renderMonthCalendar() {
  const container = document.getElementById('calGrid');
  if (!container) return;

  const [y, m] = state.currentMonth.split('-').map(Number);
  const monthTx = getMonthTransactions(state.currentMonth);

  // Map: date string → { total, txs }
  const dayMap = {};
  monthTx.forEach(tx => {
    if (!tx.date) return;
    if (!dayMap[tx.date]) dayMap[tx.date] = { total: 0, income: 0, txs: [] };
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'expense') dayMap[tx.date].total += amt;
    else dayMap[tx.date].income += amt;
    dayMap[tx.date].txs.push(tx);
  });

  const firstDay = new Date(y, m - 1, 1);
  const lastDay  = new Date(y, m, 0);
  const totalDays = lastDay.getDate();

  // Day of week offset (Mon=0)
  let startOffset = (firstDay.getDay() + 6) % 7;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  const dayLabels = ['Пн','Вт','Ср','Чт','Пт','Сб','Нд'];

  let html = `
    <div class="cal-day-headers">
      ${dayLabels.map(d => `<div class="cal-day-header">${d}</div>`).join('')}
    </div>
    <div class="cal-days">
  `;

  // Empty cells before first day
  for (let i = 0; i < startOffset; i++) {
    html += `<div class="cal-day cal-day--empty"></div>`;
  }

  const maxDay = getMaxDayTotal(dayMap);

  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const day = dayMap[dateStr];
    const isToday = dateStr === todayStr;
    const hasData = day && (day.total > 0 || day.income > 0);
    const intensity = hasData && maxDay > 0 ? day.total / maxDay : 0;

    html += `
      <div class="cal-day ${isToday ? 'cal-day--today' : ''} ${hasData ? 'cal-day--has-data' : ''}"
           data-date="${dateStr}" data-has="${hasData ? '1' : '0'}"
           style="--day-intensity:${intensity.toFixed(2)}">
        <div class="cal-day-num">${d}</div>
        ${hasData && day.total > 0 ? `<div class="cal-day-amount">${formatAmount(day.total).replace(',00','')}</div>` : ''}
        ${hasData && day.income > 0 ? `<div class="cal-day-income">+${formatAmount(day.income).replace(',00','')}</div>` : ''}
      </div>`;
  }

  html += `</div>`;

  // Monthly summary row
  const monthTotals = monthTx.reduce((acc, tx) => {
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'expense') acc.expense += amt;
    else acc.income += amt;
    return acc;
  }, { expense: 0, income: 0 });

  html += `
    <div class="cal-summary">
      <div class="cal-summary-item">
        <span class="cal-summary-label">${t('dash_total_expenses')}</span>
        <span class="cal-summary-val text-expense">${formatAmount(monthTotals.expense)}</span>
      </div>
      <div class="cal-summary-item">
        <span class="cal-summary-label">${t('dash_total_income')}</span>
        <span class="cal-summary-val text-income">${formatAmount(monthTotals.income)}</span>
      </div>
    </div>`;

  container.innerHTML = html;
  bindCalDayClick(container);
}

// ---- WEEK CALENDAR ----
function renderWeekCalendar() {
  const container = document.getElementById('calGrid');
  if (!container) return;

  const today = new Date();
  // Start of current week (Monday)
  const dayOfWeek = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }

  // Get all tx for this week
  const weekTx = state.transactions.filter(tx => {
    if (!tx.date) return false;
    const [ty, tm, td] = tx.date.split('-');
    const txDate = new Date(Number(ty), Number(tm)-1, Number(td));
    return txDate >= monday && txDate <= days[6];
  });

  const dayMap = {};
  weekTx.forEach(tx => {
    if (!dayMap[tx.date]) dayMap[tx.date] = { total: 0, income: 0, txs: [] };
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'expense') dayMap[tx.date].total += amt;
    else dayMap[tx.date].income += amt;
    dayMap[tx.date].txs.push(tx);
  });

  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const dayNames = ['Понеділок','Вівторок','Середа','Четвер','Пʼятниця','Субота','Неділя'];
  const maxTotal = Math.max(...days.map(d => {
    const ds = _dateStr(d);
    return dayMap[ds]?.total || 0;
  }), 1);

  let html = `<div class="week-grid">`;

  days.forEach((d, i) => {
    const ds = _dateStr(d);
    const day = dayMap[ds];
    const isToday = ds === todayStr;
    const barH = day ? Math.round((day.total / maxTotal) * 60) : 0;

    // Transactions list
    let txHtml = '';
    if (day?.txs?.length) {
      txHtml = day.txs.slice(0, 4).map(tx => {
        const user = USERS.find(u => u.id === Number(tx.userId));
        const isExp = tx.type === 'expense';
        return `<div class="week-tx">
          <span>${tx.categoryEmoji || (isExp ? '💸' : '💰')}</span>
          <span class="week-tx-label">${tx.categoryLabel || tx.category || '—'}</span>
          <span class="week-tx-amt ${isExp ? 'text-expense' : 'text-income'}">${isExp ? '−' : '+'}${formatAmount(tx.amount)}</span>
        </div>`;
      }).join('');
      if (day.txs.length > 4) txHtml += `<div class="week-tx-more">+${day.txs.length - 4} ще</div>`;
    }

    html += `
      <div class="week-day ${isToday ? 'week-day--today' : ''}" data-date="${ds}">
        <div class="week-day-header">
          <div class="week-day-name">${dayNames[i]}</div>
          <div class="week-day-date">${d.getDate()} ${monthName(d.getMonth())}</div>
        </div>
        <div class="week-bar-wrap">
          <div class="week-bar" style="height:${barH}px"></div>
        </div>
        <div class="week-day-total ${day?.total ? 'text-expense' : ''}">
          ${day?.total ? formatAmount(day.total) : '—'}
        </div>
        <div class="week-tx-list">${txHtml}</div>
      </div>`;
  });

  html += `</div>`;
  container.innerHTML = html;
  bindCalDayClick(container);
}

// ---- Day detail modal ----
function bindCalDayClick(container) {
  container.querySelectorAll('[data-date]').forEach(el => {
    el.addEventListener('click', () => {
      const date = el.dataset.date;
      const txs = state.transactions.filter(tx => tx.date === date);
      showDayModal(date, txs);
    });
  });
}

function showDayModal(dateStr, txs) {
  const [y, m, d] = dateStr.split('-');
  const label = `${Number(d)} ${monthName(Number(m)-1)} ${y}`;
  const totalExp = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0);

  let txHtml = txs.length ? txs.map(tx => {
    const user = USERS.find(u => u.id === Number(tx.userId));
    const isExp = tx.type === 'expense';
    return `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="font-size:22px">${tx.categoryEmoji || (isExp?'💸':'💰')}</div>
      <div style="flex:1">
        <div style="font-weight:600;color:var(--text-primary)">${tx.categoryLabel || tx.category || '—'}</div>
        <div style="font-size:12px;color:var(--text-muted)">${user?.avatar||''} ${user?.name||''} • ${tx.method==='cash'?'💵':'💳'}</div>
      </div>
      <div style="font-weight:700;color:${isExp?'var(--expense-color)':'var(--income-color)'}">
        ${isExp?'−':'+'}${formatAmount(tx.amount)}
      </div>
    </div>`;
  }).join('') : `<div style="text-align:center;padding:24px;color:var(--text-muted)">📭 Немає записів</div>`;

  document.getElementById('modalTitle').textContent = label;
  document.getElementById('modalBody').innerHTML = `
    <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px">
      Витрати: <strong style="color:var(--expense-color)">${formatAmount(totalExp)}</strong>
    </div>
    ${txHtml}
    <button class="btn btn-primary btn-full" id="calAddBtn" style="margin-top:16px">＋ Додати витрату</button>
  `;
  document.getElementById('modalBackdrop').style.display = 'flex';
  document.getElementById('modalCancelBtn').textContent = 'Закрити';
  document.getElementById('modalSaveBtn').style.display = 'none';

  document.getElementById('calAddBtn')?.addEventListener('click', () => {
    document.getElementById('modalBackdrop').style.display = 'none';
    document.getElementById('modalSaveBtn').style.display = '';
    openAddModal('expense', dateStr);
  });
}

// ---- Helpers ----
function getMaxDayTotal(dayMap) {
  return Math.max(...Object.values(dayMap).map(d => d.total), 0);
}

function _dateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
