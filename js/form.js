// ============================================================
// FAMILYFLOW — FORM (Add / Edit Transaction + Custom Category)
// ============================================================

import { t } from './i18n.js';
import { getCurrentUser } from './auth.js';
import { USERS, getAllCategories, getCategoryById, COLOR_PALETTE, CURRENCY, getAvatarHTML, SUBCATEGORIES } from './config.js';
import { addTransaction, updateTransaction, saveCustomCategory } from './storage.js';
import { showToast } from './ui.js';

// Category note hints (UA)
const CAT_HINTS = {
  food:    'Напр.: обід з другом, Макдак...',
  online:  'Напр.: Amazon, Rozetka...',
  health:  'Напр.: аптека, стоматолог...',
  housing: 'Напр.: оренда, комуналка...',
  ticket:  'Напр.: кіно, концерт...',
  misc:    'Напр.: дрібні покупки...',
  clothes: 'Напр.: куртка, кросівки...',
  extra:   'Напр.: подарунок, непередбачене...',
  salary:  'Напр.: зарплата за квітень...',
  sidejob: 'Напр.: фріланс проект...',
  bonus:   'Напр.: квартальний бонус...',
  other_in:'Напр.: продаж речей...',
};

let _editingId = null;
let _currentType = 'expense'; // 'expense' | 'income'
let _selectedCategory = null;
let _selectedColor = COLOR_PALETTE[0];
let _selectedEmoji = '📁';
let _selectedUserId = null; // null = use current user
let _presetDate     = null; // Set when opening from calendar

