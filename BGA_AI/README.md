# BGA_AI — Claude Resources for BGA Development

Claude-related knowledge for Board Game Arena game development.

## Where everything lives now (since 2026-07-10)

| Thing | Location | What it does |
|---|---|---|
| **`bga` skill** | `~/.claude/skills/bga/` | Auto-loads for any BGA work — no manual command needed. SKILL.md routes to 17 on-demand references (php, sql, js, css, config, cards, multiplayer, client-states, animations, modules, logs, troubleshooting, legacy, examples, ui-patterns, lessons, dev-setup) |
| **`/bga-new-game` skill** | `~/.claude/skills/bga-new-game/` | Scaffolds a new game from `BGA_Template\scaffold\` (copy, token-replace, customize, deploy wiring) |
| **`/bga-retro` skill** | `~/.claude/skills/bga-retro/` | Run at END of every session — harvests gotchas into the shared lessons file |
| **`bga-checker` agent** | `~/.claude/agents/bga-checker.md` | Read-only audit for silently-failing wiring (dead buttons, orphan notifs, missing zombie(), unwired stats/options). Ask Claude to "run bga-checker on <project>" |
| **Scaffold** | `BGA_Template\scaffold\` | Copy-ready modern starter (namespaced Table, States/ classes, jsonc, optional TS pipeline). See its README |
| **Lessons file** | `~/.claude/skills/bga/references/lessons.md` | Cross-project gotchas, dated, with "Verified in Studio" flags — grows via /bga-retro |

## Typical workflow

1. **New game**: `/bga-new-game` → follow the checklist (Studio project first, sftp.json, new-table-after-schema-change)
2. **Daily work**: just describe the task — the `bga` skill auto-triggers and reads the right references
3. **Before deploy / after wiring changes**: run the `bga-checker` agent
4. **End of session**: `/bga-retro` to capture what was learned; sync files to Studio (SFTP → Sync Local → Remote — uploadOnSave does NOT catch Claude's edits)

## Archive

`archive/commands/` holds the 15 original `/bga-*` slash-command files (pre-2026-07-10).
Their content was migrated, corrected (modern States/ classes, injected-bga JS pattern),
and extended into the skill references above. Kept for reference only — do not restore
them to `~/.claude/commands/` (the `bga` name would collide with the skill).
