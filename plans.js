import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  loadPlanBadge();
  setupUpgradeButtons();
  protectPlanPages();
});

async function getCurrentUserPlan(uid) {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) return "Free";

  const userData = userSnap.data();
  return userData.plan || "Free";
}

function loadPlanBadge() {
  const planBadge = document.getElementById("planBadge");
  const planText = document.getElementById("planText");
  const upgradeHint = document.getElementById("upgradeHint");

  if (!planBadge && !planText && !upgradeHint) return;

  onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    try {
      const plan = await getCurrentUserPlan(user.uid);

      if (planBadge) {
        planBadge.textContent = plan;
        planBadge.className = `plan-badge plan-${plan.toLowerCase()}`;
      }

      if (planText) {
        planText.textContent = `Dein aktueller Plan: ${plan}`;
      }

      if (upgradeHint) {
        if (plan === "Free") {
          upgradeHint.textContent = "Du nutzt aktuell den Free-Plan. Upgrade auf Pro oder Elite, um mehr Funktionen freizuschalten.";
        } else if (plan === "Pro") {
          upgradeHint.textContent = "Du nutzt aktuell Pro. Upgrade auf Elite, um den Club und exklusive Inhalte freizuschalten.";
        } else {
          upgradeHint.textContent = "Du nutzt den Elite-Plan und hast Zugriff auf alle Premium-Inhalte.";
        }
      }
    } catch (error) {
      console.error("Fehler beim Laden des Plans:", error);
    }
  });
}

function setupUpgradeButtons() {
  const freeBtn = document.getElementById("selectFree");
  const proBtn = document.getElementById("selectPro");
  const eliteBtn = document.getElementById("selectElite");
  const upgradeMessage = document.getElementById("upgradeMessage");

  if (!freeBtn && !proBtn && !eliteBtn) return;

  async function updateUserPlan(plan) {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (upgradeMessage) {
          upgradeMessage.textContent = "Bitte logge dich zuerst ein.";
        }
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, { plan });

        if (upgradeMessage) {
          upgradeMessage.textContent = `Dein Plan wurde erfolgreich auf ${plan} gesetzt.`;
        }

        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 1200);
      } catch (error) {
        console.error("Fehler beim Aktualisieren des Plans:", error);
        if (upgradeMessage) {
          upgradeMessage.textContent = "Beim Aktualisieren des Plans ist ein Fehler aufgetreten.";
        }
      }
    });
  }

  if (freeBtn) {
    freeBtn.addEventListener("click", () => updateUserPlan("Free"));
  }

  if (proBtn) {
    proBtn.addEventListener("click", () => updateUserPlan("Pro"));
  }

  if (eliteBtn) {
    eliteBtn.addEventListener("click", () => updateUserPlan("Elite"));
  }
}

function protectPlanPages() {
  const body = document.body;
  if (!body) return;

  const requiredPlan = body.dataset.requiredPlan;
  if (!requiredPlan) return;

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    try {
      const plan = await getCurrentUserPlan(user.uid);

      if (requiredPlan === "Pro" && !(plan === "Pro" || plan === "Elite")) {
        window.location.href = "upgrade.html";
      }

      if (requiredPlan === "Elite" && plan !== "Elite") {
        window.location.href = "upgrade.html";
      }
    } catch (error) {
      console.error("Fehler beim Schutz der Plan-Seite:", error);
      window.location.href = "dashboard.html";
    }
  });
}