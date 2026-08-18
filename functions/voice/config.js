const { defineString } = require("firebase-functions/params");

const TWILIO_AUTH_TOKEN = defineString("TWILIO_AUTH_TOKEN");
const VOICE_RECEPTIONIST_PHONE = defineString("VOICE_RECEPTIONIST_PHONE");
const VOICE_CLIENT_SERVICES_PHONE = defineString("VOICE_CLIENT_SERVICES_PHONE", {
  default: "",
});
const VOICE_NEW_ACCOUNTS_PHONE = defineString("VOICE_NEW_ACCOUNTS_PHONE", {
  default: "",
});
const VOICE_SUPPORT_PHONE = defineString("VOICE_SUPPORT_PHONE", {
  default: "",
});
const VOICE_COMPANY_NAME = defineString("VOICE_COMPANY_NAME", {
  default: "Safeguard Securities",
});
const VOICE_AFTER_HOURS_ENABLED = defineString("VOICE_AFTER_HOURS_ENABLED", {
  default: "false",
});

function normalizeE164(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits || digits === "+") {
    return "";
  }
  if (/^\+\d{10,15}$/.test(digits)) {
    return digits;
  }
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  const onlyDigits = digits.replace(/\D/g, "");
  if (onlyDigits.length === 10) {
    return `+1${onlyDigits}`;
  }
  if (onlyDigits.length === 11 && onlyDigits.startsWith("1")) {
    return `+${onlyDigits}`;
  }
  return "";
}

function getVoiceConfig() {
  const receptionist = normalizeE164(VOICE_RECEPTIONIST_PHONE.value());
  const pick = (value) => normalizeE164(value) || receptionist;

  return {
    companyName: VOICE_COMPANY_NAME.value() || "Safeguard Securities",
    timezone: "America/New_York",
    businessHours: {
      days: [1, 2, 3, 4, 5],
      startHour: 9,
      endHour: 17,
    },
    afterHoursEnabled:
      String(VOICE_AFTER_HOURS_ENABLED.value() || "false").toLowerCase() === "true",
    receptionistPhone: receptionist,
    menu: {
      1: {
        label: "client services and existing accounts",
        phone: pick(VOICE_CLIENT_SERVICES_PHONE.value()),
      },
      2: {
        label: "new accounts and onboarding",
        phone: pick(VOICE_NEW_ACCOUNTS_PHONE.value()),
      },
      3: {
        label: "technical support",
        phone: pick(VOICE_SUPPORT_PHONE.value()),
      },
      4: {
        label: "office hours and location",
        type: "info",
      },
      0: {
        label: "receptionist",
        phone: receptionist,
      },
    },
    infoMessage:
      "Our office is open Monday through Friday, 9 AM to 5 PM Eastern Time, " +
      "at 6060 Parkland Boulevard, Suite 200, Mayfield Heights, Ohio. " +
      "Visit safeguardsecurities dot us for online support.",
  };
}

function isBusinessOpen(config) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: config.timezone,
    weekday: "short",
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === "weekday")?.value || "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value || "0");
  const dayMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };
  const day = dayMap[weekday] ?? 0;

  if (!config.businessHours.days.includes(day)) {
    return false;
  }

  return hour >= config.businessHours.startHour && hour < config.businessHours.endHour;
}

module.exports = {
  TWILIO_AUTH_TOKEN,
  getVoiceConfig,
  isBusinessOpen,
  normalizeE164,
};
