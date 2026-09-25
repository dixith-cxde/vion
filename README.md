# Vion — Unified Developer Workspace

Workspace-based collaboration: realtime documents (BlockNote + Yjs), task Kanban, channels/DMs (Socket.io), knowledge graph, GitHub integration, notifications.

## Stack

Next.js 16 + React 19, Postgres + Prisma 7, Clerk auth, Socket.io + Yjs via custom server (`server/index.ts`), TanStack Query, Tailwind v4 + shadcn.

## Prerequisites

Node 20+, Postgres database, Clerk application, GitHub OAuth app (optional).

Required env (`DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_TOKEN_ENCRYPTION_SECRET`).

## Run

```bash
npm install
npm run prisma:migrate
npm run prisma:generate
npm run dev            # custom server: Next + Socket.io + /collab Yjs on :3000
```

`npm run dev:next` runs plain Next only (no sockets, no collab). Production: `npm run build` then `npm run start:server` (`PORT`/`HOSTNAME` env supported). Plain `npm run start` serves Next without realtime.

## Scripts

- `npm run lint`, `npx tsc --noEmit`, `npm run build`
- `npm run prisma:studio`, `npm run backfill:workspace`

## Project agents

`.opencode/agents/`: `@vion-orchestrator` (primary, owns phase order) plus `vion-baseline`, `vion-backend`, `vion-realtime`, `vion-frontend`, `vion-splitter`, `vion-hygiene`. Rules in `AGENTS.md`: one phase at a time, file cap ~200 lines (max 300), production-only comments, clean-build gate (`tsc` + `lint` + `build` + server boot + smoke).
