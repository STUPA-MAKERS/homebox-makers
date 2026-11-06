---
id: "000036"
title: Generic UI parts live in the ui-kit
kind: style
status: draft
owner: frederikbeimgraben
updated: 2026-11-06
implementation:
  - frontend/vendor/ui-kit
  - frontend/src/app/shared/ui
scope:
  - frontend/src/app/shared/ui
  - frontend/vendor/ui-kit
---

# Generic UI parts live in the ui-kit

`frontend/src/app/shared/ui/` must hold only parts with Homebox data, for example
`app-tag-chip`. A generic part must go to the ui-kit first.

Reason: STUPA-Workflow and Homebox must look the same. A copy in one app drifts away.
