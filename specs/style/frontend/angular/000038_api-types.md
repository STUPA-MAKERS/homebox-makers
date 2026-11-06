---
id: "000038"
title: The API types follow the backend swagger
kind: style
status: draft
owner: frederikbeimgraben
updated: 2026-11-06
implementation:
  - frontend/src/app/core/api/data-contracts.ts
scope:
  - frontend/src/app/core/api
  - backend/app/api/static/docs
---

# The API types follow the backend swagger

`frontend/src/app/core/api/data-contracts.ts` must match
`backend/app/api/static/docs/swagger.json`. A backend change of a request or a response must
change both in the same pull request.

Reason: A field that the frontend expects and the backend leaves out breaks the page.

Test: `npx ng build` fails when a template uses a field with the wrong type.
