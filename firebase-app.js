// firebase-app.js — Firebase ile konuşan yardımcı katman
/* global firebase, firebaseConfig */

// Firebase'i başlat
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db   = firebase.firestore();

// Anonim giriş (her cihaz kendi UID'sine sahip olacak)
function ensureAuth() {
  return new Promise((resolve, reject) => {
    if (auth.currentUser) return resolve(auth.currentUser);

    const unsub = auth.onAuthStateChanged((user) => {
      if (user) {
        unsub();
        resolve(user);
      }
    });

    auth.signInAnonymously().catch(err => {
      console.error('Anonim giriş hatası:', err);
      reject(err);
    });
  });
}

// Oda oluştur
async function createRoom(roomId) {
  const user = await ensureAuth();
  await db.collection('rooms').doc(roomId).set({
    createdAt: Date.now(),
    members: firebase.firestore.FieldValue.arrayUnion(user.uid)
  }, { merge: true });
}

// Odaya katıl
async function joinRoom(roomId) {
  const user = await ensureAuth();
  await db.collection('rooms').doc(roomId).set({
    members: firebase.firestore.FieldValue.arrayUnion(user.uid)
  }, { merge: true });
}

// Mesajları canlı dinle
function subscribeRoom(roomId, onMessage) {
  return db.collection('rooms')
    .doc(roomId)
    .collection('messages')
    .orderBy('ts', 'asc')
    .onSnapshot((snap) => {
      snap.docChanges().forEach((chg) => {
        if (chg.type === 'added') {
          const d = chg.doc.data();
          const mine = !!(auth.currentUser && d.uid === auth.currentUser.uid);
          onMessage(d.text, mine, d.ts || Date.now());
        }
      });
    }, (err) => {
      console.error('subscribeRoom error:', err);
    });
}

// Mesaj gönder
async function sendToCloud(roomId, text) {
  const user = await ensureAuth();
  const ref = db.collection('rooms').doc(roomId).collection('messages');
  await ref.add({
    text: String(text),
    uid: user.uid,
    ts: Date.now()
  });
}

// Global obje
window.chatApi = { ensureAuth, createRoom, joinRoom, subscribeRoom, sendToCloud };

console.log('[firebase-app] hazır');
