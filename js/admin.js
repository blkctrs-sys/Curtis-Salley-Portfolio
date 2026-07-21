import { auth, db, storage } from "./firebase-init.js";
import { ADMIN_UID } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { primeVideoThumbnail } from "./video-thumb.js";

const loginPanel = document.getElementById("login-panel");
const appPanels = document.getElementById("app-panels");
const loginStatus = document.getElementById("login-status");

document.getElementById("login-btn").addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  loginStatus.textContent = "Logging in...";
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    loginStatus.textContent = "Login failed: " + err.message;
  }
});

document.getElementById("logout-btn").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, (user) => {
  if (user && user.uid === ADMIN_UID) {
    loginPanel.style.display = "none";
    appPanels.style.display = "block";
    loginStatus.textContent = "";
    loadAboutIntoForm();
    refreshList("unreal", "unreal-list");
    refreshList("blender", "blender-list");
    refreshList("music", "music-list");
  } else {
    if (user) {
      // Logged in, but not the admin account.
      loginStatus.textContent = "This account is not authorized.";
      signOut(auth);
    }
    loginPanel.style.display = "block";
    appPanels.style.display = "none";
  }
});

// --- About Me ---

async function loadAboutIntoForm() {
  const snap = await getDoc(doc(db, "site", "about"));
  if (snap.exists()) {
    document.getElementById("bio-text").value = snap.data().bioText || "";
  }
}

document.getElementById("save-about-btn").addEventListener("click", async () => {
  const status = document.getElementById("about-status");
  status.textContent = "Saving...";
  try {
    const bioText = document.getElementById("bio-text").value;
    const file = document.getElementById("bio-photo").files[0];
    const data = { bioText };

    if (file) {
      const fileRef = ref(storage, `about/photo_${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      data.photoURL = await getDownloadURL(fileRef);
    }

    await setDoc(doc(db, "site", "about"), data, { merge: true });
    status.textContent = "Saved.";
  } catch (err) {
    status.textContent = "Error: " + err.message;
  }
});

// --- Gallery uploads ---

document.getElementById("upload-media-btn").addEventListener("click", async () => {
  const status = document.getElementById("upload-status");
  const section = document.getElementById("media-section").value;
  const file = document.getElementById("media-file").files[0];
  const caption = document.getElementById("media-caption").value.trim();
  const description = document.getElementById("media-description").value.trim();

  if (!file) {
    status.textContent = "Choose a file first.";
    return;
  }

  status.textContent = "Uploading...";
  try {
    const type = file.type.startsWith("video") ? "video" : "image";
    const storagePath = `${section}/${Date.now()}_${file.name}`;
    const fileRef = ref(storage, storagePath);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);

    await addDoc(collection(db, "gallery"), {
      section,
      type,
      url,
      storagePath,
      caption,
      description,
      createdAt: serverTimestamp(),
    });

    status.textContent = "Uploaded.";
    document.getElementById("media-file").value = "";
    document.getElementById("media-caption").value = "";
    document.getElementById("media-description").value = "";
    refreshList(section, `${section}-list`);
  } catch (err) {
    status.textContent = "Error: " + err.message;
  }
});

// --- List + delete existing items ---

async function refreshList(section, listId) {
  const listEl = document.getElementById(listId);
  listEl.innerHTML = "Loading...";

  const q = query(collection(db, "gallery"), where("section", "==", section), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  if (snap.empty) {
    listEl.innerHTML = '<p class="empty-state">No items yet.</p>';
    return;
  }

  listEl.innerHTML = "";
  snap.forEach((docSnap) => {
    const item = docSnap.data();
    const row = document.createElement("div");
    row.className = "item-row";

    const when = item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : "";
    const thumb =
      item.type === "video"
        ? `<video src="${item.url}" style="width:70px;height:46px;object-fit:cover;background:#000;" muted playsinline preload="metadata"></video>`
        : `<img src="${item.url}" style="width:70px;height:46px;object-fit:cover;background:#000;" />`;

    const info = document.createElement("span");
    info.style.display = "flex";
    info.style.alignItems = "center";
    info.style.gap = "0.75rem";
    const descLine = item.description
      ? `<br><small style="color:var(--text-dim);">${item.description}</small>`
      : "";
    info.innerHTML = `${thumb}<span>${item.caption || "(no caption)"} — ${item.type}<br><small style="color:var(--text-dim);">${when}</small>${descLine}</span>`;
    if (item.type === "video") {
      primeVideoThumbnail(info.querySelector("video"));
    }
    row.appendChild(info);

    const delBtn = document.createElement("button");
    delBtn.className = "danger";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", async () => {
      if (!confirm("Delete this item?")) return;
      try {
        if (item.storagePath) {
          await deleteObject(ref(storage, item.storagePath)).catch(() => {});
        }
        await deleteDoc(doc(db, "gallery", docSnap.id));
        refreshList(section, listId);
      } catch (err) {
        alert("Error deleting: " + err.message);
      }
    });

    row.appendChild(delBtn);
    listEl.appendChild(row);
  });
}
