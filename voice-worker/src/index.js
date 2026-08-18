/**
 * Safeguard Securities — Twilio Voice IVR (Cloudflare Worker).
 * Deploy without Firebase Blaze. Set secrets in wrangler.toml / dashboard.
 */

const MENU = {
  1: { label: "client services and existing accounts", key: "CLIENT" },
  2: { label: "new accounts and onboarding", key: "NEW" },
  3: { label: "technical support", key: "SUPPORT" },
  4: { label: "office hours and location", type: "info" },
  0: { label: "receptionist", key: "RECEPTIONIST" },
};

function xml(body) {
  return new Response(body, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

function say(message) {
  return `<Say voice="Polly.Joanna" language="en-US">${escapeXml(message)}</Say>`;
}

function escapeXml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function phone(env, key) {
  const map = {
    RECEPTIONIST: env.VOICE_RECEPTIONIST_PHONE,
    CLIENT: env.VOICE_CLIENT_SERVICES_PHONE || env.VOICE_RECEPTIONIST_PHONE,
    NEW: env.VOICE_NEW_ACCOUNTS_PHONE || env.VOICE_RECEPTIONIST_PHONE,
    SUPPORT: env.VOICE_SUPPORT_PHONE || env.VOICE_RECEPTIONIST_PHONE,
  };
  return normalizeE164(map[key] || "");
}

function normalizeE164(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits || digits === "+") return "";
  if (/^\+\d{10,15}$/.test(digits)) return digits;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  const onlyDigits = digits.replace(/\D/g, "");
  if (onlyDigits.length === 10) return `+1${onlyDigits}`;
  if (onlyDigits.length === 11 && onlyDigits.startsWith("1")) return `+${onlyDigits}`;
  return "";
}

function isBusinessOpen(env) {
  if (String(env.VOICE_AFTER_HOURS_ENABLED || "false").toLowerCase() !== "true") {
    return true;
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  const weekday = parts.find((p) => p.type === "weekday")?.value || "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value || 0);
  const dayMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };
  const day = dayMap[weekday] ?? 0;
  if (![1, 2, 3, 4, 5].includes(day)) return false;
  return hour >= 9 && hour < 17;
}

function welcomeTwiml(baseUrl, company) {
  const action = `${baseUrl}?step=route`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${say(
    `Thank you for calling ${company}. This call may be recorded for quality and compliance. Please listen to the following options.`
  )}
  <Gather numDigits="1" timeout="8" action="${action}" method="POST">
    ${say(
      "Press 1 for client services and existing accounts. Press 2 for new accounts and onboarding. Press 3 for technical support. Press 4 for office hours and location. Press 0 to speak with our receptionist."
    )}
  </Gather>
  <Redirect method="POST">${action}</Redirect>
</Response>`;
}

function routeTwiml(env, baseUrl, digits) {
  const company = env.VOICE_COMPANY_NAME || "Safeguard Securities";
  const route = MENU[digits];
  const welcome = `${baseUrl}?step=welcome`;

  if (!route) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${say("Sorry, that is not a valid option. Let's try again.")}
  <Redirect method="POST">${welcome}</Redirect>
</Response>`;
  }

  if (route.type === "info") {
    const info =
      env.VOICE_INFO_MESSAGE ||
      "Our office is open Monday through Friday, 9 AM to 5 PM Eastern Time, at 6060 Parkland Boulevard, Suite 200, Mayfield Heights, Ohio. Visit safeguardsecurities dot us for online support.";
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${say(info)}
  <Pause length="1"/>
  <Redirect method="POST">${welcome}</Redirect>
</Response>`;
  }

  const dest = phone(env, route.key);
  if (!dest || dest.length < 11) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${say(
    "We are unable to connect your call right now because our phone system is not fully configured. Please email info at safeguardsecurities dot us, or call back shortly. Goodbye."
  )}
  <Hangup/>
</Response>`;
  }

  const dialComplete = `${baseUrl}?step=dial-complete`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${say(`Please hold while we connect you to ${route.label}.`)}
  <Dial answerOnBridge="true" timeout="30" action="${dialComplete}" method="POST">
    <Number>${escapeXml(dest)}</Number>
  </Dial>
</Response>`;
}

function dialCompleteTwiml(baseUrl, status) {
  const welcome = `${baseUrl}?step=welcome`;
  if (status === "completed" || status === "answered") {
    return `<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${say("We could not reach an agent at this time. Goodbye.")}
  <Redirect method="POST">${welcome}</Redirect>
</Response>`;
}

async function parseBody(request) {
  if (request.method === "GET") {
    return Object.fromEntries(new URL(request.url).searchParams);
  }
  const text = await request.text();
  return Object.fromEntries(new URLSearchParams(text));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const baseUrl = `${url.origin}${url.pathname}`;
    const step = (url.searchParams.get("step") || "welcome").toLowerCase();
    const company = env.VOICE_COMPANY_NAME || "Safeguard Securities";
    const body = await parseBody(request);

    if (!isBusinessOpen(env) && step === "welcome") {
      return xml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${say(`Thank you for calling ${company}. You have reached us outside of business hours. Please leave a message after the tone.`)}
  <Record maxLength="120" playBeep="true" action="${baseUrl}?step=voicemail-done" method="POST"/>
  <Hangup/>
</Response>`);
    }

    if (step === "route") {
      return xml(routeTwiml(env, baseUrl, body.Digits || ""));
    }
    if (step === "dial-complete") {
      return xml(dialCompleteTwiml(baseUrl, body.DialCallStatus || ""));
    }
    if (step === "voicemail-done") {
      return xml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${say(`Thank you for contacting ${company}. Your message has been received. Goodbye.`)}
  <Hangup/>
</Response>`);
    }

    return xml(welcomeTwiml(baseUrl, company));
  },
};
