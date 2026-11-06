# Specs

The binding rules of Homebox-MAKERS. One file holds one rule. The rules for specs are in
[style/specs/](style/specs/). Copy [TEMPLATE.md](TEMPLATE.md) to start a new rule. The structure
is the same as in STUPA-Workflow.

`python3 scripts/check_specs.py` checks every spec. `--write` updates the tree and the index of
this file.

## Tree

```
specs/
  style/
    backend/   database
    frontend/  angular
    shared/    git, testing, writing
    specs/     content, format, structure
  requirements/
    functional/
      collections/  invitations, tenant
      labels/       preview, print
      maintenance/  list
      scanner/      camera, codes
    non-functional/
      compatibility/  deploy, pwa
      security/       print
      usability/      controls, layout
```

The second level is the area, the third level is the topic. A topic folder holds the rule
files, for example `requirements/functional/labels/print/000042_makers-label-size.md`.

## Index

| ID | Title | Status |
| --- | --- | --- |
| [F/collections/invitations/000059](requirements/functional/collections/invitations/000059_invitation-link.md) | An invitation link joins the Sammlung | draft |
| [F/collections/tenant/000058](requirements/functional/collections/tenant/000058_tenant-header.md) | Every API request names the Sammlung | draft |
| [F/labels/preview/000049](requirements/functional/labels/preview/000049_file-viewer.md) | A label preview opens in the file viewer | draft |
| [F/labels/print/000042](requirements/functional/labels/print/000042_makers-label-size.md) | The label is the STUPA MAKERS label | draft |
| [F/labels/print/000043](requirements/functional/labels/print/000043_min-length.md) | A label is at least 12 mm long | draft |
| [F/labels/print/000044](requirements/functional/labels/print/000044_label-layout.md) | The label has a fixed layout | draft |
| [F/labels/print/000045](requirements/functional/labels/print/000045_black-only.md) | The label is black on white | draft |
| [F/labels/print/000046](requirements/functional/labels/print/000046_long-words.md) | A long word wraps inside the label | draft |
| [F/labels/print/000047](requirements/functional/labels/print/000047_print-placeholders.md) | Every print placeholder has a value | draft |
| [F/labels/print/000048](requirements/functional/labels/print/000048_print-timeout.md) | A print command stops after 60 s | draft |
| [F/maintenance/list/000056](requirements/functional/maintenance/list/000056_due-groups.md) | Wartung groups entries by due date | draft |
| [F/maintenance/list/000057](requirements/functional/maintenance/list/000057_list-and-detail.md) | Wartung is a list with a detail | draft |
| [F/scanner/camera/000054](requirements/functional/scanner/camera/000054_detector.md) | The camera uses the native barcode detector first | draft |
| [F/scanner/camera/000055](requirements/functional/scanner/camera/000055_photo-fallback.md) | Without a secure context the scanner takes a photo | draft |
| [F/scanner/codes/000050](requirements/functional/scanner/codes/000050_label-urls.md) | A label URL opens its Gegenstand or Ort | draft |
| [F/scanner/codes/000051](requirements/functional/scanner/codes/000051_asset-ids.md) | A typed or printed asset ID is found | draft |
| [F/scanner/codes/000052](requirements/functional/scanner/codes/000052_unknown-code.md) | An unknown code says so | draft |
| [F/scanner/codes/000053](requirements/functional/scanner/codes/000053_repeat-window.md) | The same code within 2.5 s is one scan | draft |
| [NF/compatibility/deploy/000079](requirements/non-functional/compatibility/deploy/000079_embedded-spa.md) | The backend serves the built SPA | draft |
| [NF/compatibility/pwa/000077](requirements/non-functional/compatibility/pwa/000077_android-nav-bar.md) | The Android navigation bar has the manifest colour | draft |
| [NF/compatibility/pwa/000078](requirements/non-functional/compatibility/pwa/000078_status-bar.md) | The status bar follows the page colour | draft |
| [NF/security/print/000080](requirements/non-functional/security/print/000080_argv-tokens.md) | A print value stays in one argument | draft |
| [NF/usability/controls/000060](requirements/non-functional/usability/controls/000060_no-counters.md) | Headings show no counters | draft |
| [NF/usability/controls/000061](requirements/non-functional/usability/controls/000061_no-summary-lines.md) | The UI has no summary lines | draft |
| [NF/usability/controls/000062](requirements/non-functional/usability/controls/000062_whole-row.md) | The whole row is clickable | draft |
| [NF/usability/controls/000063](requirements/non-functional/usability/controls/000063_row-menu.md) | A list row has a trailing row menu | draft |
| [NF/usability/controls/000064](requirements/non-functional/usability/controls/000064_ghost-rows.md) | An empty list shows ghost rows | draft |
| [NF/usability/controls/000065](requirements/non-functional/usability/controls/000065_filter-reset.md) | The filter reset is a chip at the end | draft |
| [NF/usability/controls/000066](requirements/non-functional/usability/controls/000066_tag-chips.md) | Tags are removable chips with a + Tag chip | draft |
| [NF/usability/controls/000067](requirements/non-functional/usability/controls/000067_row-tags.md) | A row shows tags, not the price | draft |
| [NF/usability/layout/000068](requirements/non-functional/usability/layout/000068_list-detail.md) | List pages use rail, list and detail | draft |
| [NF/usability/layout/000069](requirements/non-functional/usability/layout/000069_sheet.md) | A detail pane uses the sheet layout | draft |
| [NF/usability/layout/000070](requirements/non-functional/usability/layout/000070_sheet-note.md) | A description sits in a note box | draft |
| [NF/usability/layout/000071](requirements/non-functional/usability/layout/000071_fab-new.md) | Neu floats at the bottom | draft |
| [NF/usability/layout/000072](requirements/non-functional/usability/layout/000072_fab-save.md) | Speichern shows only after a change | draft |
| [NF/usability/layout/000073](requirements/non-functional/usability/layout/000073_edit-pane.md) | Edit opens as a side pane | draft |
| [NF/usability/layout/000074](requirements/non-functional/usability/layout/000074_phone-bar.md) | The phone bar has five fixed entries | draft |
| [NF/usability/layout/000075](requirements/non-functional/usability/layout/000075_phone-breakpoint.md) | The phone layout starts below 768 px | draft |
| [NF/usability/layout/000076](requirements/non-functional/usability/layout/000076_search-palette.md) | Ctrl+K opens the search | draft |
| [S/backend/database/000040](style/backend/database/000040_both-drivers.md) | A schema change has a migration for each driver | draft |
| [S/backend/database/000041](style/backend/database/000041_ent-generated.md) | Generated ent code is not edited by hand | draft |
| [S/frontend/angular/000036](style/frontend/angular/000036_kit-first.md) | Generic UI parts live in the ui-kit | draft |
| [S/frontend/angular/000037](style/frontend/angular/000037_de-catalog.md) | Every UI text has a key in the DE catalog | draft |
| [S/frontend/angular/000038](style/frontend/angular/000038_api-types.md) | The API types follow the backend swagger | draft |
| [S/frontend/angular/000039](style/frontend/angular/000039_production-build.md) | A frontend change passes the production build | draft |
| [S/shared/git/000025](style/shared/git/000025_upstream-merge.md) | Upstream changes come in by a merge | draft |
| [S/shared/git/000026](style/shared/git/000026_upstream-frontend.md) | Upstream frontend changes are dropped | draft |
| [S/shared/git/000027](style/shared/git/000027_ui-kit-flow.md) | ui-kit changes go to ui-kit development first | draft |
| [S/shared/git/000028](style/shared/git/000028_no-force-push.md) | A shared branch is never force-pushed | draft |
| [S/shared/git/000029](style/shared/git/000029_merge-go.md) | A merge needs the go of the owner | draft |
| [S/shared/testing/000030](style/shared/testing/000030_test-refers-to-rule.md) | A test refers back to its rule | draft |
| [S/shared/testing/000031](style/shared/testing/000031_e2e-per-flow.md) | A UI flow has a Playwright test | draft |
| [S/shared/testing/000034](style/shared/testing/000034_mockups-from-real-app.md) | UI mockups come from the real app | draft |
| [S/shared/writing/000035](style/shared/writing/000035_ste-english.md) | Repository texts are written in STE English | draft |
| [S/specs/content/000015](style/specs/content/000015_only-the-rule.md) | A spec contains only the rule | draft |
| [S/specs/content/000016](style/specs/content/000016_one-thing.md) | One rule controls one thing | draft |
| [S/specs/content/000017](style/specs/content/000017_examinable.md) | A rule can be examined | draft |
| [S/specs/content/000018](style/specs/content/000018_must-and-must-not.md) | The rule text uses must and must not | draft |
| [S/specs/content/000019](style/specs/content/000019_reason.md) | A rule gives its reason | draft |
| [S/specs/content/000020](style/specs/content/000020_test.md) | A rule names its test | draft |
| [S/specs/content/000021](style/specs/content/000021_current-rule.md) | A spec states the current rule | draft |
| [S/specs/content/000022](style/specs/content/000022_ste.md) | A spec is written in ASD-STE100 | draft |
| [S/specs/content/000023](style/specs/content/000023_product-terms.md) | Product terms stay as the UI shows them | draft |
| [S/specs/format/000001](style/specs/format/000001_copy-the-template.md) | A new spec starts as a copy of the template | draft |
| [S/specs/format/000002](style/specs/format/000002_front-matter.md) | A spec starts with a YAML front matter | draft |
| [S/specs/format/000003](style/specs/format/000003_status.md) | The status shows the approval | draft |
| [S/specs/format/000004](style/specs/format/000004_one-rule-per-file.md) | One file holds one rule | draft |
| [S/specs/format/000005](style/specs/format/000005_rule-id.md) | The rule ID has kind, path and number | draft |
| [S/specs/format/000006](style/specs/format/000006_unique-number.md) | The number is the identity of a rule | draft |
| [S/specs/format/000007](style/specs/format/000007_moved-rule.md) | A moved rule keeps its number | draft |
| [S/specs/format/000008](style/specs/format/000008_labels.md) | Labels in a rule are fixed | draft |
| [S/specs/format/000032](style/specs/format/000032_section-sign-reference.md) | Code refers to a rule with the § sign | draft |
| [S/specs/format/000033](style/specs/format/000033_file-name.md) | The file name is number and name | draft |
| [S/specs/structure/000009](style/specs/structure/000009_precedence.md) | A spec wins over other guidance | draft |
| [S/specs/structure/000010](style/specs/structure/000010_tree.md) | The tree sorts by kind, then by area and topic | draft |
| [S/specs/structure/000011](style/specs/structure/000011_folder-names.md) | Folder names are lower case kebab case | draft |
| [S/specs/structure/000012](style/specs/structure/000012_one-place.md) | A rule is written in one place | draft |
| [S/specs/structure/000013](style/specs/structure/000013_index.md) | The index lists every rule | draft |
| [S/specs/structure/000014](style/specs/structure/000014_change-process.md) | A change goes through a pull request | draft |
| [S/specs/structure/000024](style/specs/structure/000024_spec-first.md) | A change request starts as a spec | draft |
