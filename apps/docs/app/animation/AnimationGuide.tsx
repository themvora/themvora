"use client";

import { useState } from "react";
import { highlightCode } from "../../lib/highlight";
import { pairWithJavaScript } from "../../lib/code-language";
import { CodeBlock } from "../../components/code-block";
import { SectionHeading } from "../../components/ui/section-heading";
import { Callout } from "../../components/ui/callout";
import { FrameworkPicker, getExample } from "../../components/framework-picker";

type Snippet = { lang: string; title: string; code: string };

/**
 * One snippet, with its JavaScript counterpart when there is one.
 *
 * The page derives the JavaScript and passes it down as `jsSources` — the
 * TypeScript compiler cannot be shipped to the browser — and the pair is
 * assembled here with the Shiki instance this guide already runs.
 */
function snippetBlock(
  snippet: Snippet,
  jsSources: Record<string, string> | undefined,
  labels?: Record<string, string>,
) {
  const js = jsSources?.[snippet.code];
  const variants = js
    ? pairWithJavaScript(snippet, js)?.map((variant) => ({
        ...variant,
        html: highlightCode(variant.code, variant.lang),
      }))
    : undefined;

  return (
    <CodeBlock
      html={highlightCode(snippet.code, snippet.lang)}
      code={snippet.code}
      language={snippet.lang}
      {...(labels?.[snippet.code] ? { displayLanguage: labels[snippet.code] } : {})}
      {...(variants ? { variants } : {})}
      className="rounded-lg m-0"
    />
  );
}

import {
  animationsPluginOptionsSnippet,
  animationsPluginSnippet,
  bestPracticesSnippet,
  frameworkSnippets,
  liveTransitionSnippet,
  presetTable,
  runtimeConfigureSnippet,
  runtimeTokenUpdateSnippet,
  suppressTransitionSnippet,
  transitionPropSnippet,
  viewTransitionSnippet,
} from "./snippets";

