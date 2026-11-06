---
id: "000043"
title: A label is at least 12 mm long
kind: functional
status: draft
owner: frederikbeimgraben
updated: 2026-11-06
tests:
  - "backend/pkgs/labelmaker/labelmaker_test.go:TestGenerateLabel_TooShort"
implementation:
  - backend/pkgs/labelmaker/makers_label.go
scope:
  - backend/pkgs/labelmaker
---

# A label is at least 12 mm long

The label generator must refuse a length below 12 mm.

Reason: A shorter label leaves no room for the QR code and its asset ID.

Test: `TestGenerateLabel_TooShort`.
