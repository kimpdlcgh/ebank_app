# Staff cannot log in (mobile / Webmail / wrong page)

## What the screenshot shows

| Field | Value |
|-------|--------|
| Page title | **Webmail Login** (cPanel / Roundcube) |
| URL | `safeguardsecurities.us/login` |
| Error | **The submitted username is invalid.** |
| Username tried | `admin@safeguardsecurities.us` |

That is **company email (webmail)**, not the **client investment portal**.

Portal login (Firebase) uses a different page and different passwords. Webmail only accepts **mailboxes that exist in cPanel → Email Accounts**.

---

## Fix A — Staff need **email** (`admin@…`)

1. Log in to **cPanel** (Namecheap hosting): `https://premium313.web-hosting.com:2083`  
   Use your **hosting** username/password (not Firebase, not webmail).
2. **Email Accounts** → check whether **`admin@safeguardsecurities.us`** exists.
3. If it does **not** exist:
   - **Create** the account (or use an existing address such as `info@safeguardsecurities.us`).
   - Set a **new mailbox password** (not the cPanel login password).
4. Staff open webmail at:
   - **https://mail.safeguardsecurities.us:2096/**  
   (or **https://webmail.safeguardsecurities.us** after SSL is OK)
5. Sign in with:
   - **Email:** full address, e.g. `admin@safeguardsecurities.us`
   - **Password:** the **mailbox** password from step 3

If the username is still “invalid”, the mailbox was not created on **this** server or DNS is pointing mail to the wrong host.

---

## Fix B — Staff need the **client / investment portal**

Do **not** use the orange **Webmail** screen.

| Use this URL | Credentials |
|--------------|-------------|
| **https://app.safeguardsecurities.us/login** | Email + password from **Register** on the site (Firebase) |

Alternative (same Firebase login, hosted on marketing site):

- **https://safeguardsecurities.us/login.html**

If staff see **Webmail** at `safeguardsecurities.us/login`, their phone is hitting the **old cPanel copy** of the domain, not Firebase.

---

## Fix C — Stop `safeguardsecurities.us/login` opening Webmail (DNS + cPanel)

The live marketing site on **Firebase** serves the blue **Safeguard Securities** portal login at `/login`, not Webmail.

If staff still see **Webmail** on that URL:

### 1. Namecheap → Advanced DNS

| Host | Type | Must be |
|------|------|---------|
| `@` | A | `199.36.158.100` (Firebase only) |
| `www` | CNAME | `safeguard-marketing.web.app` |

Remove any **second** `@` A record pointing to `63.250.38.111` (cPanel).  
Keep **`mail`** and **`webmail`** A → `63.250.38.111` only.

### 2. cPanel → Redirects

Remove any rule that sends:

- `safeguardsecurities.us/login` → webmail  
- `https://safeguardsecurities.us/*` → cPanel webmail

### 3. cPanel → File Manager

Open folder **`safeguardsecurities.us`** (addon domain on the server).

- Delete or fix any **`login`** file, **`login/`** folder, or **`.htaccess`** rule that forwards `/login` to webmail.
- The public website for that domain should be on **Firebase**, not duplicated on cPanel.

### 4. Staff phones

- Clear browser cache / site data for `safeguardsecurities.us`
- Or use **Chrome incognito** and open **https://app.safeguardsecurities.us/login**

---

## Quick reference for staff (share this)

**Check company email (orange Webmail page)**

- URL: **https://mail.safeguardsecurities.us:2096/** only — **not** `webmail.safeguardsecurities.us` (causes login loop; see `scripts/WEBMAIL-LOGIN-LOOP-FIX.md`)
- Do **not** use `safeguardsecurities.us/login` for email
- User: full email (`info@safeguardsecurities.us` or `admin@…` only if created in cPanel)
- Pass: mailbox password from cPanel → **Email Accounts**

**Log in to the client / investment portal (blue “Welcome Back” page)**

- URL: **https://safeguardsecurities.us/signin** (old `/login` may open Webmail by mistake)
- Or: **https://app.safeguardsecurities.us/login**
- User: email you registered with
- Pass: app password (from registration — not webmail, not cPanel)

## cPanel upload (stops Webmail on `/login` for traffic that hits the server)

Upload via File Manager:

1. `cpanel-upload/safeguardsecurities.us/.htaccess` → folder **`safeguardsecurities.us`**
2. `cpanel-upload/mail.safeguardsecurities.us/login.html` → folder **`mail.safeguardsecurities.us`**

---

## Fix D — Portal login “loops” after submit (incognito too)

**Cause:** `login.html` redirected to `backend/ebank_app/dist/#/dashboard`, which **does not exist** on Firebase Hosting (404). The 404 page links to **Webmail**, so users looked like they were “sent back to login.”

**Fix in repo:** Post-login now goes to **`dashboard.html`** on the marketing site (same Firebase session). Legacy `/backend/ebank_app/**` URLs redirect to **`https://app.safeguardsecurities.us/`**.

**Deploy:**

```powershell
.\scripts\deploy-site.ps1
```

After deploy, test in incognito:

1. **https://safeguardsecurities.us/login** → sign in → should land on **dashboard.html** (blue Safeguard page, not orange Webmail).
2. Full **investment app:** **https://app.safeguardsecurities.us/login** (separate sign-in if needed).
