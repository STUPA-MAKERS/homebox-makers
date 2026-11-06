---
id: "000026"
title: Upstream frontend changes are dropped
kind: style
status: draft
owner: frederikbeimgraben
updated: 2026-11-06
implementation:
  - frontend/src/app/core/api/data-contracts.ts
scope:
  - frontend/
---

# Upstream frontend changes are dropped

A merge from upstream must drop every change to the Vue frontend of upstream. If the upstream
API changes, the Angular frontend in `frontend/src/` must follow in the same pull request.

Reason: `frontend/` holds the Angular app. The Vue files of upstream are not used.

Test: Review: after the merge, `frontend/` has no `.vue` file.
