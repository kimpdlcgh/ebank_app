#!/usr/bin/env python3
"""Build transparent favicon assets from the S-mark logo (white background removed)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
# Prefer full wordmark source so we can auto-crop to the mark only.
SOURCE_CANDIDATES = (
    ROOT / "wp-content" / "uploads" / "sites" / "12" / "2022" / "02" / "logo3 (2).png",
    ROOT
    / "assets"
    / "c__Users_samga_AppData_Roaming_Cursor_User_workspaceStorage_2620f6328916a11f58e971570a062165_images_logo3-b8138d71-f64d-4aa7-a7ea-79f06ee9c345.png",
    ROOT / "wp-content" / "uploads" / "sites" / "12" / "2022" / "02" / "logo3.png",
)
OUT_ASSETS = ROOT / "assets" / "favicon"
OUT_WP = ROOT / "wp-content" / "uploads" / "sites" / "12" / "2022" / "02"

WHITE_THRESHOLD = 248
PADDING_RATIO = 0.12
# Wide wordmarks: keep only the left mark (exclude "Safeguard Securities" text).
GAP_COLUMNS = 10
MIN_MARK_WIDTH = 48


def _column_density(img: Image.Image) -> list[int]:
    w, h = img.size
    counts: list[int] = []
    for x in range(w):
        col = img.crop((x, 0, x + 1, h))
        counts.append(sum(1 for _r, _g, _b, a in col.getdata() if a > 12))
    return counts


def extract_mark_only(img: Image.Image) -> Image.Image:
    """Crop wide logo files to the S-mark; skip text on the right."""
    img = img.convert("RGBA")
    w, h = img.size
    if w <= int(h * 1.2):
        return img

    cols = _column_density(img)
    if not any(cols):
        return img

    peak = max(cols)
    threshold = max(int(peak * 0.07), 16)
    start = next((i for i, v in enumerate(cols) if v > threshold), 0)

    run = 0
    cut = w
    for x in range(start + MIN_MARK_WIDTH, w):
        if cols[x] < threshold:
            run += 1
            if run >= GAP_COLUMNS:
                cut = x - run + 1
                break
        else:
            run = 0

    cut = min(cut, int(w * 0.4))
    cut = max(cut, start + MIN_MARK_WIDTH)
    return img.crop((0, 0, cut, h))


def remove_white_background(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    pixels = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if r >= WHITE_THRESHOLD and g >= WHITE_THRESHOLD and b >= WHITE_THRESHOLD:
                pixels[x, y] = (255, 255, 255, 0)
    return img


def trim_and_square(img: Image.Image, size: int) -> Image.Image:
    bbox = img.getbbox()
    if not bbox:
        return Image.new("RGBA", (size, size), (0, 0, 0, 0))
    cropped = img.crop(bbox)
    w, h = cropped.size
    pad = int(max(w, h) * PADDING_RATIO)
    side = max(w, h) + pad * 2
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    ox = (side - w) // 2
    oy = (side - h) // 2
    canvas.paste(cropped, (ox, oy), cropped)
    return canvas.resize((size, size), Image.Resampling.LANCZOS)


def save_png(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, format="PNG", optimize=True)


def save_ico(square: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    sizes = [(16, 16), (32, 32), (48, 48)]
    icons = [square.resize(s, Image.Resampling.LANCZOS) for s in sizes]
    icons[0].save(
        path,
        format="ICO",
        sizes=[(i.width, i.height) for i in icons],
        append_images=icons[1:],
    )


def resolve_source() -> Path:
    for path in SOURCE_CANDIDATES:
        if path.is_file():
            return path
    raise SystemExit("Source logo not found. Add logo3.png under wp-content/.../02/.")


def main() -> None:
    source = resolve_source()
    print("Source:", source.relative_to(ROOT))

    base = extract_mark_only(remove_white_background(Image.open(source)))
    print("Mark crop size:", base.size)
    master = trim_and_square(base, 512)

    outputs = {
        OUT_ASSETS / "favicon.ico": None,
        OUT_ASSETS / "favicon-16x16.png": 16,
        OUT_ASSETS / "favicon-32x32.png": 32,
        OUT_ASSETS / "favicon-48x48.png": 48,
        OUT_ASSETS / "favicon-192x192.png": 192,
        OUT_ASSETS / "apple-touch-icon.png": 180,
    }

    save_ico(trim_and_square(base, 256), OUT_ASSETS / "favicon.ico")
    for path, dim in outputs.items():
        if dim is None:
            continue
        save_png(trim_and_square(base, dim), path)

    # Legacy paths used by exported HTML
    save_png(trim_and_square(base, 32), OUT_WP / "logo3-150x150.png")
    save_png(trim_and_square(base, 192), OUT_WP / "logo3.png")

    print("Wrote favicon assets to", OUT_ASSETS)
    print("Updated", OUT_WP / "logo3.png", "and logo3-150x150.png")


if __name__ == "__main__":
    main()
