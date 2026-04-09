const firebaseConfig = {
  apiKey: "AIzaSyDrB2NHBUbAJR3khsk9iSqssAAECCjJXck",
  authDomain: "myfiniq-35b18.firebaseapp.com",
  projectId: "myfiniq-35b18",
  storageBucket: "myfiniq-35b18.firebasestorage.app",
  messagingSenderId: "363921791846",
  appId: "1:363921791846:web:cdddb7b9194daf8930106a7"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
  .catch((error) => {
    console.error("Persistence-Fehler:", error);
  });

function updateNavForAuth(user) {
  const navLogin = document.getElementById("navLogin");
  const navRegister = document.getElementById("navRegister");
  const navDashboard = document.getElementById("navDashboard");
  const navLogout = document.getElementById("navLogout");
  const navUserLabel = document.getElementById("navUserLabel");

  if (user) {
    if (navLogin) navLogin.classList.add("hidden");
    if (navRegister) navRegister.classList.add("hidden");
    if (navDashboard) navDashboard.classList.remove("hidden");
    if (navLogout) navLogout.classList.remove("hidden");

    if (navUserLabel) {
      const displayName = user.displayName || user.email || "Mitglied";
      navUserLabel.textContent = `Hallo, ${displayName}`;
      navUserLabel.classList.remove("hidden");
    }
  } else {
    if (navLogin) navLogin.classList.remove("hidden");
    if (navRegister) navRegister.classList.remove("hidden");
    if (navDashboard) navDashboard.classList.add("hidden");
    if (navLogout) navLogout.classList.add("hidden");

    if (navUserLabel) {
      navUserLabel.textContent = "";
      navUserLabel.classList.add("hidden");
    }
  }
}

firebase.auth().onAuthStateChanged((user) => {
  updateNavForAuth(user);
});

document.addEventListener("DOMContentLoaded", () => {
  const navLogout = document.getElementById("navLogout");

  if (navLogout) {
    navLogout.addEventListener("click", async (event) => {
      event.preventDefault();

      try {
        await firebase.auth().signOut();
        window.location.href = "login.html";
      } catch (error) {
        console.error("Logout-Fehler:", error);
        alert("Logout fehlgeschlagen.");
      }
    });
  }
});