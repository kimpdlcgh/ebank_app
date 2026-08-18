(function (global) {
  "use strict";

  global.SG_ADMIN_STAFF_EMAILS = [
    "mateenforjob@gmail.com",
    "admin@safeguardsecurities.us",
    "support@safeguardsecurities.us",
    "finance@safeguardsecurities.us",
    "compliance@safeguardsecurities.us",
    "onboarding@safeguardsecurities.us"
  ];

  // Owner/staff uids — works even if email is missing on the auth token.
  global.SG_ADMIN_STAFF_UIDS = [
    "iQ8BocLqscb9xXoD8iVtMe6NiC42"
  ];

  global.SG_ADMIN_ROLES = [
    "super_admin",
    "admin",
    "support",
    "finance",
    "compliance"
  ];

  global.sgIsAdminUser = function sgIsAdminUser(profile, email, uid) {
    if (uid && global.SG_ADMIN_STAFF_UIDS.indexOf(uid) >= 0) {
      return true;
    }
    var normalizedEmail = sgNormalizeEmail(email);
    if (normalizedEmail && global.SG_ADMIN_STAFF_EMAILS.indexOf(normalizedEmail) >= 0) {
      return true;
    }
    if (!profile) {
      return false;
    }
    if (profile.is_admin === true) {
      return true;
    }
    var role = String(profile.role || "").trim().toLowerCase();
    return global.SG_ADMIN_ROLES.indexOf(role) >= 0;
  };

  global.sgNormalizeEmail = function sgNormalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  };

  global.sgGetAuthEmail = function sgGetAuthEmail(user) {
    if (!user) {
      return "";
    }
    if (user.email) {
      return user.email;
    }
    if (user.providerData && user.providerData.length && user.providerData[0].email) {
      return user.providerData[0].email;
    }
    return "";
  };
})(typeof window !== "undefined" ? window : globalThis);
