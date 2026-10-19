# `themvora migrate`

## Prerequisites
- Node.js 22+
- Theme file(s) with legacy versions to migrate
- Project with @themvora/cli installed or npx access

Migrate a legacy theme to the current Themvora format. Theme schemas evolve;
`migrate` (via `migrateTheme`) applies the registered version migrations so a
theme from an older format still loads today.

<!-- cli-command:generated:start -->
## Synopsis — Migrate a theme to the latest format

```text
Usage:
  themvora migrate <file> [options]
```

| Argument | Description |
| -------- | ----------- |
| `<file>` | Legacy theme file to migrate. |

### Options

| Option | Description | Default |
| ------ | ----------- | ------- |
| `-f, --file <path>` | Legacy theme file to migrate (or pass it positionally). | — |
| `-o, --output <file>` | Write the migrated theme to a file. | — |
| `--write` | Migrate the file in place. This flag is the confirmation; without it the input is never overwritten. | — |
| `--dry-run` | Report what would change and write nothing. | — |
| `--json` | Emit the migration report as JSON on stdout. Add --write or --output to persist the result. | — |

### Exit codes

| Code | Meaning |
| ---- | ------- |
| `0` | success |
| `1` | command/runtime error |
| `2` | usage/argument error |

### Examples

```bash
themvora migrate legacy.json
themvora migrate legacy.json --dry-run
themvora migrate legacy.json --write
themvora migrate legacy.json --output theme.json
themvora migrate legacy.json --dry-run --json
```

> Generated from `packages/cli/src/command-schema.json` — the same contract `themvora --help` renders.
<!-- cli-command:generated:end -->
## Examples

```bash
# Migrate a single legacy theme
themvora migrate themes/legacy.json

# Migrate and write the current format to a new file
themvora migrate \
  themes/legacy.json \
  --output themes/current.json
```

Without `--output`, the migrated JSON is printed to stdout — use it to diff
what changed before overwriting the original.

## What migrations cover

The migration layer understands source and target versions, token renames,
color remapping, and arbitrary transforms. `migrate` runs every registered
migration between the file's version and the current schema. Back up your
themes before a bulk migration.

## Exit codes

| Code | Meaning |
| ---- | ------- |
| `0`  | Migrated (file written or printed). |
| `1`  | Migrating the file failed. |
| `2`  | No theme file supplied. |

## Next Steps
- [Export migrated tokens](./export)
- [Validate migrated themes](./validate)
- [CLI reference](./reference)

## Related
- [Themvora Quick Start](../quickstart)
- [Migration Docs](../../migration)
- [API Reference](../../api-reference)

Next: [export](/cli/export).
