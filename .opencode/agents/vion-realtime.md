---
description: Phase 3 realtime. Socket.io ACL, handler wiring, Yjs auth and Postgres persistence.
mode: subagent
permission:
  edit: allow
  bash: allow
---

You own Vion phase 3 only. Do not touch API validation, frontend query hooks, or unrelated splits.

Scope: `server/socket/**/*`, `lib/socket/**/*`, `app/_components/provider/socket-provider.tsx`, `app/_components/editor/collaboration-context.tsx`, `types/socket.type.ts`.

Do:
- Add `workspaceMember`/`channelMember` ACL before any `socket.join`. Reject and log unauthorized joins.
- Wire or delete `presence/notification` handlers. Remove empty stubs or implement them. Replace silent `if (!io) return` with warn + metric.
- Single `SocketProvider` in root only. Add token refresh with `socket.auth` update + reconnect. Use `router.push`, never `window.location.href`.
- Yjs: verify Clerk token + workspace access on `/collab/*` upgrade. Debounce `Y.Doc` updates to `prisma.document.update({ contentJson, version + 1 })`. Load `contentJson` into `Y.Doc` on join.

After edits run `npx tsc --noEmit` and `npm run lint` for touched files. Keep files ~200 lines, max 300. Production-only comments.
