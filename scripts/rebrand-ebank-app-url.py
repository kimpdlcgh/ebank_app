#!/usr/bin/env python3
"""Rebrand the app links from the Firebase default domain to the branded subdomain.

Replaces the bare host `e-bank-dashboard.web.app` with `app.safeguardsecurities.us`
everywhere in the site (any path like /login, /register is preserved because only
the host is replaced). The Firebase *project id* `e-bank-dashboard` (without
`.web.app`) is never touched.
"""
from __future__ import annotations

import pathlib

OLD = "e-bank-dashboard.web.app"
NEW = "app.safeguardsecurities.us"

ROOT = pathlib.Path(__file__).resolve().parent.parent
TEXT_EXTS = {".html", ".htm", ".js", ".css", ".py", ".json", ".xml", ".txt"}
SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".firebase",
    "mobile", "agent-transcripts",
}


SELF = pathlib.Path(__file__).resolve()


def should_skip(path: pathlib.Path) -> bool:
    if path.resolve() == SELF:
        return True
    parts = set(path.relative_to(ROOT).parts)
    return bool(parts & SKIP_DIRS)


def main() -> None:
    changed_files = 0
    total_hits = 0
    for path in ROOT.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in TEXT_EXTS:
            continue
        if should_skip(path):
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        hits = text.count(OLD)
        if not hits:
            continue
        path.write_text(text.replace(OLD, NEW), encoding="utf-8")
        changed_files += 1
        total_hits += hits
        print(f"  {path.relative_to(ROOT)}: {hits}")

    print(f"\nUpdated {total_hits} link(s) across {changed_files} file(s).")


if __name__ == "__main__":
    main()
