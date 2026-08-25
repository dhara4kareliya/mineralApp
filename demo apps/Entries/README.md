# Entries — Biz1 (HTML + JS)

Vanilla HTML/JS module for Biz1 [Entries](https://eli.bull36.com/app/help/category/Entries).

Public URL:

`https://apps.bull36.com/{username}/entries/`

Example: `https://apps.bull36.com/szp123/entries/`

The `{username}` segment sets the API host to `https://{username}.bull36.com`.

## Pages

| File | Purpose |
|------|---------|
| `index.html` | Entries app (canonical URL: `/{username}/entries/`) |
| `login.html` | Login with email/username/phone/ID + password + OTP/resend |
| `entries.html` | Redirects to `./` |

## Scripts

| File | Purpose |
|------|---------|
| `js/config.js` | Resolves `{username}` and API domain from the URL |
| `js/api.js` | `Login`, `User.Basic`, `Entries.*`, Socket.IO realtime |
| `js/ui.js` | Light/dark theme + toasts |
| `js/login.js` | Login page logic |
| `js/entries.js` | Entries page logic |
| `css/entries.css` | Card UI, responsive layout, pulse animation |

## Run

```bash
npm start
# open http://127.0.0.1:8770/login.html
```

Or deploy this folder to `https://apps.bull36.com/{username}/entries/`.

## API flow

1. `Login` → bearer token (or `otp_required`)
2. `User.Basic` → folders + team members
3. `Customer.List` / `EntriesSettings.List` / `Entries.List` with `customer_id`
4. Socket.IO `/realtime/socket.io` → live pulse + toast on create/update/delete
