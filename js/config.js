// ============================================================
// FAMILYFLOW — CONFIG (Users, Categories)
// ============================================================

// ---- User Profiles ----
export const USERS = [
  { id: 1, name: 'Dmytro',  initials: 'D',  avatar: '😎', defaultTheme: 'dark' },
  { id: 2, name: 'Markian', initials: 'M',  avatar: '😄', defaultTheme: 'dark' },
  { id: 3, name: 'Mama',    initials: 'М',  avatar: '👩', defaultTheme: 'pink' },
];

export function getUser(id) {
  return USERS.find(u => u.id === Number(id)) || USERS[0];
}

// ---- Avatar photo helpers ----
// Photos stored as base64 in localStorage: ff_avatar_photo_1, ff_avatar_photo_2, ff_avatar_photo_3

export function getAvatarSrc(userId) {
  return localStorage.getItem(`ff_avatar_photo_${userId}`) || null;
}

// Returns <img> HTML if photo exists, otherwise returns the emoji string
export function getAvatarHTML(userId, sizePx = 36) {
  const src  = getAvatarSrc(userId);
  const user = getUser(userId);
  if (src) {
    return `<img src="${src}" class="avatar-photo" style="width:${sizePx}px;height:${sizePx}px;border-radius:50%;object-fit:cover;flex-shrink:0;" alt="${user.name}">`;
  }
  return user.avatar;
}

// Set photo for user (base64 string)
export function setAvatarSrc(userId, base64) {
  localStorage.setItem(`ff_avatar_photo_${userId}`, base64);
}

// Remove photo for user
export function removeAvatarSrc(userId) {
  localStorage.removeItem(`ff_avatar_photo_${userId}`);
}

