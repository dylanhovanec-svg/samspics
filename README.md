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
- [ ] 2. Firestore + Storage rules (needs the admin UID)
- [ ] 3. Guest upload page
- [ ] 4. Display carousel, ported from `reference/EventPhotoCircle.jsx`
- [ ] 5. Admin console
- [ ] 6. Deploy

## Notes on dependencies

The handoff specifies Firebase JS SDK v10 (modular), which is what's pinned here.
Firebase's published advisories are all in `undici`, a transitive dependency it
uses only in Node environments — it is not present in the client bundle. React,
Vite and React Router are on current majors. React Router v7 merged
`react-router-dom` back into `react-router`, so imports come from `react-router`.
