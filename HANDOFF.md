# Event Photo Wall — Claude Code Handoff

A single web app for a live event that (1) is pre-seeded with an exported photo
album, (2) lets guests add photos live by scanning a QR code, and (3) displays
everything as an auto-rotating "photo circle" carousel on a big screen. New guest
photos appear on the display within seconds.

This is a standalone project — no dependency on any existing codebase.

---

## What the human provides before build

- A **new Firebase project** (Firestore + Storage + Authentication enabled).
- One **admin account** (Firebase Auth, email/password). After creating it, copy
  its **UID** and paste it into both rule files where `REPLACE_WITH_ADMIN_UID`
  appears.
- **Hosting**: Vercel or Firebase Hosting.
- Firebase web config values, supplied as env vars (see below).

## Working preferences for this build

- Deliver **complete files**, not diffs. Split a file into up to 3 sequential
  parts if it's too long.
- **One feature at a time**, in the build order below.
- **Firestore/Storage rules always given in full** for copy/paste.

---

## Tech stack

- React + Vite
- React Router (three routes)
- Firebase JS SDK v10 (modular): Firestore, Storage, Auth
- `qrcode` (npm) for the admin QR generator
- Deploy to Vercel or Firebase Hosting

## Env vars (Vite)

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_EVENT_ID=            # slug for this event, e.g. "spring-2026"
```

## Routes / surfaces

| Route      | Surface       | Auth        | Purpose                                             |
|------------|---------------|-------------|-----------------------------------------------------|
| `/`        | Display       | none        | Big-screen rotating carousel, live-subscribed       |
| `/upload`  | Guest upload  | none        | QR target; guest adds a photo                        |
| `/admin`   | Admin console | admin login | Bulk-seed, moderate, edit title, generate QR         |

The event is identified by `eventId` (from `VITE_EVENT_ID`, or `?e=` on `/upload`).

---

## Data model

### `events/{eventId}` (document)

- `title: string` — shown on the display
- `createdAt: timestamp`

### `events/{eventId}/photos/{photoId}` (documents)

- `url: string` — Storage download URL
- `storagePath: string` — path in Storage bucket
- `source: 'guest' | 'seed'`
- `hidden: boolean` — soft-moderation flag (default false)
- `createdAt: timestamp` — **serverTimestamp()** on create
- `caption?: string` — optional, ≤140 chars
- `uploaderName?: string` — optional, ≤60 chars

### Storage layout

All images (seed + guest) live under:

```
events/{eventId}/uploads/{uuid}.jpg
```

### Display query

`photos` where `hidden == false`, `orderBy('createdAt')`, via `onSnapshot` so new
guest photos stream in live. (Add the composite index Firebase prompts for.)

---

## Firestore security rules (full)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null
        && request.auth.uid == 'REPLACE_WITH_ADMIN_UID';
    }
    match /events/{eventId} {
      allow read: if true;
      allow write: if isAdmin();
      match /photos/{photoId} {
        function isValidGuestPhoto() {
          let d = request.resource.data;
          return d.keys().hasAll(['url','storagePath','source','hidden','createdAt'])
            && d.source == 'guest'
            && d.hidden == false
            && d.url is string
            && d.storagePath is string
            && d.storagePath.matches('events/' + eventId + '/uploads/.*')
            && d.createdAt == request.time
            && (!('caption' in d)      || (d.caption is string && d.caption.size() <= 140))
            && (!('uploaderName' in d) || (d.uploaderName is string && d.uploaderName.size() <= 60));
        }
        // Display + upload confirmation can read.
        allow read: if true;
        // Guests may add a photo (validated); admin may add seed photos.
        allow create: if isValidGuestPhoto() || isAdmin();
        // Only the admin can hide, edit, or delete.
        allow update, delete: if isAdmin();
      }
    }
  }
}
```

