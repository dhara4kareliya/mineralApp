# Expense Hub (HTML)

Mobile expense app in plain HTML / CSS / JavaScript — no Vite, no React.

## Features

- Login with email, password, and OTP
- Expenses list, detail, and add form
- English / Hebrew with LTR ↔ RTL
- Light / Dark theme
- User name + logout
- Realtime expense updates (Socket.IO pulse + toast)

## Run

Open with any static server (needed for modules/CORS-free relative paths):

```bash
# Python
python3 -m http.server 8770

# or Node
npx serve .
```

Then open: http://localhost:8770/login.html

## Config

Set your Biz1 domain in [`js/config.js`](js/config.js):

```js
window.APP_CONFIG = {
  API_DOMAIN: 'https://kophangan.bull36.com'
};
```

## Files

| Path | Purpose |
|---|---|
| `login.html` | Login + OTP |
| `expenses.html` | Expense list / add / detail |
| `js/config.js` | API domain |
| `js/api.js` | Biz1 API + auth + realtime |
| `js/i18n.js` | EN/HE translations + theme |
| `js/expenses.js` | Expenses page logic |
| `css/app.css` | Mobile UI styles |

## API

Uses [Expenses](https://eli.bull36.com/app/help/category/Expenses) routes on your domain, including `Expenses.CategoriesList` for category dropdowns.
