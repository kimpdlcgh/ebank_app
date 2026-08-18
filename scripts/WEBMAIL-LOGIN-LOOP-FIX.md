# Webmail login loop (orange page — back to login after submit)

## Symptom

- Orange **Webmail** login (cPanel / Roundcube)
- Correct **full email** + **mailbox password** from cPanel → Email Accounts
- After **Log in**, page returns to the same login screen (incognito too)

## Root cause (confirmed on your server)

| URL staff use | Problem |
|---------------|---------|
| **https://webmail.safeguardsecurities.us** (port 443) | Server sends session cookies with **`port=444`**. The browser is on **443**, so it **does not store/send** those cookies → session never sticks → login loop. |
| **https://mail.safeguardsecurities.us:2096/** | Cookies use **`port=2096`** — **matches** the URL → login can work. |

Staff must **not** use `webmail.safeguardsecurities.us` until SSL/cookie config is fixed in cPanel. Use **mail.:2096** only.

---

## Fix 1 — Staff bookmark (do this first)

**Only URL for browser webmail:**

**https://mail.safeguardsecurities.us:2096/**

1. Incognito → open that URL (include **:2096**).
2. Email: full address, e.g. `info@safeguardsecurities.us` (not `admin@` unless that mailbox exists in Email Accounts).
3. Password: **mailbox** password (cPanel → Email Accounts → **Manage** / reset — not hosting login, not client portal).

---

## Fix 2 — Upload files in cPanel (stops wrong URL)

**File Manager:**

| Upload this file | Into folder |
|------------------|-------------|
| `cpanel-upload/webmail.safeguardsecurities.us/.htaccess` | `webmail.safeguardsecurities.us` |
| `cpanel-upload/webmail.safeguardsecurities.us/index.html` | `webmail.safeguardsecurities.us` |
| `cpanel-upload/mail.safeguardsecurities.us/index.html` | `mail.safeguardsecurities.us` |
| `cpanel-upload/mail.safeguardsecurities.us/login.html` | `mail.safeguardsecurities.us` |

After upload, **https://webmail.safeguardsecurities.us** should redirect to **mail.:2096**.

---

## Fix 3 — cPanel redirects (remove bad rules)

**cPanel → Domains → Redirects**

**Remove** any rule that sends:

- `mail.safeguardsecurities.us` → `webmail.safeguardsecurities.us`
- `https://mail...` → `https://webmail...` (without `:2096`)

**Optional add:**

| Type | From | To |
|------|------|-----|
| 302 | `https://webmail.safeguardsecurities.us` | `https://mail.safeguardsecurities.us:2096/` |

---

## Fix 4 — SSL on mail services (mobile + padlock)

1. cPanel → **SSL/TLS Status**
2. Select **mail.safeguardsecurities.us** (valid cert)
3. **Install on mail / webmail / exim / dovecot** (wording varies)
4. Retest **https://mail.safeguardsecurities.us:2096/** in incognito (padlock)

See `scripts/MAIL-2096-SSL-FIX.md`.

---

## Fix 5 — Mailbox still “invalid username”

cPanel → **Email Accounts**:

- Confirm the address exists (e.g. create **admin@safeguardsecurities.us** if needed).
- **Manage** → set a new password.
- Sign in with **full email** + that new password on **mail.:2096** only.

---

## Fix 6 — iPhone / Android browser

If **mail.:2096** still loops:

1. **Settings → Safari** → turn off **Prevent Cross-Site Tracking** (test once), or use **Chrome**.
2. Clear website data for `mail.safeguardsecurities.us` and `webmail.safeguardsecurities.us`.
3. Do not open webmail from **cPanel “Check Email”** until Fix 2 is uploaded (it may open the broken `webmail.` host).

---

## Long-term (optional)

Issue Let’s Encrypt for **webmail.safeguardsecurities.us** and fix cPanel so port-443 webmail cookies match 443 (Namecheap support if needed).

---

## Not webmail

| Page | URL |
|------|-----|
| Client portal (blue) | https://safeguardsecurities.us/signin |
| Trading app | https://app.safeguardsecurities.us/login |