// ---- Built-in Expense Categories ----
export const EXPENSE_CATEGORIES = [
  { id: 'food',    labelKey: 'cat_food',    emoji: '🍔', color: '#F43F5E', builtin: true },
  { id: 'online',  labelKey: 'cat_online',  emoji: '🛒', color: '#3B82F6', builtin: true },
  { id: 'health',  labelKey: 'cat_health',  emoji: '🏥', color: '#14B8A6', builtin: true },
  { id: 'housing', labelKey: 'cat_housing', emoji: '🏠', color: '#8B5CF6', builtin: true },
  { id: 'ticket',  labelKey: 'cat_ticket',  emoji: '🎫', color: '#F59E0B', builtin: true },
  { id: 'misc',    labelKey: 'cat_misc',    emoji: '🪙', color: '#94A3B8', builtin: true },
  { id: 'clothes', labelKey: 'cat_clothes', emoji: '👕', color: '#EC4899', builtin: true },
  { id: 'subs',    labelKey: 'cat_subs',    emoji: '📡', color: '#8B5CF6', builtin: true },
  { id: 'internet',labelKey: 'cat_internet',emoji: '💻', color: '#6B7280', builtin: true },
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

// ---- Subcategories (store/service logos for quick-fill) ----
// Each item: { name, logo? (URL), emoji? (fallback), color (brand color) }
export const SUBCATEGORIES = {
  food: [
    { name: 'Lidl',        logo: 'https://logo.clearbit.com/lidl.de',        color: '#0050AA' },
    { name: 'Kaufland',    logo: 'https://logo.clearbit.com/kaufland.de',     color: '#CC0000' },
    { name: 'Aldi Nord',   logo: 'https://logo.clearbit.com/aldi-nord.de',    color: '#1E3A8A' },
    { name: 'Netto',       logo: 'https://logo.clearbit.com/netto-online.de', color: '#E8BC00' },
    { name: 'Rewe',        logo: 'https://logo.clearbit.com/rewe.de',         color: '#CC0000' },
    { name: 'Penny',       logo: 'https://logo.clearbit.com/penny.de',        color: '#CC0000' },
    { name: 'Türkischer',  emoji: '🫏',                                   color: '#C41E3A' },
    { name: 'Restaurant',  emoji: '🍽️',                                   color: '#F59E0B' },
  ],
  online: [
    { name: 'AliExpress',     logo: 'https://logo.clearbit.com/aliexpress.com',   color: '#FF4747' },
    { name: 'Amazon',         logo: 'https://logo.clearbit.com/amazon.de',        color: '#FF9900' },
    { name: 'eBay',           logo: 'https://logo.clearbit.com/ebay.de',          color: '#0064D2' },
    { name: 'Temu',           logo: 'https://logo.clearbit.com/temu.com',         color: '#FF6600' },
    { name: 'Zalando',        logo: 'https://logo.clearbit.com/zalando.de',       color: '#FF6900' },
    { name: 'Otto',           logo: 'https://logo.clearbit.com/otto.de',          color: '#E30613' },
    { name: 'Shein',          logo: 'https://logo.clearbit.com/shein.com',        color: '#000000' },
  ],
  health: [
    { name: 'Rossmann',       logo: 'https://logo.clearbit.com/rossmann.de',      color: '#CC0000' },
    { name: 'DM',             logo: 'https://logo.clearbit.com/dm.de',            color: '#CC0000' },
    { name: 'Müller',         logo: 'https://logo.clearbit.com/mueller.de',       color: '#0066CC' },
    { name: 'Apotheke',       emoji: '💊',                                        color: '#16A34A' },
    { name: 'Лікар',          emoji: '🩺',                                        color: '#0EA5E9' },
    { name: 'Аналізи',        emoji: '🔬',                                        color: '#8B5CF6' },
  ],
  housing: [
    { name: 'Оренда',         emoji: '🏠',  color: '#8B5CF6' },
    { name: 'Комунальні',     emoji: '💡',  color: '#F59E0B' },
    { name: 'Газ',            emoji: '🔥',  color: '#F97316' },
    { name: 'Електрика',      emoji: '⚡',  color: '#EAB308' },
    { name: 'Страховка',      emoji: '🛡️', color: '#6366F1' },
    { name: 'Ремонт',         emoji: '🔧',  color: '#94A3B8' },
  ],
  misc: [
    { name: 'Woolworths',     logo: 'https://logo.clearbit.com/woolworths.com.au', color: '#007B3E' },
    { name: 'KiK',            logo: 'https://logo.clearbit.com/kik.de',            color: '#E30613' },
    { name: 'Action',         logo: 'https://logo.clearbit.com/action.com',        color: '#E30613' },
    { name: 'Tedi',           emoji: '🧸',                                          color: '#FF6600' },
    { name: 'Інше',           emoji: '🪙',                                          color: '#94A3B8' },
  ],
  ticket: [
    { name: 'Кіно',           emoji: '🎬',  color: '#6366F1' },
    { name: 'Концерт',        emoji: '🎵',  color: '#EC4899' },
    { name: 'Театр',          emoji: '🎭',  color: '#8B5CF6' },
    { name: 'Транспорт',      emoji: '🚆',  color: '#3B82F6' },
    { name: 'Музей',          emoji: '🏛️', color: '#F59E0B' },
  ],
  subs: [
    { name: 'Netflix',      logo: 'https://logo.clearbit.com/netflix.com',    color: '#E50914' },
    { name: 'Spotify',      logo: 'https://logo.clearbit.com/spotify.com',    color: '#1DB954' },
    { name: 'YouTube',      logo: 'https://logo.clearbit.com/youtube.com',    color: '#FF0000' },
    { name: 'Disney+',      logo: 'https://logo.clearbit.com/disneyplus.com', color: '#0063E5' },
    { name: 'Amazon Prime', logo: 'https://logo.clearbit.com/amazon.de',      color: '#00A8E1' },
    { name: 'Apple',        logo: 'https://logo.clearbit.com/apple.com',      color: '#555555' },
    { name: 'ChatGPT',      logo: 'https://logo.clearbit.com/openai.com',     color: '#10A37F' },
    { name: 'Adobe',        logo: 'https://logo.clearbit.com/adobe.com',      color: '#FF0000' },
    { name: 'Інша',         emoji: '📦',                                         color: '#6366F1' },
  ],
  internet: [
    { name: 'Інтернет',    emoji: '🌐', color: '#3B82F6' },
    { name: 'Телефон 1',  emoji: '📱', color: '#10B981' },
    { name: 'Телефон 2',  emoji: '📱', color: '#8B5CF6' },
    { name: 'A1',         logo: 'https://logo.clearbit.com/a1.net',     color: '#E30613' },
    { name: 'Magenta',    logo: 'https://logo.clearbit.com/magenta.at',  color: '#E20074' },
    { name: 'Drei',       logo: 'https://logo.clearbit.com/drei.at',     color: '#EE0033' },
    { name: 'Hutchison',  emoji: '📡',                                  color: '#FF6600' },
  ],
};

export function setCustomCategories(cats) { _customCategories = cats || []; }
export function getCustomCategories() { return _customCategories; }

export function getAllCategories(type = 'expense') {
  const builtin = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const builtinIds = new Set(builtin.map(c => c.id));
  // Exclude custom cats that duplicate a built-in id (e.g. old Firebase 'internet' entry)
  const custom = _customCategories.filter(c => c.type === type && !builtinIds.has(c.id));
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
