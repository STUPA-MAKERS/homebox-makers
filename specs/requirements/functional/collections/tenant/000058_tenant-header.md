---
id: "000058"
title: Every API request names the Sammlung
kind: functional
status: draft
owner: frederikbeimgraben
updated: 2026-11-06
implementation:
  - frontend/src/app/core/collection/tenant.interceptor.ts
  - frontend/src/app/core/api/api-client.service.ts
scope:
  - frontend/src/app/core
---

# Every API request names the Sammlung

Every API request must send the selected Sammlung in the `X-Tenant` header. A URL that the
browser opens itself, for example `<img src>`, must send it as `?tenant=`.

Reason: A user can be a member of more than one Sammlung. A browser request cannot set a header.
