---
id: "000055"
title: Without a secure context the scanner takes a photo
kind: functional
status: draft
owner: frederikbeimgraben
updated: 2026-11-06
implementation:
  - frontend/src/app/pages/scan/camera-scanner.ts
scope:
  - frontend/src/app/pages/scan
---

# Without a secure context the scanner takes a photo

Without a secure context or without `getUserMedia`, the scanner must offer a photo instead of
the live camera.

Reason: A browser gives the live camera only over HTTPS or on localhost.
