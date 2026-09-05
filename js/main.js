(function () {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open menu");
      });
    });
  }

  document.addEventListener("click", function (event) {
    const trigger = event.target.closest(".agent-cta");
    if (!trigger) return;
    const launcher = document.querySelector(".agent-launcher");
    if (!launcher) return;

    event.preventDefault();
    if (launcher.getAttribute("aria-expanded") !== "true") {
      launcher.click();
      return;
    }

    const input = document.querySelector(".agent-input");
    if (input) input.focus();
  });

  const form = document.getElementById("contact-form");
  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const name = (form.elements.name.value || "").trim();
      const email = (form.elements.email.value || "").trim();
      const message = (form.elements.message.value || "").trim();
      if (!name || !email || !message) {
        form.reportValidity();
        return;
      }
      const subject = encodeURIComponent("AI consulting inquiry from " + name);
      const body = encodeURIComponent(message + "\n\n— " + name + "\n" + email);
      window.location.href = "mailto:galvisefrain@gmail.com?subject=" + subject + "&body=" + body;
    });
  }
})();
