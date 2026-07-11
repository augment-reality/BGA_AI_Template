# BGA Modern Game Scaffold

Copy-ready starter for a modern BGA game (2024+ framework: namespaced
`Bga\GameFramework\Table`, `States/` classes, jsonc configs). Distilled from the official
template as instantiated in kalua_b, patterns cross-checked against camelup/gocaine and
updated 2026-07-11 against a pristine official template snapshot (see
`../upstream-template-2026-07/` — diff against future Studio projects to catch template
revisions).

**Preferred way to use this: run `/bga-new-game`** — it walks through copying, renaming,
and customizing. Manual steps below.

## Placeholders (plain find-and-replace, no collisions)

| Token | Meaning | Example |
|---|---|---|
| `yourgame` | lowercase project id — MUST exactly match the BGA Studio project name | `camelup` |
| `YourGame` | PascalCase — PHP namespace `Bga\Games\YourGame` | `CamelUp` |
| `Your Game Name` | display name in gameinfos | `Camel Up` |

Also rename the files `yourgame.game.php` and `yourgame.css`.

## What's included

- Entry shim `yourgame.game.php` (required by the server; do not delete)
- `gameinfos.jsonc` / `gameoptions.jsonc` / `gamepreferences.jsonc` / `stats.jsonc`
- `dbmodel.sql` — Deck-compatible `card` table + schema-trap warning
- `modules/php/Game.php` + `material.inc.php` + `States/{PlayerTurn,NextPlayer,EndScore}.php`
  — a minimal but complete play-a-card-or-pass loop (actions, notifications, zombie, stats)
- `modules/js/Game.js` — matching client: state handler, promise notifications, ghost-slide
  animation helper
- `yourgame.css` (+ SCSS source in `src-disabled/scss/`)
- `bga-framework.d.ts` — JS API typings (also useful reference for API names)
- TS pipeline (optional): `package.json`, `rollup.config.mjs`, `tsconfig.json`,
  `src-disabled/ts/`
- `.vscode/sftp.json` — deployment config with PLACEHOLDER credentials
- `misc/to-do` — session-notes file (dated entries, "verify in Studio" flags)

## Plain-JS vs TypeScript workflow

Default is plain JS: edit `modules/js/Game.js` directly; `src-disabled/` is inert.
To activate the TS pipeline: rename `src-disabled` → `src`, `npm install`, `npm run build`
(bundles `src/ts/Game.ts` → `modules/js/Game.js`; compiles SCSS → `yourgame.css`).
After activation, never hand-edit the generated `modules/js/Game.js`.

## Deployment (read this — it has bitten before)

1. Create the project in BGA Studio FIRST; the Studio project name defines `remotePath`.
2. Fill in `.vscode/sftp.json` (username/password/remotePath) — requires the VS Code
   "SFTP" extension (Natizyskunk). See the bga skill's `references/dev-setup.md`.
3. `uploadOnSave` only fires on editor saves. After external writes (Claude Code, git),
   run "SFTP: Sync Local → Remote" and verify in the Output panel.
4. Schema changes to an existing game DB are silently ignored (`IF NOT EXISTS`) —
   start a NEW table in Studio after editing `dbmodel.sql`.

Note on the entry shim: the freshest official template (upstream-template-2026-07) ships
WITHOUT a top-level `.game.php` — Studio appears to handle it server-side now. The shim is
kept here because it is harmless and older docs/error messages still reference it; delete
it if a Studio test confirms it's redundant.
