---
description: Phase 5 splitter. Breaks large files to ~200 lines max 300 with barrel re-exports.
mode: subagent
permission:
  edit: allow
  bash: allow
---

You own Vion phase 5 only. Split files, change no behavior.

Cap: ~200 lines per file, hard max 250-300. Only generated code, `prisma/schema.prisma`, and CSS tokens may exceed. Keep `lib/generated/**` untouched.

Priority queue:
1. `lib/services/github.service.ts` into `lib/services/github/github-client.ts`, `github-mappers.ts`, `github-account.service.ts`, `github-connection.service.ts`, `github-repository.service.ts`, `github-entity.service.ts`, `github-overview-commits.service.ts` plus barrel.
2. `workspace-graph.tsx`, `github-workspace-page.tsx`, `github-repository-page.tsx`, `settings-client.tsx` into `*-types.ts`, `*-api.ts`, `*-cards.tsx`, `*-rows.tsx`, `*-skeleton.tsx`, shared `github-format.ts`.
3. `[workspaceId]/page.tsx`, `tasks/[taskId]/page.tsx`, `collaboration-context.tsx`, `editor-core.tsx`, `document-editor.tsx`, `channel.service.ts`, `message.service.ts`, `mention.ts`, `use-chat-realtime.ts`, `github-integration.service.ts` per orchestrator table.
4. Small tails: `tasks/[taskId]/route.ts` handlers + serialize, `tasks/route.ts` validation, `kanban-view.tsx` board/column/card, `editor-utils.ts` theme/content/mention.

Rules: one concern per file, barrel re-export keeps imports stable, one split per commit group, run `npx tsc --noEmit` + `npm run lint` after each group. Production-only comments.
