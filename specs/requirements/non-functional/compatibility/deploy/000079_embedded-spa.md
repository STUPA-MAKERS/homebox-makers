---
id: "000079"
title: The backend serves the built SPA
kind: non-functional
status: draft
owner: frederikbeimgraben
updated: 2026-11-06
implementation:
  - Dockerfile
  - Dockerfile.rootless
  - Dockerfile.hardened
  - Taskfile.yml
scope:
  - backend/app/api/static/public
  - Dockerfile
---

# The backend serves the built SPA

The build of `frontend/` must go into `backend/app/api/static/public/`. The file `.gitkeep`
there must stay in git.

Reason: `go:embed` needs a file in the folder, also before a frontend build.
