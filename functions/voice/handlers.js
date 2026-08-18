const logger = require("firebase-functions/logger");
const { getVoiceConfig, isBusinessOpen } = require("./config");
const { getPublicUrl } = require("./validate");
const {
  buildWelcome,
  buildAfterHours,
  buildRoute,
  buildDialResult,
  buildVoicemailThanks,
} = require("./twiml");

function webhookUrl(req, step) {
  const base = getPublicUrl(req).split("?")[0];
  return `${base}?step=${encodeURIComponent(step)}`;
}

function handleVoice(req) {
  const config = getVoiceConfig();
  const step = String(req.query.step || "welcome").toLowerCase();
  const welcomeUrl = webhookUrl(req, "welcome");
  const routeUrl = webhookUrl(req, "route");
  const dialUrl = webhookUrl(req, "dial-complete");
  const voicemailUrl = webhookUrl(req, "voicemail-done");

  if (step === "welcome") {
    if (config.afterHoursEnabled && !isBusinessOpen(config)) {
      logger.info("Voice: after-hours flow");
      return buildAfterHours(config, voicemailUrl);
    }
    logger.info("Voice: welcome menu");
    return buildWelcome(config, routeUrl);
  }

  if (step === "route") {
    const digits = req.body?.Digits || req.query?.Digits || "";
    logger.info("Voice: route", { digits });
    return buildRoute(config, digits, dialUrl, welcomeUrl);
  }

  if (step === "dial-complete") {
    const dialStatus = req.body?.DialCallStatus || "";
    logger.info("Voice: dial complete", { dialStatus });
    return buildDialResult(config, dialStatus, welcomeUrl);
  }

  if (step === "voicemail-done") {
    logger.info("Voice: voicemail recorded", {
      recordingUrl: req.body?.RecordingUrl,
      from: req.body?.From,
    });
    return buildVoicemailThanks(config);
  }

  return buildWelcome(config, routeUrl);
}

module.exports = {
  handleVoice,
};
