// ============================================================
// FAMILYFLOW — EXPORT (Excel / CSV)
// ============================================================

import { state } from './state.js';
import { getCategoryById, formatAmount } from './config.js';
import { USERS } from './auth.js';
import { monthName } from './i18n.js';

// ---- User lookup ----
function _userName(id) {
  const u = USERS.find(u => u.id === Number(id));
  return u ? u.name : `User ${id}`;
}

// ---- Category label ----
function _catLabel(tx) {
  if (tx.categoryLabel) return tx.categoryLabel;
  const cat = getCategoryById(tx.category);
  return cat ? (cat.label || cat.id) : (tx.category || '—');
}

// ---- Format date ----
function _fmtDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}.${m}.${y}`;
}

// ---- Build CSV content ----
function _buildCSV(txList) {
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel to show Ukrainian correctly
  const headers = ['Дата', 'Тип', 'Категорія', 'Нотатка', 'Спосіб', 'Хто', 'Сума (€)'];
  const rows = txList.map(tx => [
    _fmtDate(tx.date),
    tx.type === 'income' ? 'Дохід' : 'Витрата',
    _catLabel(tx),
    tx.note || '',
    tx.method === 'cash' ? 'Готівка' : 'Картка',
    _userName(tx.userId),
    (tx.type === 'income' ? '+' : '-') + Number(tx.amount).toFixed(2),
  ]);
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    .join('\n');
  return BOM + csvContent;
}

// ---- Download file helper ----
function _download(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

// ---- Export all transactions as CSV (Excel-compatible) ----
export function exportAllCSV() {
  const txList = [...state.transactions].sort((a, b) => b.date?.localeCompare(a.date));
  if (!txList.length) { alert('Немає даних для експорту'); return; }
  const csv = _buildCSV(txList);
  const now  = new Date();
  const fname = `FamilyFlow_Усі_${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}.csv`;
  _download(csv, fname, 'text/csv;charset=utf-8');
}

// ---- Export current month ----
export function exportCurrentMonthCSV() {
  const month = state.currentMonth; // YYYY-MM
  const txList = state.transactions
    .filter(tx => tx.date?.startsWith(month))
    .sort((a, b) => b.date?.localeCompare(a.date));
  if (!txList.length) { alert('Немає даних за цей місяць'); return; }
  const csv  = _buildCSV(txList);
  const [y, m] = month.split('-');
  const fname = `FamilyFlow_${monthName(Number(m)-1)}_${y}.csv`;
  _download(csv, fname, 'text/csv;charset=utf-8');
}

// ---- Weekly summary report (plain text) ----
export function exportWeeklySummary() {
  const now    = new Date();
  const endDate = new Date(now);
  endDate.setDate(now.getDate() - now.getDay() + 7); // End of this week (Sunday)
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 6); // Start (Monday)

  const fmt = d => `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
  const toISO = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  const startISO = toISO(startDate);
  const endISO   = toISO(endDate);

  const txList = state.transactions.filter(tx => tx.date >= startISO && tx.date <= endISO);
  const expenses = txList.filter(t => t.type === 'expense');
  const incomes  = txList.filter(t => t.type === 'income');

  const totalExp = expenses.reduce((s, t) => s + Number(t.amount), 0);
  const totalInc = incomes.reduce((s, t) => s + Number(t.amount), 0);

  // Group by category
  const byCat = {};
  expenses.forEach(tx => {
    const lbl = _catLabel(tx);
    byCat[lbl] = (byCat[lbl] || 0) + Number(tx.amount);
  });
  const catLines = Object.entries(byCat)
    .sort(([,a],[,b]) => b - a)
    .map(([cat, amt]) => `  ${cat}: ${amt.toFixed(2)} €`)
    .join('\n');

  // Group by user
  const byUser = {};
  expenses.forEach(tx => {
    const n = _userName(tx.userId);
    byUser[n] = (byUser[n] || 0) + Number(tx.amount);
  });
  const userLines = Object.entries(byUser)
    .map(([name, amt]) => `  ${name}: ${amt.toFixed(2)} €`)
    .join('\n');

  const report = [
    '╔══════════════════════════════════╗',
    '║   FamilyFlow — Тижневий звіт    ║',
    '╚══════════════════════════════════╝',
    `Період: ${fmt(startDate)} — ${fmt(endDate)}`,
    '',
    `💸 Загальні витрати: ${totalExp.toFixed(2)} €`,
    `💰 Загальні доходи:  ${totalInc.toFixed(2)} €`,
    `📊 Баланс тижня:     ${(totalInc - totalExp).toFixed(2)} €`,
    '',
    '📋 За категоріями:',
    catLines || '  (немає витрат)',
    '',
    '👥 По учасниках:',
    userLines || '  (немає витрат)',
    '',
    `📝 Транзакцій: ${txList.length}`,
    '',
    `Згенеровано: ${fmt(now)}`,
  ].join('\n');

  _download(report, `FamilyFlow_Тиждень_${fmt(startDate)}.txt`, 'text/plain;charset=utf-8');
}

// ---- Monthly summary report ----
export function exportMonthlySummary() {
  const month  = state.currentMonth;
  const [y, m] = month.split('-');
  const txList = state.transactions.filter(tx => tx.date?.startsWith(month));
  const expenses = txList.filter(t => t.type === 'expense');
  const incomes  = txList.filter(t => t.type === 'income');

  const totalExp = expenses.reduce((s, t) => s + Number(t.amount), 0);
  const totalInc = incomes.reduce((s, t) => s + Number(t.amount), 0);
  const savings  = totalInc - totalExp;
  const rate     = totalInc > 0 ? Math.round((savings / totalInc) * 100) : 0;

  const byCat = {};
  expenses.forEach(tx => {
    const lbl = _catLabel(tx);
    byCat[lbl] = (byCat[lbl] || 0) + Number(tx.amount);
  });
  const catLines = Object.entries(byCat)
    .sort(([,a],[,b]) => b - a)
    .map(([cat, amt]) => {
      const pct = totalExp > 0 ? Math.round((amt / totalExp) * 100) : 0;
      return `  ${cat}: ${amt.toFixed(2)} € (${pct}%)`;
    }).join('\n');

  const byUser = {};
  expenses.forEach(tx => {
    const n = _userName(tx.userId);
    byUser[n] = (byUser[n] || 0) + Number(tx.amount);
  });
  const userLines = Object.entries(byUser)
    .map(([name, amt]) => `  ${name}: ${amt.toFixed(2)} €`)
    .join('\n');

  const now = new Date();
  const fmt = d => `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;

  const report = [
    '╔══════════════════════════════════╗',
    `║  FamilyFlow — ${monthName(Number(m)-1)} ${y}  ║`,
    '╚══════════════════════════════════╝',
    '',
    `💸 Загальні витрати: ${totalExp.toFixed(2)} €`,
    `💰 Загальні доходи:  ${totalInc.toFixed(2)} €`,
    `🏦 Заощадження:      ${savings.toFixed(2)} € (${rate}%)`,
    '',
    '📋 За категоріями:',
    catLines || '  (немає витрат)',
    '',
    '👥 По учасниках:',
    userLines || '  (немає витрат)',
    '',
    `📝 Всього транзакцій: ${txList.length}`,
    `   Витрат: ${expenses.length} | Доходів: ${incomes.length}`,
    '',
    `Згенеровано: ${fmt(now)}`,
  ].join('\n');

  _download(report, `FamilyFlow_Місяць_${monthName(Number(m)-1)}_${y}.txt`, 'text/plain;charset=utf-8');
}
