const twilio = require("twilio");

function xmlResponse(twiml) {
  return twiml.toString();
}

function say(twiml, message) {
  twiml.say(
    {
      voice: "Polly.Joanna",
      language: "en-US",
    },
    message
  );
}

function buildWelcome(config, actionUrl) {
  const twiml = new twilio.twiml.VoiceResponse();

  say(
    twiml,
    `Thank you for calling ${config.companyName}. ` +
      "This call may be recorded for quality and compliance. " +
      "Please listen to the following options."
  );

  const gather = twiml.gather({
    numDigits: 1,
    timeout: 8,
    action: actionUrl,
    method: "POST",
  });

  say(
    gather,
    "Press 1 for client services and existing accounts. " +
      "Press 2 for new accounts and onboarding. " +
      "Press 3 for technical support. " +
      "Press 4 for office hours and location. " +
      "Press 0 to speak with our receptionist."
  );

  twiml.redirect({ method: "POST" }, actionUrl);
  return xmlResponse(twiml);
}

function buildAfterHours(config, actionUrl) {
  const twiml = new twilio.twiml.VoiceResponse();

  say(
    twiml,
    `Thank you for calling ${config.companyName}. ` +
      "You have reached us outside of business hours. " +
      "Our team is available Monday through Friday, 9 AM to 5 PM Eastern Time."
  );

  say(
    twiml,
    "Please leave a message after the tone, including your name, phone number, and account email if applicable. " +
      "A member of our team will return your call on the next business day."
  );

  twiml.record({
    maxLength: 120,
    playBeep: true,
    transcribe: false,
    action: actionUrl,
    method: "POST",
  });

  say(twiml, "We did not receive a recording. Goodbye.");
  twiml.hangup();
  return xmlResponse(twiml);
}

function buildRoute(config, digits, actionUrl, welcomeUrl) {
  const twiml = new twilio.twiml.VoiceResponse();
  const choice = String(digits || "").trim();
  const route = config.menu[choice];

  if (!route) {
    say(
      twiml,
      "Sorry, that is not a valid option. Let's try again."
    );
    twiml.redirect({ method: "POST" }, welcomeUrl);
    return xmlResponse(twiml);
  }

  if (route.type === "info") {
    say(twiml, config.infoMessage);
    twiml.pause({ length: 1 });
    twiml.redirect({ method: "POST" }, welcomeUrl);
    return xmlResponse(twiml);
  }

  const destination = route.phone || config.receptionistPhone;
  if (!destination) {
    say(
      twiml,
      "We are unable to connect your call right now. Please email info at safeguardsecurities dot us. Goodbye."
    );
    twiml.hangup();
    return xmlResponse(twiml);
  }

  say(
    twiml,
    `Please hold while we connect you to ${route.label}.`
  );

  const dial = twiml.dial({
    answerOnBridge: true,
    timeout: 30,
    action: actionUrl,
    method: "POST",
  });
  dial.number(destination);

  return xmlResponse(twiml);
}

function buildDialResult(config, dialStatus, welcomeUrl) {
  const twiml = new twilio.twiml.VoiceResponse();
  const status = String(dialStatus || "").toLowerCase();

  if (status === "completed" || status === "answered") {
    twiml.hangup();
    return xmlResponse(twiml);
  }

  say(
    twiml,
    "We could not reach an agent at this time. " +
      "You can leave a message after the tone, or press any key to return to the main menu."
  );

  const gather = twiml.gather({
    numDigits: 1,
    timeout: 5,
    action: welcomeUrl,
    method: "POST",
  });

  gather.record({
    maxLength: 90,
    playBeep: true,
    action: welcomeUrl,
    method: "POST",
  });

  twiml.redirect({ method: "POST" }, welcomeUrl);
  return xmlResponse(twiml);
}

function buildVoicemailThanks(config) {
  const twiml = new twilio.twiml.VoiceResponse();
  say(
    twiml,
    `Thank you for contacting ${config.companyName}. Your message has been received. Goodbye.`
  );
  twiml.hangup();
  return xmlResponse(twiml);
}

module.exports = {
  buildWelcome,
  buildAfterHours,
  buildRoute,
  buildDialResult,
  buildVoicemailThanks,
};
