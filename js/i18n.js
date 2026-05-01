// ============================================================
// FAMILYFLOW — i18n (Ukrainian / German)
// ============================================================

export const TRANSLATIONS = {
  ua: {
    // App
    app_name: 'FamilyFlow',
    app_tagline: 'Сімейний трекер витрат',

    // Login
    login_title: 'Хто ти?',
    login_subtitle: 'Вибери свій профіль',

    // Navigation
    nav_home: 'Головна',
    nav_history: 'Історія',
    nav_analytics: 'Аналіз',
    nav_settings: 'Налаштування',

    // Dashboard
    dash_greeting_morning: 'Доброго ранку',
    dash_greeting_afternoon: 'Добрий день',
    dash_greeting_evening: 'Добрий вечір',
    dash_this_month: 'Цей місяць',
    dash_total_income: 'Дохід',
    dash_total_expenses: 'Витрати',
    dash_balance: 'Баланс',
    dash_card: 'Картка',
    dash_cash: 'Готівка',
    dash_recent: 'Останні витрати',
    dash_see_all: 'Всі →',
    dash_who_spent: 'Хто скільки витратив',
    dash_no_transactions: 'Ще немає витрат цього місяця',
    dash_add_first: 'Додай першу витрату!',

    // Add transaction
    add_expense: 'Витрата',
    add_income: 'Дохід',
    add_amount: 'Сума',
    add_category: 'Категорія',
    add_method: 'Спосіб оплати',
    add_method_card: 'Картка',
    add_method_cash: 'Готівка',
    add_date: 'Дата',
    add_note: 'Нотатка (необовʼязково)',
    add_note_placeholder: 'Наприклад: обід з другом...',
    add_save: 'Зберегти',
    add_cancel: 'Скасувати',
    add_title_expense: 'Нова витрата',
    add_title_income: 'Новий дохід',
    add_title_edit: 'Редагувати',
    add_custom_category: 'Нова категорія',
    add_custom_name: 'Назва категорії',
    add_custom_color: 'Колір',
    add_custom_emoji: 'Емодзі',
    add_custom_save: 'Створити категорію',

    // History
    history_title: 'Всі транзакції',
    history_filter_all: 'Всі',
    history_filter_mine: 'Мої',
    history_no_results: 'Нічого не знайдено',
    history_search: 'Пошук...',
    history_delete_confirm: 'Видалити цю транзакцію?',
    history_delete_yes: 'Так, видалити',
    history_delete_no: 'Скасувати',

    // Analytics
    analytics_title: 'Аналіз витрат',
    analytics_by_category: 'За категоріями',
    analytics_by_member: 'По членах сімʼї',
    analytics_expenses: 'Витрати',
    analytics_income: 'Доходи',
    analytics_this_month: 'Цей місяць',

    // Settings
    settings_title: 'Налаштування',
    settings_profile: 'Профіль',
    settings_switch_user: 'Змінити акаунт',
    settings_language: 'Мова',
    settings_theme: 'Тема',
    settings_theme_dark: 'Темна (зелена)',
    settings_theme_pink: 'Рожева (для мами)',
    settings_income: 'Мій дохід цього місяця',
    settings_income_card: 'По картці (€)',
    settings_income_cash: 'Готівка (€)',
    settings_income_save: 'Зберегти дохід',
    settings_categories: 'Мої категорії',
    settings_categories_add: 'Додати категорію',
    settings_firebase: 'Firebase (дані)',
    settings_firebase_status: 'Підключено',
    settings_firebase_error: 'Не підключено — перевір firebase-config.js',

    // Months
    month_0: 'Січень',
    month_1: 'Лютий',
    month_2: 'Березень',
    month_3: 'Квітень',
    month_4: 'Травень',
    month_5: 'Червень',
    month_6: 'Липень',
    month_7: 'Серпень',
    month_8: 'Вересень',
    month_9: 'Жовтень',
    month_10: 'Листопад',
    month_11: 'Грудень',

    // Categories — Expenses
    cat_food: 'Їжа',
    cat_online: 'Онлайн покупки',
    cat_health: 'Здоровʼя',
    cat_housing: 'Квартира',
    cat_ticket: 'Тікет',
    cat_misc: 'Дрібниці',
    cat_clothes: 'Одяг',
    cat_extra: 'Додаткові',
    // Categories — Income
    cat_salary: 'Зарплата',
    cat_sidejob: 'Підробіток',
    cat_bonus: 'Бонус',
    cat_other_income: 'Інший дохід',

    // Errors / status
    err_amount: 'Введи суму',
    err_category: 'Вибери категорію',
    err_firebase: 'Помилка підключення до Firebase',
    saved_ok: 'Збережено ✓',
    deleted_ok: 'Видалено',
    loading: 'Завантаження...',
  },

  de: {
    // App
    app_name: 'FamilyFlow',
    app_tagline: 'Familienausgaben-Tracker',

    // Login
    login_title: 'Wer bist du?',
    login_subtitle: 'Wähle dein Profil',

    // Navigation
    nav_home: 'Start',
    nav_history: 'Verlauf',
    nav_analytics: 'Analyse',
    nav_settings: 'Einstellungen',

    // Dashboard
    dash_greeting_morning: 'Guten Morgen',
    dash_greeting_afternoon: 'Guten Tag',
    dash_greeting_evening: 'Guten Abend',
    dash_this_month: 'Dieser Monat',
    dash_total_income: 'Einnahmen',
    dash_total_expenses: 'Ausgaben',
    dash_balance: 'Bilanz',
    dash_card: 'Karte',
    dash_cash: 'Bargeld',
    dash_recent: 'Letzte Ausgaben',
    dash_see_all: 'Alle →',
    dash_who_spent: 'Wer hat wie viel ausgegeben',
    dash_no_transactions: 'Noch keine Ausgaben diesen Monat',
    dash_add_first: 'Füge deine erste Ausgabe hinzu!',

    // Add transaction
    add_expense: 'Ausgabe',
    add_income: 'Einnahme',
    add_amount: 'Betrag',
    add_category: 'Kategorie',
    add_method: 'Zahlungsmethode',
    add_method_card: 'Karte',
    add_method_cash: 'Bargeld',
    add_date: 'Datum',
    add_note: 'Notiz (optional)',
    add_note_placeholder: 'z.B. Mittagessen mit Freund...',
    add_save: 'Speichern',
    add_cancel: 'Abbrechen',
    add_title_expense: 'Neue Ausgabe',
    add_title_income: 'Neue Einnahme',
    add_title_edit: 'Bearbeiten',
    add_custom_category: 'Neue Kategorie',
    add_custom_name: 'Kategoriename',
    add_custom_color: 'Farbe',
    add_custom_emoji: 'Emoji',
    add_custom_save: 'Kategorie erstellen',

    // History
    history_title: 'Alle Transaktionen',
    history_filter_all: 'Alle',
    history_filter_mine: 'Meine',
    history_no_results: 'Nichts gefunden',
    history_search: 'Suchen...',
    history_delete_confirm: 'Diese Transaktion löschen?',
    history_delete_yes: 'Ja, löschen',
    history_delete_no: 'Abbrechen',

    // Analytics
    analytics_title: 'Ausgabenanalyse',
    analytics_by_category: 'Nach Kategorien',
    analytics_by_member: 'Nach Familienmitglied',
    analytics_expenses: 'Ausgaben',
    analytics_income: 'Einnahmen',
    analytics_this_month: 'Dieser Monat',

    // Settings
    settings_title: 'Einstellungen',
    settings_profile: 'Profil',
    settings_switch_user: 'Konto wechseln',
    settings_language: 'Sprache',
    settings_theme: 'Design',
    settings_theme_dark: 'Dunkel (Grün)',
    settings_theme_pink: 'Hell (Rosa)',
    settings_income: 'Mein Monatseinkommen',
    settings_income_card: 'Per Karte (€)',
    settings_income_cash: 'Bargeld (€)',
    settings_income_save: 'Einkommen speichern',
    settings_categories: 'Meine Kategorien',
    settings_categories_add: 'Kategorie hinzufügen',
    settings_firebase: 'Firebase (Daten)',
    settings_firebase_status: 'Verbunden',
    settings_firebase_error: 'Nicht verbunden — prüfe firebase-config.js',

    // Months
    month_0: 'Januar',
    month_1: 'Februar',
    month_2: 'März',
    month_3: 'April',
    month_4: 'Mai',
    month_5: 'Juni',
    month_6: 'Juli',
    month_7: 'August',
    month_8: 'September',
    month_9: 'Oktober',
    month_10: 'November',
    month_11: 'Dezember',

    // Categories — Expenses
    cat_food: 'Essen',
    cat_online: 'Online-Einkäufe',
    cat_health: 'Gesundheit',
    cat_housing: 'Wohnung',
    cat_ticket: 'Ticket',
    cat_misc: 'Kleinigkeiten',
    cat_clothes: 'Kleidung',
    cat_extra: 'Sonstiges',
    // Categories — Income
    cat_salary: 'Gehalt',
    cat_sidejob: 'Nebenjob',
    cat_bonus: 'Bonus',
    cat_other_income: 'Andere Einnahmen',

    // Errors / status
    err_amount: 'Betrag eingeben',
    err_category: 'Kategorie wählen',
    err_firebase: 'Firebase-Verbindungsfehler',
    saved_ok: 'Gespeichert ✓',
    deleted_ok: 'Gelöscht',
    loading: 'Laden...',
  }
};

// ---- Current language state ----
let _currentLang = localStorage.getItem('ff_lang') || 'ua';

export function getLang() { return _currentLang; }

export function setLang(lang) {
  _currentLang = lang;
  localStorage.setItem('ff_lang', lang);
  document.documentElement.setAttribute('lang', lang === 'ua' ? 'uk' : 'de');
}

export function t(key) {
  return TRANSLATIONS[_currentLang]?.[key] ?? TRANSLATIONS['ua']?.[key] ?? key;
}

export function monthName(monthIndex) {
  return t(`month_${monthIndex}`);
}
