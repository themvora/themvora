import { For, Show, createMemo, createSignal, onCleanup } from "solid-js";
import { ThemeScope, useTheme } from "@themvora/solid";
import { docsLinks, tailwindSnippet, cssSnippet, docsHome } from "@themvora/app-shared/content";
import { selection, modes, previewColors, scopedTheme } from "@themvora/app-shared/themes";
import { ui } from "@themvora/app-shared/ui";
import ThemeSwitcher from "./ThemeSwitcher";

type ColorTokens = Record<string, string | undefined>;

const ThemvoraDefault = () => {
  const { theme, mode, setMode, setFamily } = useTheme();

  const colors = createMemo(
    () => (theme().tokens?.colors ?? {}) as unknown as ColorTokens,
  );

  const getColor = (name: string, fallback = ""): string => {
    const value = colors()[name];
    return typeof value === "string" ? value : fallback;
  };

  const background = () => getColor("background", "#fafbff");
  const foreground = () => getColor("foreground", "#17172b");
  const border = () => getColor("border", "#dfe3f5");
  const muted = () => getColor("muted", "#f1f2fa");

  const titleStyle = () => ({
    "-webkit-text-stroke": `0.5px color-mix(in srgb, ${getColor("primary")} 75%, #000)`,
    "paint-order": "stroke fill",
  });

  const colorEntries = createMemo(() =>
    Object.keys(colors())
      .map((name) => [name, getColor(name)] as const)
      .filter(([, value]) => value),
  );

  const [copied, setCopied] = createSignal<string | null>(null);
  let timer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(timer));

  const copy = async (id: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(id);
      clearTimeout(timer);
      timer = setTimeout(() => setCopied(null), 1400);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div class={ui.page}>
      {/* Hero */}
      <header class={ui.hero.wrap}>
        <span class={ui.hero.pill}>
          <span class={ui.hero.pillDot} />
          <span class="truncate">
            {theme().meta?.label ?? "Themvora"} · {mode()}
          </span>
        </span>

        <h1 class={`text-center ${ui.hero.title}`}>
          Welcome to{" "}
          <span class={ui.hero.gradient} style={titleStyle()}>
            Themvora
          </span>
        </h1>

        <p class={ui.hero.lead}>
          Your app is themed. Edit{" "}
          <code class={ui.hero.inlineCode}>src/App.tsx</code> and start building.
          Every color, radius and font below is a Themvora token.
        </p>

        <nav aria-label="Documentation" class={ui.hero.nav}>
          <For each={docsLinks}>
            {(link, index) => (
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer noopener"
                class={index() === 0 ? ui.btnPrimary : ui.btnOutline}
              >
                {link.label}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="1em"
                  height="1em"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M7 17 17 7M8 7h9v9" />
                </svg>
              </a>
            )}
          </For>
        </nav>
      </header>

      {/* Controls */}
      <section aria-label="Theme controls" class={`${ui.card} grid gap-5`}>
        <div class="flex items-center justify-between flex-wrap">
          <div class={ui.controlGroup.wrap}>
            <h3 class={ui.controlGroup.label}>Mode + Toggle</h3>
            <div class={ui.controlGroup.group} role="group" aria-label="Mode + Toggle">
              <div class={ui.controls.segmentWrap}>
                <For each={modes}>
                  {(item) => (
                    <button
                      type="button"
                      aria-pressed={mode() === item}
                      class={ui.segment}
                      onClick={() => setMode(item)}
                    >
                      {item}
                    </button>
                  )}
                </For>
              </div>
            </div>
          </div>
          <ThemeSwitcher />
        </div>

        <hr class={ui.controls.divider} />

        <div class={ui.controlGroup.wrap}>
          <h3 class={ui.controlGroup.label}>Presets</h3>
          <div class={ui.controlGroup.group} role="group" aria-label="Presets">
            <For each={selection}>
              {(item) => (
                <button
                  type="button"
                  aria-pressed={theme().meta?.family === item}
                  class={ui.chip}
                  onClick={() => setFamily(item)}
                >
                  {item}
                </button>
              )}
            </For>
          </div>
        </div>
      </section>

      {/* Live preview */}
      <section
        aria-label="Theme preview"
        class={ui.previewWindow.section}
        style={{
          "background-color": background(),
          "border-color": border(),
          color: foreground(),
        }}
      >
        <div
          class={ui.previewWindow.bar}
          style={{ "background-color": muted(), "border-color": border() }}
        >
          <span class={`${ui.previewWindow.dot} bg-destructive`} />
          <span class={`${ui.previewWindow.dot} bg-accent`} />
          <span class={`${ui.previewWindow.dot} bg-success`} />
          <span
            class="ml-3 hidden h-5 flex-1 rounded-md sm:block"
            style={{ "background-color": background(), border: `1px solid ${border()}` }}
            aria-hidden="true"
          />
        </div>

        <div class={ui.previewWindow.body}>
          <div class="min-w-0">
            <h2 class="text-base font-semibold">{theme().meta?.label ?? "Themvora"}</h2>
            <p class="mt-1 break-all font-mono text-xs text-muted-foreground">
              {foreground()} on {background()}
            </p>

            <ul class="mt-4 flex flex-wrap gap-x-4 gap-y-2">
              <For each={previewColors}>
                {(name) => (
                  <Show when={getColor(name)}>
                    <li class="flex items-center gap-1.5">
                      <span
                        class={ui.previewWindow.swatch}
                        style={{ "background-color": getColor(name) }}
                      />
                      <span class="font-mono text-xs text-muted-foreground">{name}</span>
                    </li>
                  </Show>
                )}
              </For>
            </ul>
          </div>

          <div class="grid grid-cols-2 gap-2 sm:flex md:justify-end">
            <span
              class="rounded-md px-3 py-2 text-center text-sm font-medium"
              style={{
                "background-color": getColor("primary"),
                color: getColor("primaryForeground"),
              }}
            >
              Primary
            </span>
            <span
              class="rounded-md px-3 py-2 text-center text-sm font-medium"
              style={{
                "background-color": getColor("secondary"),
                color: getColor("secondaryForeground"),
              }}
            >
              Secondary
            </span>
          </div>
        </div>
      </section>

      {/* All theme colors */}
      <section class={ui.card}>
        <div class={ui.sectionHeading.wrap}>
          <h2 class={ui.sectionHeading.title}>Theme colors</h2>
          <p class={ui.sectionHeading.hint}>
            {colorEntries().length} tokens · tap to copy
          </p>
        </div>

        <ul class={ui.colorsGrid}>
          <For each={colorEntries()}>
            {([name, value]) => (
              <li class="min-w-0">
                <button
                  type="button"
                  title={`Copy ${value}`}
                  aria-label={`Copy ${name} ${value}`}
                  class={ui.colorButton}
                  onClick={() => copy(name, value)}
                >
                  <span
                    class="size-9 shrink-0 rounded-md border-2 border-border"
                    style={{ "background-color": value }}
                  />
                  <span class="min-w-0">
                    <span class="block truncate text-sm font-medium">{name}</span>
                    <span class="block truncate font-mono text-xs text-muted-foreground">
                      {copied() === name ? "Copied!" : value}
                    </span>
                  </span>
                </button>
              </li>
            )}
          </For>
        </ul>
      </section>

      {/* Use the tokens */}
      <section class={ui.card}>
        <div class={ui.sectionHeading.wrap}>
          <h2 class={ui.sectionHeading.title}>Use the tokens</h2>
          <p class={ui.sectionHeading.hint}>
            Same tokens, two ways. Neither needs per-theme code.
          </p>
        </div>
        <div class="grid gap-3 md:grid-cols-2">
          <div class={ui.snippet.wrap}>
            <div class={ui.snippet.header}>
              <span class={ui.snippet.label}>Tailwind</span>
              <button
                type="button"
                class={ui.snippet.copyBtn}
                onClick={() => copy("snippet-tailwind", tailwindSnippet)}
              >
                <span aria-live="polite">
                  {copied() === "snippet-tailwind" ? "Copied!" : "Copy"}
                </span>
              </button>
            </div>
            <pre class={ui.snippet.pre}>
              <code>{tailwindSnippet}</code>
            </pre>
          </div>

          <div class={ui.snippet.wrap}>
            <div class={ui.snippet.header}>
              <span class={ui.snippet.label}>CSS variables</span>
              <button
                type="button"
                class={ui.snippet.copyBtn}
                onClick={() => copy("snippet-css", cssSnippet)}
              >
                <span aria-live="polite">
                  {copied() === "snippet-css" ? "Copied!" : "Copy"}
                </span>
              </button>
            </div>
            <pre class={ui.snippet.pre}>
              <code>{cssSnippet}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Scoped theme */}
      <section class={ui.card}>
        <div class={ui.sectionHeading.wrap}>
          <h2 class={ui.sectionHeading.title}>Scoped theme</h2>
          <p class={ui.sectionHeading.hint}>
            This region is scoped to the {scopedTheme} theme.
          </p>
        </div>

        <ThemeScope theme={scopedTheme} className="rounded-lg shadow-md">
          <div class={ui.scoped.inner}>
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div class="min-w-0">
                <h3 class="font-semibold">Feature tile</h3>
                <p class="mt-1 text-sm text-primary-foreground/70">
                  Scoped via ThemeScope. It runs its own transition while the rest
                  of the page is untouched.
                </p>
                <p class="mt-3 flex items-center gap-2 text-sm text-primary-foreground/70">
                  <span class="size-2.5 shrink-0 rounded-full bg-success" />
                  Scoped to: {scopedTheme}
                </p>
              </div>
              <button type="button" class={ui.scoped.button}>
                Scoped button
              </button>
            </div>
          </div>
        </ThemeScope>
      </section>

      <footer class={ui.footer}>
        <span>Generated by</span>
        <code class="rounded bg-secondary px-1.5 py-0.5">themvora init</code>
        <span aria-hidden="true">·</span>
        <a
          href={docsHome}
          target="_blank"
          rel="noreferrer noopener"
          class={`rounded text-primary underline-offset-4 hover:underline ${ui.focusRing}`}
        >
          Themvora docs
        </a>
      </footer>
    </div>
  );
};

export default ThemvoraDefault;
