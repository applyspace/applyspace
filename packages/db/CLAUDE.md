# packages/db — Claude instructions

> For git conventions and monorepo structure, see the root [CLAUDE.md](../../CLAUDE.md).

## Stack

- Drizzle ORM on SQLite (better-sqlite3). Prototype storage: the target is a shared Supabase (Postgres) database.
- Schema in `src/schema.ts`, migrations in `drizzle/migrations`.

## Conventions

- Constrained string columns store canonical English tokens, validated by a SQL CHECK and typed by a TS union from the same `as const` array. Translation happens at render, never in the database.
- Change the schema, then run `pnpm db:generate` and commit the migration.
- Platform session cookies and credentials are never stored in the database.
