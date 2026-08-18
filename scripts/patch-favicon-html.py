#!/usr/bin/env python3
"""Point all pages at consistent transparent favicon assets under /assets/favicon/."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

FAVICON_BLOCK = """<link rel="icon" href="/assets/favicon/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="192x192" href="/assets/favicon/favicon-192x192.png">
<link rel="apple-touch-icon" sizes="180x180" href="/assets/favicon/apple-touch-icon.png">
<meta name="msapplication-TileImage" content="/assets/favicon/favicon-192x192.png">"""

# Match existing favicon / tile link cluster (root-absolute or relative wp-content paths).
FAVICON_CLUSTER_RE = re.compile(
    r"<link rel=\"icon\"[^>]*>\s*"
    r"(?:<link rel=\"icon\"[^>]*>\s*)?"
    r"<link rel=\"apple-touch-icon\"[^>]*>\s*"
    r"(?:<meta name=\"msapplication-TileImage\"[^>]*>\s*)?",
    re.IGNORECASE,
)


def patch_html(text: str) -> tuple[str, bool]:
    if "/assets/favicon/favicon.ico" in text:
        return text, False
    if not FAVICON_CLUSTER_RE.search(text):
        # Insert before site-chrome.css or before </head>
        anchor = '<link rel="stylesheet" href="/assets/site-chrome.css'
        if anchor in text:
            return text.replace(anchor, FAVICON_BLOCK + "\n" + anchor, 1), True
        return text.replace("</head>", FAVICON_BLOCK + "\n</head>", 1), True
    new = FAVICON_CLUSTER_RE.sub(FAVICON_BLOCK + "\n", text, count=1)
    return new, new != text


def main() -> None:
    changed = 0
    for path in sorted(ROOT.rglob("*.html")):
        if "node_modules" in path.parts:
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        new, ok = patch_html(text)
        if ok:
            path.write_text(new, encoding="utf-8", newline="\n")
            changed += 1
            print(path.relative_to(ROOT))
    print(f"Updated {changed} file(s).")


if __name__ == "__main__":
    main()
