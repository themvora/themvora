/**
 * Manifest edits for `init`.
 *
 * A styling engine can need packages that belong in `devDependencies` —
 * Tailwind's compiler and its Vite or PostCSS plugin. The obvious way to add
 * them is a second `add -D` command, and that is what this module exists to
 * avoid: the package manager's dev flag applies to a whole command, so mixing
 * runtime and build-time packages means two resolutions of the same dependency
 * tree for one new project.
 *
 * Writing them into `package.json` instead lets the single install that already
 * has to run resolve everything at once, from the manifest as it will be. It
 * also makes `--no-install` honest: the manifest a user gets without installing
 * is the same manifest they would have got with it.
 *
 * @packageDocumentation
 */

/** The result of merging dependencies into a manifest. */
export interface ManifestEdit {
  /** The manifest's new contents, formatted with two-space indentation. */
  contents: string;
  /** The dependency names that were not already declared at that range. */
  added: string[];
}

/**
 * Merge dev dependencies into a `package.json`.
 *
 * @param existing - The manifest's current contents.
 * @param additions - Dependency names and the ranges to record.
 * @returns The merged manifest, or `null` when the file is not valid JSON or is
 *   not an object.
 *
 * @remarks
 * The merge is additive and sorted: an entry that already exists at the same
 * range is left alone, an entry that exists at a *different* range is left alone
 * too (the project's own pin wins), and only genuinely new names are inserted.
 * That is what makes a second `init` a no-op instead of a rewrite, and what
 * stops a starter from silently downgrading a dependency the user upgraded.
 *
 * Formatting is normalised to two-space JSON with a trailing newline, which is
 * what every scaffold in the supported frameworks writes.
 */
export function mergeDevDependencies(
  existing: string,
  additions: Readonly<Record<string, string>>,
): ManifestEdit | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(existing);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;

  const manifest = parsed as Record<string, unknown>;
  const current =
    typeof manifest["devDependencies"] === "object" &&
    manifest["devDependencies"] !== null &&
    !Array.isArray(manifest["devDependencies"])
      ? (manifest["devDependencies"] as Record<string, string>)
      : {};

  const merged: Record<string, string> = { ...current };
  const added: string[] = [];

  for (const [name, range] of Object.entries(additions)) {
    if (name in merged) continue;
    merged[name] = range;
    added.push(name);
  }

  if (added.length === 0) return { contents: existing, added };

  const sorted = Object.fromEntries(
    Object.keys(merged)
      .sort()
      .map((name) => [name, merged[name]!]),
  );

  return {
    contents: `${JSON.stringify({ ...manifest, devDependencies: sorted }, null, 2)}\n`,
    added,
  };
}
