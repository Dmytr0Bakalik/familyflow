// ============================================================
// FAMILYFLOW — TASCHENGELD (Pocket Money for Markian)
// ============================================================

import { getCurrentUser } from './auth.js';
import { formatAmount } from './config.js';
import { showToast } from './ui.js';

// Firebase imports (same CDN version)
import { getDatabase, ref, set, get, onValue, off, push }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

const DEFAULT_WEEKLY = 12; // €

// ---- Helpers ----

/** Returns the ISO week key "YYYY-Www" (Mon-Sun) for a given date */
function weekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7; // Mon=1 … Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - day); // nearest Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum   = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/** Monday of the week that contains `date` */
function weekMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Label like "9 чер – 15 чер" */
function weekLabel(weekKeyStr) {
  const [year, wStr] = weekKeyStr.split('-W');
  const week = parseInt(wStr, 10);
  // ISO week: Jan 4 is always in week 1
  const jan4 = new Date(Date.UTC(parseInt(year, 10), 0, 4));
  const day = jan4.getUTCDay() || 7;
  const mon = new Date(jan4);
  mon.setUTCDate(jan4.getUTCDate() - day + 1 + (week - 1) * 7);
  const sun = new Date(mon);
  sun.setUTCDate(mon.getUTCDate() + 6);

  const UA_MONTHS = ['січ', 'лют', 'бер', 'кві', 'тра', 'чер',
                     'лип', 'сер', 'вер', 'жов', 'лис', 'гру'];
  const fmt = d => `${d.getUTCDate()} ${UA_MONTHS[d.getUTCMonth()]}`;
  return `${fmt(mon)} – ${fmt(sun)}`;
}

/** Get current year's week list up to now (last 12 weeks) */
function recentWeeks(n = 8) {
  const weeks = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i * 7);
    const key = weekKey(d);
    if (!weeks.find(w => w.key === key)) {
      weeks.push({ key, label: weekLabel(key) });
    }
  }
  return weeks; // newest first
}

// ---- Firebase access (lazy, reuses existing app) ----

function getDb() {
  // Firebase app is already initialized by storage.js — just get the DB
  return getDatabase();
}

async function getTaschengeldData() {
  try {
    const snap = await get(ref(getDb(), 'taschengeld'));
    return snap.val() || {};
  } catch { return {}; }
}

