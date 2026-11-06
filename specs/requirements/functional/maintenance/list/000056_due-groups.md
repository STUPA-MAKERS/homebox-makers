---
id: "000056"
title: Wartung groups entries by due date
kind: functional
status: draft
owner: frederikbeimgraben
updated: 2026-11-06
tests:
  - "frontend/src/app/pages/maintenance/maintenance-page.spec.ts:groupOf"
implementation:
  - frontend/src/app/pages/maintenance/maintenance-page.ts
scope:
  - frontend/src/app/pages/maintenance
---

# Wartung groups entries by due date

The Wartung list must put each entry into one group: overdue before today, due in at most 30
days, due later, without a date, or done. A done entry has a completed date.

Test: `groupOf`.
