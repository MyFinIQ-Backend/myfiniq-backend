import { auth } from "./firebase-config.js";
import {
onAuthStateChanged,
signOut,
setPersistence,
browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

document.addEventListener("DOMContentLoaded", async () => {
await ensurePersistence();
initNavigation();
initAuthHeader();
initLogout();
});

async function ensurePersistence() {
try {
await setPersistence(auth, browserLocalPersistence);
} catch (error) {
console.error("Persistence-Fehler:", error);
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

function initAuthHeader() {
const dashboardLinks = document.querySelectorAll('[data-auth="dashboard"]');
const registerLinks = document.querySelectorAll('[data-auth="register"]');
const loginLinks = document.querySelectorAll('[data-auth="login"]');
const logoutLinks = document.querySelectorAll('[data-auth="logout"]');

onAuthStateChanged(auth, (user) => {
const isLoggedIn = !!user;

dashboardLinks.forEach((el) => {
el.style.display = isLoggedIn ? "" : "none";
});

logoutLinks.forEach((el) => {
el.style.display = isLoggedIn ? "" : "none";
});

registerLinks.forEach((el) => {
el.style.display = isLoggedIn ? "none" : "";
});

loginLinks.forEach((el) => {
el.style.display = isLoggedIn ? "none" : "";
});
});
}

function initLogout() {
document.querySelectorAll('[data-auth="logout"]').forEach((button) => {
button.addEventListener("click", async (event) => {
event.preventDefault();

try {
await signOut(auth);
window.location.href = "login.html";
} catch (error) {
console.error("Logout-Fehler:", error);
alert("Logout fehlgeschlagen.");
}
});
});
}