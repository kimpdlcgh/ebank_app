/**
 * Our Team page — initials avatars on leadership cards.
 */
(function () {
  "use strict";

  if (!document.body.classList.contains("elementor-page-1623")) {
    return;
  }

  function initialsFromName(name) {
    var parts = name
      .replace(/[^a-zA-Z\s]/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) {
      return "";
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function addAvatar(container, name) {
    if (!container || container.querySelector(".sg-team-avatar")) {
      return;
    }
    var avatar = document.createElement("span");
    avatar.className = "sg-team-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = initialsFromName(name);
    container.insertBefore(avatar, container.firstChild);
  }

  function init() {
    document.querySelectorAll(".sg-team-leadership-grid .ha-infobox-body").forEach(function (body) {
      var title = body.querySelector(".ha-infobox-title");
      if (title) {
        addAvatar(body, title.textContent);
      }
    });

    document.querySelectorAll(".sg-intro-subtitle").forEach(function (el) {
      el.remove();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
