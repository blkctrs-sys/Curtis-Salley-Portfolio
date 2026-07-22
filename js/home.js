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
    if (data.photoURL) {
      const img = document.getElementById("about-photo");
      img.src = data.photoURL;
      img.style.display = "block";
    }
  } catch (err) {
    console.error("Failed to load About Me content:", err);
  }
}

loadAbout();
