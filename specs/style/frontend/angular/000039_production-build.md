---
id: "000039"
title: A frontend change passes the production build
kind: style
status: draft
owner: frederikbeimgraben
updated: 2026-11-06
implementation:
  - frontend/angular.json
scope:
  - frontend/src/
---

# A frontend change passes the production build

A frontend change must pass `npx ng build`. `npm run typecheck` alone is not sufficient.

Reason: `npm run typecheck` does not check the templates. Only the build finds a wrong binding
in a template.

Test: CI runs `npx ng build`.