export function AnimationGuide({
  jsSources,
  labels,
}: {
  /** Derived JavaScript for every snippet on the page, keyed by its source. */
  jsSources?: Record<string, string>;
  /** Compatibility badge per snippet, also keyed by source. */
  labels?: Record<string, string>;
}) {
  const [selectedFramework, setSelectedFramework] = useState("react");
  const selected = getExample(frameworkSnippets, selectedFramework);
  const block = (snippet: Snippet) => snippetBlock(snippet, jsSources, labels);

  return (
    <>
      <section id="enable" className="scroll-mt-24 mb-10">
        <SectionHeading
          num={1}
          desc="Transitions are ON by default — pass a transition prop only to change the defaults."
        >
          Enable it
        </SectionHeading>
        <Callout className="mb-4" title="Enabled by default">
          <p className="text-sm">
            Themvora ships with{" "}
            <code className="mono text-[0.9em]">enabled: true</code>,{" "}
            <code className="mono text-[0.9em]">300ms</code>,{" "}
            <code className="mono text-[0.9em]">cubic-bezier(0.4, 0, 0.2, 1)</code>,
            and <code className="mono text-[0.9em]">preset: "smooth"</code>. You
            don&apos;t need to pass anything to get animated theme changes. Pass{" "}
            <code className="mono text-[0.9em]">{`transition={{ enabled: false }}`}</code>{" "}
            (or <code className="mono text-[0.9em]">transition={false}</code>) to
            turn them off.
          </p>
        </Callout>
        <p className="text-sm opacity-70 leading-relaxed">
          The full framework-specific setup is in{" "}
          <a href="#frameworks" className="underline">Section 3</a> below.
        </p>

        <div className="mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-widest opacity-50 mb-3">
            Change the configuration after mount
          </h3>
          <p className="text-sm opacity-70 leading-relaxed mb-3">
            The <code className="mono text-xs">transition</code> prop is{" "}
            <strong className="opacity-100">live</strong>. Changing{" "}
            <code className="mono text-xs">duration</code>,{" "}
            <code className="mono text-xs">easing</code>,{" "}
            <code className="mono text-xs">preset</code>/
            <code className="mono text-xs">properties</code>,{" "}
            <code className="mono text-xs">useViewTransition</code> or{" "}
            <code className="mono text-xs">enabled</code> takes effect on the
            next theme change — no reload, no provider remount, and the theme
            that is already on screen is not re-applied.
          </p>
          <Callout>
            Set <code className="mono text-[0.9em]">transition={"{{false}}"}</code>{" "}
            to make changes instant. Pass a config again to re-enable. An unusable{" "}
            <code className="mono text-[0.9em]">duration</code>/
            <code className="mono text-[0.9em]">easing</code> is reported as{" "}
            <code className="mono text-[0.9em]">TV_CONFIG_OPTION_INVALID</code>.
          </Callout>
          <div className="mt-4">
            {block(liveTransitionSnippet)}
          </div>
        </div>
      </section>

      <section id="properties" className="scroll-mt-24 mb-10">
        <SectionHeading
          num={2}
          desc="Control exactly which properties animate with preset or properties."
        >
          What animates — presets & properties
        </SectionHeading>
        <p className="text-sm opacity-70 leading-relaxed mb-3">
          Transitions run on the properties that actually changed between themes.
          <code className="mono text-xs">preset</code> selects a curated list, or
          pass an exact <code className="mono text-xs">properties</code> array to
          allow only those CSS properties to animate:
        </p>
        <CodeBlock
          html={highlightCode(transitionPropSnippet.code, transitionPropSnippet.lang)}
          code={transitionPropSnippet.code}
          language={transitionPropSnippet.lang}
          filename={transitionPropSnippet.title}
          {...(labels?.[transitionPropSnippet.code]
            ? { displayLanguage: labels[transitionPropSnippet.code] }
            : {})}
          className="rounded-lg"
        />
        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wider">Preset</th>
                <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wider">Properties allowed to animate</th>
                <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wider">When to use</th>
              </tr>
            </thead>
            <tbody>
              {presetTable.map((p) => (
                <tr key={p.name} className="border-b border-border last:border-0 align-top">
                  <td className="px-4 py-3"><code className="mono text-[0.85em] font-semibold">{p.name}</code></td>
                  <td className="px-4 py-3 mono text-xs opacity-70">{p.props}</td>
                  <td className="px-4 py-3 text-sm opacity-70 leading-relaxed">{p.when}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Callout className="mt-3">
          <strong>properties</strong> is a <em>filter</em> on the changed set, not
          a full list of everything to animate. Passing{" "}
          <code className="mono text-[0.9em]">properties: ["color", "background-color"]</code>{" "}
          animates those properties when they change and leaves everything else to
          snap. Omit both <code className="mono text-[0.9em]">preset</code> and{" "}
          <code className="mono text-[0.9em]">properties</code> for the default{" "}
          <code className="mono text-[0.9em]">"smooth"</code> set.
        </Callout>
      </section>

      <section id="frameworks" className="scroll-mt-24 mb-10">
        <SectionHeading
          num={3}
          desc="Step-by-step examples for every supported framework."
        >
          Enable transitions in your framework
        </SectionHeading>
        <p className="text-sm opacity-70 leading-relaxed">
          Pass the same <code className="mono text-xs">transition</code> object
          to your provider (or runtime). Every framework exposes it with the
          same shape — only the binding syntax changes.
        </p>
        <FrameworkPicker
          value={selectedFramework}
          onChange={setSelectedFramework}
          label="Pick your framework"
          scrollToId="frameworks"
        />
        <div className="mt-4">
          {block(selected)}
        </div>
      </section>

      <section id="view-transitions" className="scroll-mt-24 mb-10">
        <SectionHeading
          num={4}
          desc="The cleanest cross-fade — no white intermediates, ever."
        >
          View Transitions API
        </SectionHeading>
        {block(viewTransitionSnippet)}
        <Callout className="mt-3">
          With <code className="mono text-[0.9em]">useViewTransition: true</code>{" "}
          the new theme is painted <em>beneath</em> a fading snapshot of the
          old one — the opposite of interpolating directly from near-white
          colors — so light→dark switches never wash through white. Browsers
          without the API (Firefox/Safari) fall back to the inherited{" "}
          <code className="mono text-[0.9em]">--theme-color-*</code>{" "}
          interpolation automatically.
        </Callout>
        <p className="mt-3 text-sm opacity-70 leading-relaxed">
          To opt out and go back to plain CSS-property interpolation, pass{" "}
          <code className="mono text-xs">useViewTransition: false</code> together
          with the duration and easing you want — the rest of the transition
          options are unchanged, and the switch still animates, just without the
          snapshot.
        </p>
      </section>

      <section id="animations-plugin" className="scroll-mt-24 mb-10">
        <SectionHeading
          num={5}
          desc="The explicit route: apply a plain CSS transition to one element before each theme change, instead of letting the runtime plan the diff."
        >
          The animations plugin
        </SectionHeading>
        <p className="text-sm opacity-70 leading-relaxed mb-3">
          The runtime&apos;s own transition engine covers anything that reads the
          inherited <code className="mono text-xs">--theme-*</code> variables. When
          you need to animate a target the runtime does not own — a widget that
          writes its own properties, a canvas host, a third-party element — use{" "}
          <code className="mono text-xs">createAnimationsPlugin</code>. It applies
          a CSS <code className="mono text-xs">transition</code> rule to one
          element on <code className="mono text-xs">onBeforeThemeChange</code> and
          removes it on <code className="mono text-xs">onDestroy</code>.
        </p>
        {block(animationsPluginSnippet)}
        <p className="mt-4 text-sm opacity-70 leading-relaxed mb-3">
          It takes two options — the transition to apply and the element to apply
          it to. The element defaults to{" "}
          <code className="mono text-xs">document.documentElement</code> in a
          browser and to <code className="mono text-xs">null</code> (a no-op)
          elsewhere, so a themed subtree has to name itself:
        </p>
        {block(animationsPluginOptionsSnippet)}
        <Callout className="mt-4">
          <strong>Pick one, not both.</strong> The plugin writes a CSS rule; the
          runtime interpolates the variables themselves. Running both on the same
          element double-eases the same value — the lag described in Section 7.
          The plugin defaults <code className="mono text-[0.9em]">useViewTransition</code>{" "}
          to <code className="mono text-[0.9em]">false</code> for exactly this
          reason: it provides CSS transition properties, not page-level
          cross-fades.
        </Callout>
      </section>

      <section id="runtime-control" className="scroll-mt-24 mb-10">
        <SectionHeading
          num={6}
          desc="Suppress one switch, reconfigure at runtime, and animate token overrides — the same contract with or without a framework."
        >
          Runtime control
        </SectionHeading>
        <p className="text-sm opacity-70 leading-relaxed mb-3">
          Sometimes one switch must not animate — a first paint, a screenshot, a
          bulk import. <code className="mono text-xs">suppressTransition</code> on
          a store write wins over whatever the live configuration says, for that
          update only:
        </p>
        {block(suppressTransitionSnippet)}
        <p className="mt-4 text-sm opacity-70 leading-relaxed mb-3">
          Framework-free runtimes configure the transition with{" "}
          <code className="mono text-xs">runtime.configure()</code> and read it
          back from <code className="mono text-xs">runtime.transition</code>. The
          value is live: the next change uses it, and the theme already on screen
          is not re-applied.
        </p>
        {block(runtimeConfigureSnippet)}
        <p className="mt-4 text-sm opacity-70 leading-relaxed mb-3">
          Token overrides are theme changes too, so they animate on the same
          path — <code className="mono text-xs">runtime.update()</code> merges the
          tokens, resolves references, runs plugin transforms, then commits
          through the transition:
        </p>
        {block(runtimeTokenUpdateSnippet)}
      </section>

      <section id="things-to-avoid" className="scroll-mt-24 mb-10">
        <SectionHeading
          num={7}
          desc="Theme colors animate through the provider — adding your own color transition on top re-eases the same value and lags. Everything else (hover, transform, opacity, shadow) is yours to animate freely."
        >
          Things to avoid
        </SectionHeading>

        <p className="text-sm opacity-70 leading-relaxed mb-4">
          <strong className="opacity-100">Theme transitions are owned by themvora.</strong>{" "}
          The provider&apos;s transition engine (configured via the{" "}
          <code className="mono text-[0.9em]">transition</code> prop on{" "}
          <code className="mono text-[0.9em]">ThemeProvider</code> or{" "}
          <code className="mono text-[0.9em]">createThemeRuntime</code>)
          interpolates the inherited <code className="mono text-[0.9em]">--theme-color-*</code>{" "}
          variables every time the active theme changes — automatically, with
          no extra CSS from you. This is how every theme switch on this docs
          site animates smoothly, and it works the same way in your app.
          You don&apos;t need to (and should not) add your own color transition.
        </p>
        <p className="text-sm opacity-70 leading-relaxed mb-4">
          If you do add one — a{" "}
          <code className="mono text-[0.9em]">transition-colors</code> utility
          class in Tailwind, or a plain{" "}
          <code className="mono text-[0.9em]">transition: background-color 0.3s</code>{" "}
          in native CSS — that element re-eases the same value{" "}
          <em>again</em>, on top of themvora&apos;s own interpolation. The
          result is a double-eased, laggy switch. Leave color transitions to
          the library, in both Tailwind and hand-written CSS.
        </p>

        {block(bestPracticesSnippet)}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div className="rounded-xl border border-border bg-card px-4 py-3.5">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success/15 text-foreground text-[11px] font-bold">✓</span>
              <span className="font-semibold text-sm">DO</span>
            </div>
            <ul className="flex flex-col gap-1.5 text-[13px] opacity-80 leading-relaxed">
              <li>
                <strong>Tailwind:</strong> use{" "}
                <code className="mono text-[0.9em]">transition-transform</code> /{" "}
                <code className="mono text-[0.9em]">transition-opacity</code>{" "}
                with <code className="mono text-[0.9em]">hover:scale</code>,{" "}
                <code className="mono text-[0.9em]">hover:translate</code>,{" "}
                <code className="mono text-[0.9em]">hover:shadow</code>.
              </li>
              <li>
                <strong>Native CSS:</strong> write{" "}
                <code className="mono text-[0.9em]">transition: transform 0.2s ease</code>,{" "}
                <code className="mono text-[0.9em]">opacity 0.2s</code>,{" "}
                <code className="mono text-[0.9em]">box-shadow 0.2s</code> on
                toasts, overlays, and cards — none of these are theme-managed.
              </li>
              <li>Both: animate <code className="mono text-[0.9em]">outline</code> / <code className="mono text-[0.9em]">outline-offset</code> for focus rings.</li>
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3.5">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive/15 text-destructive text-[11px] font-bold">✗</span>
              <span className="font-semibold text-sm">DON'T</span>
            </div>
            <ul className="flex flex-col gap-1.5 text-[13px] opacity-80 leading-relaxed">
              <li>
                <strong>Tailwind:</strong> don&apos;t add{" "}
                <code className="mono text-[0.9em]">transition-colors</code> to
                buttons, cards, or links whose colors are theme tokens — the
                provider already animates those colors on theme change. Avoid{" "}
                <code className="mono text-[0.9em]">transition-all</code> too,
                which catches the managed properties.
              </li>
              <li>
                <strong>Native CSS:</strong> don&apos;t write a{" "}
                <code className="mono text-[0.9em]">transition</code> for{" "}
                <code className="mono text-[0.9em]">color</code>,{" "}
                <code className="mono text-[0.9em]">background-color</code>,{" "}
                <code className="mono text-[0.9em]">border-color</code> on{" "}
                <code className="mono text-[0.9em]">:root</code>,{" "}
                <code className="mono text-[0.9em]">*</code>, or any themed
                element — themvora handles that interpolation for you.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}