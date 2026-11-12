import type { Metadata } from "next";
import { DocsLayout } from "../../components/docs-layout";
import { CodeExample } from "../../components/code-example";
import { PageHeader } from "../../components/ui/page-header";
import { SectionHeading } from "../../components/ui/section-heading";
import { Callout } from "../../components/ui/callout";
import { Prerequisites } from "../../components/ui/prerequisites";
import { RelatedLinks } from "../../components/ui/related-links";
import { highlightCode } from "../../lib/highlight";
import {
  ScrollbarFrameworkProvider,
  ScrollbarFrameworkSelector,
  ScrollbarFrameworkCode,
} from "../../components/custom-scrollbar/scrollbar-framework";
import {
  MOUNT_SNIPPETS,
  OPTIONS_SNIPPETS,
  FLASHFREE_SNIPPETS,
  ARROW_SNIPPETS,
  CONTAINER_SNIPPETS,
  type ScrollbarExample,
} from "../../components/custom-scrollbar/snippets";
import { compatibilityLabels, javascriptSources } from "../../lib/code-variants";
import { docsUrl } from "../../lib/site";

export const metadata: Metadata = {
  alternates: { canonical: docsUrl("/custom-scrollbar") },
  title: "Custom Scrollbar",
  description:
    "Replace the default browser scrollbar with a theme-aware overlay that matches your design system — in any framework.",
};

function snippetBlock(snippet: { lang: string; title: string; code: string }) {
  return (
    <CodeExample
      code={snippet.code}
      lang={snippet.lang}
      className="rounded-lg m-0"
    />
  );
}

const cssImportSnippet = {
  lang: "css",
  title: "globals.css / app.css / style.css",
  code: `@import "@themvora/core/scrollbar.css";`,
};

const prePaintSnippet = {
  lang: "ts",
  title: "build-head.ts — pre-paint script",
  code: `import { createPrePaintScrollbarScript } from "@themvora/core";

// Called once in your server render or build step. The generated
// <script> is blocking, runs in <1ms, and is idempotent.
const head = [
  "<!doctype html>",
  "<html>",
  "  <head>",
  \`    <script>\${createPrePaintScrollbarScript()}</script>\`,
  '    <link rel="stylesheet" href="/scrollbar.css" />',
  "  </head>",
  "</html>",
  ].join("\\n");`,
};

const ssrCssSnippet = {
  lang: "ts",
  title: "SSR — inline the CSS instead of a script",
  code: `import { createPrePaintScrollbarCSS } from "@themvora/core";

// In your server-rendered <head>: hidden from the very first paint,
// no blocking <script>, and no hydration mismatches.
export function Head() {
  return (
    <head>
      <html lang="en" className="tv-scrollbar" />
      <style dangerouslySetInnerHTML={{ __html: createPrePaintScrollbarCSS() }} />
    </head>
  );
}`,
};

const vanillaSnippet = {
  lang: "ts",
  title: "Mount the overlay — vanilla JS",
  code: `import {
  createThemeRuntime,
  createThemeScrollbar,
} from "@themvora/core";
import "@themvora/core/scrollbar.css";

const runtime = createThemeRuntime({
  defaultTheme: "light",
});

// One call mounts the overlay and discovers every scrollable container
// on the page. Returns an OverlayScrollbarHandle (or null on SSR /
// coarse-pointer devices).
const handle = createThemeScrollbar(runtime.store, {
  autoHide: true,
  arrows: true,
  thickness: 8,
  radius: 999,
});

// The strips recolor automatically when the theme changes.
runtime.selection.setMode("dark");`,
};

/**
 * Every framework snippet the guide can render, in one place.
 *
 * Both derivations below read this list, so a snippet can never be paired
 * without also being labelled — or the other way round. Three of the five maps
 * are `Partial` — a framework without a zero-flash hook has no snippet — so
 * `undefined` entries are dropped before derivation.
 *
 * The framework key is carried onto each entry rather than dropped: it is what
 * keeps Angular's snippets TypeScript-only (see `TYPESCRIPT_ONLY_FRAMEWORKS`),
 * and `Object.values` would have discarded the only copy of it.
 */
