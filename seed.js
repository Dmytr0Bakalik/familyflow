// ============================================================
// FAMILYFLOW — Data Seeder
// Runs in browser console or Node.js
// Usage: paste into browser console at familyflow-indol.vercel.app
//        OR: node seed.js (needs node-fetch installed)
// ============================================================

const DB_URL = "https://familyflow-b7749-default-rtdb.europe-west1.firebasedatabase.app";

// User IDs: 1=Dmytro, 2=Markian, 3=Mama
// Methods: 'card' | 'cash'
// Types: 'expense' | 'income'
// Categories: food, online, health, housing, ticket, misc, clothes, extra, salary, bonus, other_in

const TRANSACTIONS = [
  // ===== БЕРЕЗЕНЬ 2026 =====
  // 02.03
  { date:'2026-03-02', amount:53.18, type:'expense', category:'food',    categoryEmoji:'🍔', categoryLabel:'Їжа',            method:'card', userId:1 },
  { date:'2026-03-02', amount:8.20,  type:'expense', category:'health',  categoryEmoji:'🏥', categoryLabel:'Здоровʼя',       method:'card', userId:1 },
  // 07.03
  { date:'2026-03-07', amount:53.18, type:'expense', category:'food',    categoryEmoji:'🍔', categoryLabel:'Їжа',            method:'card', userId:1 },
  { date:'2026-03-07', amount:8.20,  type:'expense', category:'health',  categoryEmoji:'🏥', categoryLabel:'Здоровʼя',       method:'card', userId:1 },
  { date:'2026-03-07', amount:103.00,type:'expense', category:'housing', categoryEmoji:'🏠', categoryLabel:'Квартира',       method:'card', userId:1 },
  // 08.03
  { date:'2026-03-08', amount:46.69, type:'expense', category:'food',    categoryEmoji:'🍔', categoryLabel:'Їжа',            method:'card', userId:1 },
  { date:'2026-03-08', amount:17.50, type:'expense', category:'extra',   categoryEmoji:'➕', categoryLabel:'Додаткові',      method:'card', userId:1 },
  // 09.03
  { date:'2026-03-09', amount:28.79, type:'expense', category:'food',    categoryEmoji:'🍔', categoryLabel:'Їжа',            method:'card', userId:1 },
  // 13.03
  { date:'2026-03-13', amount:94.38, type:'expense', category:'food',    categoryEmoji:'🍔', categoryLabel:'Їжа',            method:'card', userId:1 },
  { date:'2026-03-13', amount:11.10, type:'expense', category:'health',  categoryEmoji:'🏥', categoryLabel:'Здоровʼя',       method:'card', userId:1 },
  // 14.03
  { date:'2026-03-14', amount:136.00,type:'expense', category:'extra',   categoryEmoji:'➕', categoryLabel:'Додаткові',      method:'card', userId:1 },
  { date:'2026-03-14', amount:83.99, type:'income',  category:'other_in',categoryEmoji:'💰', categoryLabel:'Інший дохід',    method:'card', userId:1 },
  // 15.03
  { date:'2026-03-15', amount:18.38, type:'expense', category:'food',    categoryEmoji:'🍔', categoryLabel:'Їжа',            method:'card', userId:1 },
  { date:'2026-03-15', amount:19.88, type:'expense', category:'health',  categoryEmoji:'🏥', categoryLabel:'Здоровʼя',       method:'card', userId:1 },
  // 16.03
  { date:'2026-03-16', amount:138.00,type:'expense', category:'extra',   categoryEmoji:'➕', categoryLabel:'Додаткові',      method:'card', userId:1 },
  // 17.03
  { date:'2026-03-17', amount:80.00, type:'expense', category:'extra',   categoryEmoji:'➕', categoryLabel:'Додаткові',      method:'card', userId:1 },
  // 18.03
  { date:'2026-03-18', amount:7.22,  type:'expense', category:'food',    categoryEmoji:'🍔', categoryLabel:'Їжа',            method:'card', userId:1 },
  { date:'2026-03-18', amount:9.00,  type:'expense', category:'extra',   categoryEmoji:'➕', categoryLabel:'Додаткові',      method:'card', userId:1 },
  // 19.03
  { date:'2026-03-19', amount:80.00, type:'expense', category:'extra',   categoryEmoji:'➕', categoryLabel:'Додаткові',      method:'card', userId:1 },
  // 20.03
  { date:'2026-03-20', amount:18.75, type:'expense', category:'food',    categoryEmoji:'🍔', categoryLabel:'Їжа',            method:'card', userId:1 },
  // 21.03
  { date:'2026-03-21', amount:76.17, type:'expense', category:'online',  categoryEmoji:'🛒', categoryLabel:'Онлайн покупки', method:'card', userId:1 },
  { date:'2026-03-21', amount:1.00,  type:'expense', category:'extra',   categoryEmoji:'➕', categoryLabel:'Додаткові',      method:'card', userId:1 },
  { date:'2026-03-21', amount:518.00,type:'income',  category:'salary',  categoryEmoji:'💼', categoryLabel:'Зарплата',       method:'card', userId:1 },
  // 23.03
  { date:'2026-03-23', amount:45.93, type:'expense', category:'food',    categoryEmoji:'🍔', categoryLabel:'Їжа',            method:'card', userId:1 },
  { date:'2026-03-23', amount:42.00, type:'expense', category:'online',  categoryEmoji:'🛒', categoryLabel:'Онлайн покупки', method:'card', userId:1 },
  // 24.03
  { date:'2026-03-24', amount:26.93, type:'expense', category:'food',    categoryEmoji:'🍔', categoryLabel:'Їжа',            method:'card', userId:1 },
  { date:'2026-03-24', amount:102.00,type:'expense', category:'online',  categoryEmoji:'🛒', categoryLabel:'Онлайн покупки', method:'card', userId:1 },
  { date:'2026-03-24', amount:5.50,  type:'expense', category:'ticket',  categoryEmoji:'🎫', categoryLabel:'Тікет',          method:'card', userId:1 },
  { date:'2026-03-24', amount:48.97, type:'expense', category:'misc',    categoryEmoji:'🪙', categoryLabel:'Дрібниці',       method:'cash', userId:1 },
  // 25.03
  { date:'2026-03-25', amount:23.01, type:'expense', category:'food',    categoryEmoji:'🍔', categoryLabel:'Їжа',            method:'card', userId:1 },
  { date:'2026-03-25', amount:34.99, type:'expense', category:'ticket',  categoryEmoji:'🎫', categoryLabel:'Тікет',          method:'card', userId:1 },
  { date:'2026-03-25', amount:136.00,type:'income',  category:'other_in',categoryEmoji:'💰', categoryLabel:'Інший дохід',    method:'card', userId:1 },
  // 26.03
  { date:'2026-03-26', amount:20.00, type:'expense', category:'extra',   categoryEmoji:'➕', categoryLabel:'Додаткові',      method:'cash', userId:1 },
  // 27.03
  { date:'2026-03-27', amount:8.29,  type:'expense', category:'food',    categoryEmoji:'🍔', categoryLabel:'Їжа',            method:'card', userId:1 },
  // 29.03
  { date:'2026-03-29', amount:29.68, type:'expense', category:'food',    categoryEmoji:'🍔', categoryLabel:'Їжа',            method:'card', userId:1 },
  { date:'2026-03-29', amount:22.99, type:'expense', category:'extra',   categoryEmoji:'➕', categoryLabel:'Додаткові',      method:'card', userId:1 },

  // ===== КВІТЕНЬ 2026 — додай свої =====
  // (вставити після того як юзер скине дані)
];

async function seed() {
  let ok = 0, fail = 0;
  for (const tx of TRANSACTIONS) {
    try {
      const res = await fetch(`${DB_URL}/transactions.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...tx, createdAt: Date.now() + ok })
      });
      const data = await res.json();
      if (data.name) { ok++; console.log(`✅ ${tx.date} ${tx.category} ${tx.amount}€`); }
      else { fail++; console.error('❌', data); }
    } catch(e) { fail++; console.error('❌', e.message); }
    await new Promise(r => setTimeout(r, 80)); // rate limit
  }
  console.log(`\n🎉 Done! ${ok} imported, ${fail} failed`);
}

seed();
