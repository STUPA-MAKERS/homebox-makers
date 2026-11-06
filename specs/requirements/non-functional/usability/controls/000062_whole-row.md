---
id: "000062"
title: The whole row is clickable
kind: non-functional
status: draft
owner: frederikbeimgraben
updated: 2026-11-06
implementation:
  - frontend/src/app/
scope:
  - frontend/src/app/
---

# The whole row is clickable

A click anywhere on a list row must open its entity. Only the row menu must have its own action.

Test: `frontend/e2e/items.spec.ts`: the trailing area of a list row opens the item.
