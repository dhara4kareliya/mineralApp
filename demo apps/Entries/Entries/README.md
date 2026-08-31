# Entries — Biz1 (HTML + JS)

Vanilla HTML/JS module for Biz1 [Entries](https://eli.bull36.com/app/help/category/Entries).

## Pages

| File | Purpose |
|------|---------|
| `index.html` | Redirects to login or entries |
| `login.html` | Login with email/username/phone/ID + password + OTP/resend |
| `entries.html` | Entry tabs, search, add / edit / delete, live pulse + toast |

## Scripts

| File | Purpose |
|------|---------|
| `js/config.js` | API domain (`eli.bull36.com`) |
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

Or any static server from this folder.

## API flow

1. `Login` → bearer token (or `otp_required`)
2. `User.Basic` → `data.entries.list` / `tabs` + fields
3. `Entries.List` / `Count` / `Add` / `Update` / `Delete` with `entry_id`
4. Socket.IO `/realtime/socket.io` → green pulse + toast on create/update/delete

Change host in `js/config.js` → `API_DOMAIN` if you use another `*.bull36.com` account.
