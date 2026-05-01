// ============================================================
// FAMILYFLOW — Firebase Configuration
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey:            "AIzaSyA1HRF_CNEasymH59_aiKZJM63OALG0jIY",
  authDomain:        "familyflow-b7749.firebaseapp.com",
  projectId:         "familyflow-b7749",
  storageBucket:     "familyflow-b7749.firebasestorage.app",
  messagingSenderId: "749704271244",
  appId:             "1:749704271244:web:db074d27a4f967fc63b2a9",
  measurementId:     "G-DMFQ2PL2L7",
  databaseURL: "https://familyflow-b7749-default-rtdb.europe-west1.firebasedatabase.app",
};

let _app = null;
let _db  = null;

export function getFirebaseApp() { return _app; }
export function getFirebaseDb()  { return _db; }

export async function initFirebaseApp() {
  try {
    _app = initializeApp(firebaseConfig);
    _db  = getDatabase(_app);
    console.log('[Firebase] ✅ Connected');
    return true;
  } catch (e) {
    console.warn('[Firebase] ❌ Error:', e.message);
    return false;
  }
}
