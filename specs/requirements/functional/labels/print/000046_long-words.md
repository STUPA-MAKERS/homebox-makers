---
id: "000046"
title: A long word wraps inside the label
kind: functional
status: draft
owner: frederikbeimgraben
updated: 2026-11-06
tests:
  - "backend/pkgs/labelmaker/labelmaker_test.go:TestWrap_BreaksLongWords"
implementation:
  - backend/pkgs/labelmaker/makers_label.go
scope:
  - backend/pkgs/labelmaker
---

# A long word wraps inside the label

A word longer than the text column must break across lines. Text must not run out of its column.

Test: `TestWrap_BreaksLongWords`.
