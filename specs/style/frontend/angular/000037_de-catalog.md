---
id: "000037"
title: Every UI text has a key in the DE catalog
kind: style
status: draft
owner: frederikbeimgraben
updated: 2026-11-06
implementation:
  - frontend/src/app/core/i18n/translations.ts
  - frontend/src/app/core/i18n/catalog
scope:
  - frontend/src/app/
---

# Every UI text has a key in the DE catalog

A UI text must not be written into a template or a component. It must have a key in
`catalog/de.json`. A key that `catalog/en.json` does not have shows the DE text.

Reason: DE is the reference language of the UI.

Test: `npx ng build`: `TranslationKey` comes from `de.json`, so an unknown key fails.
