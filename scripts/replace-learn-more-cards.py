#!/usr/bin/env python3
"""Replace unrelated blog cards in 'learn more about stock trading' sections."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

OLD_MARKERS = (
    "tips-and-techniques-for-successful-project-control",
    "benefits-associated-with-a-self-developed-cms",
    "how-to-locate-the-best-vpn-review",
    "mobile-phone-antivirus",
)

HEADING_OLD = "Want to learn more about online stock trading?"
HEADING_NEW = "Explore guides to strengthen your investing approach"

CARDS = (
    (
        "investing-essentials/index.html",
        "Investing Essentials: Start With the Fundamentals",
    ),
    (
        "fundamental-and-technical-analysis/index.html",
        "How to Analyze Stocks Before You Invest",
    ),
    (
        "factors-to-consider/index.html",
        "Key Factors to Consider Before Every Trade",
    ),
    (
        "portfolio-management/index.html",
        "Portfolio Management &amp; Risk Control",
    ),
)

POST_ITEMS_RE = re.compile(
    r'(<div id="post-items--[a-f0-9]+" class="row post-items">)'
    r"[\s\S]*?"
    r"(                </div>\n       </div>)",
    re.MULTILINE,
)


def card_html(href_prefix: str, url: str, title: str) -> str:
    return f"""                    <div class="col-lg-3 col-md-6">

                                    <div class="elementskit-post-image-card">
                        <div class="elementskit-entry-header">
                            
                            
\t\t\t\t\t\t\t\t\t\t\t</div><!-- .elementskit-entry-header END -->

\t\t\t\t\t\t<div class="elementskit-post-body ">
\t\t\t\t\t\t\t
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t
\t\t\t\t\t\t\t\t
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t<h2 class="entry-title">
\t\t\t\t\t<a href="{href_prefix}{url}">
\t\t\t\t\t\t{title}\t\t\t\t\t</a>
\t\t\t\t</h2>
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t</div><!-- .elementskit-post-body END -->
                    </div>
                
            </div>"""


def build_cards_block(widget_open: str, closing: str) -> str:
    prefix = "../"
    cards = "\n".join(card_html(prefix, url, title) for url, title in CARDS)
    return f"{widget_open}\n{cards}\n{closing}"


def patch_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8", errors="replace")
    if not any(m in text for m in OLD_MARKERS):
        return False

    new_text = text
    if HEADING_OLD in text:
        new_text = new_text.replace(HEADING_OLD, HEADING_NEW)

    def repl(match: re.Match[str]) -> str:
        return build_cards_block(match.group(1), match.group(2))

    patched, n = POST_ITEMS_RE.subn(repl, new_text, count=1)
    if n != 1:
        raise SystemExit(f"post-items replace failed ({n} matches): {path}")

    if patched == text:
        return False
    path.write_text(patched, encoding="utf-8", newline="\n")
    return True


def main() -> None:
    changed = 0
    for path in sorted(ROOT.rglob("*.html")):
        if "node_modules" in path.parts or "2022" in path.parts:
            continue
        try:
            if patch_file(path):
                changed += 1
                print(path.relative_to(ROOT))
        except SystemExit as e:
            print(f"SKIP {path.relative_to(ROOT)}: {e}")

    print(f"Updated {changed} file(s).")


if __name__ == "__main__":
    main()
