---
id: "000077"
title: The Android navigation bar has the manifest colour
kind: non-functional
status: draft
owner: frederikbeimgraben
updated: 2026-11-06
implementation:
  - frontend/public/manifest.webmanifest
  - frontend/public/manifest-dark.webmanifest
  - frontend/src/app/app.config.ts
scope:
  - frontend/public
  - frontend/src/app/app.config.ts
---

# The Android navigation bar has the manifest colour

The `theme_color` and the `background_color` of each manifest must be the `surface-3` colour of
its theme: `#e6e9e5` in `manifest.webmanifest`, `#262a27` in `manifest-dark.webmanifest`. The
dark theme must link the dark manifest.

Reason: Android paints the navigation bar of an installed app with these manifest colours, not
with the page.
