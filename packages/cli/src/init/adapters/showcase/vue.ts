/**
 * The Vue showcase: `ThemvoraDefault.vue` and `ThemeSwitcher.vue`.
 *
 * The same design as the React port, in Vue 3 idioms: `<script setup lang="ts">`,
 * Composition API refs and computed values, and `ThemeScope` from
 * `@themvora/vue`. `useTheme()` returns refs here, so the template auto-unwraps
 * them while the script reads `.value`.
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
import type { StylingEngine } from "../../types.js";

/** A backtick, so the generated snippets can be delimited without escaping. */
const BT = "`";

/**
 * `ThemvoraDefault.vue`.
 *
 * @param c - The class vocabulary for the selected engine.
 * @param port - The framework-specific bits.
 * @returns The component's source.
 */
export function vueThemvoraDefault(
  c: ShowcaseClasses,
  port: ShowcasePort,
  styling: StylingEngine,
): string {
  // A plain-CSS project is not shown a Tailwind snippet: the card would be
  // documenting an engine the project does not have.
  const tailwind = styling === "tailwind";
  const links = docsLinks(port.guideSlug)
    .map((link) => `  { href: "${link.href}", label: "${link.label}" },`)
    .join("\n");

  return `${generatedHtmlHeader("The Themvora showcase.")}<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { ThemeScope, useTheme } from "${port.hooksFrom}";

import { scopedFamily, selection } from "../themes/themes";
import ThemeSwitcher from "./ThemeSwitcher.vue";

const modes = ["light", "dark", "system"] as const;
const previewColors = ["primary", "secondary", "accent", "muted"] as const;

const docsLinks = [
${links}
];

${tailwind ? `const tailwindSnippet = ${BT}${TAILWIND_SNIPPET}${BT};\n` : ""}
const cssSnippet = ${BT}${CSS_SNIPPET}${BT};

const { theme, mode, setMode, setFamily } = useTheme();

const copied = ref<string | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;

// The "Copied!" state is on a timer, so it has to be cleared on unmount.
onBeforeUnmount(() => clearTimeout(timer));

const colors = computed(
  () => (theme.value.tokens?.colors ?? {}) as Record<string, unknown>,
);

/**
 * Resolve a semantic colour from the active theme.
 *
 * Returns undefined when the token is absent, and the caller omits the value
 * rather than substituting a literal — a fallback colour here would be a second
 * palette, which is exactly what a themed component must not carry.
 */
function getColor(name: string): string | undefined {
  const value = colors.value[name];
  return typeof value === "string" ? value : undefined;
}

const background = computed(() => getColor("background"));
const foreground = computed(() => getColor("foreground"));
const border = computed(() => getColor("border"));
const muted = computed(() => getColor("muted"));

const colorEntries = computed(() =>
  Object.keys(colors.value)
    .map((name) => [name, getColor(name)] as const)
    .filter((entry): entry is readonly [string, string] => Boolean(entry[1])),
);

async function copy(id: string, value: string) {
  try {
    await navigator.clipboard.writeText(value);
    copied.value = id;
  } catch {
    // Clipboard access can be denied; say so rather than pretending it worked.
    copied.value = id + ":failed";
  }
  clearTimeout(timer);
  timer = setTimeout(() => (copied.value = null), 1400);
}
</script>

<template>
  <div class="${c.page}">
    <!-- Hero -->
    <header class="${c.hero}">
      <span class="${c.status}">
        <span class="${c.statusDot}" />
        <span class="${c.statusText}">
          {{ theme.meta?.label ?? "Themvora" }} · {{ mode }}
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
        <a
          v-for="(link, index) in docsLinks"
          :key="link.href"
          :href="link.href"
          target="_blank"
          rel="noreferrer noopener"
          :class="index === 0 ? '${c.btnPrimary}' : '${c.btnOutline}'"
        >
          {{ link.label }}
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
      </nav>
    </header>

    <!-- Controls -->
    <section class="${c.card} ${c.cardStack}" aria-label="Theme controls">
      <div class="${c.controlsRow}">
        <div class="${c.controlGroup}">
          <h3 class="${c.controlLabel}">Mode + Toggle</h3>
          <div class="${c.controlRow}" role="group" aria-label="Mode + Toggle">
            <div class="${c.segments}">
              <button
                v-for="item in modes"
                :key="item"
                type="button"
                :aria-pressed="mode === item"
                class="${c.segment}"
                @click="setMode(item)"
              >
                {{ item }}
              </button>
            </div>
          </div>
        </div>
        <ThemeSwitcher />
      </div>

      <hr class="${c.rule}" />

      <div class="${c.controlGroup}">
        <h3 class="${c.controlLabel}">Presets</h3>
        <div class="${c.controlRow}" role="group" aria-label="Presets">
          <button
            v-for="item in selection"
            :key="item"
            type="button"
            :aria-pressed="theme.meta?.family === item"
            class="${c.chip}"
            @click="setFamily(item)"
          >
            {{ item }}
          </button>
        </div>
      </div>
    </section>

    <!-- Live preview -->
    <section
      aria-label="Theme preview"
      class="${c.preview}"
      :style="{
        backgroundColor: background,
        borderColor: border,
        color: foreground,
      }"
    >
      <div
        class="${c.previewBar}"
        :style="{ backgroundColor: muted, borderColor: border }"
      >
        <span class="${c.previewDot} ${c.previewDotDestructive}" />
        <span class="${c.previewDot} ${c.previewDotAccent}" />
        <span class="${c.previewDot} ${c.previewDotSuccess}" />
        <span
          class="${c.previewAddress}"
          :style="{ backgroundColor: background, border: border ? '1px solid ' + border : undefined }"
          aria-hidden="true"
        />
      </div>

      <div class="${c.previewBody}">
        <div class="${c.previewInfo}">
          <h2 class="${c.previewTitle}">{{ theme.meta?.label ?? "Themvora" }}</h2>
          <p class="${c.previewMeta}">
            {{ foreground ?? "foreground" }} on {{ background ?? "background" }}
          </p>

          <ul class="${c.previewSwatches}">
            <li v-for="name in previewColors" :key="name" class="${c.previewSwatch}">
              <template v-if="getColor(name)">
                <span
                  class="${c.previewSwatchDot}"
                  :style="{ backgroundColor: getColor(name) }"
                />
                <span class="${c.previewSwatchName}">{{ name }}</span>
              </template>
            </li>
          </ul>
        </div>

        <div class="${c.previewActions}">
          <span
            class="${c.previewPill}"
            :style="{
              backgroundColor: getColor('primary'),
              color: getColor('primaryForeground'),
            }"
          >
            Primary
          </span>
          <span
            class="${c.previewPill}"
            :style="{
              backgroundColor: getColor('secondary'),
              color: getColor('secondaryForeground'),
            }"
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
        <p class="${c.cardHint}">{{ colorEntries.length }} tokens · tap to copy</p>
      </div>

      <ul class="${c.tokenGrid}">
        <li v-for="[name, value] in colorEntries" :key="name">
          <button
            type="button"
            :title="'Copy ' + value"
            :aria-label="'Copy ' + name + ' ' + value"
            class="${c.token}"
            @click="copy(name, value)"
          >
            <span class="${c.tokenSwatch}" :style="{ backgroundColor: value }" />
            <span class="${c.tokenBody}">
              <span class="${c.tokenName}">{{ name }}</span>
              <span class="${c.tokenValue}" aria-live="polite">
                {{ copied === name ? "Copied!" : copied === name + ":failed" ? "Copy failed" : value }}
              </span>
            </span>
          </button>
        </li>
      </ul>
    </section>

    <!-- Use the tokens -->
    <section class="${c.card}">
      <div class="${c.cardHeading}">
        <h2 class="${c.cardTitle}">Use the tokens</h2>
        <p class="${c.cardHint}">${tailwind ? "Same tokens, two ways. Neither needs per-theme code." : "Every colour on this page is one of these variables."}</p>
      </div>
      <div class="${tailwind ? c.snippetGrid : c.snippetGridSingle}">
${tailwind ? `        <div class="${c.snippet}">
          <div class="${c.snippetHead}">
            <span class="${c.snippetLabel}">Tailwind</span>
            <button type="button" class="${c.snippetCopy}" @click="copy('snippet-tailwind', tailwindSnippet)">
              <span aria-live="polite">{{ copied === "snippet-tailwind" ? "Copied!" : "Copy" }}</span>
            </button>
          </div>
          <pre class="${c.snippetCode}"><code>{{ tailwindSnippet }}</code></pre>
        </div>

` : ""}        <div class="${c.snippet}">
          <div class="${c.snippetHead}">
            <span class="${c.snippetLabel}">CSS variables</span>
            <button type="button" class="${c.snippetCopy}" @click="copy('snippet-css', cssSnippet)">
              <span aria-live="polite">{{ copied === "snippet-css" ? "Copied!" : "Copy" }}</span>
            </button>
          </div>
          <pre class="${c.snippetCode}"><code>{{ cssSnippet }}</code></pre>
        </div>
      </div>
    </section>

    <!-- Scoped theme -->
    <section class="${c.card}">
      <div class="${c.cardHeading}">
        <h2 class="${c.cardTitle}">Scoped theme</h2>
        <p class="${c.cardHint}">This region is scoped to the {{ scopedFamily }} theme.</p>
      </div>

      <div class="${c.scopedTile}">
        <!-- A family scope, so the region keeps its own palette while still
             following the page's light/dark mode. -->
        <ThemeScope :family="scopedFamily">
          <div class="${c.scopedTileBody}">
            <div>
              <h3 class="${c.scopedTitle}">Feature tile</h3>
              <p class="${c.scopedText}">
                Scoped via ThemeScope. It runs its own transition while the rest of
                the page is untouched.
              </p>
              <p class="${c.scopedMeta}">
                <span class="${c.scopedDot}" />
                Scoped to: {{ scopedFamily }}
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
</template>
`;
}

/**
 * `ThemeSwitcher.vue`.
 *
 * @param c - The class vocabulary for the selected engine.
 * @param port - The framework-specific bits.
 * @returns The component's source.
 */
export function vueThemeSwitcher(c: ShowcaseClasses, port: ShowcasePort): string {
  return `${generatedHtmlHeader("A light/dark control.")}<script setup lang="ts">
import { useTheme } from "${port.hooksFrom}";

// Safe here, and only here: this component is rendered *inside* the provider, so
// the runtime it injects already exists.
const { toggleTheme } = useTheme();
</script>

<template>
  <div class="${c.switcherWrap}">
    <button type="button" class="${c.switcherBtn}" @click="toggleTheme">
      Toggle light/dark
    </button>
  </div>
</template>
`;
}
