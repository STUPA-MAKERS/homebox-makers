---
id: "000047"
title: Every print placeholder has a value
kind: functional
status: draft
owner: frederikbeimgraben
updated: 2026-11-06
tests:
  - "backend/pkgs/labelmaker/print_png_test.go:TestPrintCommandDefaults_NoMissingKeys"
implementation:
  - backend/pkgs/labelmaker/labelmaker.go
scope:
  - backend/pkgs/labelmaker
---

# Every print placeholder has a value

The print command must get every placeholder that a label kind can have, also the STUPA MAKERS
ones `TapeWidth`, `Length`, `Maker`, `Model` and `AssetID`. A placeholder without a value must
render empty.

Reason: `text/template` renders a missing key as `<no value>`, and that text goes to the
printer.

Test: `TestPrintCommandDefaults_NoMissingKeys`.
