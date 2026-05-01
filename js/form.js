// ============================================================
// FAMILYFLOW — FORM (Add / Edit Transaction + Custom Category)
// ============================================================

import { t } from './i18n.js';
import { getCurrentUser } from './auth.js';
import { getAllCategories, getCategoryById, COLOR_PALETTE, CURRENCY } from './config.js';
import { addTransaction, updateTransaction, saveCustomCategory } from './storage.js';
import { showToast } from './ui.js';

let _editingId = null;
let _currentType = 'expense'; // 'expense' | 'income'
let _selectedCategory = null;
let _selectedColor = COLOR_PALETTE[0];
let _selectedEmoji = '📁';

// ---- Open modal to add new ----
export function openAddModal(defaultType = 'expense') {
  _editingId = null;
  _currentType = defaultType;
  _selectedCategory = null;
  _renderModal();
}

// ---- Open modal to edit existing ----
export function openEditModal(tx) {
  _editingId = tx.id;
  _currentType = tx.type || 'expense';
  _selectedCategory = tx.category || null;
  _renderModal(tx);
}

// ---- Render modal content ----
function _renderModal(tx = null) {
  const backdrop = document.getElementById('modalBackdrop');
  const body     = document.getElementById('modalBody');
  if (!backdrop || !body) return;

  const isEdit = !!tx;
  const today  = new Date().toISOString().split('T')[0];

  body.innerHTML = `
    <!-- Type Toggle -->
    <div class="form-type-toggle">
      <button class="type-btn ${_currentType === 'expense' ? 'active' : ''}" 
              id="btnTypeExpense" data-i18n="add_expense">${t('add_expense')}</button>
      <button class="type-btn ${_currentType === 'income' ? 'active' : ''}" 
              id="btnTypeIncome" data-i18n="add_income">${t('add_income')}</button>
    </div>

    <!-- Amount -->
    <div class="form-group">
      <label class="form-label" data-i18n="add_amount">${t('add_amount')} (${CURRENCY})</label>
      <div class="amount-input-wrapper">
        <span class="amount-currency">€</span>
        <input type="number" id="formAmount" class="form-input amount-input"
               inputmode="decimal" step="0.01" min="0"
               placeholder="0,00"
               value="${tx ? tx.amount : ''}">
      </div>
    </div>

    <!-- Category -->
    <div class="form-group">
      <label class="form-label" data-i18n="add_category">${t('add_category')}</label>
      <div class="category-grid" id="categoryGrid"></div>
      <button class="btn btn-ghost btn-sm add-cat-btn" id="btnAddCategory">
        ＋ ${t('add_custom_category')}
      </button>
    </div>

    <!-- Payment method (only for expenses) -->
    <div class="form-group" id="methodGroup" ${_currentType === 'income' ? 'style="display:none"' : ''}>
      <label class="form-label" data-i18n="add_method">${t('add_method')}</label>
      <div class="method-toggle">
        <button class="method-btn ${!tx || tx.method !== 'cash' ? 'active' : ''}" 
                data-method="card" id="btnCard">
          💳 ${t('add_method_card')}
        </button>
        <button class="method-btn ${tx?.method === 'cash' ? 'active' : ''}" 
                data-method="cash" id="btnCash">
          💵 ${t('add_method_cash')}
        </button>
      </div>
    </div>

    <!-- Date -->
    <div class="form-group">
      <label class="form-label" data-i18n="add_date">${t('add_date')}</label>
      <input type="date" id="formDate" class="form-input"
             value="${tx?.date || today}" max="${today}">
    </div>

    <!-- Note -->
    <div class="form-group">
      <label class="form-label" data-i18n="add_note">${t('add_note')}</label>
      <input type="text" id="formNote" class="form-input"
             placeholder="${t('add_note_placeholder')}"
             value="${tx?.note || ''}">
    </div>
  `;

  // Render category grid
  _renderCategoryGrid(tx?.category || null);

  // Wire type toggle
  document.getElementById('btnTypeExpense')?.addEventListener('click', () => {
    _currentType = 'expense';
    _selectedCategory = null;
    _renderModal({ ...(_getFormData()), type: 'expense', amount: document.getElementById('formAmount')?.value });
  });
  document.getElementById('btnTypeIncome')?.addEventListener('click', () => {
    _currentType = 'income';
    _selectedCategory = null;
    _renderModal({ ...(_getFormData()), type: 'income', amount: document.getElementById('formAmount')?.value });
  });

  // Wire method toggle
  document.querySelectorAll('.method-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Add custom category button
  document.getElementById('btnAddCategory')?.addEventListener('click', _openCustomCategoryForm);

  // Title
  const titleEl = document.getElementById('modalTitle');
  if (titleEl) {
    titleEl.textContent = isEdit ? t('add_title_edit')
      : (_currentType === 'expense' ? t('add_title_expense') : t('add_title_income'));
  }

  // Save button
  const saveBtn = document.getElementById('modalSaveBtn');
  if (saveBtn) {
    saveBtn.onclick = _handleSave;
    const saveLabelEl = saveBtn.querySelector('span') || saveBtn;
    saveLabelEl.textContent = t('add_save');
  }

  backdrop.style.display = 'flex';
  setTimeout(() => document.getElementById('formAmount')?.focus(), 100);
}

// ---- Category grid ----
function _renderCategoryGrid(selectedId) {
  const grid = document.getElementById('categoryGrid');
  if (!grid) return;
  const cats = getAllCategories(_currentType);
  _selectedCategory = selectedId || null;

  grid.innerHTML = cats.map(cat => {
    const label = cat.labelKey ? t(cat.labelKey) : cat.label || cat.id;
    const isSelected = cat.id === _selectedCategory;
    return `
      <button class="cat-chip ${isSelected ? 'selected' : ''}" 
              data-catid="${cat.id}"
              style="--cat-color:${cat.color}">
        <span class="cat-chip-emoji">${cat.emoji}</span>
        <span class="cat-chip-label">${label}</span>
      </button>
    `;
  }).join('');

  grid.querySelectorAll('.cat-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      grid.querySelectorAll('.cat-chip').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      _selectedCategory = btn.dataset.catid;
    });
  });
}

