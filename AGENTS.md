<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:vion-orchestration -->
# Vion orchestration — do not go out of order

Primary: `@vion-orchestrator`. One phase at a time via todowrite. No skipping without `tsc + lint` green.

1. `0 baseline` → `@vion-baseline`
2. `1-2 backend` → `@vion-backend`
3. `3 realtime` → `@vion-realtime`
4. `4 frontend/build` → `@vion-frontend`
5. `5 splits` → `@vion-splitter`
6. `6-7 hygiene + updates` → `@vion-hygiene`

Locked: keep custom `server/index.ts` (socket.io + Yjs); persist Yjs to Postgres; file cap ~200 lines, hard max 250-300 (`lib/generated/**`, `prisma/schema.prisma`, CSS tokens exempt); production-only comments (no banners, restatements, ASCII dividers, dead code, `console.log`).

Gate: `npx tsc --noEmit` + `npm run lint` + `npm run build` + server boot (socket + `/collab`) + smoke (workspace docs/tasks/chat/graph/github/notifications).
<!-- END:vion-orchestration -->
