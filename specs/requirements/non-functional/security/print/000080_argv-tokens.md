---
id: "000080"
title: A print value stays in one argument
kind: non-functional
status: draft
owner: frederikbeimgraben
updated: 2026-11-06
tests:
  - "backend/pkgs/labelmaker/labelmaker_test.go:TestPrintLabel_ArgumentInjection"
implementation:
  - backend/pkgs/labelmaker/labelmaker.go
scope:
  - backend/pkgs/labelmaker
---

# A print value stays in one argument

The print command must split into arguments before it gets its values. A value with spaces must
stay in one argument.

Reason: Any user can set the name of a Gegenstand, and the name goes into the command.

Test: `TestPrintLabel_ArgumentInjection`.
