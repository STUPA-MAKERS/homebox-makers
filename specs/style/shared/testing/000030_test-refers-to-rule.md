---
id: "000030"
title: A test refers back to its rule
kind: style
status: draft
owner: frederikbeimgraben
updated: 2026-11-06
implementation: null
scope:
  - backend/pkgs/
  - frontend/src/app/
---

# A test refers back to its rule

A test that a spec lists in `tests` must name the rule in a comment. Use `§` and the full rule
ID, for example `§F/labels/print/000042`.

Reason: The reader of a test sees which rule it protects. A search finds the link in both
directions.

Test: Review: every `tests` entry has the `§` reference next to the test.
