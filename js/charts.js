// ============================================================
// FAMILYFLOW — CHARTS + ANALYTICS DASHBOARD
// ============================================================

import { state, getCurrentMonthTx, getExpensesByCategory,
         getTotalsByUser, getMonthTransactions } from './state.js';
import { t } from './i18n.js';
import { USERS, formatAmount } from './config.js';

let _donutChart    = null;
let _memberChart   = null;
let _trendChart    = null;
let _catBarChart   = null;
let _cashFlowChart = null;

const THEME_DARK = { grid: 'rgba(255,255,255,0.07)', text: '#9CA3AF', tooltip: '#1A2E1A' };
const THEME_PINK = { grid: 'rgba(0,0,0,0.07)',       text: '#6B7280', tooltip: '#FFF0F5' };

function _theme() {
  return document.documentElement.getAttribute('data-theme') === 'pink' ? THEME_PINK : THEME_DARK;
}

// ============================================================
// DONUT — expense by category (home tab)
// ============================================================
export function renderDonutChart() {
  const canvas = document.getElementById('chartDonut');
  if (!canvas) return;

  const monthTx = getCurrentMonthTx().filter(tx => tx.type === 'expense');
  const byCat   = getExpensesByCategory(monthTx);

  if (_donutChart) { _donutChart.destroy(); _donutChart = null; }

  if (!byCat.length) {
    canvas.style.display = 'none';
    const empEl = document.getElementById('donutEmpty');
    if (empEl) empEl.style.display = 'block';
    return;
  }
  canvas.style.display = 'block';
  const empEl = document.getElementById('donutEmpty');
  if (empEl) empEl.style.display = 'none';

  const wrap = canvas.parentElement;
  const size = Math.min(wrap?.clientWidth || 240, 240);
  canvas.width  = size;
  canvas.height = size;
  canvas.style.display = 'block';
  canvas.style.margin  = '0 auto';

  _donutChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: byCat.map(c => c.label),
      datasets: [{
        data: byCat.map(c => c.amount),
        backgroundColor: byCat.map(c => c.color),
        borderWidth: 3,
        borderColor: document.documentElement.getAttribute('data-theme') === 'pink' ? '#fff' : '#111A11',
      }]
    },
    options: {
      cutout: '68%',
      responsive: false,
      maintainAspectRatio: false,
      layout: { padding: 0 },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${formatAmount(ctx.parsed)}` } }
      },
      animation: { animateRotate: true, duration: 700 }
    }
  });

  // Legend
  const legend = document.getElementById('donutLegend');
  if (legend) {
    const total = byCat.reduce((s, c) => s + c.amount, 0);
    legend.innerHTML = byCat.map(c => `
      <div class="legend-item">
        <span class="legend-dot" style="background:${c.color}"></span>
        <span class="legend-label">${c.emoji} ${c.label}</span>
        <span class="legend-value">${formatAmount(c.amount)}</span>
        <span class="legend-pct">${total ? Math.round(c.amount / total * 100) : 0}%</span>
      </div>
    `).join('');
  }
}

// ============================================================
// BAR — spending by member (analytics)
// ============================================================
export function renderMemberChart() {
  const canvas = document.getElementById('chartMembers');
  if (!canvas) return;

  const monthTx = getCurrentMonthTx().filter(tx => tx.type === 'expense');
  const byUser  = getTotalsByUser(monthTx);
  const theme   = _theme();

  if (_memberChart) { _memberChart.destroy(); _memberChart = null; }

  _memberChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: USERS.map(u => `${u.avatar} ${u.name}`),
      datasets: [{
        label: t('dash_total_expenses'),
        data: USERS.map(u => byUser[u.id]?.totalExpense || 0),
        backgroundColor: ['#22C55E88', '#3B82F688', '#EC489988'],
        borderColor:     ['#22C55E',   '#3B82F6',   '#EC4899'],
        borderWidth: 2,
        borderRadius: 10,
        borderSkipped: false,
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: theme.grid }, ticks: { color: theme.text, font: { family: 'Inter', size: 13 } } },
        y: { grid: { color: theme.grid }, ticks: { color: theme.text, callback: v => `${v} €` } }
      },
      animation: { duration: 600 }
    }
  });
}

// ============================================================
// LINE — trend 6 months
// ============================================================
export function renderTrendChart() {
  const canvas = document.getElementById('chartTrend');
  if (!canvas) return;

  const theme  = _theme();
  const months = _lastNMonths(6);

  const expData = months.map(m => {
    return getMonthTransactions(m).filter(t => t.type === 'expense')
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  });
  const incData = months.map(m => {
    return getMonthTransactions(m).filter(t => t.type === 'income')
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  });

  const labels = months.map(m => {
    const [, mo] = m.split('-');
    return t(`month_${Number(mo) - 1}`).slice(0, 3);
  });

  if (_trendChart) { _trendChart.destroy(); _trendChart = null; }

  _trendChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: t('dash_total_income'),
          data: incData,
          borderColor: '#22C55E', backgroundColor: '#22C55E22',
          tension: 0.4, fill: true, pointRadius: 5, pointBackgroundColor: '#22C55E',
        },
        {
          label: t('dash_total_expenses'),
          data: expData,
          borderColor: '#F43F5E', backgroundColor: '#F43F5E22',
          tension: 0.4, fill: true, pointRadius: 5, pointBackgroundColor: '#F43F5E',
        }
      ]
    },
    options: {
      plugins: {
        legend: { labels: { color: theme.text, font: { family: 'Inter', size: 12 } } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${formatAmount(ctx.parsed.y)}` } }
      },
      scales: {
        x: { grid: { color: theme.grid }, ticks: { color: theme.text } },
        y: { grid: { color: theme.grid }, ticks: { color: theme.text, callback: v => `${v} €` } }
      },
      animation: { duration: 700 }
    }
  });
}

