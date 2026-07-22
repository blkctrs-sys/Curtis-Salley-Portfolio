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

function setupLightbox() {
  const lightbox = document.getElementById("lightbox");
  const lightboxContent = document.getElementById("lightbox-content");

  function closeLightbox() {
    lightbox.classList.remove("open");
    lightboxContent.innerHTML = "";
  }

  lightbox.querySelector(".close-btn").addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  return function openLightbox(type, url, description) {
    const media =
      type === "video"
        ? `<video src="${url}" controls autoplay></video>`
        : `<img src="${url}" alt="" />`;
    const desc = description ? `<p class="lightbox-description">${description}</p>` : "";
    lightboxContent.innerHTML = media + desc;
    lightbox.classList.add("open");
  };
}

async function loadSectionDescription(section) {
  const el = document.getElementById("section-description");
  if (!el) return;
  try {
    const snap = await getDoc(doc(db, "site", section));
    if (snap.exists() && snap.data().description) {
      el.textContent = snap.data().description;
    }
  } catch (err) {
    console.error(`Failed to load ${section} description:`, err);
  }
}

async function loadGallery(section, containerId, openLightbox) {
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

export function initSectionPage(section) {
  const openLightbox = setupLightbox();
  loadSectionDescription(section);
  loadGallery(section, `${section}-gallery`, openLightbox);
}
