---
id: "000076"
title: Ctrl+K opens the search
kind: non-functional
status: draft
owner: frederikbeimgraben
updated: 2026-11-06
implementation:
  - frontend/vendor/ui-kit/shell/src/command-palette
  - frontend/src/app/features/search
scope:
  - frontend/src/app/
---

# Ctrl+K opens the search

`Ctrl+K` and `Cmd+K` must open the global search palette. The search must find Gegenstände, Orte
and pages.

Test: `frontend/e2e/collection.spec.ts`: global search finds items, places and pages.