// ============================================================
// BAR — categories by last 3 months
// ============================================================
export function renderCatBarChart() {
  const canvas = document.getElementById('chartCatBar');
  if (!canvas) return;

  const theme  = _theme();
  const months = _lastNMonths(3);

  // Get top-5 categories from current month
  const curTx   = getCurrentMonthTx().filter(t => t.type === 'expense');
  const byCat   = getExpensesByCategory(curTx).slice(0, 5);
  if (!byCat.length) return;

  if (_catBarChart) { _catBarChart.destroy(); _catBarChart = null; }

  const labels = months.map(m => {
    const [, mo] = m.split('-');
    return t(`month_${Number(mo) - 1}`).slice(0, 3);
  });

  const datasets = byCat.map(cat => ({
    label: `${cat.emoji} ${cat.label}`,
    data: months.map(m => {
      return getMonthTransactions(m)
        .filter(t => t.type === 'expense' && t.category === cat.id)
        .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    }),
    backgroundColor: cat.color + 'BB',
    borderColor: cat.color,
    borderWidth: 1,
    borderRadius: 6,
  }));

  _catBarChart = new Chart(canvas, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      plugins: {
        legend: { labels: { color: theme.text, font: { family: 'Inter', size: 11 }, boxWidth: 12 } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${formatAmount(ctx.parsed.y)}` } }
      },
      scales: {
        x: { stacked: true, grid: { color: theme.grid }, ticks: { color: theme.text } },
        y: { stacked: true, grid: { color: theme.grid }, ticks: { color: theme.text, callback: v => `${v} €` } }
      },
      animation: { duration: 600 }
    }
  });
}

// ============================================================
// LINE — Cash Flow (daily running balance for current month)
// ============================================================
export function renderCashFlowChart() {
  const canvas = document.getElementById('chartCashFlow');
  if (!canvas) return;

  const theme   = _theme();
  const monthTx = getCurrentMonthTx();
  const [y, m]  = state.currentMonth.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();

  // Build daily net per day
  const daily = {};
  monthTx.forEach(tx => {
    if (!tx.date) return;
    const d = Number(tx.date.split('-')[2]);
    const amt = Number(tx.amount) || 0;
    daily[d] = (daily[d] || 0) + (tx.type === 'income' ? amt : -amt);
  });

  // Running cumulative
  const labels = [];
  const data   = [];
  let running  = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    running += (daily[d] || 0);
    labels.push(d);
    data.push(running);
  }

  if (_cashFlowChart) { _cashFlowChart.destroy(); _cashFlowChart = null; }

  _cashFlowChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Залишок',
        data,
        borderColor: data[data.length - 1] >= 0 ? '#22C55E' : '#F43F5E',
        backgroundColor: data[data.length - 1] >= 0 ? '#22C55E22' : '#F43F5E22',
        tension: 0.3, fill: true, pointRadius: 2,
        segment: {
          borderColor: ctx => ctx.p1.parsed.y >= 0 ? '#22C55E' : '#F43F5E',
        }
      }]
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` Залишок: ${formatAmount(ctx.parsed.y)}` } }
      },
      scales: {
        x: { grid: { color: theme.grid }, ticks: { color: theme.text, maxTicksLimit: 10 } },
        y: { grid: { color: theme.grid }, ticks: { color: theme.text, callback: v => `${v} €` } }
      },
      animation: { duration: 600 }
    }
  });
}

// ============================================================
// ANALYTICS KPI CARDS
// ============================================================
export function renderAnalyticsKPI() {
  const el = document.getElementById('anKpiRow');
  if (!el) return;

  const monthTx  = getCurrentMonthTx();
  const income   = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expenses = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const balance  = income - expenses;
  const savings  = income > 0 ? ((balance / income) * 100) : 0;

  // Forecast to end of month
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projectedExp = dayOfMonth > 0 ? (expenses / dayOfMonth) * daysInMonth : 0;

  el.innerHTML = `
    <div class="an-kpi-card">
      <div class="an-kpi-icon" style="background:rgba(34,197,94,0.15)">💰</div>
      <div class="an-kpi-label">Доходи</div>
      <div class="an-kpi-val text-income">${formatAmount(income)}</div>
    </div>
    <div class="an-kpi-card">
      <div class="an-kpi-icon" style="background:rgba(244,63,94,0.15)">💸</div>
      <div class="an-kpi-label">Витрати</div>
      <div class="an-kpi-val text-expense">${formatAmount(expenses)}</div>
      <div class="an-kpi-sub">${income > 0 ? Math.round(expenses/income*100) : 0}% від доходу</div>
    </div>
    <div class="an-kpi-card">
      <div class="an-kpi-icon" style="background:rgba(99,102,241,0.15)">📊</div>
      <div class="an-kpi-label">Залишок</div>
      <div class="an-kpi-val ${balance >= 0 ? 'text-income' : 'text-expense'}">${formatAmount(balance)}</div>
    </div>
    <div class="an-kpi-card">
      <div class="an-kpi-icon" style="background:rgba(251,191,36,0.15)">🧠</div>
      <div class="an-kpi-label">Savings Rate</div>
      <div class="an-kpi-val ${savings >= 20 ? 'text-income' : savings >= 10 ? '' : 'text-expense'}">${savings.toFixed(1)}%</div>
      <div class="an-kpi-sub">${savings >= 30 ? '🔥 Відмінно!' : savings >= 20 ? '✅ Добре' : savings >= 10 ? '⚠️ Нормально' : '🚨 Критично'}</div>
    </div>
    <div class="an-kpi-card an-kpi-full">
      <div class="an-kpi-icon" style="background:rgba(168,85,247,0.15)">🔮</div>
      <div class="an-kpi-label">Прогноз витрат до кінця місяця</div>
      <div class="an-kpi-val" style="font-size:var(--text-lg)">${formatAmount(projectedExp)}</div>
      <div class="an-kpi-sub">при поточному темпі (${dayOfMonth} з ${daysInMonth} днів)</div>
    </div>
  `;
}

// ============================================================
// SAVINGS RATE BAR
// ============================================================
export function renderSavingsBar() {
  const el = document.getElementById('anSavingsCard');
  if (!el) return;

  const monthTx  = getCurrentMonthTx();
  const income   = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expenses = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const saved    = Math.max(0, income - expenses);
  const pct      = income > 0 ? Math.min(100, (saved / income) * 100) : 0;

  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3)">
      <div style="font-weight:var(--fw-bold)">🧠 Savings Rate</div>
      <div style="font-size:var(--text-xl);font-weight:var(--fw-extrabold);color:${pct>=20?'var(--income-color)':pct>=10?'var(--text-primary)':'var(--expense-color)'}">${pct.toFixed(1)}%</div>
    </div>
    <div class="an-rate-track">
      <div class="an-rate-bar" style="width:${pct}%;background:${pct>=20?'var(--income-color)':pct>=10?'#F59E0B':'var(--expense-color)'}"></div>
      <div class="an-rate-mark" style="left:10%"><span>10%</span></div>
      <div class="an-rate-mark" style="left:20%"><span>20%</span></div>
      <div class="an-rate-mark" style="left:40%"><span>40%</span></div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:var(--text-xs);color:var(--text-muted);margin-top:var(--space-2)">
      <span>🚨 Слабко</span><span>⚠️ Нормально</span><span>✅ Добре</span><span>🔥 Чудово</span>
    </div>
    <div style="font-size:var(--text-sm);color:var(--text-muted);margin-top:var(--space-3)">
      Відкладено: <strong style="color:var(--income-color)">${formatAmount(saved)}</strong> з ${formatAmount(income)} доходу
    </div>
  `;
}

// ============================================================
// FINANCIAL LEAKS
// ============================================================
export function renderFinancialLeaks() {
  const el = document.getElementById('anLeaks');
  if (!el) return;

  const monthTx  = getCurrentMonthTx().filter(t => t.type === 'expense');
  const byCat    = getExpensesByCategory(monthTx);
  const income   = getCurrentMonthTx().filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const total    = byCat.reduce((s, c) => s + c.amount, 0);

  if (!byCat.length) { el.style.display = 'none'; return; }
  el.style.display = '';

  // Top 3 biggest categories = "leaks"
  const top = byCat.slice(0, 3);

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-4)">
      <span style="font-size:20px">⚠️</span>
      <span style="font-weight:var(--fw-bold);font-size:var(--text-base)">Де йдуть гроші</span>
    </div>
    ${top.map(c => {
      const pct = total > 0 ? Math.round(c.amount / total * 100) : 0;
      const pctInc = income > 0 ? Math.round(c.amount / income * 100) : 0;
      return `
        <div class="an-leak-item">
          <div class="an-leak-icon" style="background:${c.color}22;color:${c.color}">${c.emoji}</div>
          <div class="an-leak-info">
            <div class="an-leak-name">${c.label}</div>
            <div class="an-leak-bar-wrap">
              <div class="an-leak-bar" style="width:${pct}%;background:${c.color}"></div>
            </div>
          </div>
          <div class="an-leak-right">
            <div class="an-leak-amount">${formatAmount(c.amount)}</div>
            <div class="an-leak-pct">${pct}% витрат${income ? ` · ${pctInc}% доходу` : ''}</div>
          </div>
        </div>`;
    }).join('')}
  `;
}

// ============================================================
// AI INSIGHTS (rule-based)
// ============================================================
export function renderInsights() {
  const el = document.getElementById('anInsights');
  if (!el) return;

  const months   = _lastNMonths(3);
  const curTx    = getCurrentMonthTx();
  const prevTx   = getMonthTransactions(months[1]);

  const curExp   = curTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const prevExp  = prevTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const curInc   = curTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);

  const insights = [];

  // Insight 1: Expense vs last month
  if (prevExp > 0) {
    const diff = ((curExp - prevExp) / prevExp) * 100;
    if (diff > 15)  insights.push({ icon: '📈', text: `Витрати зросли на ${diff.toFixed(0)}% порівняно з минулим місяцем`, color: 'var(--expense-color)' });
    if (diff < -10) insights.push({ icon: '📉', text: `Витрати знизились на ${Math.abs(diff).toFixed(0)}% — молодець!`, color: 'var(--income-color)' });
  }

  // Insight 2: Top category
  const byCat = getExpensesByCategory(curTx.filter(t => t.type === 'expense'));
  if (byCat.length > 0) {
    const top = byCat[0];
    const pct = curExp > 0 ? Math.round(top.amount / curExp * 100) : 0;
    insights.push({ icon: top.emoji, text: `Найбільша стаття: ${top.label} — ${formatAmount(top.amount)} (${pct}% витрат)`, color: top.color });
  }

  // Insight 3: Savings rate
  const savings = curInc > 0 ? ((curInc - curExp) / curInc) * 100 : 0;
  if (savings < 10 && curInc > 0)  insights.push({ icon: '🚨', text: `Savings Rate лише ${savings.toFixed(0)}% — спробуй скоротити витрати на ${formatAmount(curExp * 0.1)}`, color: 'var(--expense-color)' });
  if (savings >= 30) insights.push({ icon: '🔥', text: `Чудовий Savings Rate ${savings.toFixed(0)}%! Подумай про інвестиції`, color: 'var(--income-color)' });

  // Insight 4: Who spends most
  const byUser = {};
  curTx.filter(t => t.type === 'expense').forEach(t => {
    byUser[t.userId] = (byUser[t.userId] || 0) + Number(t.amount);
  });
  const topUser = Object.entries(byUser).sort((a, b) => b[1] - a[1])[0];
  if (topUser) {
    const u = USERS.find(u => u.id === Number(topUser[0]));
    if (u) insights.push({ icon: u.avatar, text: `${u.name} витратив найбільше — ${formatAmount(topUser[1])}`, color: 'var(--text-secondary)' });
  }

  // Insight 5: Weekend spending
  const weekendAmt = curTx.filter(t => {
    if (!t.date || t.type !== 'expense') return false;
    const dow = new Date(t.date).getDay();
    return dow === 0 || dow === 6;
  }).reduce((s, t) => s + Number(t.amount), 0);
  if (weekendAmt > curExp * 0.4) {
    insights.push({ icon: '🎉', text: `${Math.round(weekendAmt/curExp*100)}% витрат у вихідні — ${formatAmount(weekendAmt)}`, color: '#F59E0B' });
  }

  if (!insights.length) {
    el.style.display = 'none'; return;
  }
  el.style.display = '';

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-4)">
      <span style="font-size:20px">🤖</span>
      <span style="font-weight:var(--fw-bold)">AI Insights</span>
    </div>
    ${insights.map(ins => `
      <div class="an-insight-item">
        <span class="an-insight-icon">${ins.icon}</span>
        <span class="an-insight-text" style="color:${ins.color}">${ins.text}</span>
      </div>
    `).join('')}
  `;
}

// ============================================================
// RENDER ALL
// ============================================================
export function renderAllCharts() {
  renderDonutChart();
  renderMemberChart();
  renderTrendChart();
}

export function renderAnalyticsDashboard() {
  renderAnalyticsKPI();
  renderSavingsBar();
  renderFinancialLeaks();
  renderInsights();
  renderMemberChart();
  renderTrendChart();
  renderCatBarChart();
  renderCashFlowChart();
}

export function destroyCharts() {
  [_donutChart, _memberChart, _trendChart, _catBarChart, _cashFlowChart].forEach(c => c?.destroy?.());
  _donutChart = _memberChart = _trendChart = _catBarChart = _cashFlowChart = null;
}

// ---- Helpers ----
function _lastNMonths(n) {
  const result = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return result;
}
