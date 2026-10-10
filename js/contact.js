// The contact form sends through FormSubmit (https://formsubmit.co): free, no account, and
// no server needed. The very first message triggers an "Activate" email to the address
// below. Until that link is clicked, messages aren't delivered.
const CONTACT_EMAIL = "blkctrs@gmail.com";
const ENDPOINT = `https://formsubmit.co/ajax/${CONTACT_EMAIL}`;

const form = document.getElementById("contact-form");
const submitBtn = document.getElementById("contact-submit");
const status = document.getElementById("contact-status");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Bots fill in the hidden "_honey" field; people never see it.
  if (form.elements._honey && form.elements._honey.value) return;

  const name = document.getElementById("contact-name").value.trim();
  const email = document.getElementById("contact-email").value.trim();
  const message = document.getElementById("contact-message").value.trim();

  submitBtn.disabled = true;
  status.textContent = "Sending...";
  status.className = "status-msg";

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        name,
        email, // FormSubmit uses this as the reply-to address
        message,
        _subject: `Portfolio message from ${name}`,
        _template: "table",
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || String(data.success) !== "true") throw new Error(data.message || `HTTP ${res.status}`);
    status.textContent = "Message sent. Thanks! I'll get back to you soon.";
    status.className = "status-msg success";
    form.reset();
  } catch (err) {
    console.error("Failed to send message:", err);
    status.textContent = "Something went wrong sending that. Please use the email link below instead.";
    status.className = "status-msg error";
  } finally {
    submitBtn.disabled = false;
  }
});

// Copy email fallback (mailto: only works if the visitor has a default mail app set up)
const copyEmailBtn = document.querySelector(".copy-email-btn");
const copyConfirm = document.getElementById("copy-confirm");
copyEmailBtn?.addEventListener("click", async () => {
  const address = copyEmailBtn.dataset.email;
  try {
    await navigator.clipboard.writeText(address);
    copyConfirm.textContent = "Copied to clipboard. Paste it into an email to reach me.";
  } catch (err) {
    copyConfirm.textContent = address;
  }
  setTimeout(() => {
    copyConfirm.textContent = "";
  }, 4000);
});