const snippets = [
  MOUNT_SNIPPETS,
  OPTIONS_SNIPPETS,
  FLASHFREE_SNIPPETS,
  ARROW_SNIPPETS,
  CONTAINER_SNIPPETS,
]
  .flatMap((map) =>
    Object.entries(map).map(([framework, snippet]) => ({ framework, snippet })),
  )
  .filter(
    (entry): entry is { framework: string; snippet: ScrollbarExample } =>
      entry.snippet !== undefined,
  )
  .flatMap(({ framework, snippet }) => [
    { ...snippet, framework },
    ...(snippet.vite ? [{ ...snippet.vite, framework }] : []),
  ]);

/**
 * The JavaScript counterpart of every framework snippet the guide can render.
 *
 * Derived here, on the server, because the framework picker is a client
 * component and the TypeScript compiler cannot be shipped to the browser. The
 * picker highlights the result with its own Shiki instance, so only the source
 * crosses the boundary.
 */
const jsSources = javascriptSources(snippets);

/**
 * The compatibility badge of every snippet — `TS / JS`, `TS`, and so on.
 *
 * Separate from `jsSources` because a label is metadata, not source: a snippet
 * highlighted with the TypeScript grammar may still be valid JavaScript.
 */
const labels = compatibilityLabels(snippets);

