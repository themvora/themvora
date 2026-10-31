import { useProvidedThemes, useSetThemeFamily, useTheme } from "@themvora/react";
import { useThemeOverrideControl } from "../theme-override-context";

/**
 * Theme discovery and the explicit override, side by side.
 *
 * The list is built from `useProvidedThemes()` — the provider's own collection —
 * not from the preset catalog the app happens to import. The override buttons
 * change a prop on the provider, so the selected theme applies even though a
 * different one may be saved in `localStorage`.
 */
export default function ProvidedThemesCard() {
  const families = useProvidedThemes();
  const setFamily = useSetThemeFamily();
  const { theme, family } = useTheme();
  const { override, setOverride } = useThemeOverrideControl();

  return (
    <section
      aria-label="Provided themes"
      className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6"
    >
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <h2 className="text-lg font-semibold">Themes this provider was given</h2>
        <p className="text-xs text-muted-foreground sm:text-sm">
          {families.length} families · from <code>useProvidedThemes()</code>
        </p>
      </div>

      <ul className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 md:grid-cols-3">
        {families.map((entry) => {
          const active = entry.family === family;
          return (
            <li key={entry.id} className="min-w-0">
              <button
                type="button"
                onClick={() => setFamily(entry.family)}
                aria-pressed={active}
                className="flex w-full min-w-0 flex-col gap-1 rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{entry.name}</span>
                  <span className="shrink-0 font-mono text-[11px] opacity-70">
                    {entry.family}
                  </span>
                </span>

                {/* Variants stay separate: light/dark are siblings, not a flattened list. */}
                <span className="flex flex-wrap items-center gap-1.5">
                  {entry.variants.map((variant) => (
                    <span
                      key={variant.name}
                      className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px]"
                    >
                      <span
                        aria-hidden
                        className="size-2.5 rounded-full border border-border"
                        style={{
                          // `colors` is a nested record; only a string is a paint.
                          backgroundColor:
                            typeof variant.tokens.colors?.background === "string"
                              ? variant.tokens.colors.background
                              : undefined,
                        }}
                      />
                      {variant.mode}
                    </span>
                  ))}
                  {entry.provenance ? (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">
                      {entry.provenance.kind}
                    </span>
                  ) : null}
                </span>

                {entry.meta?.description ? (
                  <span className="truncate text-[11px] opacity-70">
                    {entry.meta.description}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      <hr className="my-5 border-border" />

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-medium">Explicit override</h3>
          <p className="text-xs text-muted-foreground">
            Applied through the provider&apos;s <code>themeOverride</code> prop.
            It outranks a saved selection, applies once per value, and does not
            write to <code>localStorage</code>. Removing it restores the theme it
            covered. Current theme: <strong>{theme.name}</strong>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setOverride(undefined)}
            aria-pressed={override === undefined}
            className="rounded-full border border-border px-3 py-1.5 text-sm transition-colors hover:bg-muted aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
          >
            No override
          </button>

          {/*
            Two naming forms, side by side: a family (resolved for the mode in
            effect) and one exact variant. Removing the override — the button
            above — restores the selection it covered, without a reload.
          */}
          {families.slice(0, 4).map((entry) => {
            const variant = entry.variants[0];
            if (!variant) return null;
            return (
              <span key={entry.id} className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOverride(entry.family)}
                  aria-pressed={override === entry.family}
                  className="rounded-full border border-border px-3 py-1.5 text-sm transition-colors hover:bg-muted aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                >
                  Override → {entry.family}
                </button>
                <button
                  type="button"
                  onClick={() => setOverride(variant.name)}
                  aria-pressed={override === variant.name}
                  className="rounded-full border border-border px-3 py-1.5 text-sm transition-colors hover:bg-muted aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                >
                  {variant.name}
                </button>
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
