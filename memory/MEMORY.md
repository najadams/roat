# Argus Project Memory

## Stack Versions (Actual)
- Next.js 16.1.6 (not 14 as in CLAUDE.md)
- Zod v4.3.6 (not v3 — API differences apply)
- @supabase/supabase-js v2 + @supabase/ssr

## Next.js 16 vs CLAUDE.md spec
- `middleware.ts` → `proxy.ts`, export `proxy()` not `middleware()`
- Build cmd: `node node_modules/next/dist/bin/next build` (npx next broken)

## Zod v4 API differences
- `required_error` removed → pass string as 2nd arg: `z.enum(values, 'error msg')`
- `z.input<>` and `z.infer<>` still work

## Supabase Types
- Add `Relationships` to tables for nested selects to work
- `webinar_tasks` needs FK relationship to `webinars`
- Use `as any` cast for nested select results if type errors persist
- Exclude `supabase/functions/` from tsconfig (Deno imports)

## Setup Steps
1. Fill in `.env.local` with real Supabase credentials
2. Run SQL migrations 001-004 in Supabase SQL editor
3. Deploy Edge Function and pg_cron schedule
