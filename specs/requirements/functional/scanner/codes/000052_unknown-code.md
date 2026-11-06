---
id: "000052"
title: An unknown code says so
kind: functional
status: draft
owner: frederikbeimgraben
updated: 2026-11-06
implementation:
  - frontend/src/app/pages/scan/scan.component.ts
scope:
  - frontend/src/app/pages/scan
---

# An unknown code says so

A code that is no Homebox code and that the search does not find must show that nothing was
found. It must not open a page.

Test: `frontend/e2e/scan.spec.ts`: an unknown code says so.
