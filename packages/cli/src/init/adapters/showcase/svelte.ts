/**
 * The Svelte showcase: `ThemvoraDefault.svelte` and `ThemeSwitcher.svelte`.
 *
 * Svelte 5 throughout: runes for local state (`$state`, `$derived`, `$effect`),
 * runes-era event attributes (`onclick`, not `on:click`), and `$store`
 * auto-subscription for the readable stores `useTheme()` returns.
 *
 * The file header is an HTML comment, not a JS block comment: a `/* … *​/` before
 * the markup is not a comment in a Svelte component and would render as text.
 *
 * @packageDocumentation
 */
import { generatedHtmlHeader } from "../../files.js";
import type { ShowcaseClasses } from "../showcase-classes.js";
import {
  CSS_SNIPPET,
  TAILWIND_SNIPPET_CLASS as TAILWIND_SNIPPET,
  docsLinks,
} from "../showcase-content.js";
import type { ShowcasePort } from "./port.js";

/** A backtick, so the generated snippets can be delimited without escaping. */
const BT = "`";

/**
 * `ThemvoraDefault.svelte`.
 *
 * @param c - The class vocabulary for the selected engine.
 * @param port - The framework-specific bits.
 * @returns The component's source.
 */
export function svelteThemvoraDefault(c: ShowcaseClasses, port: ShowcasePort): string {
  const links = docsLinks(port.guideSlug)
    .map((link) => `    { href: "${link.href}", label: "${link.label}" },`)
    .join("\n");

  return `${generatedHtmlHeader("The Themvora showcase.")}<script lang="ts">
  import { ThemeScope, useTheme } from "${port.hooksFrom}";

  import { scopedFamily, selection } from "../themes/themes";
  import ThemeSwitcher from "./ThemeSwitcher.svelte";

  const modes = ["light", "dark", "system"] as const;
  const previewColors = ["primary", "secondary", "accent", "muted"] as const;

  const docsLinks = [
${links}
  ];

  const tailwindSnippet = ${BT}${TAILWIND_SNIPPET}${BT};

  const cssSnippet = ${BT}${CSS_SNIPPET}${BT};

  const { theme, mode, setMode, setFamily } = useTheme();

  let copied = $state<string | null>(null);
  let timer: ReturnType<typeof setTimeout> | undefined;

  // The "Copied!" state is on a timer, so it has to be cleared on teardown.
  $effect(() => () => clearTimeout(timer));

  const colors = $derived(($theme.tokens?.colors ?? {}) as Record<string, unknown>);

  /**
   * Resolve a semantic colour from the active theme.
   *
   * Returns undefined when the token is absent, and the caller omits the value
   * rather than substituting a literal — a fallback colour here would be a second
   * palette, which is exactly what a themed component must not carry.
   */
  function getColor(name: string): string | undefined {
    const value = colors[name];
    return typeof value === "string" ? value : undefined;
  }

  const colorEntries = $derived(
    Object.keys(colors)
      .map((name) => [name, getColor(name)] as const)
      .filter((entry): entry is readonly [string, string] => Boolean(entry[1])),
  );

  async function copy(id: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      copied = id;
    } catch {
      // Clipboard access can be denied; say so rather than pretending it worked.
      copied = id + ":failed";
    }
    clearTimeout(timer);
    timer = setTimeout(() => (copied = null), 1400);
  }
</script>

<div class="${c.page}">
  <!-- Hero -->
  <header class="${c.hero}">
    <span class="${c.status}">
      <span class="${c.statusDot}"></span>
      <span class="${c.statusText}">
        {$theme.meta?.label ?? "Themvora"} · {$mode}
      </span>
    </span>

    <h1 class="${c.title}">
      Welcome to <span class="${c.titleGradient}">Themvora</span>
    </h1>

    <p class="${c.lead}">
      Your app is themed. Edit <code class="${c.code}">${port.editPath}</code> and start
      building. Every color, radius and font below is a Themvora token.
    </p>

    <nav aria-label="Documentation" class="${c.docsNav}">
      {#each docsLinks as link, index (link.href)}
        <a
          href={link.href}
          target="_blank"
          rel="noreferrer noopener"
          class={index === 0 ? "${c.btnPrimary}" : "${c.btnOutline}"}
        >
          {link.label}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            class="${c.icon}"
          >
            <path d="M7 17 17 7M8 7h9v9" />
          </svg>
        </a>
      {/each}
    </nav>
  </header>

  <!-- Controls -->
  <section class="${c.card} ${c.cardStack}" aria-label="Theme controls">
    <div class="${c.controlsRow}">
      <div class="${c.controlGroup}">
        <h3 class="${c.controlLabel}">Mode + Toggle</h3>
        <div class="${c.controlRow}" role="group" aria-label="Mode + Toggle">
          <div class="${c.segments}">
            {#each modes as item (item)}
              <button
                type="button"
                aria-pressed={$mode === item}
                class="${c.segment}"
                onclick={() => setMode(item)}
              >
                {item}
              </button>
            {/each}
          </div>
        </div>
      </div>
      <ThemeSwitcher />
    </div>

    <hr class="${c.rule}" />

    <div class="${c.controlGroup}">
      <h3 class="${c.controlLabel}">Presets</h3>
      <div class="${c.controlRow}" role="group" aria-label="Presets">
        {#each selection as item (item)}
          <button
            type="button"
            aria-pressed={$theme.meta?.family === item}
            class="${c.chip}"
            onclick={() => setFamily(item)}
          >
            {item}
          </button>
        {/each}
      </div>
    </div>
  </section>

  <!-- Live preview -->
  <section
    aria-label="Theme preview"
    class="${c.preview}"
    style:background-color={getColor("background")}
    style:border-color={getColor("border")}
    style:color={getColor("foreground")}
  >
    <div
      class="${c.previewBar}"
      style:background-color={getColor("muted")}
      style:border-color={getColor("border")}
    >
      <span class="${c.previewDot} ${c.previewDotDestructive}"></span>
      <span class="${c.previewDot} ${c.previewDotAccent}"></span>
      <span class="${c.previewDot} ${c.previewDotSuccess}"></span>
      <span
        class="${c.previewAddress}"
        style:background-color={getColor("background")}
        style:border={getColor("border") ? "1px solid " + getColor("border") : undefined}
        aria-hidden="true"
      ></span>
    </div>

    <div class="${c.previewBody}">
      <div class="${c.previewInfo}">
        <h2 class="${c.previewTitle}">{$theme.meta?.label ?? "Themvora"}</h2>
        <p class="${c.previewMeta}">
          {getColor("foreground") ?? "foreground"} on {getColor("background") ?? "background"}
        </p>

        <ul class="${c.previewSwatches}">
          {#each previewColors as name (name)}
            {#if getColor(name)}
              <li class="${c.previewSwatch}">
                <span class="${c.previewSwatchDot}" style:background-color={getColor(name)}></span>
                <span class="${c.previewSwatchName}">{name}</span>
              </li>
            {/if}
          {/each}
        </ul>
      </div>

      <div class="${c.previewActions}">
        <span
          class="${c.previewPill}"
          style:background-color={getColor("primary")}
          style:color={getColor("primaryForeground")}
        >
          Primary
        </span>
        <span
          class="${c.previewPill}"
          style:background-color={getColor("secondary")}
          style:color={getColor("secondaryForeground")}
        >
          Secondary
        </span>
      </div>
    </div>
  </section>

  <!-- All theme colors -->
  <section class="${c.card}">
    <div class="${c.cardHeading}">
      <h2 class="${c.cardTitle}">Theme colors</h2>
      <p class="${c.cardHint}">{colorEntries.length} tokens · tap to copy</p>
    </div>

    <ul class="${c.tokenGrid}">
      {#each colorEntries as [name, value] (name)}
        <li>
          <button
            type="button"
            title={"Copy " + value}
            aria-label={"Copy " + name + " " + value}
            class="${c.token}"
            onclick={() => copy(name, value)}
          >
            <span class="${c.tokenSwatch}" style:background-color={value}></span>
            <span class="${c.tokenBody}">
              <span class="${c.tokenName}">{name}</span>
              <span class="${c.tokenValue}" aria-live="polite">
                {copied === name ? "Copied!" : copied === name + ":failed" ? "Copy failed" : value}
              </span>
            </span>
          </button>
        </li>
      {/each}
    </ul>
  </section>

  <!-- Use the tokens -->
  <section class="${c.card}">
    <div class="${c.cardHeading}">
      <h2 class="${c.cardTitle}">Use the tokens</h2>
      <p class="${c.cardHint}">Same tokens, two ways. Neither needs per-theme code.</p>
    </div>
    <div class="${c.snippetGrid}">
      <div class="${c.snippet}">
        <div class="${c.snippetHead}">
          <span class="${c.snippetLabel}">Tailwind</span>
          <button type="button" class="${c.snippetCopy}" onclick={() => copy("snippet-tailwind", tailwindSnippet)}>
            <span aria-live="polite">{copied === "snippet-tailwind" ? "Copied!" : "Copy"}</span>
          </button>
        </div>
        <pre class="${c.snippetCode}"><code>{tailwindSnippet}</code></pre>
      </div>

      <div class="${c.snippet}">
        <div class="${c.snippetHead}">
          <span class="${c.snippetLabel}">CSS variables</span>
          <button type="button" class="${c.snippetCopy}" onclick={() => copy("snippet-css", cssSnippet)}>
            <span aria-live="polite">{copied === "snippet-css" ? "Copied!" : "Copy"}</span>
          </button>
        </div>
        <pre class="${c.snippetCode}"><code>{cssSnippet}</code></pre>
      </div>
    </div>
  </section>

  <!-- Scoped theme -->
  <section class="${c.card}">
    <div class="${c.cardHeading}">
      <h2 class="${c.cardTitle}">Scoped theme</h2>
      <p class="${c.cardHint}">This region is scoped to the {scopedFamily} theme.</p>
    </div>

    <div class="${c.scopedTile}">
      <!-- A family scope, so the region keeps its own palette while still
           following the page's light/dark mode. -->
      <ThemeScope family={scopedFamily}>
        <div class="${c.scopedTileBody}">
          <div>
            <h3 class="${c.scopedTitle}">Feature tile</h3>
            <p class="${c.scopedText}">
              Scoped via ThemeScope. It runs its own transition while the rest of
              the page is untouched.
            </p>
            <p class="${c.scopedMeta}">
              <span class="${c.scopedDot}"></span>
              Scoped to: {scopedFamily}
            </p>
          </div>
          <button type="button" class="${c.scopedBtn}">Scoped button</button>
        </div>
      </ThemeScope>
    </div>
  </section>

  <footer class="${c.footer}">
    <span>Generated by</span>
    <code class="${c.code}">themvora init</code>
    <span aria-hidden="true">·</span>
    <a
      href="https://themvora-dev.vercel.app/"
      target="_blank"
      rel="noreferrer noopener"
      class="${c.footerLink}"
    >
      Themvora docs
    </a>
  </footer>
</div>
`;
}

/**
 * `ThemeSwitcher.svelte`.
 *
 * @param c - The class vocabulary for the selected engine.
 * @param port - The framework-specific bits.
 * @returns The component's source.
 */
export function svelteThemeSwitcher(c: ShowcaseClasses, port: ShowcasePort): string {
  return `${generatedHtmlHeader("A light/dark control.")}<script lang="ts">
  import { useTheme } from "${port.hooksFrom}";

  // Safe here, and only here: this component is rendered *inside* the provider.
  const { toggleTheme } = useTheme();
</script>

<div class="${c.switcherWrap}">
  <button type="button" class="${c.switcherBtn}" onclick={toggleTheme}>
    Toggle light/dark
  </button>
</div>
`;
}
