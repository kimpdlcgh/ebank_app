(function () {
  "use strict";

  var footerSections = {
    PRODUCT: [
      { label: "Features", href: "/services/index.html" },
      { label: "Pricing", href: "/faq-brokerage-fees/index.html" },
      { label: "Create a free account", href: "ttps://e-bank-dashboard.web.app/login" },
      { label: "Privacy Policy & GDPR", href: "/privacy-policy/index.html" },
      { label: "Terms of Service", href: "/terms-of-service/index.html" }
    ],
    COMPANY: [
      { label: "About Us", href: "/about/index.html" },
      { label: "Contact & Support", href: "/contact/index.html" },
      { label: "Success History", href: "/testimonial/index.html" },
      { label: "Setting & Privacy", href: "/privacy-policy/index.html" },
      { label: "Contact Us", href: "/contact/index.html" }
    ],
    SUPPORT: [
      { label: "Support", href: "/contact/index.html" },
      { label: "Knowledge Base", href: "/faq/index.html" },
      { label: "Webinars", href: "/investing-essentials/index.html" },
      { label: "API Documentation", href: "/fintech-services/index.html" },
      { label: "Log In", href: "https://e-bank-dashboard.web.app/login" }
    ],
    RESOURCES: [
      { label: "API reference", href: "/fintech-services/index.html" },
      { label: "Status", href: "/about/index.html" },
      { label: "Get help", href: "/faq/index.html" },
      { label: "Brand assets", href: "/about/index.html" },
      { label: "Fintech Services", href: "/fintech-services/index.html" }
    ]
  };

  function normalizeHeading(text) {
    return (text || "").replace(/\s+/g, " ").trim().toUpperCase();
  }

  function buildItem(item) {
    var li = document.createElement("li");
    li.className = "elementor-icon-list-item";

    var a = document.createElement("a");
    a.href = item.href;

    var span = document.createElement("span");
    span.className = "elementor-icon-list-text";
    span.textContent = item.label;

    a.appendChild(span);
    li.appendChild(a);
    return li;
  }

  function applySharedFooterLinks() {
    var columns = document.querySelectorAll("footer .elementor-column");
    if (!columns.length) return;

    columns.forEach(function (column) {
      var headingEl = column.querySelector(".elementor-widget-heading .elementor-heading-title");
      var listEl = column.querySelector(".elementor-widget-icon-list .elementor-icon-list-items");
      if (!headingEl || !listEl) return;

      var key = normalizeHeading(headingEl.textContent);
      var links = footerSections[key];
      if (!links) return;

      listEl.innerHTML = "";
      links.forEach(function (item) {
        listEl.appendChild(buildItem(item));
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applySharedFooterLinks);
  } else {
    applySharedFooterLinks();
  }
})();
