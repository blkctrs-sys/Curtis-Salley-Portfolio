# Curtis Salley Portfolio

A free, static portfolio site showcasing Unreal Engine and Blender work. Hosted free on GitHub
Pages. Uploads (text, photos, videos) are managed through a private admin page that only works
for Curtis's one login — everyone else only ever sees the public, read-only site.

No npm, no build step — open `index.html` directly or host the folder as-is.

## One-time setup (do this yourself — about 15 minutes)

### 1. Create a free Firebase project
1. Go to https://console.firebase.google.com and sign in with a Google account.
2. Click **Add project**, give it any name (e.g. `curtis-salley-portfolio`), finish the wizard.
   No credit card is required for the free **Spark** plan used here.

### 2. Turn on Authentication (this becomes your admin login)
1. In the Firebase console, go to **Build → Authentication → Get started**.
2. Under **Sign-in method**, enable **Email/Password**.
3. Go to the **Users** tab → **Add user** → enter your own email and a password you choose.
   This is the only account that will ever be able to upload or delete anything.
4. Click into that user and copy its **User UID** — you'll need it twice below.

### 3. Turn on Firestore and Storage
1. **Build → Firestore Database → Create database** → start in **production mode** → pick any
   location close to you.
2. **Build → Storage → Get started** → keep the default settings.

### 4. Paste in the security rules
These rules are what actually enforce "only I can upload" — replace `PASTE_YOUR_UID_HERE` with
the UID you copied in step 2.4.

**Firestore rules** (Firestore Database → Rules tab):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == "PASTE_YOUR_UID_HERE";
    }
  }
}
```

**Storage rules** (Storage → Rules tab):
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == "PASTE_YOUR_UID_HERE";
    }
  }
}
```
Click **Publish** on each.

### 5. Fill in the site's config
1. Firebase console → ⚙️ **Project settings** → scroll to **Your apps** → click the web icon
   (`</>`) to register a web app (any nickname is fine, no hosting needed).
2. Copy the `firebaseConfig` object it gives you into `js/firebase-config.js` in this project,
   replacing the placeholder values.
3. In the same file, set `ADMIN_UID` to the UID from step 2.4 (same value you pasted into the
   rules above).

### 6. Put the site online for free with GitHub Pages
1. Create a free GitHub account if you don't have one (https://github.com).
2. Create a new **public** repository.
3. Push this folder to that repository.
4. In the repo, go to **Settings → Pages**, set **Source** to your main branch / root folder,
   save. GitHub gives you a URL like `https://yourusername.github.io/your-repo-name/` — that's
   the link you send to anyone. No download, no install, just the URL.

## Using it day to day
- Go to `https://yourusername.github.io/your-repo-name/admin.html`, log in with the email/password
  from step 2.3.
- Update your bio/photo, or upload images/videos to the Unreal Engine or Blender sections.
- Changes show up on the main site immediately — no redeploy needed, since the content lives in
  Firebase, not in the HTML files.
- The "Admin" link in the public site's footer just points here for your convenience; it isn't
  what keeps things secure — the security rules above are what stop anyone else from writing data,
  even if they find or guess the admin URL.

## A note on free-tier limits
Firebase's free Spark plan includes 5GB of stored files and 1GB of downloaded data per day. That's
plenty for a portfolio under normal traffic. If you upload a lot of large raw video files and get
a traffic spike, you could hit the daily download cap. If that ever becomes a problem, the easiest
fix is keeping videos shorter/compressed, or switching to embedding YouTube/Vimeo links for video
instead of raw uploads.
