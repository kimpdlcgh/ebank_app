#!/usr/bin/env python3
"""Wrap the header logo image (Elementor widget a3f592e) in a home link if not already linked."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

SKIP_DIR_PARTS = frozenset({"wp-content", "feed", "comments", "campaign-admin"})

LOGO_BLOCK = re.compile(
    r'<div class="elementor-element elementor-element-a3f592e\b[^>]*>'
    r"[\s\S]*?"
    r'<div class="elementor-widget-container">\s*'
    r"(?:<style>[\s\S]*?</style>\s*)?"
    r"<img\b[^>]*\s*/?\s*>"
)


def prefix_for(path: Path) -> str:
    rel = path.relative_to(ROOT)
    depth = len(rel.parts) - 1
    return "../" * depth


def skip_file(path: Path) -> bool:
    if path.suffix.lower() != ".html" or path.name != "index.html":
        return True
    if any(p in SKIP_DIR_PARTS for p in path.parts):
        return True
    return False


def home_href(path: Path) -> str:
    pfx = prefix_for(path)
    return f"{pfx}index.html"


def patch_file(path: Path) -> bool:
    raw = path.read_text(encoding="utf-8")
    m = LOGO_BLOCK.search(raw)
    if not m:
        return False
    blob = m.group(0)
    img_idx = blob.index("<img")
    if "<a " in blob[:img_idx]:
        return False
    img_m = re.search(r"<img\b[^>]*\s*/?\s*>", blob)
    if not img_m:
        return False
    img_tag = img_m.group(0)
    prefix = blob[: img_m.start()]
    home = home_href(path)
    wrapped = f'{prefix}<a href="{home}" title="Safeguard Securities" rel="home">{img_tag}</a>'
    new_raw = raw[: m.start()] + wrapped + raw[m.end() :]
    path.write_text(new_raw, encoding="utf-8", newline="\n")
    return True


def main() -> None:
    n = 0
    for p in sorted(ROOT.rglob("index.html")):
        if skip_file(p):
            continue
        if patch_file(p):
            n += 1
            print(p.relative_to(ROOT))
    print(f"Done. {n} logo(s) wrapped.")


if __name__ == "__main__":
    main()