## Storage security rules (full)

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function isAdmin() {
      return request.auth != null
        && request.auth.uid == 'REPLACE_WITH_ADMIN_UID';
    }
    match /events/{eventId}/uploads/{fileName} {
      allow read: if true;
      // Guest + admin uploads: image content-type only, capped at 15 MB.
      allow create: if request.resource.size < 15 * 1024 * 1024
                    && request.resource.contentType.matches('image/.*');
      allow delete: if isAdmin();
    }
  }
}
```

> Hardening note: public unauthenticated upload is intentional (guests aren't
> signed in) but leaves the door open to abuse from anyone with the URL. For a
> private event this is acceptable given the size/type caps and the semi-secret
> `eventId`. If stronger protection is wanted, enable **Firebase App Check** and
> add it as a follow-up feature — do not block the initial build on it.

---

## Feature specs

### 1. Guest upload page (`/upload`)

- Read `eventId` from `?e=` (fallback to `VITE_EVENT_ID`).
- Big friendly "Add your photo" button → file input with `accept="image/*"`
  and `capture` allowed so phones offer the camera.
- Optional fields: name (≤60), caption (≤140).
- On submit: **downscale client-side** (see helper below) → upload to
  `events/{eventId}/uploads/{uuid}.jpg` → get download URL → write the Firestore
  photo doc with `source:'guest'`, `hidden:false`, `createdAt: serverTimestamp()`.
- Show a clear success state with "Add another" and a note that it'll appear on
  the screen shortly. Handle errors in plain language (what failed, what to do).
- Mobile-first layout; large tap targets.

### 2. Display page (`/`) — the carousel

- Port the aesthetic from the reference component `EventPhotoCircle.jsx`
  (provided separately): central circular photo that cross-fades, a ring of
  circular thumbnails orbiting it, auto-advance with Slow/Medium/Fast, play/pause,
  prev/next, fullscreen, arrow-key + spacebar control, event title shown.
- Replace the in-memory sample array with a **live `onSnapshot`** on the photos
  query above. New photos append to the ring automatically.
- Auto-advance should keep looping indefinitely (built for hours on a screen).
- Keep the design tokens below.

### 3. Admin console (`/admin`)

- Firebase Auth email/password sign-in gate (only the admin UID gets write access
  per the rules).
- **Bulk seed**: multi-file input; for each file, downscale → upload → write
  Firestore doc with `source:'seed'`. Show progress (n of total). This is how the
  exported PhotoCircle album gets loaded once, beforehand.
- **Moderation**: grid of all photos (including hidden); toggle `hidden`, or
  delete (remove Storage object + Firestore doc).
- **Event title**: edit the `events/{eventId}.title` field.
- **QR generator**: render a QR of `${window.location.origin}/upload?e=${eventId}`
  using `qrcode`; provide a downloadable PNG to print for the event.

### Client-side downscale helper (use on every upload, guest + seed)

Keeps Storage/bandwidth reasonable and the carousel smooth.

```js
async function downscale(file, maxDim = 1600, quality = 0.85) {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d').drawImage(img, 0, 0, w, h);
  return new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
}
```

---

## Design tokens (match the reference carousel)

- Background: `radial-gradient(120% 90% at 50% -10%, #2c1f3d, #1a1224 55%, #120c1a)`
- Gold accent: `#e8b84b`  ·  Rose accent: `#e06a8a`
- Text: `#f5eefb`  ·  Muted: `#a99cb8`
- Display font: **Fraunces** (600)  ·  Body font: **Inter**
- Circular framing, soft shadows, gold ring on the active photo.
- Respect `prefers-reduced-motion` (disable ring rotation + ambient spin).

---

## Build order

1. **Scaffold** — Vite + React + Router, Firebase init module reading env vars,
   the three empty routes.
2. **Rules** — deploy the Firestore + Storage rules above (with the real admin
   UID). Confirm reads/writes behave.
3. **Guest upload page** — full flow with downscale.
4. **Display page** — port the carousel, wire the live `onSnapshot`.
5. **Admin console** — auth gate, bulk seed, moderation, title edit, QR generator.
6. **Deploy** — host on Vercel/Firebase Hosting; set env vars; generate and print
   the QR from `/admin`.

## Pre-event runbook (for the human)

1. Export the finished album out of PhotoCircle (Save all → your device).
2. Open `/admin`, sign in, bulk-seed that folder.
3. Set the event title; generate + print the QR.
4. At the event: open `/` on the display device, go fullscreen; put the QR where
   guests can scan it. Photos they add appear live.

## Open items to confirm during build

- **Admin UID**: paste into both rule files once the admin account exists.
- **Guest photos default visible or held for approval?** Spec above shows them
  going live immediately (`hidden:false`). If you'd rather pre-moderate, flip the
  guest-create default to `hidden:true` and approve from `/admin` — small change,
  decide before wiring the upload page.
- **App Check**: optional hardening, add later if abuse is a concern.
