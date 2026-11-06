---
id: "000027"
title: ui-kit changes go to ui-kit development first
kind: style
status: draft
owner: frederikbeimgraben
updated: 2026-11-06
implementation:
  - frontend/vendor/ui-kit
scope:
  - frontend/vendor/ui-kit
---

# ui-kit changes go to ui-kit development first

A ui-kit pull request must target the `development` branch of `STUPA-MAKERS/ui-kit`. The
submodule `frontend/vendor/ui-kit` must point at a merge commit of `development`. Nobody must
install packages in the submodule.

Reason: STUPA-Workflow uses the same kit. One branch keeps both apps on the same parts.

Test: Review: `git -C frontend/vendor/ui-kit branch -r --contains HEAD` lists
`origin/development`.
