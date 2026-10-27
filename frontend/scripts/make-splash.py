#!/usr/bin/env python3
"""Render the iOS launch images (apple-touch-startup-image) into public/splash/.

iOS shows a white screen while an installed web app starts, also in the dark theme,
unless index.html links a launch image of the exact screen size of the device. Each
image is the page background of a theme with the app mark in the centre, at a quarter
of the screen width, so the start looks like the first frame of the app.

The mark comes from public/icons/icon-512x512.png in the light theme and from
public/icons/icon-dark-512x512.png in the dark one (rendered from public/favicon.svg by
scripts/make-icons.mjs, on transparent). The images are palette PNGs, a few KB each.

Run from frontend/ after a change of the sizes, the colours or the icon (after
scripts/make-icons.mjs):

    python3 scripts/make-splash.py

Then copy the <link> lines it prints into src/index.html. Needs Pillow.
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ICONS = {
    "light": ROOT / "public" / "icons" / "icon-512x512.png",
    "dark": ROOT / "public" / "icons" / "icon-dark-512x512.png",
}
OUT = ROOT / "public" / "splash"

# The page background (--color-bg of the ui-kit tokens) per theme.
THEMES = {"light": (0xF6, 0xF7, 0xF5), "dark": (0x10, 0x12, 0x11)}

# The portrait screens of the iPhones that run a current iOS: CSS width, CSS height and
# the device pixel ratio. One entry covers every model with the same screen.
SCREENS = [
    (375, 667, 2),  # iPhone SE 2nd and 3rd gen, 8, 7, 6s
    (414, 736, 3),  # iPhone 8 Plus, 7 Plus
    (375, 812, 3),  # iPhone X, XS, 11 Pro, 12 mini, 13 mini
    (414, 896, 2),  # iPhone XR, 11
    (414, 896, 3),  # iPhone XS Max, 11 Pro Max
    (390, 844, 3),  # iPhone 12, 12 Pro, 13, 13 Pro, 14, 16e
    (428, 926, 3),  # iPhone 12 Pro Max, 13 Pro Max, 14 Plus
    (393, 852, 3),  # iPhone 14 Pro, 15, 15 Pro, 16
    (430, 932, 3),  # iPhone 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus
    (402, 874, 3),  # iPhone 16 Pro, 17, 17 Pro
    (420, 912, 3),  # iPhone Air
    (440, 956, 3),  # iPhone 16 Pro Max, 17 Pro Max
]


def mark(path: Path) -> Image.Image:
    """The mark of an icon, cut to its bounds."""
    icon = Image.open(path).convert("RGBA")
    bbox = icon.getbbox()
    if bbox is None:
        raise SystemExit(f"{path} holds no mark")
    return icon.crop(bbox)


def splash(
    logo: Image.Image, width: int, height: int, background: tuple[int, int, int]
) -> Image.Image:
    """One launch image: the background with the mark at a quarter of the width."""
    size = round(width / 4)
    scaled = logo.resize((size, round(logo.height * size / logo.width)), Image.Resampling.LANCZOS)
    image = Image.new("RGB", (width, height), background)
    image.paste(scaled, ((width - scaled.width) // 2, (height - scaled.height) // 2), scaled)
    # A flat background and the colours of the mark with their edges: 64 palette entries
    # keep the edges smooth and the file small.
    return image.quantize(colors=64, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)


def main() -> None:
    OUT.mkdir(exist_ok=True)
    links = []
    for theme, background in THEMES.items():
        logo = mark(ICONS[theme])
        for w, h, ratio in SCREENS:
            name = f"splash-{theme}-{w * ratio}x{h * ratio}.png"
            splash(logo, w * ratio, h * ratio, background).save(OUT / name, optimize=True)
            media = (
                f"(device-width: {w}px) and (device-height: {h}px)"
                f" and (-webkit-device-pixel-ratio: {ratio}) and (orientation: portrait)"
                f" and (prefers-color-scheme: {theme})"
            )
            links.append(
                f'<link rel="apple-touch-startup-image" media="{media}" href="splash/{name}" />'
            )
    print("\n".join(links))


if __name__ == "__main__":
    main()
