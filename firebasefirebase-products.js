/* =====================================================================
   Firestore Products — CENTRALIZED ONLINE STOCK
   Collection: products/{productId}
   productId = barcode (stable, unique, never changes)
   ===================================================================== */

/* Real-time products listener — every device sees the SAME stock. */
function fbListenProducts(cb) {
  return db.collection("products").onSnapshot(snap => {
    const list = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() }));
    cb(list);
  });
}

/* ADMIN: create new product */
async function fbAddProduct(p) {
  const id = p.barcode || p.id;
  if (!id) throw new Error("Product barcode is required.");
  await db.collection("products").doc(id).set({
    ...p,
    id,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

/* ADMIN: edit existing product */
async function fbUpdateProduct(id, patch) {
  await db.collection("products").doc(id).update({
    ...patch,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

/* ADMIN: delete product */
async function fbDeleteProduct(id) {
  await db.collection("products").doc(id).delete();
}

/* ADMIN: adjust stock by +/- n (never creates a new product) */
async function fbAdjustStock(id, delta) {
  await db.runTransaction(async tx => {
    const ref = db.collection("products").doc(id);
    const doc = await tx.get(ref);
    if (!doc.exists) throw new Error("Product not found.");
    const stock = doc.data().stock || 0;
    const newStock = Math.max(0, stock + delta);
    tx.update(ref, {
      stock: newStock,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  });
}

/* One-time seed from allProductsData (called only if collection empty). */
async function fbSeedProducts(seedList) {
  const batch = db.batch();
  seedList.forEach(p => {
    const id = p.barcode;
    const ref = db.collection("products").doc(id);
    batch.set(ref, {
      id,
      barcode: p.barcode,
      name: p.name,
      price: p.price,
      stock: p.stock,
      image: p.image || "",
      category: p.category || "others",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  });
  await batch.commit();
}

/* Repairs — same pattern */
function fbListenRepairs(cb) {
  return db.collection("repairs").onSnapshot(snap => {
    const list = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() }));
    cb(list);
  });
}
async function fbSaveRepair(r) {
  await db.collection("repairs").doc(r.id).set({
    ...r,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}
async function fbDeleteRepair(id) {
  await db.collection("repairs").doc(id).delete();
}