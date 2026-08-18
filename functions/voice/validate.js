const twilio = require("twilio");
const logger = require("firebase-functions/logger");

function getPublicUrl(req) {
  const proto = req.get("x-forwarded-proto") || "https";
  const host = req.get("x-forwarded-host") || req.get("host");
  const path = req.originalUrl || req.url || "";
  return `${proto}://${host}${path}`;
}

function validateTwilioRequest(req, authToken) {
  if (!authToken) {
    logger.warn("TWILIO_AUTH_TOKEN missing; skipping signature validation");
    return true;
  }

  const signature = req.get("x-twilio-signature");
  if (!signature) {
    return false;
  }

  const url = getPublicUrl(req);
  const params = req.method === "GET" ? req.query : req.body;

  return twilio.validateRequest(authToken, signature, url, params);
}

module.exports = {
  getPublicUrl,
  validateTwilioRequest,
};
