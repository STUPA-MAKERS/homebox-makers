---
id: "000025"
title: Upstream changes come in by a merge
kind: style
status: draft
owner: frederikbeimgraben
updated: 2026-11-06
implementation: null
scope:
  - backend/
  - docs/
---

# Upstream changes come in by a merge

Changes of `sysadminsmedia/homebox` `main` must come in by a merge commit on a branch from
`main`. A rebase or a squash of upstream commits must not be used.

Reason: A merge keeps the upstream history, so the next merge only brings the new commits.

Test: Review: `git log --merges` shows the merge of `upstream/main`.
