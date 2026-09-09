# Time Tracking & Timesheets (HTML)

Vanilla HTML/CSS/JS app connected to the [Biz1 App API](https://eli.bull36.com/app/help).

## Features

- **Login** with email/username/ID, password, and OTP (2FA) support
- **Live shift control** — start and end via `TeamHours.*` routes
- **Live clock** — session timer with daily and monthly totals
- **Attendance history** — session log from `TeamHours.List`
- **Realtime updates** — WebSocket via Biz1 SDK
- **Light / dark theme** — toggle on login and dashboard (saved in browser)
- **English & Hebrew** — language switcher with RTL layout for Hebrew

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
cd "/Users/kareliyainfo/Dhara/time tracking"
python3 -m http.server 8080
```

Then visit `http://localhost:8080/login.html` (or `home.html` if already signed in).

> `index.html` redirects to login or home based on your saved session.

## Pages

| Page | Purpose |
|------|---------|
| `login.html` | Sign in (email/username/ID + password) |
| `home.html` | Time tracking dashboard (requires login) |
| `calendar.html` | Month calendar, notes & sick days |
| `index.html` | Auto-redirect to login or home |

## Login

1. **Email, username, or user ID**
2. **Password** from your Biz1 account
3. If OTP is required, enter the code emailed to you

The app connects to `https://eli.bull36.com` automatically (configured in `js/config.js`).

## API routes used

| Feature | Route |
|---------|--------|
| Login | `Login` |
| User profile | `User.Basic` |
| Clock status | `TeamHours.Get` |
| Start / stop shift | `TeamHours.StartStop` |
| Pre-stop summary | `TeamHours.WhenStop` |
| Session history | `TeamHours.List` |
| Monthly totals | `Workdiary.List` |
| Realtime | Socket.IO at `/realtime/socket.io` |

## Files

```
login.html       Login page
home.html        Shift control & attendance history
calendar.html    Month calendar, notes & sick days
index.html       Redirect helper
css/app.css      Styles, theme, responsive layout
js/guard.js      Instant auth redirect (before page paint)
js/ui.js         Shared UI helpers & toasts
js/login.js      Login page logic
js/calendar.js   Calendar, notes & sick days page
js/home.js       Dashboard page logic
js/i18n.js       English / Hebrew translations & RTL
js/config.js     Domain and socket config
js/utils.js      Time formatting helpers
js/api.js        Biz1 SDK wrapper
js/auth.js       Login / session
js/realtime.js   WebSocket connection
js/timesheet.js  Time tracking module
js/app.js        UI wiring and bootstrap
```
