/* =====================================================================
   SAFE CHECKOUT — Firestore transaction
   RULE: cart stores productId. On checkout we re-read live stock,
   validate, then UPDATE the SAME product doc. Never create new product.
   ===================================================================== */

async function fbCheckout({ cart, cash, method, user }) {
  if (!cart || cart.length === 0) throw new Error("Cart is empty.");

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const rounded = Math.round(total * 100) / 100;
  if (cash < rounded) throw new Error("Insufficient cash.");

  const change = Math.round((cash - rounded) * 100) / 100;

  /* ---------- ATOMIC TRANSACTION ---------- */
  const result = await db.runTransaction(async tx => {

    // 1) Read every product by its STABLE productId
    const refs = cart.map(i => db.collection("products").doc(i.productId));
    const docs = await Promise.all(refs.map(r => tx.get(r)));

    // 2) Validate stock
    docs.forEach((doc, i) => {
      if (!doc.exists)
        throw new Error(`Product missing: ${cart[i].name}`);
      const stock = doc.data().stock || 0;
      if (stock < cart[i].quantity)
        throw new Error(
          `Insufficient stock for "${cart[i].name}" — only ${stock} left.`
        );
    });

    // 3) Deduct — UPDATE the existing doc (never create)
    docs.forEach((doc, i) => {
      tx.update(refs[i], {
        stock: (doc.data().stock || 0) - cart[i].quantity,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });

    // 4) Create sale document
    const saleRef = db.collection("sales").doc();
    tx.set(saleRef, {
      saleId: saleRef.id,
      cashierId: user.uid,
      cashierName: user.name,
      items: cart.map(i => ({
        productId: i.productId,
        productName: i.name,
        quantity: i.quantity,
        price: i.price,
        subtotal: Math.round(i.price * i.quantity * 100) / 100
      })),
      total: rounded,
      cash: cash,
      change: change,
      paymentMethod: method,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    return { saleId: saleRef.id, total: rounded, change };
  });

  return result;
}

/* Real-time sales listener */
function fbListenSales(cb) {
  return db.collection("sales")
           .orderBy("createdAt", "desc")
           .limit(200)
           .onSnapshot(snap => {
             const list = [];
             snap.forEach(d => list.push({ id: d.id, ...d.data() }));
             cb(list);
           });
}