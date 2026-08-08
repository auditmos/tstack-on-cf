# Decision: agent support is declared, not mirrored

**Status:** accepted · **Applies to:** `AGENTS.md`, `.claude/`

## Decision

This template ships configuration for **one** agent tool and a single
tool-neutral instruction file. It does not mirror agent definitions, rules, or
commands into the configuration formats of other tools. Which tool gets what is
stated in the matrix below instead.

## Support matrix

| Tool | Support | What it reads here |
| ---- | ------- | ------------------ |
| **Claude Code** | First-class | `.claude/CLAUDE.md`, `.claude/rules/` (path-scoped, activate on the files being edited), `.claude/agents/`, `.claude/commands/`, `.claude/settings.json` |
| **Any tool implementing the `AGENTS.md` convention** — Codex CLI, Cursor, Zed, GitHub Copilot's coding agent, and others; check your tool's own documentation | Best-effort | `AGENTS.md` only: stack, layout, commands, and the verification steps. The path-scoped rules under `.claude/rules/` are not picked up |
| **Cursor** (`.cursor/rules/`), **Windsurf** (`.windsurfrules`), **GitHub Copilot** (`.github/copilot-instructions.md`), **Gemini CLI** (`GEMINI.md`), **Aider** (`CONVENTIONS.md`) | Unsupported | Nothing. No such file ships here. Adding one is yours to write and yours to keep current |
| **Codex CLI local state** (`.codex/`) | Not shipped | Gitignored. If it exists in your checkout it is yours, not the template's |

"First-class" means the configuration is maintained and the repository's own
verification exercises it. "Best-effort" means the file is maintained but only
carries what fits in one tool-neutral document. "Unsupported" means absent, and
absent on purpose.

## Why

Mirroring is cheap to do once and expensive forever. Every duplicated rule file
is a permanent obligation: a rule changes, and now it has to change in three
formats or two of them start lying. Nothing in a repository's verification
catches an agent instruction that has quietly drifted, which is precisely the
class of rot this template's invariant tests exist to prevent everywhere else.

The audience makes it worse rather than better. Secondary tool configs serve
whoever happens to use that tool, and the maintenance falls on the person who
does not. Partial parity that rots is worse for that cloner than an honest
"not supported": it looks like a supported path right up to the point where the
instructions are stale, and stale instructions are harder to detect than absent
ones.

`AGENTS.md` is the hedge. It is a convention several tools already read, so
tool-neutral guidance reaches them without a per-tool file. `.claude/CLAUDE.md`
is a symlink to it — one file, two names, no synchronisation. That is the only
form of mirroring this template will do: the kind the filesystem maintains.

## Decide differently when

- **Your team standardises on one of the unsupported tools.** Then write its
  config and own it. Prefer a symlink to `AGENTS.md` over a copy where the tool's
  format allows it; where it does not, keep the copy thin — point at
  `AGENTS.md` rather than restating it.
- **You are on a checkout without symlink support** (Windows without developer
  mode, some archive extractions). `.claude/CLAUDE.md` may arrive as a text file
  containing the path `../AGENTS.md`. Replace it with a real copy and accept the
  synchronisation cost, or enable symlinks.
- **A tool's convention becomes near-universal.** Adding a file that many tools
  read is a different trade from adding one that a single tool reads — that is
  the reasoning that put `AGENTS.md` here in the first place, and it applies
  again if another such format appears.
