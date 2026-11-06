---
id: "000073"
title: Edit opens as a side pane
kind: non-functional
status: draft
owner: frederikbeimgraben
updated: 2026-11-06
implementation:
  - frontend/src/app/features/edit
scope:
  - frontend/src/app/
---

# Edit opens as a side pane

Bearbeiten must open as a side pane over the detail, like the card drawer of STUPA-Workflow. It
must not open a new page.

Test: `frontend/e2e/items.spec.ts`: edit an item and see the change on its page.
