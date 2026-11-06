---
id: "000040"
title: A schema change has a migration for each driver
kind: style
status: draft
owner: frederikbeimgraben
updated: 2026-11-06
implementation:
  - backend/internal/data/migrations
scope:
  - backend/internal/data/migrations
---

# A schema change has a migration for each driver

A schema change must have one migration in `migrations/sqlite3/` and one in
`migrations/postgres/`, with the same timestamp.

Reason: Homebox runs on SQLite and on PostgreSQL.

Test: `task test:ci` and `task test:ci:postgresql` run the e2e suite on each driver.
