---
id: "000028"
title: A shared branch is never force-pushed
kind: style
status: draft
owner: frederikbeimgraben
updated: 2026-11-06
implementation: null
scope:
  - backend/
  - frontend/
---

# A shared branch is never force-pushed

`main` and the branch of an open pull request must not be force-pushed.

Reason: A force push removes commits that other people or sessions already use.
