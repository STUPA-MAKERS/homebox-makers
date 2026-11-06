---
id: "000054"
title: The camera uses the native barcode detector first
kind: functional
status: draft
owner: frederikbeimgraben
updated: 2026-11-06
implementation:
  - frontend/src/app/pages/scan/camera-scanner.ts
scope:
  - frontend/src/app/pages/scan
---

# The camera uses the native barcode detector first

The scanner must use the `BarcodeDetector` of the browser where it exists. Else it must load
ZXing on demand.

Reason: The native detector is faster. ZXing stays out of the main bundle.

Test: `frontend/e2e/scan.spec.ts`: the camera reads the QR code of a printed label.
