#!/usr/bin/env python3
"""Repair footer ElementsKit shortcuts that used href=index.html on 2022 post pages."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Elementor widget IDs for footer nav (same as homepage/footer template).
WIDGET_HREF: list[tuple[str, str]] = [
    ("2262922", "../../../../index.html"),
    ("4d3c238", "../../../../contact/index.html"),
    ("57a30fd", "../../../../about/index.html"),
    ("d88f5bc", "../../../../faq/index.html"),
    ("5847b92", "../../../../about/index.html"),
]


def patch_raw(raw: str) -> tuple[str, int]:
    n = 0
    out = raw
    for wid, dest in WIDGET_HREF:
        pat = (
            rf'(<div class="elementor-element elementor-element-{wid}\b[^>]*>'
            r"[\s\S]*?<a href=\")index\.html(\")"
        )
        new_out, c = re.subn(pat, rf"\1{dest}\2", out, count=1)
        out = new_out
        n += c
    return out, n


def main() -> None:
    total = 0
    files = 0
    for p in ROOT.rglob("index.html"):
        if "feed" in p.parts or "wp-content" in p.parts:
            continue
        rel = p.relative_to(ROOT)
        if len(rel.parts) < 4 or rel.parts[0] != "2022":
            continue
        raw = p.read_text(encoding="utf-8")
        new, c = patch_raw(raw)
        if not c:
            continue
        p.write_text(new, encoding="utf-8", newline="\n")
        files += 1
        total += c
        print(p.relative_to(ROOT), c)
    print(f"Done. {files} files, {total} anchor fixes.")


if __name__ == "__main__":
    main()