export default function CustomScrollbarPage() {
  return (
    <DocsLayout>
      <ScrollbarFrameworkProvider jsSources={jsSources} labels={labels}>
        <div>
          <PageHeader
          icon={
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="11" y="2" width="2" height="20" rx="1" />
              <rect x="4" y="6" width="4" height="12" rx="2" />
              <rect x="18" y="6" width="4" height="12" rx="2" />
            </svg>
          }
          title="Custom Scrollbar"
          subtitle="@themvora/core"
          description={
            <>
              Replace the browser&apos;s default scrollbar with a
              theme-aware overlay that matches your design system.
              Works on every framework — zero layout shift, no flash of
              native chrome. Import the scrollbar CSS once, then mount
              <code className="mono text-[0.9em]">ThemeScrollbar</code>{" "}
              anywhere in your app.
            </>
          }
        />

        <Prerequisites
          items={[
            {
              label: "Core Package",
              value: "@themvora/core",
              href: "/packages/core",
            },
            {
              label: "CSS Import",
              value: "@themvora/core/scrollbar.css in your global styles",
            },
            {
              label: "Provider",
              value: "ThemeProvider configured with themes",
              href: "/quick-start",
            },
          ]}
          className="mb-8"
        />

        <section id="frameworks" className="scroll-mt-24 mb-10">
          <SectionHeading
            num={1}
            desc="ThemeScrollbar is not a demo — it is the overlay engine, mounted once in your app. Pick your framework below and every snippet on this page updates to match."
          >
            Pick your framework
          </SectionHeading>
          <ScrollbarFrameworkSelector scrollToId="quick-start" />
        </section>

        <section id="quick-start" className="scroll-mt-24 mb-10">
          <SectionHeading
            num={2}
            desc="Import the scrollbar CSS, then mount ThemeScrollbar next to your app."
          >
            Quick start
          </SectionHeading>
          <ScrollbarFrameworkCode map={MOUNT_SNIPPETS} />
          <Callout className="mt-3">
            <strong>CSS import required</strong>
            <span className="mx-1 opacity-40">|</span>
            Add{" "}
            <code className="mono text-[0.9em]">
              @import "@themvora/core/scrollbar.css";
            </code>{" "}
            to your global stylesheet (
            <code className="mono text-[0.9em]">globals.css</code>
            , <code className="mono text-[0.9em]">app.css</code>
            , or <code className="mono text-[0.9em]">style.css</code>
            ). This brings in the pre-paint native-bar hiding and the
            overlay strip base styles.
          </Callout>
          {snippetBlock(cssImportSnippet)}
        </section>

        <section id="recommended-setup" className="scroll-mt-24 mb-10">
          <SectionHeading
            num={3}
            desc="Two things have to be right: one mount in the root layout, and the CSS import in your global stylesheet so the native bar is hidden before the first paint. The rest is tuning."
          >
            Recommended setup
          </SectionHeading>

          <h3 className="text-base font-semibold mt-6 mb-3">
            Place ThemeScrollbar in the root layout
          </h3>
          <p className="text-sm opacity-80 leading-relaxed mb-4">
            Mount <code className="mono text-[0.9em]">ThemeScrollbar</code>{" "}
            once in your root layout — not inside individual pages or
            components. The engine discovers every scrollable container on
            the page (including ones added later by client-side navigation),
            so a single mount covers the entire app.
          </p>

          <h3 className="text-base font-semibold mt-6 mb-3">
            Import the scrollbar CSS in your global stylesheet
          </h3>
          <p className="text-sm opacity-80 leading-relaxed mb-4">
            Add the import to your global CSS file so the pre-paint native-bar
            hiding and overlay strip base styles are available before the first
            paint. This prevents a flash of native scrollbars on initial load.
          </p>

          <h3 className="text-base font-semibold mt-6 mb-3">
            Recommended configuration
          </h3>
          <div className="flex flex-col gap-2 text-sm opacity-80 leading-relaxed">
            <p>
              <strong className="opacity-100">autoHide</strong> — fades the
              strip after idle. Set to <code className="mono text-[0.9em]">false</code>{" "}
              if you want scrollbars always visible (e.g. on kiosk or
              accessibility-first setups).
            </p>
            <p>
              <strong className="opacity-100">autoHideDelay</strong> — idle time
              in ms before a revealed strip fades out. Default{" "}
              <code className="mono text-[0.9em]">900</code>. Only takes
              effect when <code className="mono text-[0.9em]">autoHide</code>{" "}
              is <code className="mono text-[0.9em]">true</code>.
            </p>
            <p>
              <strong className="opacity-100">thickness</strong> — resting thumb
              size. Increase for touch-friendly targets.
            </p>
            <p>
              <strong className="opacity-100">radius</strong> — set to{" "}
              <code className="mono text-[0.9em]">999</code> for a pill-shaped
              thumb that matches most design systems.
            </p>
            <p>
              <strong className="opacity-100">arrows</strong> — show arrow
              buttons at the ends of the track. Default{" "}
              <code className="mono text-[0.9em]">true</code>.
            </p>
            <p>
              <strong className="opacity-100">hoverExpand</strong> — grow the
              thumb on hover for easier targeting. Default{" "}
              <code className="mono text-[0.9em]">false</code>.
            </p>
            <p>
              <strong className="opacity-100">offset</strong> — clearance
              between a rail and its container edge, in px: one number for every
              side, or a per-side object.{" "}
              <code className="mono text-[0.9em]">0</code> is a value, not
              &quot;unset&quot; — it means flush against the edge, and it is
              honoured on every host, the page scrollbar included.
            </p>
          </div>

          <h3 className="text-base font-semibold mt-6 mb-3">
            How it integrates with your theme
          </h3>
          <p className="text-sm opacity-80 leading-relaxed mb-4">
            The thumb is the only surface that takes a theme color, and you
            never set it. On mount the engine tries{" "}
            <code className="mono text-[0.9em]">primary</code>, then{" "}
            <code className="mono text-[0.9em]">accent</code>, then{" "}
            <code className="mono text-[0.9em]">foreground</code>, keeps the
            first that contrasts with{" "}
            <code className="mono text-[0.9em]">background</code>, and writes it
            to <code className="mono text-[0.9em]">--tv-scrollbar-thumb</code>;
            hover and active are derived from it. The track is transparent and
            the arrows inherit <code className="mono text-[0.9em]">currentColor</code>,
            so switching themes only ever moves the thumb — no re-mount, and
            nothing else to configure.
          </p>

          <h3 className="text-base font-semibold mt-6 mb-3">
            Best practices
          </h3>
          <ul className="text-sm opacity-80 leading-relaxed list-disc pl-5 space-y-1 mb-4">
            <li>
              Scope the overlay with{" "}
              <code className="mono text-[0.9em]">include</code> /{" "}
              <code className="mono text-[0.9em]">exclude</code> — CSS selectors
              for inner scrollables; the document is always tracked. The
              framework components group the same pair under{" "}
              <code className="mono text-[0.9em]">scope</code>, so there it is{" "}
              <code className="mono text-[0.9em]">
                scope={"{{"} include: [&quot;.panel&quot;] {"}}"}
              </code>{" "}
              rather than a top-level prop. A selector matches the region as well
              as the element, so{" "}
              <code className="mono text-[0.9em]">exclude: [&quot;.code-block&quot;]</code>{" "}
              also covers the scroll panes inside a code block, not only a
              container that scrolls itself. An excluded container also gives up
              the scrollbar gutter the overlay reserves, so it keeps no empty
              strip where a bar would have been.
            </li>
            <li>
              Pass custom arrow icons via the{" "}
              <code className="mono text-[0.9em]">icons</code> group for
              framework-owned rendering (JSX, VNodes, etc.).
            </li>
          </ul>
        </section>

        <section id="lifecycle" className="scroll-mt-24 mb-10">
          <h3 className="text-base font-semibold mt-6 mb-3">
            Lifecycle and reactivity
          </h3>
          <p className="text-sm opacity-80 leading-relaxed mb-3">
            The overlay owns the native bar for exactly as long as it is
            mounted, and every option is live.
          </p>
          <ul className="text-sm opacity-80 leading-relaxed list-disc pl-5 space-y-1 mb-4">
            <li>
              <strong>Every prop is reactive.</strong> Changing one — on the
              component, or by setting the matching attribute on{" "}
              <code className="mono text-[0.9em]">themvora-scrollbar</code>{" "}
              directly — rebuilds the overlay in place. The replacement is
              created before the incumbent is destroyed, so the page never
              passes through a frame with the native bar back and nothing
              drawing.
            </li>
            <li>
              <strong>Unmounting restores the native scrollbar.</strong> The
              overlay, its observers and its DOM nodes go away with the
              component, and so does the native-bar hiding — the platform
              scrollbar returns. Removing the element is therefore a supported
              way to turn the feature off, not a way to break the page.
            </li>
            <li>
              <strong>The SSR pre-paint hiding is provisional.</strong> A
              server-rendered{" "}
              <code className="mono text-[0.9em]">tv-scrollbar</code> class only
              hides the native bar; the overlay is what replaces it. If a page
              enables pre-paint hiding but renders no overlay element — the
              component was omitted, or commented out — the class and the hiding
              stylesheet are removed at the end of{" "}
              <code className="mono text-[0.9em]">&lt;body&gt;</code> and the
              native scrollbar comes back. A mismatch degrades to a native
              scrollbar, never to no scrollbar at all.
            </li>
          </ul>
        </section>

        <section id="zero-flash" className="scroll-mt-24 mb-10">
          <SectionHeading
            num={4}
            desc="Hide the native bar before the first paint — only shown for frameworks that provide an SSR pre-paint hook."
          >
            Zero-flash (SSR)
          </SectionHeading>
          <ScrollbarFrameworkCode
            map={FLASHFREE_SNIPPETS}
            fallback={
              <Callout>
                <strong>This framework doesn&apos;t provide SSR zero-flash</strong>
                <span className="mx-1 opacity-40">|</span>
                It renders client-side, so there&apos;s no server pre-paint hook.
                On Vite, pass{" "}
                <code className="mono text-[0.9em]">scrollbar: true</code> to{" "}
                <code className="mono text-[0.9em]">themvoraVitePlugin</code> and
                it injects the blocking pre-paint script for you; otherwise add
                the script yourself (see{" "}
                <code className="mono text-[0.9em]">Framework-agnostic</code>) or
                serve the page from an SSR framework (Next.js / Nuxt / Remix).
              </Callout>
            }
          />
          <Callout className="mt-3">
            <strong>Why this matters</strong>
            <span className="mx-1 opacity-40">|</span>
            Without pre-paint hiding, the browser paints the native scrollbar
            for a frame before the overlay engine mounts — a visible flash.
            The supported frameworks inline a tiny CSS block + the{" "}
            <code className="mono text-[0.9em]">tv-scrollbar</code> class during
            SSR (no blocking script, no hydration mismatch).
          </Callout>
          <Callout className="mt-3">
            <strong>No pre-paint script needed</strong>
            <span className="mx-1 opacity-40">|</span>
            Mounting <code className="mono text-[0.9em]">ThemeScrollbar</code>{" "}
            (or calling <code className="mono text-[0.9em]">createOverlayScrollbar</code>)
            automatically applies the <code className="mono text-[0.9em]">tv-scrollbar</code>{" "}
            class + hiding CSS if none is present. The engine is self-sufficient;
            you only need the pre-paint script when you want to prevent the
            initial flash on a server-rendered page.
          </Callout>
        </section>

        <section id="options" className="scroll-mt-24 mb-10">
          <SectionHeading
            num={5}
            desc="Every option is available as a flat top-level prop (flat wins over grouped) or organized into behavior, appearance, and icons groups. Pick your framework for the exact prop shape."
          >
            Options — grouped props API
          </SectionHeading>
          <ScrollbarFrameworkCode map={OPTIONS_SNIPPETS} />
          <Callout className="mt-3">
            <strong>Per-framework binding</strong>
            <span className="mx-1 opacity-40">|</span>
            JSX frameworks (React/Next/Solid/Remix) use object props; Vue/Nuxt
            use <code className="mono text-[0.9em]">:prop</code>; Svelte uses
            snippet attributes; Angular binds
            <code className="mono text-[0.9em]">[themvoraScrollbarOptions]</code>;
            Web Components use individual attributes; Vanilla JS uses a single
            options object on
            <code className="mono text-[0.9em]">createThemeScrollbar</code>.
          </Callout>
        </section>

        <section id="thumb-appearance" className="scroll-mt-24 mb-10">
          <SectionHeading
            num={6}
            desc="Customize the scrollbar colors beyond what the theme provides. By default, colors derive from the active theme (primary → accent → foreground). Set these to override with any CSS color."
          >
            Thumb appearance
          </SectionHeading>
          <p className="text-sm opacity-80 leading-relaxed mb-4">
            All color options accept any valid CSS color string (hex, rgb, hsl, named colors, CSS variables, etc.).
          </p>
          <ul className="text-sm opacity-80 leading-relaxed list-disc pl-5 space-y-1 mb-4">
            <li>
              <code className="mono text-[0.9em]">thumbColor</code> — base thumb color. Default: theme-derived.
            </li>
            <li>
              <code className="mono text-[0.9em]">trackColor</code> — track background color. Default: transparent (theme-derived wash).
            </li>
            <li>
              <code className="mono text-[0.9em]">thumbHoverColor</code> — thumb color on hover. Default: same as <code className="mono text-[0.9em]">thumbColor</code>.
            </li>
            <li>
              <code className="mono text-[0.9em]">activeThumbColor</code> — thumb color while dragging. Default: same as <code className="mono text-[0.9em]">thumbColor</code>.
            </li>
          </ul>
          <p className="text-sm opacity-80 leading-relaxed mb-4">
            You can also theme via CSS custom properties — this is useful for dark/light mode pairs or global design tokens:
          </p>
          {snippetBlock({
            lang: "css",
            title: "CSS custom properties",
            code: `:root {
  --tv-scrollbar-thumb: #ff6b6b;
  --tv-scrollbar-track: #2d2d2d;
  --tv-scrollbar-thumb-hover: #ff8888;
  --tv-scrollbar-thumb-active: #ff4444;
}

/* Dark mode override */
.dark {
  --tv-scrollbar-thumb: #7c3aed;
  --tv-scrollbar-track: #1e1e1e;
  --tv-scrollbar-thumb-hover: #a855f7;
  --tv-scrollbar-thumb-active: #d946ef;
}`,
          })}
          <p className="text-sm opacity-80 leading-relaxed mb-4">
            The CSS variables are defined on the overlay host element (<code className="mono text-[0.9em]">[data-themvora-host]</code>) with theme-derived defaults, so the scrollbar automatically follows your active theme. Custom values override the defaults.
          </p>
        </section>

        <section id="arrows" className="scroll-mt-24 mb-10">
          <SectionHeading
            num={7}
            desc="Pass any ReactNode (Vue VNode, Svelte snippet, etc.) as arrow icons via the icons group."
          >
            Arrow icons
          </SectionHeading>
          <Callout className="mb-3">
            <strong>Built-in arrow icons</strong>
            <span className="mx-1 opacity-40">|</span>
            When no custom arrow icons are passed, the engine renders CSS
            triangle glyphs via <code className="mono text-[0.9em]">::before</code>{" "}
            pseudo-elements. Pass <code className="mono text-[0.9em]">icons</code>{" "}
            (or flat <code className="mono text-[0.9em]">arrowUpIcon</code> /{" "}
            <code className="mono text-[0.9em]">arrowDownIcon</code>) to replace
            them with your own SVG / HTML.
            <code className="mono text-[0.9em]">icons.size</code> sets the size of
            all four glyphs in CSS px — clamped to the arrow button&apos;s
            usable area (floored at 8px while space allows), so a large
            value can never overflow a thin scrollbar.
          </Callout>
          <ScrollbarFrameworkCode map={ARROW_SNIPPETS} />
        </section>

        <section id="containers" className="scroll-mt-24 mb-10">
          <SectionHeading
            num={8}
            desc="Use scope.include to track specific scrollable containers instead of the whole window."
          >
            Container scrollbars
          </SectionHeading>
          <ScrollbarFrameworkCode map={CONTAINER_SNIPPETS} />
        </section>

        <section id="vanilla" className="scroll-mt-24 mb-10">
          <SectionHeading
            num={9}
            desc="The overlay engine lives in @themvora/core, so you can mount it without React, Vue, Svelte, or any framework — with an identical option surface."
          >
            Framework-agnostic (vanilla JS)
          </SectionHeading>

          <h3 className="text-base font-semibold mt-6 mb-3">
            Programmatic mount
          </h3>
          <p className="text-sm opacity-80 leading-relaxed mb-4">
            Create a theme store and pass it to{" "}
            <code className="mono text-[0.9em]">createThemeScrollbar</code>{" "}
            (alias for <code className="mono text-[0.9em]">createOverlayScrollbar</code>).
            Returns an <code className="mono text-[0.9em]">OverlayScrollbarHandle</code>{" "}
            or <code className="mono text-[0.9em]">null</code> on SSR/coarse-pointer devices.
          </p>
          {snippetBlock(vanillaSnippet)}

          <h3 className="text-base font-semibold mt-6 mb-3">
            Hide the native bar before first paint
          </h3>
          <p className="text-sm opacity-80 leading-relaxed mb-4">
            Framework providers bootstrap this for you. In vanilla settings,
            drop a blocking pre-paint script into{" "}
            <code className="mono text-[0.9em]">&lt;head&gt;</code> so the
            native scrollbar is never painted (it runs in under 1 ms and skips
            coarse-pointer devices unless you pass{" "}
            <code className="mono text-[0.9em]">{`{ touch: true }`}</code>).
          </p>
          {snippetBlock(prePaintSnippet)}
          <p className="text-sm opacity-80 leading-relaxed mt-4 mb-4">
            If you&apos;re already server-rendering markup, you can skip the
            script and inline{" "}
            <code className="mono text-[0.9em]">createPrePaintScrollbarCSS()</code>{" "}
            as a <code className="mono text-[0.9em]">&lt;style&gt;</code>{" "}
            alongside a <code className="mono text-[0.9em]">tv-scrollbar</code>{" "}
            class on <code className="mono text-[0.9em]">&lt;html&gt;</code> — no
            blocking script, no hydration mismatch.
          </p>
          {snippetBlock(ssrCssSnippet)}
        </section>

        <RelatedLinks
          links={[
            {
              title: "Zero Flash SSR",
              href: "/zero-flash",
              description: "Flash-free theme bootstrap",
            },
            {
              title: "Animation & Transitions",
              href: "/animation",
              description: "Smooth theme change animations",
            },
            {
              title: "Accessibility",
              href: "/accessibility",
              description: "Reduced motion and contrast support",
            },
            {
              title: "Core API Reference",
              href: "/api-reference/core",
              description: "ThemeScrollbar API docs",
            },
          ]}
        />
      </div>
      </ScrollbarFrameworkProvider>
    </DocsLayout>
  );
}