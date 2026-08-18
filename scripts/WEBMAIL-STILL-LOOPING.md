# Webmail still loops on mail.safeguardsecurities.us:2096

You are on the **correct URL** and still return to the orange login page. That usually means the **mail server is rejecting the login** or **the session breaks right after login** — not a wrong bookmark.

---

## Why there is no popup (webmail only)

cPanel **Webmail does not show a browser popup** for failed login. It is not like the blue client portal.

| What you might expect | What cPanel actually does |
|----------------------|---------------------------|
| Alert / popup saying “invalid” | **No popup** — a **red notice bar** under the Webmail logo (easy to miss on mobile) |
| Stays on screen until you dismiss | Message often **fades away after ~8 seconds** |
| Wrong password | Should show **“The login is invalid.”** in that red bar (if JavaScript is on) |
| Wrong email / missing mailbox | **“The submitted username is invalid.”** |
| Password correct but back to login with **no** message | **Session loop** (server/cookies) — not the same as “invalid password” |

If changing the mailbox password in **Email Accounts → Manage** fixed it, the password was wrong before; the red bar may have appeared too briefly to notice, or the page reloaded before you saw it.

**Use Chrome (not in-app browser), full email, mailbox password, URL with `:2096`.**

---

## Step 1 — Read the red error (important)

After you click **Log in**, wait 2 seconds. What does the red banner say?

| Message | Meaning |
|---------|---------|
| **The submitted username is invalid** | Mailbox does not exist, wrong address, or IMAP/Roundcube cannot see that user |
| **The login is invalid** | Wrong password, or server auth block (cPHulk, firewall) |
| **Login successful. Redirecting…** then back to login | Session/cookie or Roundcube database issue (server-side) |
| (no message, just login again) | Often cookie/browser; try Chrome desktop |

Tell support which message you see.

---

## Step 2 — Reset the mailbox (in cPanel, 5 minutes)

1. **https://premium313.web-hosting.com:2083** → your **hosting** login (not webmail).
2. **Email Accounts**.
3. Find the address (e.g. `info@safeguardsecurities.us`).  
   - If **`admin@safeguardsecurities.us` is not listed**, click **Create** and make it (or use an address that **is** listed).
4. Click **Manage** → **Change Password** → set a **new** password (12+ characters, no spaces).
5. Wait **5 minutes**.
6. Incognito → **https://mail.safeguardsecurities.us:2096/**  
   - User: **full email** exactly as shown in Email Accounts  
   - Pass: **new** mailbox password only (not hosting, not client portal)

Also try once with **username only** (part before `@`) if full email fails.

---

## Step 3 — Open webmail the way cPanel expects

In **Email Accounts**, click **Check Email** (or **Open**).

- Note the URL it opens.
- If it is **not** `mail.safeguardsecurities.us:2096`, tell Namecheap support.
- After uploading repo files (`cpanel-upload/webmail.../.htaccess`), **Check Email** should still work.

Alternative direct link (bypasses some redirects):

**https://premium313.web-hosting.com:2096/**

Log in with the **same** full email + mailbox password.

---

## Step 4 — Confirm mail actually works (IMAP test)

In cPanel → **Email Accounts** → **Connect Devices** / **Configure Mail Client**:

- Note **IMAP** host: `mail.safeguardsecurities.us`, port **993**, SSL on.
- Add that account to **iPhone Mail** or **Outlook** with the same email + mailbox password.

| Result | Next step |
|--------|-----------|
| **Phone/Outlook works** | Credentials are fine → webmail/Roundcube is broken; open Namecheap ticket (Step 5) |
| **Phone/Outlook fails** | Mailbox or server mail stack broken → Namecheap must fix Dovecot/Exim |

---

## Step 5 — Namecheap ticket (copy/paste)

Subject: **Webmail login loop on premium313 – safeguardsecurities.us**

Body:

> Webmail on **https://mail.safeguardsecurities.us:2096/** returns to the login page after submitting valid mailbox credentials from Email Accounts (also tested incognito).  
> Domain: safeguardsecurities.us  
> Server: premium313.web-hosting.com (63.250.38.111)  
> Please check:  
> - Mailbox exists and is not suspended  
> - Dovecot + Exim running  
> - `/var/log/maillog` and `/usr/local/cpanel/logs/error_log` at login time  
> - Roundcube session / `.rcube.db` for the user  
> - cPHulk / firewall not blocking our IP  
> - Server time NTP sync  
> - Run if needed: `/usr/local/cpanel/scripts/updateuserdomains --force`  
> - Webmail on port 2096: session cookies should use port **2096** (not 444 on port 443)

---

## Step 6 — Staff workaround until fixed

Use **phone/computer mail app** (IMAP) from **Connect Devices** in cPanel — does not need the orange webmail page.

---

## Not these (common mistakes)

| Wrong | Right |
|-------|--------|
| cPanel **hosting** password | **Mailbox** password (Email Accounts → Manage) |
| Client portal password (`/signin`) | Webmail / IMAP password |
| `admin@…` without creating mailbox | Create in Email Accounts first |
| Only `webmail.safeguardsecurities.us` (no :2096) | **mail.safeguardsecurities.us:2096** |

---

## Repo files to upload (if not done)

| File | cPanel folder |
|------|----------------|
| `cpanel-upload/webmail.safeguardsecurities.us/.htaccess` | `webmail.safeguardsecurities.us` |
| `cpanel-upload/webmail.safeguardsecurities.us/index.html` | `webmail.safeguardsecurities.us` |
| `cpanel-upload/mail.safeguardsecurities.us/index.html` | `mail.safeguardsecurities.us` |

These stop staff from using the broken **webmail.** host; they do **not** fix server auth by themselves.