async function saveTaschengeldData(path, value) {
  try {
    await set(ref(getDb(), `taschengeld/${path}`), value);
  } catch (e) {
    // offline fallback
    const ls = JSON.parse(localStorage.getItem('ff_taschengeld') || '{}');
    const parts = path.split('/');
    let obj = ls;
    for (let i = 0; i < parts.length - 1; i++) {
      obj[parts[i]] = obj[parts[i]] || {};
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = value;
    localStorage.setItem('ff_taschengeld', JSON.stringify(ls));
  }
}

// ---- Main render ----

let _unsubscribeTaschengeld = null;

export function setupTaschengeld() {
  if (_unsubscribeTaschengeld) {
    _unsubscribeTaschengeld();
    _unsubscribeTaschengeld = null;
  }

  try {
    const r = ref(getDb(), 'taschengeld');
    const handler = snap => {
      const data = snap.val() || {};
      renderTaschengeld(data);
    };
    const errHandler = () => {
      // offline
      const data = JSON.parse(localStorage.getItem('ff_taschengeld') || '{}');
      renderTaschengeld(data);
    };
    onValue(r, handler, errHandler);
    _unsubscribeTaschengeld = () => off(r, 'value', handler);
  } catch {
    const data = JSON.parse(localStorage.getItem('ff_taschengeld') || '{}');
    renderTaschengeld(data);
  }
}

function renderTaschengeld(data) {
  const container = document.getElementById('taschengeldPanel');
  if (!container) return;

  const isDmytro = getCurrentUser()?.id === 1;
  const weeks    = recentWeeks(8);
  const thisWeek = weeks[0].key;

  // weekly amounts: data.weekly[weekKey] = amount
  // payouts:        data.payouts[weekKey][pushId] = { amount, note, ts }
  const weeklyAmounts = data.weekly  || {};
  const payouts       = data.payouts || {};

  // Calculate cumulative balance:
  // Start from week with first payout or first override, going forward
  // Each week: +weeklyAmount, -sum(payouts that week)
  // Balance = sum over all weeks up to and including current
  const allWeekKeys = [...new Set([
    ...Object.keys(weeklyAmounts),
    ...Object.keys(payouts),
    ...weeks.map(w => w.key)
  ])].sort();

  const defaultAmount = data.defaultWeekly ?? DEFAULT_WEEKLY;
  let balance = 0;
  const weekData = {};
  for (const wk of allWeekKeys) {
    const earned = weeklyAmounts[wk] ?? defaultAmount;
    const paid   = payouts[wk]
      ? Object.values(payouts[wk]).reduce((s, p) => s + Number(p.amount), 0)
      : 0;
    weekData[wk] = { earned, paid, net: earned - paid };
    if (wk <= thisWeek) balance += earned - paid;
  }

  // Clamp balance: never show negative if no data
  const displayBalance = balance;

  container.innerHTML = `
    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-5)">
      <div>
        <h2 style="font-size:var(--text-xl);font-weight:var(--fw-extrabold);color:var(--text-primary)">
          💰 Taschengeld
        </h2>
        <div style="font-size:var(--text-sm);color:var(--text-muted);margin-top:2px">Кишенькові гроші Markian</div>
      </div>
      <div class="tg-balance-badge ${displayBalance >= 0 ? 'tg-balance-pos' : 'tg-balance-neg'}">
        ${displayBalance >= 0 ? '+' : ''}${formatAmount(displayBalance)}
      </div>
    </div>

    <!-- Default weekly amount (only Dmytro) -->
    ${isDmytro ? `
    <div class="card tg-settings-card" style="margin-bottom:var(--space-4)">
      <div style="font-size:var(--text-sm);font-weight:var(--fw-semibold);color:var(--text-muted);margin-bottom:var(--space-2)">
        ⚙️ Стандартна сума на тиждень
      </div>
      <div style="display:flex;align-items:center;gap:var(--space-3)">
        <input type="number" id="tgDefaultAmount" class="form-input" value="${defaultAmount}" min="0" step="0.5"
               style="flex:1;max-width:120px;text-align:center;font-size:var(--text-lg);font-weight:var(--fw-bold)">
        <span style="font-weight:var(--fw-bold);font-size:var(--text-lg)">€ / тиждень</span>
        <button class="btn btn-primary btn-sm" id="tgSaveDefault">Зберегти</button>
      </div>
    </div>` : ''}

    <!-- Weeks list -->
    <div class="tg-weeks-list">
      ${weeks.map((w, i) => {
        const wd       = weekData[w.key] || { earned: defaultAmount, paid: 0, net: defaultAmount };
        const wPayouts = payouts[w.key] ? Object.entries(payouts[w.key]) : [];
        const isThis   = i === 0;

        return `
        <div class="card tg-week-card ${isThis ? 'tg-week-this' : ''}" data-week="${w.key}">
          <div class="tg-week-header">
            <div>
              <div style="font-weight:var(--fw-bold);font-size:var(--text-base)">
                ${isThis ? '📅 Цей тиждень' : `Тиждень ${w.label}`}
              </div>
              <div style="font-size:var(--text-xs);color:var(--text-muted)">${w.label}</div>
            </div>
            <div style="text-align:right">
              <div style="color:var(--income-color);font-weight:var(--fw-bold)">+${formatAmount(wd.earned)}</div>
              ${wd.paid > 0 ? `<div style="color:var(--expense-color);font-size:var(--text-xs)">−${formatAmount(wd.paid)} видано</div>` : ''}
            </div>
          </div>

          <!-- Payouts list -->
          ${wPayouts.length ? `
          <div class="tg-payout-list">
            ${wPayouts.map(([pid, p]) => `
              <div class="tg-payout-item" data-pid="${pid}" data-week="${w.key}">
                <span class="tg-payout-note">💵 ${p.note || 'Готівка видана'}</span>
                <span class="tg-payout-amount">−${formatAmount(p.amount)}</span>
                ${isDmytro ? `<button class="tg-del-btn" data-pid="${pid}" data-week="${w.key}">✕</button>` : ''}
              </div>`).join('')}
          </div>` : ''}

          <!-- Add payout (only Dmytro, only current week) -->
          ${isDmytro ? `
          <div class="tg-add-payout" data-week="${w.key}">
            <input type="number" class="form-input tg-payout-input" placeholder="Сума €" min="0" step="0.5"
                   style="width:90px;text-align:center">
            <input type="text" class="form-input tg-payout-note" placeholder="Нотатка (необов'язково)"
                   style="flex:1">
            <button class="btn btn-secondary btn-sm tg-add-btn" data-week="${w.key}">Видати</button>
          </div>

          <!-- Override weekly amount for this week -->
          <details class="tg-override-details">
            <summary style="font-size:var(--text-xs);color:var(--text-muted);cursor:pointer;padding:var(--space-1) 0">
              ✏️ Змінити суму цього тижня (зараз: ${formatAmount(wd.earned)}€)
            </summary>
            <div style="display:flex;gap:var(--space-2);margin-top:var(--space-2)">
              <input type="number" class="form-input tg-override-input" value="${wd.earned}" min="0" step="0.5"
                     style="width:90px;text-align:center" data-week="${w.key}">
              <span style="align-self:center">€</span>
              <button class="btn btn-secondary btn-sm tg-override-btn" data-week="${w.key}">OK</button>
            </div>
          </details>
          ` : ''}
        </div>`;
      }).join('')}
    </div>
  `;

  // ---- Wire events ----

  // Save default weekly amount
  document.getElementById('tgSaveDefault')?.addEventListener('click', async () => {
    const val = parseFloat(document.getElementById('tgDefaultAmount')?.value || '') || 0;
    await saveTaschengeldData('defaultWeekly', val);
    showToast('✅ Стандартну суму збережено');
  });

  // Add payout buttons
  container.querySelectorAll('.tg-add-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const wrap  = btn.closest('.tg-add-payout');
      const week  = btn.dataset.week;
      const amtEl = wrap.querySelector('.tg-payout-input');
      const noteEl= wrap.querySelector('.tg-payout-note');
      const amt   = parseFloat(amtEl?.value || '');
      if (!amt || amt <= 0) { showToast('Введи суму!', 'error'); return; }
      const note  = noteEl?.value?.trim() || '';
      const payoutRef = ref(getDb(), `taschengeld/payouts/${week}`);
      const newRef    = push(payoutRef);
      await set(newRef, { amount: amt, note, ts: Date.now() });
      showToast(`💵 Видано ${formatAmount(amt)}`);
      amtEl.value  = '';
      noteEl.value = '';
    });
  });

  // Delete payout
  container.querySelectorAll('.tg-del-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Видалити цей запис?')) return;
      const { pid, week } = btn.dataset;
      await set(ref(getDb(), `taschengeld/payouts/${week}/${pid}`), null);
      showToast('Запис видалено', 'info');
    });
  });

  // Override weekly amount
  container.querySelectorAll('.tg-override-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const week = btn.dataset.week;
      const inp  = btn.closest('.tg-override-details').querySelector('.tg-override-input');
      const val  = parseFloat(inp?.value || '') || 0;
      await saveTaschengeldData(`weekly/${week}`, val);
      showToast(`✅ Сума для цього тижня: ${formatAmount(val)}`);
    });
  });
}
