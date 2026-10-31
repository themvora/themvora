# Archived milestone records

Historical working documents from the development of Themvora for VS Code:
milestone scopes, audits, implementation reports, phase progress logs and
decision records.

**These are a record, not documentation.** They describe the state of the package
at the time they were written. Several describe features as planned or partial
that have since shipped, and several describe behaviour that has since changed.
Do not read them as a description of current behaviour.

Use these instead:

- [`../../architecture.md`](../../architecture.md) — how the package works today.
- [`../../README.md`](../../README.md) — what it does and how to install it.
- [`../../CHANGELOG.md`](../../CHANGELOG.md) — what changed, and when.

## What is here, and why it was kept

The architectural conclusions of these documents were consolidated into
`architecture.md`. The originals are retained because they carry the reasoning
behind decisions that the current code does not explain on its own — why the CLI
is not loaded, why JSONC is masked rather than stripped, why source evidence is
never reported as runtime state.

| Document | Still worth reading for |
| --- | --- |
| `MILESTONE-3-CLI-DECISION.md` | The evidence behind not shelling out to `@themvora/cli`, and the proposed public API that would unblock it. |
| `MILESTONE-6-JSONC-REPORT.md` | Why comments and trailing commas are masked instead of stripped. |
| `MILESTONE-8-THEME-STUDIO.md` | The `defineTheme()` source-shape matrix: which shapes are read, and which are refused. |
| `MILESTONE-20-DRAFT-REGISTRY.md` | The audit that motivated a host-owned draft registry. |
| `MILESTONE-21-SAVED-ANALYSIS.md` | Why project analysis follows saved files, and the measurements either side of the change. |
| `MILESTONE-19-COMMAND-LAYER.md` | The command contract each command now shares. |
| `MILESTONE-15-UNCONFIGURED-ONBOARDING.md` | The workspace-state model and capability-aware navigation. |
| `MILESTONE-14-APPEARANCE-AND-SCROLLBAR.md` | Why Studio appearance is global state and never touches `workbench.colorTheme`. |
| `REACTIVE-STUDIO-PHASE-1-CONTRACT-MATRIX.md` | What each save format can and cannot preserve. |

Everything else is a scope, an audit or a progress log whose outcome is now
visible in the code and in `CHANGELOG.md`.
