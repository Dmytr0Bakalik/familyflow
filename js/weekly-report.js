// ============================================================
// FAMILYFLOW — WEEKLY SHORT REPORT
// ============================================================

import { state, getCurrentMonthTx, getExpensesByCategory } from './state.js';
import { formatAmount } from './config.js';
import { USERS } from './auth.js';

let _activeWeekIndex = -1; // -1 means "Total" (Загальний огляд)

// ---- Week splitting logic ----
// Strict days: 1-7, 8-14, 15-21, 22-28, 29-end
export function getWeeksOfMonth(yearMonth) {
  if (!yearMonth) return [];
  const [y, m] = yearMonth.split('-');
  const daysInMonth = new Date(Number(y), Number(m), 0).getDate();
  
  const weeks = [];
  let currentStart = 1;
  let weekNum = 1;
  
  while (currentStart <= daysInMonth) {
    let currentEnd = currentStart + 6;
    if (currentEnd > 28) currentEnd = daysInMonth; // 5th week takes the rest
    if (currentStart === 29) currentEnd = daysInMonth;
    
    weeks.push({
      index: weekNum - 1,
      label: `Тиждень ${weekNum}`,
      start: currentStart,
      end: currentEnd
    });
    
    currentStart = currentEnd + 1;
    weekNum++;
  }
  
  return weeks;
}

// ---- Render navigation ----
function renderWeekNav() {
  const container = document.getElementById('weekNavContainer');
  if (!container) return;
  
  const weeks = getWeeksOfMonth(state.currentMonth);
  
  let html = '';
  weeks.forEach(w => {
    const isActive = _activeWeekIndex === w.index ? 'active' : '';
    const num = w.index + 1; // 1, 2, 3...
    html += `<button class="week-btn ${isActive}" data-index="${w.index}" style="min-width: 40px; text-align: center; padding: var(--space-2)">
      ${num}
    </button>`;
  });
  
  const isTotalActive = _activeWeekIndex === -1 ? 'active' : '';
  html += `<button class="week-btn ${isTotalActive}" data-index="-1" style="padding: var(--space-2) var(--space-3)">
    Загальний
  </button>`;
  
  container.innerHTML = html;
  
  // Bind clicks
  container.querySelectorAll('.week-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _activeWeekIndex = Number(btn.dataset.index);
      renderWeekNav();
      renderShortReportContent();
    });
  });
}

// ---- Filter transactions for active week ----
function getActiveWeekTx() {
  const monthTx = getCurrentMonthTx();
  if (_activeWeekIndex === -1) return monthTx;
  
  const weeks = getWeeksOfMonth(state.currentMonth);
  const activeWeek = weeks[_activeWeekIndex];
  if (!activeWeek) return monthTx;
  
  return monthTx.filter(tx => {
    if (!tx.date) return false;
    const day = parseInt(tx.date.split('-')[2], 10);
    return day >= activeWeek.start && day <= activeWeek.end;
  });
}

// ---- Render report content ----
function renderShortReportContent() {
  const container = document.getElementById('shortReportContent');
  if (!container) return;
  
  const txList = getActiveWeekTx();
  const expenses = txList.filter(t => t.type === 'expense');
  const incomes  = txList.filter(t => t.type === 'income');
  
  const totalExp = expenses.reduce((s, t) => s + Number(t.amount), 0);
  const totalInc = incomes.reduce((s, t) => s + Number(t.amount), 0);
  const savings  = totalInc - totalExp;
  
  // Categories
  const byCat = getExpensesByCategory(expenses);
  const topCategoriesHtml = byCat.length ? byCat.map(c => {
    const pct = totalExp > 0 ? Math.round(c.amount / totalExp * 100) : 0;
    return `
      <div class="short-report-cat-item">
        <div class="short-report-cat-icon" style="background:${c.color}22;color:${c.color}">${c.emoji}</div>
        <div class="short-report-cat-info">
          <div class="short-report-cat-name">${c.label}</div>
          <div class="short-report-cat-bar-wrap">
            <div class="short-report-cat-bar" style="width:${pct}%;background:${c.color}"></div>
          </div>
        </div>
        <div class="short-report-cat-right">
          <div class="short-report-cat-amount">${formatAmount(c.amount)}</div>
          <div class="short-report-cat-pct">${pct}%</div>
        </div>
      </div>
    `;
  }).join('') : '<div style="text-align:center;color:var(--text-muted);padding:20px">Немає витрат</div>';
  
  // HTML Build
  container.innerHTML = `
    <!-- KPI -->
    <div class="short-report-kpi">
      <div class="card stat-card">
        <div class="stat-card-icon stat-icon-expense">💸</div>
        <div class="stat-label">Витрати</div>
        <div class="stat-value text-expense">−${formatAmount(totalExp)}</div>
      </div>
      <div class="card stat-card">
        <div class="stat-card-icon stat-icon-savings">🏦</div>
        <div class="stat-label">Заощаджено</div>
        <div class="stat-value text-income">${savings > 0 ? '+' : ''}${formatAmount(savings)}</div>
      </div>
    </div>
    
    <!-- Info row -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-3);padding:0 var(--space-2)">
      <div style="color:var(--text-secondary);font-size:var(--text-sm)">
        Доходи: <span style="color:var(--text-primary);font-weight:var(--fw-bold)">${formatAmount(totalInc)}</span>
      </div>
      <div style="color:var(--text-muted);font-size:var(--text-sm)">
        📝 Транзакцій: ${txList.length}
      </div>
    </div>
    
    <!-- Category list -->
    <div class="card short-report-card">
      <h3 style="font-size:var(--text-md);font-weight:var(--fw-bold);margin-bottom:var(--space-4);border-bottom:1px solid var(--border);padding-bottom:var(--space-2)">
        Витрати по категоріях
      </h3>
      <div>${topCategoriesHtml}</div>
    </div>
  `;
}

// ---- Setup & Toggle Logic ----
export function setupWeeklyReport() {
  const btnGen = document.getElementById('btnViewGeneral');
  const btnShort = document.getElementById('btnViewShort');
  const viewGen = document.getElementById('analyticsGeneral');
  const viewShort = document.getElementById('analyticsShortReport');
  
  if (!btnGen || !btnShort || !viewGen || !viewShort) return;
  
  btnGen.addEventListener('click', () => {
    btnGen.classList.add('active');
    btnShort.classList.remove('active');
    viewGen.style.display = 'block';
    viewShort.style.display = 'none';
  });
  
  btnShort.addEventListener('click', () => {
    btnShort.classList.add('active');
    btnGen.classList.remove('active');
    viewGen.style.display = 'none';
    viewShort.style.display = 'block';
    
    // Auto-select week 1 or total on first open
    if (_activeWeekIndex === -1 && getWeeksOfMonth(state.currentMonth).length > 0) {
       _activeWeekIndex = -1; // Default to total
    }
    renderWeekNav();
    renderShortReportContent();
  });
}

// Call this when data changes (e.g. from main.js renderAllCharts)
export function updateWeeklyReportIfActive() {
  const viewShort = document.getElementById('analyticsShortReport');
  if (viewShort && viewShort.style.display !== 'none') {
    renderWeekNav();
    renderShortReportContent();
  }
}
