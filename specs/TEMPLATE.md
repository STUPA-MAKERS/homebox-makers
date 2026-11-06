---
id: "NNNNNN"
title: Short title of the rule
kind: functional
status: draft
owner: frederikbeimgraben
updated: YYYY-MM-DD
tests:
  - "backend/pkgs/example/example_test.go:TestExampleRule"
implementation:
  - backend/pkgs/example
scope:
  - backend/pkgs/example
  - frontend/src/app/features/example
---

# Short title of the rule

The rule in one to three sentences. Use `must` and `must not`. Write one instruction in one
sentence.

Reason: The cause of the rule.

Test: The test, lint rule or check that finds a violation.
