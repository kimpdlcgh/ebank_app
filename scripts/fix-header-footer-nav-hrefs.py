#!/usr/bin/env python3
"""
Prefix root-relative .html links inside the main header (#masthead) and footer (#colophon).

Static export pages one level (or more) below site root often shipped with the same
href values as the homepage (e.g. index.html, about/index.html), which resolve to the
wrong path. This mirrors the corrected relative-prefix pattern used elsewhere.

Rules:
  - Only rewrites URLs that contain .html and are relative (no scheme, no leading / or ../ ./).
  - In the footer chunk only, preserves bare href="index.html" (same-page anchors, e.g. Contact tile).
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

SKIP_DIR_PARTS = frozenset({"wp-content", "feed", "comments", "campaign-admin"})

HEADER_RE = re.compile(
    r'(<header\s+[^>]*\bid\s*=\s*["\']masthead["\'][^>]*>)(.*?)(</header\s*>)',
    re.DOTALL | re.IGNORECASE,
)
FOOTER_RE = re.compile(
    r'(<footer\s+[^>]*\bid\s*=\s*["\']colophon["\'][^>]*>)(.*?)(</footer\s*>)',
    re.DOTALL | re.IGNORECASE,
)

# Relative site link ending in .html, optional #fragment / ?query
HTML_LINK_RE = re.compile(r"\.html(?:[#?][^\s\"]*)?$")


def prefix_for(path: Path) -> str:
    """../ repeated (depth from site root to directory containing index.html)."""
    rel = path.relative_to(ROOT)
    depth = len(rel.parts) - 1
    return "../" * depth


def skip_file(path: Path) -> bool:
    if path.suffix.lower() != ".html" or path.name != "index.html":
        return True
    parts = path.parts
    if any(p in SKIP_DIR_PARTS for p in parts):
        return True
    try:
        if path.relative_to(ROOT) == Path("index.html"):
            return True
    except ValueError:
        return True
    return False


def fix_hrefs_in_chunk(chunk: str, prefix: str, *, skip_bare_index: bool) -> tuple[str, int]:
    n = 0

    def repl(m: re.Match[str]) -> str:
        nonlocal n
        url = m.group(1)
        if not url:
            return m.group(0)
        lowered = url.split("?", 1)[0].split("#", 1)[0]
        if not HTML_LINK_RE.search(lowered) and lowered != "index.html":
            return m.group(0)
        if url.startswith(("http://", "https://", "//", "mailto:", "tel:", "#", "javascript:")):
            return m.group(0)
        if url.startswith(("/", "\\")):
            return m.group(0)
        if url.startswith("../") or url.startswith("./"):
            return m.group(0)
        if skip_bare_index and url == "index.html":
            return m.group(0)
        n += 1
        return f'href="{prefix}{url}"'

    new_chunk = re.sub(r'href="([^"]*)"', repl, chunk)
    return new_chunk, n


def patch_file(path: Path) -> int:
    raw = path.read_text(encoding="utf-8")
    prefix = prefix_for(path)
    if not prefix:
        return 0

    total = 0
    out = raw

    hm = HEADER_RE.search(out)
    if hm:
        head_open, chunk, head_close = hm.group(1), hm.group(2), hm.group(3)
        new_chunk, c = fix_hrefs_in_chunk(chunk, prefix, skip_bare_index=False)
        total += c
        out = out[: hm.start()] + head_open + new_chunk + head_close + out[hm.end() :]

    fm = FOOTER_RE.search(out)
    if fm:
        foot_open, chunk, foot_close = fm.group(1), fm.group(2), fm.group(3)
        new_chunk, c = fix_hrefs_in_chunk(chunk, prefix, skip_bare_index=True)
        total += c
        out = out[: fm.start()] + foot_open + new_chunk + foot_close + out[fm.end() :]

    if total:
        path.write_text(out, encoding="utf-8", newline="\n")
    return total


def main() -> None:
    touched = files = 0
    for p in sorted(ROOT.rglob("index.html")):
        if skip_file(p):
            continue
        n = patch_file(p)
        if n:
            files += 1
            touched += n
            print(f"{p.relative_to(ROOT)}\t{n}")
    print(f"Done. {files} files, {touched} href rewrites.")


if __name__ == "__main__":
    main()
