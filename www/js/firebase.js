import { initializeApp } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-storage.js";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-auth.js";
// import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/9.16.0/firebase-messaging.js";


const firebaseConfig = {
  authDomain: "cordova-project-b98f1.firebaseapp.com",
  projectId: "cordova-project-b98f1",
  storageBucket: "cordova-project-b98f1.firebasestorage.app",
  messagingSenderId: "625842018761",
  appId: "1:625842018761:web:9961327742f9a752e7f018"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Add incident to Firestore with optional image upload
export async function addIncident(data, imageFile) {
  try {
    let imageUrl = null;

    if (imageFile) {
      console.log('this is img file:', imageFile);
      const imageRef = ref(storage, `incidents/${Date.now()}_${imageFile.name}`);
      try {
        const snapshot = await uploadBytes(imageRef, imageFile);
        imageUrl = await getDownloadURL(snapshot.ref);
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        throw new Error('Image upload failed');
      }
      
    }

    const incidentData = { ...data, imageUrl }; // Include image URL if available
    const docRef = await addDoc(collection(db, "incidents"), incidentData);
    console.log("Incident added with ID: ", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error adding incident: ", error);
  }
}

/* navigator.serviceWorker.register('firebase-messaging-sw.js')
  .then((registration) => {
    messaging.useServiceWorker(registration);
  }).catch((error) => {
    console.error('Service Worker registration failed:', error);
  }); */

/* export async function requestNotificationPermission() {
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      console.log("Notification permission granted.");

      const fcmToken = await getToken(messaging, {
        vapidKey: "BKsAL5AH5T3ecOArlldbsQx0O5v57h5ZfMbkNtmCeK0Ub-8TfkVNBKPVIv2HRF4YTV-kCcNFr1kdEpDWIxpTP7Y",
      });
      console.log("FCM Token:", fcmToken);
      return fcmToken;
    } else {
      console.error("Unable to get permission for notifications.");
    }
  } catch (error) {
    console.error("Error getting notification permission:", error);
  }
}

onMessage(messaging, (payload) => {
  console.log("Message received in foreground:", payload);
  alert(`Notification: ${payload.notification.title}\n${payload.notification.body}`);
}); */

export { db, onSnapshot, collection, auth, signInWithPopup, provider };
