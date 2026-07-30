# Event Photo Wall

A live-event photo wall: pre-seed an album, let guests add photos by scanning a
QR code, and show everything as an auto-rotating circular carousel on a big
screen. Full spec in [`HANDOFF.md`](./HANDOFF.md).

## Getting started

```bash
npm install
cp .env.example .env   # fill in from the Firebase console
npm run dev
```

No Firebase project yet? Follow [`SETUP.md`](./SETUP.md) — it walks through
creating the project, enabling Firestore/Storage/Auth, and finding each value.

| Script            | Purpose                          |
|-------------------|----------------------------------|
| `npm run dev`     | Local dev server                 |
| `npm run build`   | Production build to `dist/`      |
| `npm run preview` | Serve the production build       |

Until `.env` is filled in, every route renders a notice listing the missing
variables rather than failing silently.

## Routes

| Route     | Surface       | Auth        |
|-----------|---------------|-------------|
| `/`       | Display wall  | none        |
| `/upload` | Guest upload  | none        |
| `/admin`  | Admin console | admin login |

`/upload` reads the event from `?e=`, falling back to `VITE_EVENT_ID`. The other
two always use `VITE_EVENT_ID`.

## Build status

Following the build order in `HANDOFF.md`:

- [x] 1. Scaffold — Vite + React + Router, Firebase init, three routes
- [x] 2. Firestore + Storage rules — deployed and verified against the live project
- [x] 3. Guest upload page — guest photos go live immediately (see
      `src/lib/uploadPhoto.js` to switch to pre-moderation)
- [x] 4. Display slideshow — full-frame photos, never cropped
- [x] 5. Admin console — auth gate, bulk seed, moderation, title, QR
- [ ] 6. Deploy

### Deploying the rules

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules,firestore:indexes,storage --project sams-pics
```

This also creates the composite index the display query needs, so you don't have
to click through the console link.

### Deploying the app

`.env` must be filled in first — Vite inlines those values at build time, so a
build made without them produces an app that cannot reach Firebase.

```bash
npm run build
npx firebase-tools deploy --only hosting --project sams-pics
```

### Deploying to Vercel

`vercel.json` sets the framework, output directory and the SPA rewrite — without
that rewrite `/upload` and `/admin` 404 on a hard load, which breaks the QR code
since that is exactly how guests arrive.

Vercel never sees the local `.env` (it is gitignored), so all seven `VITE_`
variables must be set under **Settings → Environment Variables** for the
Production and Preview environments. A build without them succeeds and produces
an app that cannot reach Firebase.

Node 22.12+ is required by the build toolchain; `engines.node` in `package.json`
tells Vercel which major to use.

### Rehearsing the display

`/?demo` renders six placeholder photos and `/?demo=40` renders forty, in a mix
of landscape, portrait and square, so the slideshow can be checked on the venue
screen before any real photos exist.

## Notes on dependencies

The handoff specifies Firebase JS SDK v10 (modular), which is what's pinned here.
Firebase's published advisories are all in `undici`, a transitive dependency it
uses only in Node environments — it is not present in the client bundle. React,
Vite and React Router are on current majors. React Router v7 merged
`react-router-dom` back into `react-router`, so imports come from `react-router`.
