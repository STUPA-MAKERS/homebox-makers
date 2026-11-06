---
id: "000068"
title: List pages use rail, list and detail
kind: non-functional
status: draft
owner: frederikbeimgraben
updated: 2026-11-06
implementation:
  - frontend/vendor/ui-kit/src/lib/list-detail
  - frontend/src/app/
scope:
  - frontend/src/app/
  - frontend/vendor/ui-kit
---

# List pages use rail, list and detail

A page with a list must use `app-list-detail` of the ui-kit with the detail as a child route.
The document must not scroll. Each pane must scroll inside.

Reason: STUPA-Workflow uses the same pattern.
