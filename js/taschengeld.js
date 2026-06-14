// ============================================================
// FAMILYFLOW — TASCHENGELD (Pocket Money for Markian)
// ============================================================

import { getCurrentUser } from './auth.js';
import { formatAmount } from './config.js';
import { showToast } from './ui.js';

import { getDatabase, ref, set, onValue, off, push }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

const DEFAULT_WEEKLY = 12; // €

// ---- Helpers ----

/** Returns ISO week key "YYYY-Www" (Mon-Sun) for a given date */
function weekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum   = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/** Label like "9 чер – 15 чер" */
function weekLabel(weekKeyStr) {
  const [year, wStr] = weekKeyStr.split('-W');
  const week = parseInt(wStr, 10);
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

/** Generate week keys from startWeek up to current week */
function weeksFrom(startKey, currentKey) {
  const weeks = [];
  let key = startKey;
  // Increment by weeks until > currentKey
  while (key <= currentKey) {
    weeks.push({ key, label: weekLabel(key) });
    // Next week: parse and add 7 days to monday of this week
    const [y, wStr] = key.split('-W');
    const w = parseInt(wStr, 10);
    const jan4 = new Date(Date.UTC(parseInt(y, 10), 0, 4));
    const day  = jan4.getUTCDay() || 7;
    const mon  = new Date(jan4);
    mon.setUTCDate(jan4.getUTCDate() - day + 1 + (w - 1) * 7);
    mon.setUTCDate(mon.getUTCDate() + 7);
    key = weekKey(new Date(mon.getUTCFullYear(), mon.getUTCMonth(), mon.getUTCDate()));
    if (weeks.length > 52) break; // safety
  }
  return weeks.reverse(); // newest first
}

// ---- Firebase ----

function getDb() { return getDatabase(); }

async function saveData(path, value) {
  try {
    await set(ref(getDb(), `taschengeld/${path}`), value);
  } catch {
    try {
      const ls = JSON.parse(localStorage.getItem('ff_taschengeld') || '{}');
      const parts = path.split('/');
      let obj = ls;
      for (let i = 0; i < parts.length - 1; i++) {
        obj[parts[i]] = obj[parts[i]] || {};
        obj = obj[parts[i]];
      }
      obj[parts[parts.length - 1]] = value;
      localStorage.setItem('ff_taschengeld', JSON.stringify(ls));
    } catch {}
  }
}

// ---- Reactive listener ----

let _unsub = null;

export function setupTaschengeld() {
  if (_unsub) { _unsub(); _unsub = null; }

  try {
    const r = ref(getDb(), 'taschengeld');
    const handler    = snap => renderTaschengeld(snap.val() || {});
    const errHandler = ()   => renderTaschengeld(
      JSON.parse(localStorage.getItem('ff_taschengeld') || '{}')
    );
    onValue(r, handler, errHandler);
    _unsub = () => off(r, 'value', handler);
  } catch {
    renderTaschengeld(JSON.parse(localStorage.getItem('ff_taschengeld') || '{}'));
  }
}

// ---- Main render ----

function renderTaschengeld(data) {
  const container = document.getElementById('taschengeldPanel');
  if (!container) return;

  const isDmytro      = getCurrentUser()?.id === 1;
  const today         = new Date();
  const thisWeek      = weekKey(today);
  const defaultAmount = data.defaultWeekly ?? DEFAULT_WEEKLY;

  // startWeek: when tracking began (default = this week)
  const startWeek     = data.startWeek || thisWeek;
  // openingBalance: manual starting point (default = 0)
  const openingBal    = Number(data.openingBalance ?? 0);

  const weeklyAmounts = data.weekly  || {};
  const payouts       = data.payouts || {};

  // Build list of weeks from start to now
  const weeks = weeksFrom(startWeek, thisWeek);

  // Calculate balance = openingBal + Σ(earned - paid) for all weeks
  let balance = openingBal;
  const weekData = {};
  for (const w of [...weeks].reverse()) { // oldest first for running total
    const earned = weeklyAmounts[w.key] ?? defaultAmount;
    const paid   = payouts[w.key]
      ? Object.values(payouts[w.key]).reduce((s, p) => s + Number(p.amount), 0)
      : 0;
    weekData[w.key] = { earned, paid };
    balance += earned - paid;
  }

  const balClass = balance >= 0 ? 'tg-balance-pos' : 'tg-balance-neg';

  container.innerHTML = `
    <!-- HEADER -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-5)">
      <div>
        <h2 style="font-size:var(--text-xl);font-weight:var(--fw-extrabold)">💰 Taschengeld</h2>
        <div style="font-size:var(--text-sm);color:var(--text-muted);margin-top:2px">
          Кишенькові гроші Markian · з ${weekLabel(startWeek)}
        </div>
      </div>
      <div class="tg-balance-badge ${balClass}">
        ${balance >= 0 ? '+' : ''}${formatAmount(balance)}
      </div>
    </div>

    ${isDmytro ? `
    <!-- SETTINGS CARD -->
    <div class="card tg-settings-card" style="margin-bottom:var(--space-4)">
      <div style="font-size:var(--text-xs);font-weight:var(--fw-semibold);color:var(--text-muted);
                  text-transform:uppercase;letter-spacing:.5px;margin-bottom:var(--space-3)">
        ⚙️ Налаштування
      </div>
      <div style="display:grid;gap:var(--space-3)">

        <!-- Weekly amount -->
        <div style="display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap">
          <span style="font-size:var(--text-sm);color:var(--text-secondary);min-width:140px">Сума / тиждень:</span>
          <input type="number" id="tgDefaultAmount" class="form-input"
                 value="${defaultAmount}" min="0" step="0.5"
                 style="width:80px;text-align:center;font-weight:var(--fw-bold)">
          <span style="color:var(--text-muted)">€</span>
          <button class="btn btn-primary btn-sm" id="tgSaveDefault">Зберегти</button>
        </div>

        <!-- Opening balance -->
        <div style="display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap">
          <span style="font-size:var(--text-sm);color:var(--text-secondary);min-width:140px">Початковий баланс:</span>
          <input type="number" id="tgOpeningBal" class="form-input"
                 value="${openingBal}" min="0" step="0.5"
                 style="width:80px;text-align:center;font-weight:var(--fw-bold)">
          <span style="color:var(--text-muted)">€</span>
          <button class="btn btn-secondary btn-sm" id="tgSaveOpeningBal">Зберегти</button>
        </div>

        <!-- Start week reset -->
        <div style="display:flex;align-items:center;gap:var(--space-2)">
          <span style="font-size:var(--text-sm);color:var(--text-secondary);min-width:140px">Відлік з:</span>
          <span style="font-size:var(--text-sm);font-weight:var(--fw-semibold)">${weekLabel(startWeek)}</span>
          <button class="btn btn-ghost btn-sm" id="tgResetStart">Скинути на цей тиждень</button>
        </div>
      </div>
    </div>` : ''}

    <!-- WEEKS LIST -->
    <div class="tg-weeks-list">
      ${weeks.map((w, i) => {
        const wd       = weekData[w.key] || { earned: defaultAmount, paid: 0 };
        const wPayouts = payouts[w.key] ? Object.entries(payouts[w.key]) : [];
        const isThis   = w.key === thisWeek;

        return `
        <div class="card tg-week-card ${isThis ? 'tg-week-this' : ''}">
          <!-- Week header -->
          <div class="tg-week-header">
            <div>
              <div style="font-weight:var(--fw-bold)">
                ${isThis ? '📅 Цей тиждень' : weekLabel(w.key)}
              </div>
              ${isThis ? `<div style="font-size:var(--text-xs);color:var(--text-muted)">${w.label}</div>` : ''}
            </div>
            <div style="text-align:right">
              <div style="color:var(--income-color);font-weight:var(--fw-bold)">
                +${formatAmount(wd.earned)} нараховано
              </div>
              ${wd.paid > 0
                ? `<div style="color:var(--expense-color);font-size:var(--text-sm);font-weight:var(--fw-semibold)">
                     −${formatAmount(wd.paid)} видано
                   </div>`
                : '<div style="font-size:var(--text-xs);color:var(--text-muted)">нічого не видано</div>'}
            </div>
          </div>

          <!-- Payouts list -->
          ${wPayouts.length ? `
          <div class="tg-payout-list">
            ${wPayouts.map(([pid, p]) => `
              <div class="tg-payout-item">
                <span class="tg-payout-icon">💵</span>
                <span class="tg-payout-note">${p.note || 'Готівка видана'}</span>
                <span class="tg-payout-amount">−${formatAmount(p.amount)}</span>
                ${isDmytro
                  ? `<button class="tg-del-btn" data-pid="${pid}" data-week="${w.key}">✕</button>`
                  : ''}
              </div>`).join('')}
          </div>` : ''}

          <!-- Add payout (Dmytro only) -->
          ${isDmytro ? `
          <div class="tg-add-payout" data-week="${w.key}">
            <input type="number" class="form-input tg-payout-input"
                   placeholder="Сума" min="0" step="0.5"
                   style="width:80px;text-align:center">
            <input type="text" class="form-input tg-payout-note-inp"
                   placeholder="Нотатка (опційно)" style="flex:1">
            <button class="btn btn-secondary btn-sm tg-add-btn" data-week="${w.key}">💵 Видати</button>
          </div>

          <details class="tg-override-details">
            <summary>✏️ Змінити суму цього тижня (${formatAmount(wd.earned)}€)</summary>
            <div style="display:flex;gap:var(--space-2);margin-top:var(--space-2);align-items:center">
              <input type="number" class="form-input tg-override-input"
                     value="${wd.earned}" min="0" step="0.5"
                     style="width:80px;text-align:center">
              <span style="color:var(--text-muted)">€</span>
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
    const val = parseFloat(document.getElementById('tgDefaultAmount')?.value) || 0;
    await saveData('defaultWeekly', val);
    showToast(`✅ ${formatAmount(val)}€ / тиждень`);
  });

  // Save opening balance
  document.getElementById('tgSaveOpeningBal')?.addEventListener('click', async () => {
    const val = parseFloat(document.getElementById('tgOpeningBal')?.value) || 0;
    await saveData('openingBalance', val);
    showToast(`✅ Початковий баланс: ${formatAmount(val)}€`);
  });

  // Reset start week to current
  document.getElementById('tgResetStart')?.addEventListener('click', async () => {
    if (!confirm(`Скинути відлік на цей тиждень (${weekLabel(thisWeek)})?`)) return;
    await saveData('startWeek', thisWeek);
    showToast('✅ Відлік починається з цього тижня');
  });

  // Add payout
  container.querySelectorAll('.tg-add-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const wrap  = btn.closest('.tg-add-payout');
      const week  = btn.dataset.week;
      const amtEl = wrap.querySelector('.tg-payout-input');
      const noteEl= wrap.querySelector('.tg-payout-note-inp');
      const amt   = parseFloat(amtEl?.value || '');
      if (!amt || amt <= 0) { showToast('Введи суму!', 'error'); return; }
      const newRef = push(ref(getDb(), `taschengeld/payouts/${week}`));
      await set(newRef, { amount: amt, note: noteEl?.value?.trim() || '', ts: Date.now() });
      showToast(`💵 Видано ${formatAmount(amt)}`);
      amtEl.value = ''; noteEl.value = '';
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
      await saveData(`weekly/${week}`, val);
      showToast(`✅ ${formatAmount(val)}€ для цього тижня`);
    });
  });
}
