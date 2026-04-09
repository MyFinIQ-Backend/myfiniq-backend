document.addEventListener("DOMContentLoaded", () => {
  const newsletterForm = document.getElementById("newsletterForm");
  const formMessage = document.getElementById("formMessage");

  if (!newsletterForm || !formMessage) {
    return;
  }

  newsletterForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const allInputs = newsletterForm.querySelectorAll("input");
    const nameInput = allInputs[0];
    const emailInput = allInputs[1];

    const name = nameInput ? nameInput.value.trim() : "";
    const email = emailInput ? emailInput.value.trim() : "";

    if (!name || !email) {
      formMessage.textContent = "Bitte fülle alle Felder aus.";
      formMessage.style.color = "#9f1c1c";
      return;
    }

    const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!emailIsValid) {
      formMessage.textContent = "Bitte gib eine gültige E-Mail-Adresse ein.";
      formMessage.style.color = "#9f1c1c";
      return;
    }

    formMessage.textContent =
      `Danke ${name}! Dein kostenloser Finanzguide ist für dich vorgemerkt.`;
    formMessage.style.color = "#166534";

    newsletterForm.reset();

    if (nameInput) nameInput.blur();
    if (emailInput) emailInput.blur();
  });
});