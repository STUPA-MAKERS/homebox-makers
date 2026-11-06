---
id: "000059"
title: An invitation link joins the Sammlung
kind: functional
status: draft
owner: frederikbeimgraben
updated: 2026-11-06
implementation:
  - frontend/src/app/app.routes.ts
scope:
  - frontend/src/app/
---

# An invitation link joins the Sammlung

An invitation link `/?token=<id>` must let a signed-in user join the Sammlung. A visitor must
register with the token.

Test: `frontend/e2e/account.spec.ts`: invite a second user who joins the collection.
