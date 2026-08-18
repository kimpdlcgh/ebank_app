# Runbox email for safeguardsecurities.us

Move company mail from **Namecheap cPanel** to **Runbox**, while keeping the **website on Firebase**.

Official Runbox docs: [Email Hosting](https://help.runbox.com/email-hosting/) · [Moving email to Runbox](https://help.runbox.com/moving-your-domains-email-to-runbox/) · [Email program settings](https://help.runbox.com/email-program-settings/)

---

## Overview

| Service | Stays where | DNS |
|---------|-------------|-----|
| Website (`www`, `app`, apex) | **Firebase** | Do **not** change `@` → `199.36.158.100`, `www` CNAME, Firebase TXT |
| **Email** (`info@`, `admin@`, …) | **Runbox** | Change **MX**, **SPF**, **DKIM**, **DMARC** at Namecheap |
| Old cPanel webmail (`mail.`, `webmail.`, `:2096`) | **Retire** after cutover | Remove or stop using |

---

## Part 1 — Runbox account

### Option A — New main address on your domain (recommended)

1. Go to [https://runbox.com/signup](https://runbox.com/signup)
2. Choose **Use your own domain**
3. Enter the address you want as primary (e.g. `info@safeguardsecurities.us`)
4. Complete signup and **verify** the backup email Runbox sends
5. **Pay for subscription** (or validate backup email) so **SMTP (sending)** works

### Option B — Existing `@runbox.com` account

1. Log in → **Account** → **Email Hosting**
2. Add domain: `safeguardsecurities.us`
3. Status may show **Pending** until DNS is correct

---

## Part 2 — Addresses for staff

| Need | Runbox setting |
|------|----------------|
| `info@safeguardsecurities.us` same inbox as main | Main account or **Alias** |
| `admin@safeguardsecurities.us`, other staff | **Account → Aliases** (same inbox) or **Sub-accounts** (separate login/inbox) |

1. **Account → Aliases** → add each address (e.g. `admin@safeguardsecurities.us`)
2. Wait **~15 minutes** for aliases to activate
3. Do **not** enable **Catch-all** unless you want every `random@safeguardsecurities.us` in one inbox (more spam)

**Filters:** Mail to aliases lands in the main Inbox unless you add Runbox filters to sort into folders.

---

## Part 3 — Namecheap DNS (Advanced DNS)

**Domain List → safeguardsecurities.us → Advanced DNS**

### Remove or replace (old cPanel mail)

Delete (or edit) records that point mail to Namecheap hosting, for example:

| Remove / replace | Typical old value |
|------------------|-------------------|
| **MX** `@` | `mx1.web-hosting.com`, `mx2.web-hosting.com`, or similar |
| **TXT** `@` SPF | `v=spf1 ... web-hosting.com ...` |
| **TXT/CNAME** DKIM | `default._domainkey` (cPanel) |

You can **remove** `mail` and `webmail` **A** → `63.250.38.111` after cutover (no longer needed for Runbox). Optional: leave `mail` pointing to a simple redirect page later.

### Add (Runbox — required)

| Host | Type | Priority | TTL | Value |
|------|------|----------|-----|--------|
| `@` | **MX** | **10** | 3600 (or Automatic) | `mx.runbox.com.` |
| `@` | **TXT** | — | 3600 | `v=spf1 include:spf.runbox.com -all` |

**Note:** Some UIs want the trailing dot on `mx.runbox.com.` — if it fails, try without the dot.

### Add (Runbox DKIM — from your Runbox panel)

1. Runbox → **Account** → **Email Hosting** → your domain → **DKIM**
2. Generate keys if needed
3. Copy the **two CNAME** records shown (hostnames like `selector1._domainkey`, `selector2._domainkey`)
4. Add them in Namecheap exactly as Runbox displays (with or without trailing `.` per Namecheap’s other records)

### Add (DMARC — recommended)

| Host | Type | Value |
|------|------|--------|
| `_dmarc` | **TXT** | `v=DMARC1; p=none; pct=100;` |

Start with `p=none` (monitoring). Later you can tighten to `quarantine` or `reject` after DKIM/SPF pass.

### Keep unchanged (Firebase / website)

Do **not** delete:

- `@` **A** → `199.36.158.100` (Firebase apex)
- `www` **CNAME** → `safeguard-marketing.web.app` (or your Firebase target)
- `app` and other Firebase hosting records
- Firebase **TXT** / DKIM (`firebase1`, `firebase2`) if you use Firebase Auth email

---

## Part 4 — Verify DNS

1. Runbox help tool: [Check your domain’s DNS for Runbox](https://help.runbox.com/email-hosting/) (on that page)
2. Or [MXToolbox](https://mxtoolbox.com/SuperTool.aspx?action=mx%3asafeguardsecurities.us) — MX should be `mx.runbox.com`
3. Wait **15 minutes–48 hours** for full propagation; Runbox domain status should leave **Pending**

---

## Part 5 — Webmail & apps (no more orange cPanel page)

| Use | URL / settings |
|-----|----------------|
| **Browser mail** | [https://runbox.com](https://runbox.com) → sign in with your Runbox username (e.g. `info@safeguardsecurities.us`) |
| **IMAP (incoming)** | Server: `mail.runbox.com` · Port: **993** · SSL/TLS · Password |
| **SMTP (outgoing)** | Server: `mail.runbox.com` · Port: **465** (SSL) or **587** (STARTTLS) · Password |
| **Username** | Full Runbox primary address (or sub-account address) |

**Sending:** SMTP stays disabled until the account is **paid** or the **backup email is validated**.

**Phones:** iPhone/Android → add account → Other / IMAP → use settings above. “From” address can be your `@safeguardsecurities.us` alias if configured in Runbox.

---

## Part 6 — Migrate from cPanel (safe order)

1. **Create** Runbox account + **aliases** (and sub-accounts if needed)
2. **Add** DNS records above (MX last if you want minimal overlap, or MX when ready to switch)
3. **Test** Runbox: send from Runbox webmail to a Gmail address; reply to confirm SPF/DKIM
4. **Change MX** to `mx.runbox.com` when ready for inbound mail at Runbox
5. **Wait up to 24 hours** — some senders still use old MX cache
6. **Import old mail** (optional): Runbox → **Manager → Retrieve → IMAP Import** from cPanel:
   - IMAP host: `mail.safeguardsecurities.us` (while cPanel still works) or server from old **Connect Devices**
   - Port 993, full email, mailbox password
7. **Stop using** cPanel Email Accounts / orange webmail / `:2096`
8. Remove old MX / cPanel SPF / cPanel DKIM from Namecheap when satisfied

---

## Part 7 — Optional site updates (this repo)

After mail is on Runbox:

- Change `firebase.json` `/webmail` redirect from `mail.:2096` to `https://runbox.com` (or your Runbox login URL)
- Update `cpanel-upload/mail.safeguardsecurities.us/index.html` to link to Runbox instead of cPanel

Deploy marketing site only if you change redirects:

```powershell
.\scripts\deploy-site.ps1
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Mail still goes to cPanel | MX not updated or DNS cache — wait; check MXToolbox |
| Can receive, cannot send | Pay Runbox or validate backup email; check SMTP 465/587 + SSL |
| Gmail marks as spam | Confirm SPF + DKIM + DMARC in Namecheap; use Runbox DNS checker |
| “Invalid login” on **old** cPanel webmail | Expected after MX move — use **runbox.com** webmail |
| Alias bounces | Wait 15 min; confirm alias exists in Runbox |
| Runbox domain “inactive” | MX must include `mx.runbox.com` (or contact Runbox for third-party spam filter setup) |

---

## Quick checklist

- [ ] Runbox account with `safeguardsecurities.us` in Email Hosting
- [ ] Aliases / sub-accounts for staff addresses
- [ ] Namecheap MX → `mx.runbox.com`
- [ ] Namecheap SPF TXT → `v=spf1 include:spf.runbox.com -all`
- [ ] DKIM CNAMEs from Runbox panel added
- [ ] `_dmarc` TXT added
- [ ] Firebase DNS left intact
- [ ] Test send/receive; then retire cPanel webmail

For Runbox-specific issues: **Runbox Support** from the webmail **Help** menu.
