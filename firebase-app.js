// firebase-app.js
// Firebase compat SDK'leri index.html'de yüklenmiş olmalı.
// firebase-config.js içinde firebaseConfig tanımlı olmalı.

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

function getRoomRef(id) {
  return db.collection("rooms").doc(id);
}

function getMessagesRef(id) {
  return getRoomRef(id).collection("messages");
}

function getDisplayName() {
  try {
    return localStorage.getItem("displayName") || null;
  } catch {
    return null;
  }
}

// ODA OLUŞTUR (İSİMLİ) → ID döner
async function createRoomWithName(roomName) {
  const user = await ensureAuth();
  const name = roomName && roomName.trim() ? roomName.trim() : "Adsız oda";

  const docRef = await db.collection("rooms").add({
    roomName: name,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    createdBy: user.uid,
    members: [user.uid],
    messageCount: 0,
    lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
  });

  return docRef.id;
}

// Var olan odaya katıl
async function joinRoom(roomId) {
  const user = await ensureAuth();
  await getRoomRef(roomId).set(
    {
      members: firebase.firestore.FieldValue.arrayUnion(user.uid),
    },
    { merge: true }
  );
}

// Mesaj gönder + oda messageCount arttır
async function sendToCloud(roomId, text, type = "text") {
  const user = await ensureAuth();
  const displayName = getDisplayName() || "Anonim";

  const roomRef = getRoomRef(roomId);
  const msgRef = getMessagesRef(roomId);
  const batch = db.batch();
  const newMsgRef = msgRef.doc();
  const nowTS = firebase.firestore.FieldValue.serverTimestamp();

  batch.set(newMsgRef, {
    text: String(text),
    type,
    userId: user.uid,
    userName: displayName,
    createdAt: nowTS,
    editedAt: null,
  });

  batch.set(
    roomRef,
    {
      messageCount: firebase.firestore.FieldValue.increment(1),
      lastMessageAt: nowTS,
    },
    { merge: true }
  );

  await batch.commit();
}

// Tek bir odanın mesajlarını dinle
function subscribeRoom(roomId, cb) {
  let currentUser = auth.currentUser;
  auth.onAuthStateChanged((u) => {
    currentUser = u;
  });

  return getMessagesRef(roomId)
    .orderBy("createdAt", "asc")
    .onSnapshot((snap) => {
      snap.docChanges().forEach((change) => {
        const d = change.doc.data();
        const mine = currentUser && d.userId === currentUser.uid;
        cb({
          id: change.doc.id,
          changeType: change.type,
          text: d.text,
          type: d.type || "text",
          userName: d.userName || "Anonim",
          mine,
          createdAt: d.createdAt ? d.createdAt.toDate() : new Date(),
          editedAt: d.editedAt ? d.editedAt.toDate() : null,
        });
      });
    });
}

// Kullanıcının üye olduğu odaları dinle → oda listesi + unread için
function subscribeMyRooms(cb) {
  return auth.onAuthStateChanged((user) => {
    if (!user) return;
    db.collection("rooms")
      .where("members", "array-contains", user.uid)
      .onSnapshot((snap) => {
        snap.docChanges().forEach((change) => {
          const d = change.doc.data();
          cb({
            id: change.doc.id,
            changeType: change.type,
            roomName: d.roomName || change.doc.id,
            messageCount: d.messageCount || 0,
            lastMessageAt: d.lastMessageAt ? d.lastMessageAt.toDate() : null,
          });
        });
      });
  });
}

// Mesaj düzenle
async function updateMessage(roomId, msgId, newText) {
  const user = await ensureAuth();
  const ref = getMessagesRef(roomId).doc(msgId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Mesaj bulunamadı");
  const data = snap.data();
  if (data.userId !== user.uid) throw new Error("Sadece kendi mesajını düzenleyebilirsin");
  await ref.update({
    text: String(newText),
    editedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

// Mesaj sil
async function deleteMessage(roomId, msgId) {
  const user = await ensureAuth();
  const ref = getMessagesRef(roomId).doc(msgId);
  const snap = await ref.get();
  if (!snap.exists) return;
  const data = snap.data();
  if (data.userId !== user.uid) throw new Error("Sadece kendi mesajını silebilirsin");
  await ref.delete();
}

// Oda ismi değiştirme
async function renameRoom(roomId, newName) {
  const name = newName && newName.trim() ? newName.trim() : null;
  if (!name) return;
  await getRoomRef(roomId).set(
    {
      roomName: name,
    },
    { merge: true }
  );
}

window.chatApi = {
  ensureAuth,
  createRoomWithName,
  joinRoom,
  sendToCloud,
  subscribeRoom,
  subscribeMyRooms,
  updateMessage,
  deleteMessage,
  getDisplayName,
  renameRoom,
};

console.log("[BATUCHAT] firebase-app hazır");
