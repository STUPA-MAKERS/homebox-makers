---
id: "000063"
title: A list row has a trailing row menu
kind: non-functional
status: draft
owner: frederikbeimgraben
updated: 2026-11-06
implementation:
  - frontend/vendor/ui-kit/src/lib/row-menu
  - frontend/src/app/
scope:
  - frontend/src/app/
---

# A list row has a trailing row menu

A list row of an entity must end with a three-dot `app-row-menu`.

Test: `frontend/e2e/items.spec.ts`: row menu of the list deletes an item.
