import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  await initAuthPersistence();
  initNavigation();
  initRegisterForm();
  initLoginForm();
  initLogout();
  protectPage();
  loadDashboardUser();
});

async function initAuthPersistence() {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (error) {
    console.error("Fehler bei der Auth-Persistence:", error);
  }
}

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
    message.textContent = "";

    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");

    if (!name || !email || !password || !confirmPassword) {
      message.textContent = "Bitte alle Felder ausfüllen.";
      return;
    }

    if (password.length < 6) {
      message.textContent = "Das Passwort muss mindestens 6 Zeichen lang sein.";
      return;
    }

    if (password !== confirmPassword) {
      message.textContent = "Die Passwörter stimmen nicht überein.";
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: name
      });

      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          name: name,
          email: email,
          plan: "free",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      localStorage.setItem("uid", user.uid);

      message.textContent = "Registrierung erfolgreich. Du wirst weitergeleitet.";

      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1000);
    } catch (error) {
      console.error("Registrierungsfehler:", error);
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
    message.textContent = "";

    const formData = new FormData(form);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    if (!email || !password) {
      message.textContent = "Bitte E-Mail und Passwort eingeben.";
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      localStorage.setItem("uid", user.uid);

      message.textContent = "Login erfolgreich. Dashboard wird geöffnet.";

      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 800);
    } catch (error) {
      console.error("Loginfehler:", error);
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
      localStorage.removeItem("uid");
      await signOut(auth);
      window.location.href = "login.html";
    } catch (error) {
      console.error("Logout fehlgeschlagen:", error);
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

    localStorage.setItem("uid", user.uid);

    if (isPremium) {
      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          window.location.href = "dashboard.html";
          return;
        }

        const userData = userSnap.data();
        const plan = String(userData.plan || "free").toLowerCase();

        if (plan !== "pro" && plan !== "elite") {
          window.location.href = "dashboard.html";
        }
      } catch (error) {
        console.error("Fehler bei Premium-Prüfung:", error);
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
  const proText = document.getElementById("proText");
  const eliteText = document.getElementById("eliteText");

  if (!userName && !userEmail && !userPlan && !welcomeTitle && !proText && !eliteText) {
    return;
  }

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      return;
    }

    try {
      localStorage.setItem("uid", user.uid);

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      let name = user.displayName || "Mitglied";
      let email = user.email || "–";
      let plan = "free";

      if (userSnap.exists()) {
        const userData = userSnap.data();
        name = userData.name || userData.displayName || name;
        email = userData.email || email;
        plan = String(userData.plan || "free").toLowerCase();
      }

      if (userName) userName.textContent = name;
      if (userEmail) userEmail.textContent = email;
      if (userPlan) userPlan.textContent = plan.toUpperCase();
      if (welcomeTitle) welcomeTitle.textContent = `Willkommen zurück, ${name}`;

      if (proText) {
        proText.textContent =
          plan === "pro" || plan === "elite"
            ? "Du hast Zugriff auf alle PRO-Inhalte."
            : "Upgrade auf PRO erforderlich.";
      }

      if (eliteText) {
        eliteText.textContent =
          plan === "elite"
            ? "Du hast Zugriff auf alle ELITE-Inhalte."
            : "Upgrade auf ELITE erforderlich.";
      }
    } catch (error) {
      console.error("Fehler beim Laden der Nutzerdaten:", error);

      if (userName) userName.textContent = user.displayName || "–";
      if (userEmail) userEmail.textContent = user.email || "–";
      if (userPlan) userPlan.textContent = "FREE";
      if (proText) proText.textContent = "Upgrade auf PRO erforderlich.";
      if (eliteText) eliteText.textContent = "Upgrade auf ELITE erforderlich.";
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
    case "auth/too-many-requests":
      return "Zu viele Versuche. Bitte warte kurz und versuche es erneut.";
    default:
      return "Es ist ein Fehler aufgetreten. Bitte versuche es erneut.";
  }
}