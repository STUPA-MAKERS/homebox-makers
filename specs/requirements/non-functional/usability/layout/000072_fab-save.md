---
id: "000072"
title: Speichern shows only after a change
kind: non-functional
status: draft
owner: frederikbeimgraben
updated: 2026-11-06
implementation:
  - frontend/vendor/ui-kit/src/lib/fab
  - frontend/src/app/
scope:
  - frontend/src/app/
---

# Speichern shows only after a change

Speichern must be an `app-fab` at the bottom. It must show only while there are unsaved changes.
