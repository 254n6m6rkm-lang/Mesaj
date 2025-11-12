// firebase-app.js — Mesaj PWA için Firebase köprüsü (Compat SDK)
/* global firebase, firebaseConfig */

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

function ensureAuth() {
  return new Promise((resolve, reject) => {
    if (auth.currentUser) return resolve(auth.currentUser);
    const unsub = auth.onAuthStateChanged(() => {
      unsub();
      if (auth.currentUser) resolve(auth.currentUser);
      else reject(new Error("Auth failed"));
    });
    auth.signInAnonymously().catch(reject);
  });
}

async function createRoom(roomId, joinKey) {
  const user = await ensureAuth();
  await db.collection('rooms').doc(roomId).set({
    members: [user.uid],
    joinKey: joinKey || null
  }, { merge: true });
}

async function joinRoom(roomId, joinKey) {
  const user = await ensureAuth();
  const ref = db.collection('rooms').doc(roomId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error('Oda bulunamadı');
    const data = snap.data() || {};
    if (data.joinKey && data.joinKey !== joinKey) throw new Error('Davet anahtarı hatalı');
    const members = Array.from(new Set([...(data.members || []), user.uid]));
    tx.set(ref, { members }, { merge: true });
  });
}

async function getJoinKey(roomId) {
  const doc = await db.collection('rooms').doc(roomId).get();
  if (doc.exists) return (doc.data() && doc.data().joinKey) || '';
  return '';
}

function subscribeRoom(roomId, onMessage) {
  return db.collection('rooms').doc(roomId).collection('messages')
    .orderBy('ts','asc')
    .onSnapshot((snap) => {
      snap.docChanges().forEach((ch) => {
        if (ch.type === 'added') {
          const d = ch.doc.data();
          const mine = !!(auth.currentUser && d.uid === auth.currentUser.uid);
          onMessage(d.text, mine, d.ts || Date.now());
        }
      });
    }, (err) => console.error('subscribeRoom error:', err));
}

async function sendToCloud(roomId, text) {
  const user = await ensureAuth();
  await db.collection('rooms').doc(roomId).collection('messages').add({ text: String(text), uid: user.uid, ts: Date.now() });
}

window.firebaseBridge = { ensureAuth, createRoom, joinRoom, getJoinKey, subscribeRoom, sendToCloud };
console.log('[firebase-app] hazır: auth & firestore başlatıldı');
