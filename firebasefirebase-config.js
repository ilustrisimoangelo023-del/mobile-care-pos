/* =====================================================================
   MOBILE CARE POS - Firebase Configuration
   =====================================================================
   SAFE to expose publicly: apiKey, authDomain, projectId, appId, etc.
   NEVER put here: Gmail password, SMTP, service-account JSON, admin SDK key.
   ===================================================================== */

const firebaseConfig = {
  apiKey:            "PASTE_YOUR_API_KEY",
  authDomain:        "PASTE_YOUR_PROJECT.firebaseapp.com",
  projectId:         "PASTE_YOUR_PROJECT_ID",
  storageBucket:     "PASTE_YOUR_PROJECT.appspot.com",
  messagingSenderId: "PASTE_SENDER_ID",
  appId:             "PASTE_APP_ID"
};

// Primary app (normal sessions)
firebase.initializeApp(firebaseConfig);

// Secondary app — used ONLY to create Cashier accounts WITHOUT
// signing the current Admin out. (Firebase SDK limitation.)
const secondaryApp = firebase.initializeApp(firebaseConfig, "Secondary");

const auth = firebase.auth();
const db   = firebase.firestore();

// Optional: keep Firestore cache from stalling
db.settings({ ignoreUndefinedProperties: true });