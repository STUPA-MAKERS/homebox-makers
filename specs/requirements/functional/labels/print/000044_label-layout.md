---
id: "000044"
title: The label has a fixed layout
kind: functional
status: draft
owner: frederikbeimgraben
updated: 2026-11-06
implementation:
  - backend/pkgs/labelmaker/makers_label.go
scope:
  - backend/pkgs/labelmaker
---

# The label has a fixed layout

The label must show, from left to right: the MAKERS logo column, the title with a dotted rule
and the notes above a black maker and model bar, and the QR code with the asset ID.

Reason: All MAKERS labels must look the same on the shelf.

Test: Review of a generated label.
