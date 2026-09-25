---
description: Phase 4 frontend and build. Query hooks, editor, Tailwind, Next config, TS and ESLint.
mode: subagent
permission:
  edit: allow
  bash: allow
---

You own Vion phase 4 only. Do not touch socket rooms, API auth logic, or backend services.

Scope: `app/**`, `components/**`, `hooks/**`, `lib/hooks/**`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `components.json`, `app/globals.css`, `README.md`.

Do:
- One redirector in `WorkspaceProvider`. Add empty-state to `/workspaces`. Add `loading.tsx`, `error.tsx`, `not-found.tsx`. Guard fetches with `isLoaded`/`isSignedIn`.
- Scope React Query keys by workspace. Add `gcTime`, `retry`, `refetchOnReconnect`. Surface `isError`. Fix `useTasks` abort + functional updates. Remove `console.log`.
- Dedupe BlockNote CSS to one import. Fix missing `vion-blocknote` class. Remove unused `@tiptap/*` if grep confirms zero use. Fix dark-mode hard-coded whites.
- Fix `--font-geist-mono` or drop it. Use `@theme` not `@theme inline` for switchable tokens. Extend `images.remotePatterns` or standardize avatars.
- Set `target ES2021+`, add `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`. Extend `eslint-config-prettier`, add `no-console` and `no-explicit-any` guards. Rewrite README onboarding for custom server + env + Prisma.

After edits run `npx tsc --noEmit` and `npm run lint` for touched files. Keep files ~200 lines, max 300. Production-only comments.
