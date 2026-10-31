# Install the CLI

## Prerequisites
- Node.js 22+
- npm, pnpm, yarn, or bun installed

There are three practical ways to run `themvora`. Teams usually prefer the
**project-local** approach so every human and pipeline runs the identical
version; individuals often install globally.

## Requirements

- **Node.js 22+** (any modern release). npm, pnpm, yarn, and bun all work.

## 1. Install globally (any directory)

```bash
# npm — `-g` is npm's global-install flag
npm install -g @themvora/cli

# pnpm uses the long `--global` form
pnpm add --global @themvora/cli

# yarn (yarn 2+ with global support)
yarn global add @themvora/cli
```

> Installing globally: each package manager spells it differently. npm uses
> `npm install -g <pkg>`, pnpm uses `pnpm add --global <pkg>`, and yarn uses
> `yarn global add <pkg>`. In a team, prefer [project-local](#3-add-it-to-one-project-best-for-teams)
> so the version is reviewed and reproducible.

After a global install, `themvora` is on your shell's PATH and runs from any
directory. The packager writes a small shim for **every** platform, so
`themvora` works identically from Windows cmd, Windows PowerShell, macOS
Terminal (`bash`/`zsh`), and Linux (`bash`).

```bash
themvora --version
themvora --help
```

## 2. On demand with npx (zero install)

`npx` ships with Node and downloads the package when you run it:

```bash
npx --yes @themvora/cli generate --seed "#6366f1"
```

npm, pnpm, yarn, and bun all resolve the same package name.

## 3. Add it to one project (best for teams)

Lock the command into `package.json` so every teammate and every pipeline
runs the identical version:

```json
{
  "scripts": {
    "theme:generate": "themvora generate --seed \"#6366f1\" --family indigo --output theme.json"
  },
  "dependencies": {
    "@themvora/cli": "workspace:*"
  }
}
```

```bash
npm run theme:generate
```

A project-local dependency is deterministic: version bumps are reviewed in the
same PR that changes the script, so machines and humans agree.

## 4. Set up shell completion

Once `themvora` is on your PATH, you can enable shell completion. See [`themvora completion`](./completion) for the full setup.

## Prefer a direct alias instead of installing?

If you already have a clone or a built copy, you can alias the built entry point:

```bash
alias themvora="node /path/to/themvora/packages/cli/dist/cli.cjs"
```

## Verify the executable, not the workspace

A package's `bin` only proves portable if you test it from a **separate
directory** — not just from inside this monorepo. From any empty folder:

```bash
mkdir themvora-cli-test
cd themvora-cli-test
npx --yes @themvora/cli --version
```

That confirms the published package resolves your executable rather than a
workspace shortcut.

## Next Steps
- [Run your first theme workflow](./quickstart)
- [Generate a theme from a seed color](./generate)
- [CLI reference](./reference)

## Related
- [Themvora Quick Start](../quickstart)
- [Core Concepts](../../core-concepts)
- [API Reference](../../api-reference)

Next: [Quick Start](/cli/quickstart).