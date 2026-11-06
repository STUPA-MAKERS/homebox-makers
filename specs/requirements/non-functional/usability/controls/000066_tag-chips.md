---
id: "000066"
title: Tags are removable chips with a + Tag chip
kind: non-functional
status: draft
owner: frederikbeimgraben
updated: 2026-11-06
implementation:
  - frontend/src/app/shared/ui/tag-chip/tag-chip.component.ts
  - frontend/src/styles.scss
scope:
  - frontend/src/app/
  - frontend/src/styles.scss
---

# Tags are removable chips with a + Tag chip

The tags of an entity must show as removable `app-tag-chip` chips. A dashed `+ Tag` chip at the
end must have the height of a tag chip, 26 px.
