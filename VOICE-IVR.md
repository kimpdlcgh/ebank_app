# Voice receptionist & IVR (Twilio + Firebase)

Simple phone system for client calls:

- **Receptionist greeting** (AWS Polly voice)
- **IVR menu** (press 1–4 or 0)
- **Call routing** to your team’s mobile/office numbers
- **Optional after-hours voicemail** (Mon–Fri 9 AM–5 PM Eastern)

Runs on **Firebase Cloud Functions** (`voice`) in project **`e-bank-dashboard`**, **or** on **Cloudflare Workers** (`voice-worker/`) if you are not on Firebase Blaze yet.

---

## Architecture

```
Client calls your Twilio number
        ↓
Twilio Voice webhook (POST)
        ↓
https://us-central1-e-bank-dashboard.cloudfunctions.net/voice
        ↓
TwiML (say / gather / dial / record)
        ↓
Rings receptionist or department number
```

You need a **Twilio account** and a **phone number** (new number from Twilio, or port/forward your existing line).

---

## Choose how to host the webhook

| Path | Requires | Best when |
|------|----------|-----------|
| **A. Firebase** (`functions/voice`) | [Blaze plan](https://console.firebase.google.com/project/e-bank-dashboard/usage/details) (pay-as-you-go; low volume ≈ $0) | You already use Firebase for the site |
| **B. Cloudflare Worker** (`voice-worker/`) | Free Cloudflare account + `wrangler deploy` | Blaze upgrade blocked or you want fastest deploy |

Both use the same Twilio number webhook (POST). Steps below: **Twilio** is shared; **hosting** is A or B.

### B. Cloudflare (no Blaze)

```powershell
cd D:\safeguardsecurities
.\scripts\deploy-voice-cloudflare.ps1
```

Then set Twilio voice webhook to the `*.workers.dev` URL printed by Wrangler.

---

## 1. Twilio setup

1. Sign up at [https://www.twilio.com](https://www.twilio.com)
2. Buy a **Voice** number (US local, e.g. 216 area code) **or** port `+1 216 250 7891`
3. Console → **Phone Numbers** → your number → **Voice configuration**
   - **A call comes in:** Webhook, **POST**
   - URL: *(paste after deploy, step 3 below)*

Copy **Account SID** and **Auth Token** (Auth Token is used by Firebase to verify webhooks).

---

## 2. Configure `functions/.env`

Copy the example file and add your Twilio **main Auth Token** (not a restricted API key):

```powershell
cd D:\safeguardsecurities\functions
copy .env.example .env
notepad .env
```

| Variable | Example | Required |
|----------|---------|----------|
| `TWILIO_AUTH_TOKEN` | from Twilio Console → Account → API keys & tokens | Yes |
| `VOICE_RECEPTIONIST_PHONE` | `+12162507891` (E.164, rings on **0**) | Yes |
| `VOICE_CLIENT_SERVICES_PHONE` | same or another line for **1** | Optional |
| `VOICE_NEW_ACCOUNTS_PHONE` | for **2** | Optional |
| `VOICE_SUPPORT_PHONE` | for **3** | Optional |
| `VOICE_AFTER_HOURS_ENABLED` | `true` for voicemail outside 9–5 ET weekdays | Optional |

Never commit `functions/.env` (it is gitignored).

**Note:** Firebase **Secret Manager** (`functions:secrets:set`) requires the **Blaze** plan. This project uses `.env` on deploy instead so you can ship on Spark if Functions are enabled.

---

## 3. Deploy

```powershell
cd D:\safeguardsecurities
.\scripts\deploy-voice.ps1
```

Or manually:

```powershell
firebase deploy --only functions:voice --project e-bank-dashboard
```

Copy the **`voice`** function URL from the deploy output, e.g.:

`https://us-central1-e-bank-dashboard.cloudfunctions.net/voice`

Paste that into Twilio → your number → **Voice** → **A call comes in** → Webhook **POST**.

---

## 4. IVR menu (default)

| Key | Routes to |
|-----|-----------|
| **1** | Client services / existing accounts → `VOICE_CLIENT_SERVICES_PHONE` or receptionist |
| **2** | New accounts & onboarding → `VOICE_NEW_ACCOUNTS_PHONE` or receptionist |
| **3** | Technical support → `VOICE_SUPPORT_PHONE` or receptionist |
| **4** | Office hours & address (spoken message, then menu) |
| **0** | Receptionist → `VOICE_RECEPTIONIST_PHONE` |

If an agent does not answer within 30 seconds, caller can leave a voicemail or return to the menu.

---

## 5. Test

1. Call your Twilio number from a mobile phone.
2. Listen for the greeting and press **0** to test receptionist ring-through.
3. Check **Firebase** → Functions → **Logs** for `Voice: welcome menu` / `Voice: route`.

---

## 6. Use your published website number

Today the site shows **+1 216 250 7891** in `assets/site-config.js`. To use this IVR as that number:

- **Option A:** Port the number to Twilio (Twilio porting wizard), **or**
- **Option B:** Forward your current carrier number to the Twilio number (carrier “call forward all”).

Update `site-config.js` only if the **public** number changes.

---

## 7. Compliance notes (finance / brokerage)

- Greeting includes *“This call may be recorded for quality and compliance.”*
- Review call recording laws for Ohio/your states.
- Twilio **call recording** for voicemails is stored in Twilio Console → **Monitor** → **Logs** → **Calls** (enable recording storage in Twilio if needed).
- For production, consider Twilio **Elastic SIP** or enterprise support; this stack is a lean starter IVR.

---

## 8. Customize menu / messages

Edit:

- `functions/voice/twiml.js` — spoken prompts
- `functions/voice/config.js` — menu keys, business hours, info message

Redeploy: `firebase deploy --only functions:voice --project e-bank-dashboard`

---

## Troubleshooting

| Issue | Fix |
|--------|-----|
| Twilio says application error | Check Functions logs; ensure `TWILIO_AUTH_TOKEN` matches Twilio console |
| 403 Forbidden | Webhook URL in Twilio must match deployed URL exactly (https, no typo) |
| Phone never rings | `VOICE_RECEPTIONIST_PHONE` must be E.164 `+1...`; Twilio trial only rings **verified** numbers |
| No after-hours | Set `VOICE_AFTER_HOURS_ENABLED=true` and call outside 9–5 ET weekdays |

---

## Files

| Path | Purpose |
|------|---------|
| `functions/index.js` | Exports `voice` HTTPS function |
| `functions/voice/config.js` | Hours, routing numbers, menu |
| `functions/voice/twiml.js` | TwiML prompts |
| `functions/voice/handlers.js` | Step router (`welcome`, `route`, `dial-complete`) |
| `functions/voice/validate.js` | Twilio signature check |
