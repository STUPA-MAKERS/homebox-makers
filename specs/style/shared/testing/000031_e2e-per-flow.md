---
id: "000031"
title: A UI flow has a Playwright test
kind: style
status: draft
owner: frederikbeimgraben
updated: 2026-11-06
implementation:
  - frontend/e2e
scope:
  - frontend/e2e
  - frontend/src/app/pages
---

# A UI flow has a Playwright test

A user flow of a page, for example create, edit, delete or scan, must have a Playwright test in
`frontend/e2e/`.

Reason: Most rules of the UI only show in a real browser against a real server.

Test: `task test:ci` runs the suite.
