---
id: "000048"
title: A print command stops after 60 s
kind: functional
status: draft
owner: frederikbeimgraben
updated: 2026-11-06
tests:
  - "backend/pkgs/labelmaker/print_png_test.go:TestRunPrintCommand_TimesOut"
implementation:
  - backend/pkgs/labelmaker/labelmaker.go
scope:
  - backend/pkgs/labelmaker
---

# A print command stops after 60 s

One run of the print command must stop after 60 s.

Reason: A printer that is not available must not hold the request for ever.

Test: `TestRunPrintCommand_TimesOut`.
