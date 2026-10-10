import { db } from "./firebase-init.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

async function loadAbout() {
  try {
    const snap = await getDoc(doc(db, "site", "about"));
    if (!snap.exists()) return;
    const data = snap.data();
    if (data.bioText) {
      document.getElementById("about-bio").textContent = data.bioText;
    }
  } catch (err) {
    console.error("Failed to load About Me content:", err);
  }
}

// The profile photo is served from the repo (listed in media/gallery.json).
async function loadPhoto() {
  try {
    const res = await fetch("media/gallery.json?v=" + Date.now());
    const photo = (await res.json()).about?.photo;
    if (!photo) return;
    const img = document.getElementById("about-photo");
    img.src = photo;
    img.style.display = "block";
  } catch (err) {
    console.error("Failed to load the profile photo:", err);
  }
}

loadAbout();
loadPhoto();
