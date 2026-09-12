/* =====================================================================
   Firebase Authentication + Role Authorization
   ===================================================================== */

const ALLOWED_ROLES = ["admin", "cashier"];

/* ---------- LOGIN ---------- */
async function fbLogin(email, password) {
  // Real Firebase Auth — invalid email or wrong password throws
  const cred = await auth.signInWithEmailAndPassword(email, password);
  const profile = await fbGetUserProfile(cred.user.uid);

  // Role must exist in Firestore. No random self-registered users.
  if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
    await auth.signOut();
    throw new Error("This account is not authorized for this POS.");
  }
  return profile;
}

/* ---------- LOGOUT ---------- */
async function fbLogout() { await auth.signOut(); }

/* ---------- FORGOT PASSWORD ---------- */
// Uses Firebase's secure built-in reset email (safer than custom OTP).
async function fbSendPasswordReset(email) {
  await auth.sendPasswordResetEmail(email);
}

/* ---------- PROFILE LOAD ---------- */
async function fbGetUserProfile(uid) {
  const snap = await db.collection("users").doc(uid).get();
  return snap.exists ? snap.data() : null;
}

/* ---------- ADMIN CREATES CASHIER (no self-registration) ----------
   Runs on the SECONDARY app so the signed-in Admin stays signed in. */
async function fbAdminCreateCashier(email, password, fullname) {
  const cred = await secondaryApp.auth()
    .createUserWithEmailAndPassword(email, password);

  await db.collection("users").doc(cred.user.uid).set({
    uid: cred.user.uid,
    name: fullname,
    email: email,
    role: "cashier",
    status: "offline",
    loginTime: null,
    lastLogout: null,
    lastActive: null,
    dateAdded: firebase.firestore.FieldValue.serverTimestamp()
  });

  await secondaryApp.auth().signOut();
  return cred.user.uid;
}

/* ---------- ADMIN DELETES CASHIER ---------- */
async function fbDeleteCashierProfile(uid) {
  await db.collection("users").doc(uid).delete();
}

/* ---------- STATUS HELPERS (used by cashier dashboard) ---------- */
async function fbUpdateCashierStatus(uid, status, loginTime, lastLogout, lastActive) {
  const patch = { status };
  if (loginTime  !== null && loginTime  !== undefined) patch.loginTime  = loginTime;
  if (lastLogout !== null && lastLogout !== undefined) patch.lastLogout = lastLogout;
  if (lastActive !== null && lastActive !== undefined) patch.lastActive = lastActive;
  await db.collection("users").doc(uid).set(patch, { merge: true });
}

/* ---------- LIVE LISTENERS ---------- */
function fbOnAuthChange(cb) {
  return auth.onAuthStateChanged(cb);
}
function fbListenCashiers(cb) {
  return db.collection("users")
           .where("role", "==", "cashier")
           .onSnapshot(snap => {
             const list = [];
             snap.forEach(d => list.push({ uid: d.id, ...d.data() }));
             cb(list);
           });
}