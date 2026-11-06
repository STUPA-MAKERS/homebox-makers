---
id: "000051"
title: A typed or printed asset ID is found
kind: functional
status: draft
owner: frederikbeimgraben
updated: 2026-11-06
tests:
  - "frontend/src/app/pages/scan/scan-code.spec.ts:parseHomeboxCode_assetIds"
implementation:
  - frontend/src/app/pages/scan/scan.component.ts
scope:
  - frontend/src/app/pages/scan
---

# A typed or printed asset ID is found

The scanner must accept an asset ID as printed or typed: `000-123`, `MK-0004`, `#MK-0004` or
`123`. A leading `#` must be removed before the lookup.

Test: `parseHomeboxCode_assetIds`.
