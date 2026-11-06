---
id: "000049"
title: A label preview opens in the file viewer
kind: functional
status: draft
owner: frederikbeimgraben
updated: 2026-11-06
implementation:
  - frontend/src/app/features/labels/label-viewer.component.ts
scope:
  - frontend/src/app/features/labels
---

# A label preview opens in the file viewer

A label preview must open in `app-file-viewer` of the ui-kit with a download button. It must not
open a new tab.

Reason: STUPA-Workflow shows attachments the same way.
