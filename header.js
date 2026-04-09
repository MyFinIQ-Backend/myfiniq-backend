document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page || "";

  const headerMarkup = `
    <header class="site-header">
      <div class="container nav-wrap">
        <a href="index.html" class="logo">MyFinIQ</a>

        <button class="nav-toggle" aria-label="Menü öffnen" id="navToggle">☰</button>

        <nav class="main-nav" id="mainNav">
          <a href="index.html" data-page="index">Start</a>
          <a href="kurse.html" data-page="kurse">Kurse</a>
          <a href="club.html" data-page="club">Club</a>
          <a href="tools.html" data-page="tools">Tools</a>
          <a href="buecher.html" data-page="buecher">Bücher</a>
          <a href="ueber.html" data-page="ueber">Über uns</a>
          <a href="premium.html" data-page="premium">Upgrade</a>
          <a href="dashboard.html" data-page="dashboard">Dashboard</a>

          <a href="registrieren.html" id="navRegister" class="btn btn-small btn-outline">Registrieren</a>
          <a href="login.html" id="navLogin" class="btn btn-small btn-gold">Login</a>
          <a href="#" id="navLogout" class="btn btn-small btn-outline hidden">Logout</a>
        </nav>
      </div>
    </header>
  `;

  document.body.insertAdjacentHTML("afterbegin", headerMarkup);

  const navToggle = document.getElementById("navToggle");
  const mainNav = document.getElementById("mainNav");
  const navLogin = document.getElementById("navLogin");
  const navRegister = document.getElementById("navRegister");
  const navLogout = document.getElementById("navLogout");

  if (navToggle && mainNav) {
    navToggle.addEventListener("click", () => {
      mainNav.classList.toggle("open");
    });
  }

  const navLinks = document.querySelectorAll(".main-nav a[data-page]");
  navLinks.forEach((link) => {
    if (link.dataset.page === page) {
      link.classList.add("active");
    }
  });

  if (typeof firebase !== "undefined" && firebase.auth) {
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        if (navLogin) navLogin.classList.add("hidden");
        if (navRegister) navRegister.classList.add("hidden");
        if (navLogout) navLogout.classList.remove("hidden");
      } else {
        if (navLogin) navLogin.classList.remove("hidden");
        if (navRegister) navRegister.classList.remove("hidden");
        if (navLogout) navLogout.classList.add("hidden");
      }
    });

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
  }
});