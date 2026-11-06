---
id: "000050"
title: A label URL opens its Gegenstand or Ort
kind: functional
status: draft
owner: frederikbeimgraben
updated: 2026-11-06
tests:
  - "frontend/src/app/pages/scan/scan-code.spec.ts:parseHomeboxCode_urls"
implementation:
  - frontend/src/app/pages/scan/scan.component.ts
scope:
  - frontend/src/app/pages/scan
---

# A label URL opens its Gegenstand or Ort

The scanner must resolve a URL or a path with `/item/<uuid>`, `/items/<uuid>`,
`/location/<uuid>` or `/locations/<uuid>` to that entity. A path with `/a/<asset ID>` must
resolve through the asset ID.

Reason: A label holds only the path when the server has no public URL.

Test: `parseHomeboxCode_urls`.
