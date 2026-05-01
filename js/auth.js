// ============================================================
// FAMILYFLOW — AUTH (Profile Management)
// ============================================================

import { USERS, getUser } from './config.js';

const SESSION_KEY = 'ff_user';

// ---- Get current logged-in user ----
export function getCurrentUser() {
  const id = sessionStorage.getItem(SESSION_KEY);
  if (!id) return null;
  return getUser(Number(id));
}

// ---- Login as user ----
export function loginAs(userId) {
  sessionStorage.setItem(SESSION_KEY, String(userId));
  // Apply default theme for this user
  const user = getUser(userId);
  const savedTheme = localStorage.getItem(`ff_theme_${userId}`) || user.defaultTheme;
  applyTheme(savedTheme);
}

// ---- Logout (back to login screen) ----
export function logout() {
  sessionStorage.removeItem(SESSION_KEY);
}

// ---- Theme management ----
export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

export function getTheme() {
  return document.documentElement.getAttribute('data-theme') || 'dark';
}

export function toggleTheme() {
  const current = getTheme();
  const next = current === 'dark' ? 'pink' : 'dark';
  applyTheme(next);
  const user = getCurrentUser();
  if (user) localStorage.setItem(`ff_theme_${user.id}`, next);
  return next;
}

export function setTheme(theme) {
  applyTheme(theme);
  const user = getCurrentUser();
  if (user) localStorage.setItem(`ff_theme_${user.id}`, theme);
}

// ---- Check if logged in ----
export function isLoggedIn() {
  return getCurrentUser() !== null;
}

export { USERS };
