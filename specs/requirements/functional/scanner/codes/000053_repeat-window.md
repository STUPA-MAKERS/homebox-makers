---
id: "000053"
title: The same code within 2.5 s is one scan
kind: functional
status: draft
owner: frederikbeimgraben
updated: 2026-11-06
implementation:
  - frontend/src/app/pages/scan/scan.component.ts
scope:
  - frontend/src/app/pages/scan
---

# The same code within 2.5 s is one scan

The scanner must ignore the same code again within 2500 ms.

Reason: The camera reads the same label many times per second.
