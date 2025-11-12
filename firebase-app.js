// firebase-app.js — Firebase entegrasyonu (index.html'de scriptleri açmayı unutma)
/* global firebase */
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
auth.signInAnonymously().catch(console.error);

function subscribeRoom(roomId, onMessage){
  return db.collection('rooms').doc(roomId).collection('messages')
    .orderBy('ts','asc')
    .onSnapshot((snap)=>{
      snap.docChanges().forEach((ch)=>{
        if(ch.type === 'added'){
          const d = ch.doc.data();
          onMessage(d.text, d.uid === (auth.currentUser && auth.currentUser.uid), d.ts);
        }
      });
    });
}

async function sendToCloud(roomId, text){
  const uid = (auth.currentUser && auth.currentUser.uid) || 'anon';
  await db.collection('rooms').doc(roomId).collection('messages').add({ text, uid, ts: Date.now() });
}

window.firebaseBridge = { subscribeRoom, sendToCloud };
