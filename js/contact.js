import {
  EMAILJS_PUBLIC_KEY,
  EMAILJS_SERVICE_ID,
  EMAILJS_TEMPLATE_ID,
} from "./emailjs-config.js";

const form = document.getElementById("contact-form");
const submitBtn = document.getElementById("contact-submit");
const status = document.getElementById("contact-status");

const isConfigured =
  !EMAILJS_PUBLIC_KEY.startsWith("PASTE_") &&
  !EMAILJS_SERVICE_ID.startsWith("PASTE_") &&
  !EMAILJS_TEMPLATE_ID.startsWith("PASTE_");

if (isConfigured && window.emailjs) {
  window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!isConfigured || !window.emailjs) {
    status.textContent = "The contact form isn't set up yet — please use the email link below instead.";
    status.className = "status-msg error";
    return;
  }

  submitBtn.disabled = true;
  status.textContent = "Sending...";
  status.className = "status-msg";

  try {
    await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      name: document.getElementById("contact-name").value.trim(),
      email: document.getElementById("contact-email").value.trim(),
      message: document.getElementById("contact-message").value.trim(),
    });
    status.textContent = "Message sent — thanks! I'll get back to you soon.";
    status.className = "status-msg success";
    form.reset();
  } catch (err) {
    console.error("Failed to send message:", err);
    status.textContent = "Something went wrong sending that — please use the email link below instead.";
    status.className = "status-msg error";
  } finally {
    submitBtn.disabled = false;
  }
});

// Copy email fallback (mailto: only works if the visitor has a default mail app set up)
const copyEmailBtn = document.querySelector(".copy-email-btn");
const copyConfirm = document.getElementById("copy-confirm");
copyEmailBtn?.addEventListener("click", async () => {
  const email = copyEmailBtn.dataset.email;
  try {
    await navigator.clipboard.writeText(email);
    copyConfirm.textContent = "Copied to clipboard — paste it into an email to reach me.";
  } catch (err) {
    copyConfirm.textContent = email;
  }
  setTimeout(() => {
    copyConfirm.textContent = "";
  }, 4000);
});
