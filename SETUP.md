# Firebase setup

Everything here happens in the Firebase console — it can't be scripted from the
repo. Takes about 15 minutes. At the end you'll have a filled-in `.env` and an
admin UID, which is everything the build needs.

## Before you start: the Storage billing catch

Cloud Storage on a **new** Firebase project requires the **Blaze**
(pay-as-you-go) plan — the free Spark plan no longer includes it. Blaze still
has a free monthly allowance, and a single event's worth of photos sits well
inside it, but enabling Storage will require putting a card on the account.

If you'd rather not, say so — the app can be reworked to keep images somewhere
else (Cloudinary, imgbb, Supabase Storage), which changes the upload path but
not the carousel or the data model.

Worth setting a budget alert either way: Google Cloud console → Billing →
Budgets & alerts.

---

## 1. Create the project

1. Go to <https://console.firebase.google.com> and click **Add project**.
2. Name it (e.g. `event-photo-wall`). Google Analytics is not needed — turn it off.
3. Wait for provisioning, then continue into the project.

## 2. Register a web app (this gives you the env vars)

1. On the project overview, click the **`</>`** (web) icon.
2. Give it a nickname. **Do not** tick "Firebase Hosting" yet — you can add it later.
3. You'll land on **SDK setup and configuration** showing a `firebaseConfig`
   object. Every value you need is in it.

Map it into `.env` (copy `.env.example` first):

| `firebaseConfig` key | `.env` variable                    |
|----------------------|------------------------------------|
| `apiKey`             | `VITE_FIREBASE_API_KEY`            |
| `authDomain`         | `VITE_FIREBASE_AUTH_DOMAIN`        |
| `projectId`          | `VITE_FIREBASE_PROJECT_ID`         |
| `storageBucket`      | `VITE_FIREBASE_STORAGE_BUCKET`     |
| `messagingSenderId`  | `VITE_FIREBASE_MESSAGING_SENDER_ID`|
| `appId`              | `VITE_FIREBASE_APP_ID`             |

If you lose this screen: **⚙ Project settings → General → Your apps**.

> These values are not secrets — they ship in the client bundle of every
> Firebase web app by design. Access is controlled by the security rules, which
> is why those rules matter. `.env` is gitignored regardless.

## 3. Enable Firestore

**Build → Firestore Database → Create database**

- Start in **production mode** (locked down; we deploy real rules in step 2 of
  the build order).
- Pick a region close to where the event is. **This cannot be changed later.**

## 4. Enable Storage

**Build → Storage → Get started**

- Production mode again.
- Same region as Firestore.
- This is where the Blaze upgrade prompt appears, if it hasn't already.

## 5. Enable Auth and create the admin account

1. **Build → Authentication → Get started**.
2. Under **Sign-in method**, enable **Email/Password** (leave passwordless off).
3. Go to the **Users** tab → **Add user**. Use a real email and a strong
   password — this is the only account that can moderate or seed photos.
4. In the users list, copy the **User UID** (a ~28-character string).

**Send me that UID.** It gets pasted into both rule files where
`REPLACE_WITH_ADMIN_UID` appears. It's an identifier, not a credential — it is
safe to share, and it's already visible to anyone reading the deployed rules.
Never send the password.

## 6. Pick an event id

Any slug — `sams-birthday`, `spring-2026`. Put it in `.env` as
`VITE_EVENT_ID`. It becomes the Firestore document id and appears in the guest
QR link, so keep it short and not easily guessable if you'd rather strangers
didn't find the upload page.

---

## What you should have at the end

- [ ] `.env` created with all six `VITE_FIREBASE_*` values plus `VITE_EVENT_ID`
- [ ] Firestore enabled
- [ ] Storage enabled
- [ ] Email/password auth on, one admin user created
- [ ] The admin UID copied down

Then run `npm run dev` — the red "Not configured yet" notice should be gone from
all three routes. That's the signal the wiring is correct.

## Still to come

- **Composite index**: the display query (`hidden == false` ordered by
  `createdAt`) needs one. Firestore will print a direct creation link in the
  browser console the first time the query runs — click it, wait a minute for
  the index to build.
- **Rules**: written and deployed once the admin UID exists.
