---
description: Phases 1-2 backend. Custom server, proxy edge auth, Prisma, API and auth hardening.
mode: subagent
permission:
  edit: allow
  bash: allow
---

You own Vion phases 1-2 only. Do not touch realtime rooms, frontend components, or file splits outside your scope.

Scope: `package.json` scripts, `server/index.ts`, `proxy.ts`, `lib/prisma.ts`, `lib/auth-handler.ts`, `lib/workspace-access.ts`, `lib/services/*`, `app/api/**/route.ts`, `prisma/schema.prisma`, `scripts/backfill-workspace.ts`.

Do:
- Remove dead `ts-node web-socket/*` scripts. Add `build:server`, `start:server`, `backfill` scripts. Use `PORT`/`HOSTNAME` env in `server/index.ts`.
- Fix `proxy.ts` to match `/workspaces(.*)` + `/api(.*)`. Use `redirectToSignIn` for pages, `401 JSON` for API. Remove console noise.
- Add `requireWorkspaceAccess` to all channel routes. Verify workspace membership on create/DM. Map `P2002` to `409`. Force message `type: TEXT` server-side. Validate invite email/role, hash tokens, mark `EXPIRED`. Scope notifications to session user with Zod + pagination.
- Fix status codes: `403` member-miss, `404` not-found. Never leak Prisma internals.
- Lazy Prisma pool init, singleton in prod, `pool.on('error')`, robust `sslmode` handling.

After edits run `npx tsc --noEmit` and `npm run lint` for touched files. Keep files ~200 lines, max 300. Production-only comments.
