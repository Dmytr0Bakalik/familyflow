// ============================================================
// FAMILYFLOW — CONFIG (Users, Categories)
// ============================================================

// ---- User Profiles ----
export const USERS = [
  { id: 1, name: 'Dmytro',  initials: 'D',  avatar: '👨', defaultTheme: 'dark' },
  { id: 2, name: 'Markian', initials: 'M',  avatar: '👦', defaultTheme: 'dark' },
  { id: 3, name: 'Mama',    initials: 'М',  avatar: '👩', defaultTheme: 'pink' },
];

export function getUser(id) {
  return USERS.find(u => u.id === Number(id)) || USERS[0];
}

// ---- Built-in Expense Categories ----
export const EXPENSE_CATEGORIES = [
  { id: 'food',     labelKey: 'cat_food',    emoji: '🍔', color: '#F43F5E', builtin: true },
  { id: 'online',   labelKey: 'cat_online',  emoji: '🛒', color: '#3B82F6', builtin: true },
  { id: 'health',   labelKey: 'cat_health',  emoji: '🏥', color: '#14B8A6', builtin: true },
  { id: 'housing',  labelKey: 'cat_housing', emoji: '🏠', color: '#8B5CF6', builtin: true },
  { id: 'ticket',   labelKey: 'cat_ticket',  emoji: '🎫', color: '#F59E0B', builtin: true },
  { id: 'misc',     labelKey: 'cat_misc',    emoji: '🪙', color: '#94A3B8', builtin: true },
  { id: 'clothes',  labelKey: 'cat_clothes', emoji: '👕', color: '#EC4899', builtin: true },
  { id: 'extra',    labelKey: 'cat_extra',   emoji: '➕', color: '#6366F1', builtin: true },
];

// ---- Built-in Income Categories ----
export const INCOME_CATEGORIES = [
  { id: 'salary',     labelKey: 'cat_salary',       emoji: '💼', color: '#10B981', builtin: true },
  { id: 'sidejob',    labelKey: 'cat_sidejob',      emoji: '💻', color: '#3B82F6', builtin: true },
  { id: 'bonus',      labelKey: 'cat_bonus',        emoji: '🎯', color: '#F59E0B', builtin: true },
  { id: 'other_in',   labelKey: 'cat_other_income', emoji: '💰', color: '#22C55E', builtin: true },
];

// Custom categories are loaded from Firebase/localStorage at runtime.
// Shape: { id: 'custom_xxx', label: 'My Cat', emoji: '🌟', color: '#hex', type: 'expense'|'income', builtin: false }
let _customCategories = [];

export function setCustomCategories(cats) { _customCategories = cats || []; }
export function getCustomCategories() { return _customCategories; }

export function getAllCategories(type = 'expense') {
  const builtin = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const custom  = _customCategories.filter(c => c.type === type);
  return [...builtin, ...custom];
}

export function getCategoryById(id) {
  return [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES, ..._customCategories]
    .find(c => c.id === id);
}

// ---- Color palette for custom categories ----
export const COLOR_PALETTE = [
  '#F43F5E', '#EC4899', '#A855F7', '#8B5CF6',
  '#6366F1', '#3B82F6', '#0EA5E9', '#14B8A6',
  '#10B981', '#22C55E', '#84CC16', '#EAB308',
  '#F97316', '#EF4444', '#64748B', '#94A3B8',
];

// ---- Currency ----
export const CURRENCY = '€';
export function formatAmount(n) {
  return `${Number(n).toFixed(2).replace('.', ',')} €`;
}
