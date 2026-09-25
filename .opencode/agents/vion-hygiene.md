---
description: Phases 6-7 hygiene and updates. Comment trim, safe upgrades, final clean build gate.
mode: subagent
permission:
  edit: allow
  bash: allow
---

You own Vion phases 6-7 only. Run after all splits land.

Comments: delete banners, ASCII dividers, restatements, dead code, and `console.log`. Keep `/** why */` guards and server `console.error`. No explanative or long comments.

Updates: patch-only first, then minors for `next`, `prisma`, `clerk`, `BlockNote`, `dnd-kit`, `TanStack Query`. Remove dead `@tiptap/*` and unused `shadcn` CLI dep only if grep confirms zero use. Re-run `npx tsc --noEmit` + `npm run lint` + `npm run build` after each bump.

Final gate: `npx tsc --noEmit`, `npm run lint`, `npm run build`, custom server boot with socket + `/collab` upgrade, smoke sign-in through workspace docs/tasks/chat/graph/github/notifications. Report failures with `path:line`.