// ---- Open modal to add new ----
export function openAddModal(defaultType = 'expense', presetDate = null) {
  _editingId = null;
  _currentType = defaultType;
  _selectedCategory = null;
  _presetDate = presetDate; // e.g. '2026-06-03' from calendar
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

    <!-- Who (user picker) -->
    <div class="form-group">
      <label class="form-label">Для кого</label>
      <div class="user-picker" id="userPicker">
        ${USERS.map(u => `
          <button class="user-pick-btn ${(_selectedUserId || getCurrentUser()?.id) === u.id ? 'active' : ''}" data-uid="${u.id}">
            <span class="user-pick-avatar">${getAvatarHTML(u.id, 28)}</span>
            <span class="user-pick-name">${u.name}</span>
          </button>
        `).join('')}
      </div>
    </div>

    <!-- Date -->
    <div class="form-group">
      <label class="form-label" data-i18n="add_date">${t('add_date')}</label>
      <input type="date" id="formDate" class="form-input"
             value="${tx?.date || _presetDate || today}" max="${today}">
    </div>

    <!-- Note -->
    <div class="form-group">
      <label class="form-label" data-i18n="add_note">${t('add_note')}</label>
      <input type="text" id="formNote" class="form-input"
             placeholder="${t('add_note_placeholder')}"
             value="${tx?.note || ''}">
    </div>
  `;

  // Init selected user
  if (!_selectedUserId) _selectedUserId = getCurrentUser()?.id || 1;
  if (tx?.userId) _selectedUserId = Number(tx.userId);

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

  // Wire user picker
  document.querySelectorAll('.user-pick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.user-pick-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _selectedUserId = Number(btn.dataset.uid);
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

  // Save button — always restore visibility (calendar day-modal may have hidden it)
  const saveBtn = document.getElementById('modalSaveBtn');
  if (saveBtn) {
    saveBtn.style.display = '';
    saveBtn.onclick = _handleSave;
    const saveLabelEl = saveBtn.querySelector('span') || saveBtn;
    saveLabelEl.textContent = t('add_save');
  }

  // Cancel button — restore text
  const cancelBtn = document.getElementById('modalCancelBtn');
  if (cancelBtn) cancelBtn.textContent = t('add_cancel');

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
      const catId = btn.dataset.catid;
      const subs  = SUBCATEGORIES[catId];

      if (subs && subs.length) {
        // Has subcategories → animate grid out, show store picker
        _selectedCategory = catId;
        _showStorePicker(catId, subs, grid);
      } else {
        // No subcategories → just select
        grid.querySelectorAll('.cat-chip').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        _selectedCategory = catId;
        document.getElementById('subcatWrap')?.remove();
        const noteEl = document.getElementById('formNote');
        if (noteEl && !noteEl.value) noteEl.placeholder = CAT_HINTS[catId] || t('add_note_placeholder');
      }
    });
  });

  // If already selected and has subcategories, show picker
  if (_selectedCategory && SUBCATEGORIES[_selectedCategory]?.length) {
    _showStorePicker(_selectedCategory, SUBCATEGORIES[_selectedCategory], grid, true /* instant */);
  }
}

// ---- Store Picker (animated overlay replacing the category grid) ----
function _showStorePicker(catId, subs, grid, instant = false) {
  // Remove old picker
  document.getElementById('storePicker')?.remove();
  document.getElementById('subcatWrap')?.remove();

  const catGroup = grid.closest('.form-group');
  const catObj   = getAllCategories(_currentType).find(c => c.id === catId);
  const catLabel = catObj ? (catObj.labelKey ? t(catObj.labelKey) : catObj.label) : catId;
  const catEmoji = catObj?.emoji || '';

  // Build store chips HTML
  const chipsHTML = subs.map(sub => {
    const name    = sub.name;
    const color   = sub.color || '#94A3B8';
    const logoEl  = sub.logo
      ? `<img src="${sub.logo}" class="subcat-logo-img"
              onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" alt="${name}">`
      : '';
    const emojiEl = sub.emoji
      ? `<span class="subcat-logo-emoji" style="background:${color}22;color:${color}">${sub.emoji}</span>`
      : '';
    const fallback = sub.logo
      ? `<span class="subcat-logo-emoji" style="display:none;background:${color}22;color:${color}">🏪</span>`
      : '';
    return `
      <button class="subcat-chip subcat-logo-chip" type="button" data-name="${name}" style="--chip-color:${color}">
        <div class="subcat-logo-wrap">${logoEl}${fallback}${emojiEl}</div>
        <span class="subcat-chip-name">${name}</span>
      </button>`;
  }).join('');

  const picker = document.createElement('div');
  picker.id = 'storePicker';
  picker.className = 'store-picker-wrap';
  picker.style.opacity = instant ? '1' : '0';
  picker.style.transform = instant ? '' : 'translateY(8px)';
  picker.innerHTML = `
    <div class="store-picker-header">
      <button class="store-back-btn" type="button" id="storeBackBtn">← Категорії</button>
      <span class="store-picker-title">${catEmoji} ${catLabel}</span>
      <div class="store-selected-badge" id="storeSelectedBadge" style="display:none"></div>
    </div>
    <div class="subcat-chips">${chipsHTML}
      <button class="subcat-chip subcat-chip--custom" type="button" id="subcatCustomBtn">
        <div class="subcat-logo-wrap"><span class="subcat-logo-emoji" style="background:var(--accent-dim);color:var(--accent)">✏️</span></div>
        <span class="subcat-chip-name">Своє</span>
      </button>
    </div>`;

  // Slide out category grid, show picker
  if (!instant) {
    catGroup.style.transition = 'opacity 0.2s, transform 0.2s';
    catGroup.style.opacity = '0';
    catGroup.style.transform = 'translateY(-6px)';
  }

  setTimeout(() => {
    catGroup.style.display = 'none';
    // Also hide "add cat" button
    document.getElementById('btnAddCategory')?.closest('.form-group')?.style.setProperty('display', 'none');
    catGroup.after(picker);

    requestAnimationFrame(() => {
      picker.style.transition = 'opacity 0.25s, transform 0.25s';
      picker.style.opacity = '1';
      picker.style.transform = 'translateY(0)';
    });
  }, instant ? 0 : 200);

  // Wire: Back button
  picker.querySelector('#storeBackBtn')?.addEventListener('click', () => {
    picker.remove();
    catGroup.style.display = '';
    catGroup.style.opacity = '0';
    catGroup.style.transform = 'translateY(-6px)';
    document.getElementById('btnAddCategory')?.closest('.form-group')?.style.setProperty('display', '');
    requestAnimationFrame(() => {
      catGroup.style.opacity = '1';
      catGroup.style.transform = 'translateY(0)';
    });
    // Deselect category
    _selectedCategory = null;
    catGroup.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('selected'));
  });

  // Wire: Store chip click
  picker.querySelectorAll('.subcat-logo-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      picker.querySelectorAll('.subcat-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const noteEl = document.getElementById('formNote');
      if (noteEl) noteEl.value = btn.dataset.name;
      const badge = document.getElementById('storeSelectedBadge');
      if (badge) { badge.style.display = 'inline-flex'; badge.textContent = `✓ ${btn.dataset.name}`; }
    });
  });

  // Wire: Custom input
  picker.querySelector('#subcatCustomBtn')?.addEventListener('click', () => {
    picker.querySelectorAll('.subcat-chip').forEach(b => b.classList.remove('active'));
    const noteEl = document.getElementById('formNote');
    if (noteEl) { noteEl.value = ''; noteEl.focus(); }
  });
}

// ---- Subcategory chips (legacy - now replaced by store picker) ----
function _renderSubcategories(catId) {
  // No longer used directly — handled inside _showStorePicker
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
    userId: _selectedUserId || user?.id || 1,
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
  // Restore Save button (may have been hidden by calendar day-modal)
  const saveBtn = document.getElementById('modalSaveBtn');
  if (saveBtn) saveBtn.style.display = '';
  // Restore Cancel button text
  const cancelBtn = document.getElementById('modalCancelBtn');
  if (cancelBtn) cancelBtn.textContent = t('add_cancel');
}

// ---- Setup modal close button ----
export function setupModal() {
  document.getElementById('modalCloseBtn')?.addEventListener('click', closeModal);
  document.getElementById('modalCancelBtn')?.addEventListener('click', closeModal);
  document.getElementById('modalBackdrop')?.addEventListener('click', e => {
    if (e.target === document.getElementById('modalBackdrop')) closeModal();
  });
}
