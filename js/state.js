// ============================================================
// FAMILYFLOW — APP STATE
// ============================================================

export const state = {
  // All transactions from Firebase
  transactions: [],

  // Current month filter (YYYY-MM) — used on home tab
  currentMonth: (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  })(),

  // History tab month filter (YYYY-MM) — independent of home tab
  historyMonth: (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  })(),

  // Income for current user (this month)
  income: { card: 0, cash: 0 },

  // All income data per user
  allIncome: {},

  // Filter state
  filter: {
    userId: 'all',    // 'all' | 1 | 2 | 3
    type: 'all',      // 'all' | 'expense' | 'income'
    search: '',
    dateFrom: '',
    dateTo: '',
  },

  // Firebase connection
  firebaseConnected: false,

  // UI state
  activeTab: 'home',
  isLoading: false,
};

// ---- Computed helpers ----

export function getMonthTransactions(month) {
  return state.transactions.filter(tx => tx.date && tx.date.startsWith(month));
}

export function getCurrentMonthTx() {
  return getMonthTransactions(state.currentMonth);
}

export function getTotals(txList) {
  let income = 0, expenseCard = 0, expenseCash = 0;
  txList.forEach(tx => {
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'income') {
      income += amt;
    } else {
      if (tx.method === 'cash') expenseCash += amt;
      else expenseCard += amt;
    }
  });
  return {
    income,
    expenseCard,
    expenseCash,
    totalExpense: expenseCard + expenseCash,
    balance: income - (expenseCard + expenseCash),
  };
}

export function getTotalsByUser(txList) {
  // Returns { 1: totals, 2: totals, 3: totals }
  const result = {};
  [1, 2, 3].forEach(uid => {
    const userTx = txList.filter(tx => Number(tx.userId) === uid);
    result[uid] = getTotals(userTx);
  });
  return result;
}

export function getExpensesByCategory(txList) {
  const map = {};
  txList
    .filter(tx => tx.type === 'expense')
    .forEach(tx => {
      const key = tx.category || 'misc';
      if (!map[key]) map[key] = { id: key, amount: 0, color: tx.categoryColor || '#94A3B8', emoji: tx.categoryEmoji || '💸', label: tx.categoryLabel || key };
      map[key].amount += Number(tx.amount) || 0;
    });
  return Object.values(map).sort((a, b) => b.amount - a.amount);
}

export function applyFilters(txList) {
  const { userId, type, search, dateFrom, dateTo } = state.filter;
  return txList.filter(tx => {
    if (userId !== 'all' && Number(tx.userId) !== Number(userId)) return false;
    if (type !== 'all' && tx.type !== type) return false;
    if (search) {
      const q = search.toLowerCase();
      const haystack = `${tx.categoryLabel || ''} ${tx.note || ''} ${tx.amount}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (dateFrom && tx.date < dateFrom) return false;
    if (dateTo   && tx.date > dateTo)   return false;
    return true;
  });
}
