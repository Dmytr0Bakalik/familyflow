// ============================================================
// FAMILYFLOW — TASCHENGELD (Pocket Money for Markian)
// ============================================================

import { getCurrentUser } from './auth.js';
import { formatAmount, escapeHtml } from './config.js';
import { showToast } from './ui.js';
import { closeModal } from './form.js';

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
                <span class="tg-payout-note">${escapeHtml(p.note) || 'Готівка видана'}</span>
                <span class="tg-payout-amount">−${formatAmount(p.amount)}</span>
                ${isDmytro
                  ? `<button class="tg-del-btn" data-pid="${pid}" data-week="${w.key}">✕</button>`
                  : ''}
              </div>`).join('')}
          </div>` : ''}

          <!-- Add payout (Dmytro only) -->
          ${isDmytro ? `
          <div class="tg-add-payout" data-week="${w.key}">
            <button class="btn btn-primary btn-full tg-payout-open-btn"
                    data-week="${w.key}" data-default="${defaultAmount}">
              💵 Видати кишенькові
            </button>
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

  // Open payout stepper modal
  container.querySelectorAll('.tg-payout-open-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const week = btn.dataset.week;
      const def  = Math.round(Number(btn.dataset.default) || DEFAULT_WEEKLY);
      _openPayoutStepper(week, def);
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

// ---- Payout stepper modal (press +/- or a preset chip, no typing) ----

const PAYOUT_PRESETS = [5, 10, 12, 15, 20, 25];

function _openPayoutStepper(week, startAmount) {
  const backdrop = document.getElementById('modalBackdrop');
  const body     = document.getElementById('modalBody');
  const titleEl  = document.getElementById('modalTitle');
  const saveBtn  = document.getElementById('modalSaveBtn');
  if (!backdrop || !body || !saveBtn) return;

  let val = Math.max(0, Math.round(startAmount) || DEFAULT_WEEKLY);

  titleEl.textContent = '💵 Видати кишенькові';

  body.innerHTML = `
    <div class="stepper-wrap">
      <div class="stepper-row">
        <button type="button" class="stepper-btn" id="stepMinus" aria-label="Менше">−</button>
        <div class="stepper-value" id="stepValue">${val} €</div>
        <button type="button" class="stepper-btn" id="stepPlus" aria-label="Більше">+</button>
      </div>
      <div class="stepper-presets">
        ${PAYOUT_PRESETS.map(v => `<button type="button" class="stepper-chip" data-v="${v}">${v}€</button>`).join('')}
      </div>
      <input type="text" id="stepNote" class="form-input" placeholder="Нотатка (опційно)" style="margin-top:var(--space-4)">
    </div>
  `;

  const valueEl = document.getElementById('stepValue');
  const render  = () => { valueEl.textContent = `${val} €`; };

  document.getElementById('stepMinus').addEventListener('click', () => {
    val = Math.max(0, val - 1);
    render();
  });
  document.getElementById('stepPlus').addEventListener('click', () => {
    val = val + 1;
    render();
  });
  body.querySelectorAll('.stepper-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      val = Number(chip.dataset.v);
      render();
    });
  });

  const saveLabelEl = saveBtn.querySelector('span') || saveBtn;
  saveLabelEl.textContent = 'Видати';
  saveBtn.style.display = '';
  saveBtn.onclick = async () => {
    if (!val || val <= 0) { showToast('Обери суму!', 'error'); return; }
    const note = document.getElementById('stepNote')?.value?.trim() || '';
    const newRef = push(ref(getDb(), `taschengeld/payouts/${week}`));
    await set(newRef, { amount: val, note, ts: Date.now() });
    showToast(`💵 Видано ${formatAmount(val)}`);
    closeModal();
  };

  backdrop.style.display = 'flex';
}
