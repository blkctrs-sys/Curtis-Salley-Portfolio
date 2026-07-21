import { db } from "./firebase-init.js";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { primeVideoThumbnail } from "./video-thumb.js";

document.getElementById("year").textContent = new Date().getFullYear();

// Nav smooth-scroll
document.querySelectorAll("nav button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelector(btn.dataset.target)?.scrollIntoView({ behavior: "smooth" });
  });
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

// Lightbox
const lightbox = document.getElementById("lightbox");
const lightboxContent = document.getElementById("lightbox-content");
lightbox.querySelector(".close-btn").addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) closeLightbox();
});

function closeLightbox() {
  lightbox.classList.remove("open");
  lightboxContent.innerHTML = "";
}

function openLightbox(type, url, description) {
  const media =
    type === "video"
      ? `<video src="${url}" controls autoplay></video>`
      : `<img src="${url}" alt="" />`;
  const desc = description ? `<p class="lightbox-description">${description}</p>` : "";
  lightboxContent.innerHTML = media + desc;
  lightbox.classList.add("open");
}

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

async function loadGallery(section, containerId) {
  const container = document.getElementById(containerId);
  try {
    const q = query(
      collection(db, "gallery"),
      where("section", "==", section),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    if (snap.empty) return; // leave the existing empty-state message in place

    container.innerHTML = "";
    snap.forEach((docSnap) => {
      const item = docSnap.data();
      const card = document.createElement("div");
      card.className = "gallery-item";

      const media =
        item.type === "video"
          ? `<video src="${item.url}" ${item.posterURL ? `poster="${item.posterURL}"` : ""} muted playsinline preload="metadata"></video>`
          : `<img src="${item.url}" alt="${item.caption || ""}" loading="lazy" />`;

      card.innerHTML = `${media}<div class="caption">${item.caption || ""}</div>`;
      if (item.description) {
        card.title = item.description;
      }
      if (item.type === "video") {
        primeVideoThumbnail(card.querySelector("video"));
      }
      card.addEventListener("click", () => openLightbox(item.type, item.url, item.description));
      container.appendChild(card);
    });
  } catch (err) {
    console.error(`Failed to load ${section} gallery:`, err);
    container.innerHTML = `<p class="empty-state" style="color:#ff5c5c;">Couldn't load this gallery: ${err.message}</p>`;
  }
}

loadAbout();
loadGallery("unreal", "unreal-gallery");
loadGallery("blender", "blender-gallery");
loadGallery("music", "music-gallery");
