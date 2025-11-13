// firebase-app.js
// Firebase compat SDK'leri index.html'de yüklenmiş olmalı.
// firebase-config.js içinde firebaseConfig değişkeni tanımlı olmalı.

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

async function ensureAuth() {
  let user = auth.currentUser;
  if (!user) {
    const cred = await auth.signInAnonymously();
    user = cred.user;
  }
  return user;
}

function getRoomRef(roomId) {
  return db.collection('rooms').doc(roomId);
}

function getMessagesRef(roomId) {
  return getRoomRef(roomId).collection('messages');
}

// Kullanıcı adı localStorage'dan okunacak
function getLocalDisplayName() {
  try {
    return localStorage.getItem('displayName') || null;
  } catch {
    return null;
  }
}

async function createRoom(roomId) {
  const user = await ensureAuth();
  const displayName = getLocalDisplayName();

  const ref = getRoomRef(roomId);
  await ref.set(
    {
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdBy: user.uid,
      createdByName: displayName,
      members: firebase.firestore.FieldValue.arrayUnion(user.uid),
      lastActivity: firebase.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

async function joinRoom(roomId) {
  const user = await ensureAuth();
  const ref = getRoomRef(roomId);
  await ref.set(
    {
      members: firebase.firestore.FieldValue.arrayUnion(user.uid),
      lastJoinedAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastActivity: firebase.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

async function sendToCloud(roomId, text, type = "text", extra = {}) {
  const user = await ensureAuth();
  const displayName = getLocalDisplayName();

  const ref = getMessagesRef(roomId);
  const docRef = await ref.add({
    text,
    type,
    userId: user.uid,
    userName: displayName || extra.userName || "Anonim",
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    editedAt: null,
  });
  return docRef;
}

function subscribeRoom(roomId, cb) {
  let currentUser = auth.currentUser;
  auth.onAuthStateChanged((u) => {
    currentUser = u;
  });

  return getMessagesRef(roomId)
    .orderBy("createdAt", "asc")
    .onSnapshot((snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === "added" || change.type === "modified" || change.type === "removed") {
          const d = change.doc.data();
          const mine = currentUser && d.userId === currentUser.uid;
          cb({
            id: change.doc.id,
            changeType: change.type,
            text: d.text,
            type: d.type,
            userName: d.userName || "Anonim",
            mine,
            createdAt: d.createdAt ? d.createdAt.toDate() : new Date(),
            editedAt: d.editedAt ? d.editedAt.toDate() : null,
          });
        }
      });
    });
}

async function updateMessage(roomId, msgId, newText) {
  const user = await ensureAuth();
  const ref = getMessagesRef(roomId).doc(msgId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Mesaj bulunamadı");
  const data = snap.data();
  if (data.userId !== user.uid) throw new Error("Sadece kendi mesajını düzenleyebilirsin");
  await ref.update({
    text: newText,
    editedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

async function deleteMessage(roomId, msgId) {
  const user = await ensureAuth();
  const ref = getMessagesRef(roomId).doc(msgId);
  const snap = await ref.get();
  if (!snap.exists) return;
  const data = snap.data();
  if (data.userId !== user.uid) throw new Error("Sadece kendi mesajını silebilirsin");
  await ref.delete();
}

window.chatApi = {
  ensureAuth,
  createRoom,
  joinRoom,
  sendToCloud,
  subscribeRoom,
  updateMessage,
  deleteMessage,
};
