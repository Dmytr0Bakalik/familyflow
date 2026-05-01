// ============================================================
// FAMILYFLOW — CHARTS (Chart.js)
// ============================================================

import { state, getCurrentMonthTx, getExpensesByCategory,
         getTotalsByUser, getMonthTransactions } from './state.js';
import { t } from './i18n.js';
import { USERS, formatAmount } from './config.js';

let _donutChart    = null;
let _memberChart   = null;
let _trendChart    = null;

const THEME_DARK = {
  grid: 'rgba(255,255,255,0.07)',
  text: '#9CA3AF',
  tooltip: '#1A2E1A',
};
const THEME_PINK = {
  grid: 'rgba(0,0,0,0.07)',
  text: '#6B7280',
  tooltip: '#FFF0F5',
};

function _theme() {
  return document.documentElement.getAttribute('data-theme') === 'pink' ? THEME_PINK : THEME_DARK;
}

// ---- Donut: expense by category ----
export function renderDonutChart() {
  const canvas = document.getElementById('chartDonut');
  if (!canvas) return;

  const monthTx  = getCurrentMonthTx().filter(tx => tx.type === 'expense');
  const byCat    = getExpensesByCategory(monthTx);

  if (_donutChart) { _donutChart.destroy(); _donutChart = null; }

  if (!byCat.length) {
    canvas.style.display = 'none';
    document.getElementById('donutEmpty')?.style && (document.getElementById('donutEmpty').style.display = 'block');
    return;
  }
  canvas.style.display = 'block';
  const empEl = document.getElementById('donutEmpty');
  if (empEl) empEl.style.display = 'none';

  const theme = _theme();

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
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${formatAmount(ctx.parsed)}`
          }
        }
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

// ---- Bar chart: spending by member ----
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
        x: {
          grid: { color: theme.grid },
          ticks: { color: theme.text, font: { family: 'Inter', size: 13 } }
        },
        y: {
          grid: { color: theme.grid },
          ticks: { color: theme.text, callback: v => `${v} €` }
        }
      },
      animation: { duration: 600 }
    }
  });
}

// ---- Line chart: spending trend (last 6 months) ----
export function renderTrendChart() {
  const canvas = document.getElementById('chartTrend');
  if (!canvas) return;

  const theme = _theme();
  const months = _lastNMonths(6);

  const expData    = months.map(m => {
    const tx = getMonthTransactions(m).filter(t => t.type === 'expense');
    return tx.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  });
  const incData = months.map(m => {
    const tx = getMonthTransactions(m).filter(t => t.type === 'income');
    return tx.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  });

  const now    = new Date();
  const labels = months.map(m => {
    const [y, mo] = m.split('-');
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
          borderColor: '#22C55E',
          backgroundColor: '#22C55E22',
          tension: 0.4,
          fill: true,
          pointRadius: 5,
          pointBackgroundColor: '#22C55E',
        },
        {
          label: t('dash_total_expenses'),
          data: expData,
          borderColor: '#F43F5E',
          backgroundColor: '#F43F5E22',
          tension: 0.4,
          fill: true,
          pointRadius: 5,
          pointBackgroundColor: '#F43F5E',
        }
      ]
    },
    options: {
      plugins: {
        legend: {
          labels: { color: theme.text, font: { family: 'Inter', size: 12 } }
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${formatAmount(ctx.parsed.y)}`
          }
        }
      },
      scales: {
        x: {
          grid: { color: theme.grid },
          ticks: { color: theme.text }
        },
        y: {
          grid: { color: theme.grid },
          ticks: { color: theme.text, callback: v => `${v} €` }
        }
      },
      animation: { duration: 700 }
    }
  });
}

export function renderAllCharts() {
  renderDonutChart();
  renderMemberChart();
  renderTrendChart();
}

export function destroyCharts() {
  [_donutChart, _memberChart, _trendChart].forEach(c => c?.destroy?.());
  _donutChart = _memberChart = _trendChart = null;
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