// ---- Custom category form (inline) ----
function _openCustomCategoryForm() {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.style.display = 'flex';
  backdrop.style.zIndex = '1000';

  const colors = COLOR_PALETTE.map((c, i) => `
    <button class="color-swatch ${i === 0 ? 'selected' : ''}" 
            data-color="${c}" style="background:${c}" title="${c}"></button>
  `).join('');

  const emojis = ['🍔','🛒','🏥','🏠','🎫','🪙','👕','➕','💼','💻','🎯','💰',
                  '🚗','✈️','🎬','📚','🛡️','💳','🎁','🏋️','🌟','🔧','🎵','🎮',
                  '🐾','🌿','☕','🍕','🎂','🎪'].map(e => `
    <button class="emoji-btn" data-emoji="${e}">${e}</button>
  `).join('');

  backdrop.innerHTML = `
    <div class="modal-panel">
      <div class="modal-header">
        <h2 class="modal-title">${t('add_custom_category')}</h2>
        <button class="icon-btn" id="closeCustomCat">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">${t('add_custom_name')}</label>
          <input type="text" id="customCatName" class="form-input" placeholder="${t('add_custom_name')}">
        </div>
        <div class="form-group">
          <label class="form-label">${t('add_custom_emoji')}</label>
          <div class="emoji-picker" id="emojiPicker">${emojis}</div>
          <div id="selectedEmoji" style="font-size:2rem;text-align:center;margin-top:8px">🍔</div>
        </div>
        <div class="form-group">
          <label class="form-label">${t('add_custom_color')}</label>
          <div class="color-palette" id="colorPalette">${colors}</div>
        </div>
        <div class="form-group">
          <label class="form-label">Тип</label>
          <div class="method-toggle">
            <button class="method-btn ${_currentType === 'expense' ? 'active' : ''}" data-type="expense">${t('add_expense')}</button>
            <button class="method-btn ${_currentType === 'income' ? 'active' : ''}" data-type="income">${t('add_income')}</button>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="cancelCustomCat">${t('add_cancel')}</button>
        <button class="btn btn-primary" id="saveCustomCat">${t('add_custom_save')}</button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  let selColor = COLOR_PALETTE[0];
  let selEmoji = '🍔';
  let selType  = _currentType;

  // Color picker
  backdrop.querySelectorAll('.color-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      backdrop.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selColor = btn.dataset.color;
    });
  });

  // Emoji picker
  backdrop.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      backdrop.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selEmoji = btn.dataset.emoji;
      const prev = backdrop.querySelector('#selectedEmoji');
      if (prev) prev.textContent = selEmoji;
    });
  });

  // Type toggle
  backdrop.querySelectorAll('.method-btn[data-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      backdrop.querySelectorAll('.method-btn[data-type]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selType = btn.dataset.type;
    });
  });

  backdrop.querySelector('#closeCustomCat')?.addEventListener('click', () => backdrop.remove());
  backdrop.querySelector('#cancelCustomCat')?.addEventListener('click', () => backdrop.remove());
  backdrop.querySelector('#saveCustomCat')?.addEventListener('click', async () => {
    const name = backdrop.querySelector('#customCatName')?.value?.trim();
    if (!name) return;
    const cat = {
      id: 'custom_' + Date.now(),
      label: name,
      emoji: selEmoji,
      color: selColor,
      type: selType,
      builtin: false,
    };
    await saveCustomCategory(cat);
    backdrop.remove();
    // Refresh category grid in main modal
    _renderCategoryGrid(_selectedCategory);
    showToast(t('saved_ok'));
  });
}

// ---- Save handler ----
async function _handleSave() {
  const amount   = parseFloat(document.getElementById('formAmount')?.value?.replace(',', '.'));
  const date     = document.getElementById('formDate')?.value;
  const note     = document.getElementById('formNote')?.value?.trim() || '';
  const method   = document.querySelector('.method-btn.active')?.dataset?.method || 'card';

  if (!amount || isNaN(amount) || amount <= 0) {
    showToast(t('err_amount'), 'error'); return;
  }
  if (!_selectedCategory) {
    showToast(t('err_category'), 'error'); return;
  }

  const cat  = getCategoryById(_selectedCategory);
  const user = getCurrentUser();

  const tx = {
    date,
    type: _currentType,
    method: _currentType === 'income' ? 'card' : method,
    category: _selectedCategory,
    categoryColor: cat?.color || '#94A3B8',
    categoryEmoji: cat?.emoji || '💸',
    categoryLabel: cat?.labelKey ? t(cat.labelKey) : (cat?.label || _selectedCategory),
    amount: Math.round(amount * 100) / 100,
    note,
    userId: user?.id || 1,
  };

  try {
    if (_editingId) {
      await updateTransaction(_editingId, tx);
    } else {
      await addTransaction(tx);
    }
    closeModal();
    showToast(t('saved_ok'));
  } catch (e) {
    console.error(e);
    showToast(t('err_firebase'), 'error');
  }
}

// ---- Get current form data (for type switch) ----
function _getFormData() {
  return {
    amount: document.getElementById('formAmount')?.value,
    date:   document.getElementById('formDate')?.value,
    note:   document.getElementById('formNote')?.value,
    method: document.querySelector('.method-btn.active')?.dataset?.method || 'card',
    category: _selectedCategory,
  };
}

// ---- Close modal ----
export function closeModal() {
  const backdrop = document.getElementById('modalBackdrop');
  if (backdrop) backdrop.style.display = 'none';
}

// ---- Setup modal close button ----
export function setupModal() {
  document.getElementById('modalCloseBtn')?.addEventListener('click', closeModal);
  document.getElementById('modalCancelBtn')?.addEventListener('click', closeModal);
  document.getElementById('modalBackdrop')?.addEventListener('click', e => {
    if (e.target === document.getElementById('modalBackdrop')) closeModal();
  });
}
