---
id: "000042"
title: The label is the STUPA MAKERS label
kind: functional
status: draft
owner: frederikbeimgraben
updated: 2026-11-06
tests:
  - "backend/pkgs/labelmaker/labelmaker_test.go:TestGenerateLabel_MakersLabelSize"
implementation:
  - backend/pkgs/labelmaker/makers_label.go
scope:
  - backend/pkgs/labelmaker
---

# The label is the STUPA MAKERS label

The generated label must be the STUPA MAKERS inventory label for a Brother QL-800. The defaults
must be a tape width of 62 mm, a length of 24 mm and 300 dpi.

Reason: MAKERS labels its inventory with the QL-800 on 62 mm continuous tape.

Test: `TestGenerateLabel_MakersLabelSize`.
