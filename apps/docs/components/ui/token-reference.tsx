"use client";

import { useMemo, useState } from "react";

import { CopyButton } from "./copy-button";

/**
 * The complete token list for the active theme, with copy affordances.
 *
 * The page previously showed a hand-written sample of each group, which left
 * readers unable to answer the question they actually arrive with: *what are
 * the exact variable names, and what are they called in JSON?* Guessing a key
 * is how people end up with `var(--theme-spacing-md)` resolving to nothing.
 *
 * The data is passed in from the server, derived from the real built-in theme,
 * so this list cannot drift from what the runtime emits.
 */
export type TokenGroupView = {
  /** Group id, e.g. `colors`. */
  id: string;
  /** What the group is for, in one line. */
  description: string;
  /** `key` is the token name as authored; `value` is its resolved value. */
  entries: { key: string; value: string }[];
  /** The prefix the runtime appends the key to, e.g. `--theme-color-`. */
  cssPrefix: string;
};

export function TokenReference({ groups }: { groups: TokenGroupView[] }) {
  const [active, setActive] = useState(groups[0]?.id ?? "");

  const current = groups.find((group) => group.id === active) ?? groups[0];

  const css = useMemo(
    () =>
      groups
        .flatMap((group) =>
          group.entries.map((entry) => `${group.cssPrefix}${entry.key}: ${entry.value};`),
        )
        .join("\n"),
    [groups],
  );

  const json = useMemo(() => {
    const out: Record<string, Record<string, string>> = {};
    for (const group of groups) {
      out[group.id] = Object.fromEntries(group.entries.map((e) => [e.key, e.value]));
    }
    return JSON.stringify(out, null, 2);
  }, [groups]);

  if (!current) return null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {groups.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => setActive(group.id)}
            aria-pressed={group.id === current.id}
            className={`mono rounded-md border px-2.5 py-1 text-xs transition-colors ${
              group.id === current.id
                ? "border-transparent bg-[var(--theme-color-primary)] text-[var(--theme-color-primaryForeground)]"
                : "opacity-70 hover:opacity-100"
            }`}
            style={
              group.id === current.id
                ? undefined
                : { borderColor: "var(--theme-color-border)" }
            }
          >
            {group.id}
            <span className="ml-1.5 opacity-60">{group.entries.length}</span>
          </button>
        ))}
      </div>

      <p className="mb-3 text-sm opacity-70">{current.description}</p>

      <div
        className="overflow-hidden rounded-lg border"
        style={{ borderColor: "var(--theme-color-border)" }}
      >
        <div
          className="flex items-center justify-between gap-2 border-b px-3 py-2"
          style={{ borderColor: "var(--theme-color-border)" }}
        >
          <code className="mono text-xs opacity-70">
            {current.cssPrefix}
            <span className="opacity-50">{"{key}"}</span>
          </code>
          <CopyButton text={current.entries.map((e) => `${current.cssPrefix}${e.key}: ${e.value};`).join("\n")} label="CSS" />
        </div>

        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <tbody>
              {current.entries.map((entry) => (
                <tr
                  key={entry.key}
                  className="border-t first:border-t-0"
                  style={{ borderColor: "var(--theme-color-border)" }}
                >
                  <td className="mono w-1/2 px-3 py-1.5 align-top break-all">{entry.key}</td>
                  <td className="mono px-3 py-1.5 align-top break-all opacity-70">
                    <span className="inline-flex items-center gap-2">
                      {entry.value.startsWith("#") || entry.value.startsWith("rgb") ? (
                        <span
                          aria-hidden
                          className="inline-block size-3 shrink-0 rounded-sm border"
                          style={{
                            background: entry.value,
                            borderColor: "var(--theme-color-border)",
                          }}
                        />
                      ) : null}
                      {entry.value}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <CopyButton text={css} label="Copy all as CSS variables" />
        <CopyButton text={json} label="Copy all as JSON" />
        <span className="text-xs opacity-60">
          Every group, every key — the same names the runtime writes.
        </span>
      </div>
    </div>
  );
}
