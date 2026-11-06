---
id: "000041"
title: Generated ent code is not edited by hand
kind: style
status: draft
owner: frederikbeimgraben
updated: 2026-11-06
implementation:
  - backend/internal/data/ent
scope:
  - backend/internal/data/ent
---

# Generated ent code is not edited by hand

Code in `backend/internal/data/ent/` outside `schema/` must change only through `task
db:generate`.

Reason: A hand edit disappears with the next generate.

Test: Review: `task db:generate` gives no diff.
