firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

async function ensureAuth() {
  if (auth.currentUser) return auth.currentUser;
  await auth.signInAnonymously();
  return auth.currentUser;
}

async function createRoom(roomId) {
  const user = await ensureAuth();
  await db.collection('rooms').doc(roomId).set({
    createdAt: Date.now(),
    members: firebase.firestore.FieldValue.arrayUnion(user.uid)
  }, { merge: true });
}

async function joinRoom(roomId) {
  const user = await ensureAuth();
  await db.collection('rooms').doc(roomId).set({
    members: firebase.firestore.FieldValue.arrayUnion(user.uid)
  }, { merge: true });
}

function subscribeRoom(roomId, callback) {
  return db.collection('rooms').doc(roomId)
    .collection('messages').orderBy("ts")
    .onSnapshot(snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === "added") {
          const data = change.doc.data();
          callback(data.text, data.uid === auth.currentUser?.uid, data.ts);
        }
      });
    });
}

async function sendToCloud(roomId, text) {
  const user = await ensureAuth();
  await db.collection("rooms").doc(roomId).collection("messages").add({
    text: text,
    uid: user.uid,
    ts: Date.now()
  });
}

window.chatApi = { ensureAuth, createRoom, joinRoom, subscribeRoom, sendToCloud };
