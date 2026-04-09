import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDrB2NHBUbAJR3khsk9iSqssAAECCjJXck",
  authDomain: "myfiniq-35b18.firebaseapp.com",
  projectId: "myfiniq-35b18",
  storageBucket: "myfiniq-35b18.firebasestorage.app",
  messagingSenderId: "363921791846",
  appId: "1:363921791846:web:cddb7b9194daf8930106a7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };