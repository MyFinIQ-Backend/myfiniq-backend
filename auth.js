import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initRegisterForm();
  initLoginForm();
  initLogout();
  protectPage();
  loadDashboardUser();
});

function initNavigation() {
  const navToggle = document.getElementById("navToggle");
  const mainNav = document.getElementById("mainNav");

  if (navToggle && mainNav) {
    navToggle.addEventListener("click", () => {
      mainNav.classList.toggle("open");
    });
  }
}

function initRegisterForm() {
  const form = document.getElementById("registerForm");
  const message = document.getElementById("registerMessage");

  if (!form || !message) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const name = String(formData.get("name")).trim();
    const email = String(formData.get("email")).trim();
    const password = String(formData.get("password"));
    const confirmPassword = String(formData.get("confirmPassword"));

    if (!name || !email || !password || !confirmPassword) {
      message.textContent = "Bitte alle Felder ausfüllen.";
      return;
    }

    if (password !== confirmPassword) {
      message.textContent = "Die Passwörter stimmen nicht überein.";
      return;
    }

    if (password.length < 6) {
      message.textContent = "Das Passwort muss mindestens 6 Zeichen lang sein.";
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        name: name,
        email: email,
        plan: "Free",
        createdAt: new Date().toISOString()
      });

      message.textContent = "Registrierung erfolgreich. Du wirst jetzt weitergeleitet.";
      form.reset();

      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1200);
    } catch (error) {
      message.textContent = getFirebaseErrorMessage(error.code);
    }
  });
}

function initLoginForm() {
  const form = document.getElementById("loginForm");
  const message = document.getElementById("loginMessage");

  if (!form || !message) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const email = String(formData.get("email")).trim();
    const password = String(formData.get("password"));

    try {
      await signInWithEmailAndPassword(auth, email, password);
      message.textContent = "Login erfolgreich. Dashboard wird geöffnet.";

      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 900);
    } catch (error) {
      message.textContent = getFirebaseErrorMessage(error.code);
    }
  });
}

function initLogout() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", async (event) => {
    event.preventDefault();

    try {
      await signOut(auth);
      window.location.href = "login.html";
    } catch (error) {
      alert("Logout fehlgeschlagen.");
    }
  });
}

function protectPage() {
  const body = document.body;
  if (!body) return;

  const isProtected = body.dataset.protected === "true";
  const isPremium = body.dataset.premium === "true";

  if (!isProtected && !isPremium) return;

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    if (isPremium) {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        window.location.href = "dashboard.html";
        return;
      }

      const userData = userSnap.data();
      if (userData.plan !== "Pro" && userData.plan !== "Elite") {
        window.location.href = "dashboard.html";
      }
    }
  });
}

function loadDashboardUser() {
  const userName = document.getElementById("userName");
  const userEmail = document.getElementById("userEmail");
  const userPlan = document.getElementById("userPlan");
  const welcomeTitle = document.getElementById("welcomeTitle");

  if (!userName && !userEmail && !userPlan && !welcomeTitle) return;

  onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) return;

      const userData = userSnap.data();

      if (userName) userName.textContent = userData.name || "–";
      if (userEmail) userEmail.textContent = userData.email || user.email || "–";
      if (userPlan) userPlan.textContent = userData.plan || "Free";
      if (welcomeTitle) welcomeTitle.textContent = `Willkommen zurück, ${userData.name}`;
    } catch (error) {
      console.error("Fehler beim Laden der Nutzerdaten:", error);
    }
  });
}

function getFirebaseErrorMessage(code) {
  switch (code) {
    case "auth/email-already-in-use":
      return "Diese E-Mail-Adresse wird bereits verwendet.";
    case "auth/invalid-email":
      return "Die E-Mail-Adresse ist ungültig.";
    case "auth/weak-password":
      return "Das Passwort ist zu schwach.";
    case "auth/invalid-credential":
      return "E-Mail oder Passwort ist nicht korrekt.";
    case "auth/user-not-found":
      return "Kein Nutzer mit dieser E-Mail gefunden.";
    case "auth/wrong-password":
      return "Das Passwort ist falsch.";
    default:
      return "Es ist ein Fehler aufgetreten. Bitte versuche es erneut.";
  }
}