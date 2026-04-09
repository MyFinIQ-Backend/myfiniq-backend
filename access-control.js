document.addEventListener("DOMContentLoaded", () => {
  const requiredPlan = (document.body.dataset.requiredPlan || "").toLowerCase();
  const statusBox = document.getElementById("accessStatus");

  function setStatus(text) {
    if (statusBox) {
      statusBox.textContent = text;
    }
  }

  function isAllowed(userPlan, requiredPlanValue) {
    const order = {
      free: 0,
      pro: 1,
      elite: 2
    };

    return (order[userPlan] || 0) >= (order[requiredPlanValue] || 0);
  }

  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
      setStatus("Nicht eingeloggt. Weiterleitung zur Login-Seite ...");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1200);
      return;
    }

    if (!requiredPlan) {
      setStatus("Kein Zugriffslevel definiert.");
      return;
    }

    try {
      const response = await fetch(`/api/user-premium/${encodeURIComponent(user.uid)}`);
      const data = await response.json();
      const userPlan = (data.plan || "free").toLowerCase();

      if (!isAllowed(userPlan, requiredPlan)) {
        setStatus("Kein Zugriff vorhanden. Weiterleitung zur Upgrade-Seite ...");
        setTimeout(() => {
          window.location.href = "premium.html";
        }, 1300);
        return;
      }

      setStatus(`Zugriff freigeschaltet. Aktueller Plan: ${userPlan.toUpperCase()}`);
    } catch (error) {
      console.error("Fehler bei der Zugriffsprüfung:", error);
      setStatus("Zugriff konnte nicht geprüft werden.");
    }
  });
});