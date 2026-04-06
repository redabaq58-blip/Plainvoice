# AGENTS.md

Instructions for AI coding agents working with this codebase.

## opensrc — Deep Package Context

This project uses opensrc for deep package context.
Before using any npm package, check `opensrc/<package>/` for source code.

Currently available in `opensrc/`:
- `next-intl` v4.9.0 — i18n/translations
- `@supabase/supabase-js` v2.101.1 — database client
- `@supabase/ssr` v0.10.0 — server-side Supabase helpers
- `github.com/cameronking4/VapiBlocks` — Vapi React components reference
- `github.com/vercel/next-forge` — Next.js monorepo patterns reference

See `opensrc/sources.json` for full list and paths.

<!-- opensrc:start -->

## Source Code Reference

Source code for dependencies is available in `opensrc/` for deeper understanding of implementation details.

See `opensrc/sources.json` for the list of available packages and their versions.

Use this source code when you need to understand how a package works internally, not just its types/interface.

### Fetching Additional Source Code

To fetch source code for a package or repository you need to understand, run:

```bash
npx opensrc <package>           # npm package (e.g., npx opensrc zod)
npx opensrc pypi:<package>      # Python package (e.g., npx opensrc pypi:requests)
npx opensrc crates:<package>    # Rust crate (e.g., npx opensrc crates:serde)
npx opensrc <owner>/<repo>      # GitHub repo (e.g., npx opensrc vercel/ai)
```

<!-- opensrc:end -->
