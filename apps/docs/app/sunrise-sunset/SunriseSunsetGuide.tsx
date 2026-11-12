"use client";

import { useState } from "react";
import Link from "next/link";
import { CodeBlock } from "../../components/code-block";
import { SectionHeading } from "../../components/ui/section-heading";
import { Callout } from "../../components/ui/callout";
import { FrameworkPicker, getExample } from "../../components/framework-picker";
import { pairWithJavaScript } from "../../lib/code-language";
import { controllerExamples, mountExamples } from "./snippets";

type Snippet = {
  lang: string;
  title: string;
  code: string;
  /** Web only — the same setup through the Vite plugin. */
  vite?: { lang: string; title: string; code: string };
};

/**
 * One block, with its JavaScript counterpart when the page derived one.
 *
 * `jsSources` is keyed by source text, so a lookup miss is the normal
 * "this snippet has no second form" case — Vue, Svelte and Angular templates
 * are single-file components whose TypeScript is inseparable from the file, and
 * a few snippets are already JavaScript. Those render exactly as before.
 */
function snippetBlock(
  snippet: Snippet,
  jsSources: Record<string, string> | undefined,
  labels: Record<string, string> | undefined,
) {
  const js = jsSources?.[snippet.code];
  const variants = js
    ? pairWithJavaScript(snippet, js)?.map((variant) => ({
        ...variant,
      }))
    : undefined;
  const label = labels?.[snippet.code];
  const main = (
    <CodeBlock
      code={snippet.code}
      language={snippet.lang}
      filename={snippet.title}
      {...(label ? { displayLanguage: label } : {})}
      {...(variants ? { variants } : {})}
      className="rounded-lg m-0"
    />
  );
  if (!snippet.vite) return main;

  const vite = snippet.vite;
  const viteJs = jsSources?.[vite.code];
  const viteVariants = viteJs
    ? pairWithJavaScript(vite, viteJs)?.map((variant) => ({ ...variant }))
    : undefined;
  const viteLabel = labels?.[vite.code];

  return (
    <>
      {main}
      <CodeBlock
        code={vite.code}
        language={vite.lang}
        filename={vite.title}
        {...(viteLabel ? { displayLanguage: viteLabel } : {})}
        {...(viteVariants ? { variants: viteVariants } : {})}
        className="rounded-lg m-0 mt-3"
      />
    </>
  );
}

export function SunriseSunsetGuide({
  optionRows,
  jsSources,
  labels,
}: {
  optionRows: { name: string; type: string; desc: string }[];
  /**
   * Derived JavaScript for this page's snippets, keyed by source text.
   *
   * The compiler runs in the page — a server component — so the guide can offer
   * a language selector without shipping a parser to the browser.
   */
  jsSources?: Record<string, string>;
  /**
   * Compatibility badge per source text — `TS / JS`, `TS`, and so on.
   *
   * Separate from `jsSources` because the badge describes the source, not the
   * conversion: a snippet highlighted with the TypeScript grammar can still be
   * valid JavaScript.
   */
  labels?: Record<string, string>;
}) {
  const [selectedFramework, setSelectedFramework] = useState("react");
  const mountExample = getExample(mountExamples, selectedFramework);
  const controllerExample = getExample(controllerExamples, selectedFramework);

  return (
    <>
      <FrameworkPicker
        value={selectedFramework}
        onChange={setSelectedFramework}
        label="Pick your framework"
        scrollToId="setup"
      />

      <section id="setup" className="scroll-mt-24 mb-10">
        <SectionHeading
          num={1}
          desc="Pass `scheduled` to your provider, or set it in your module config. One block."
        >
          Setup
        </SectionHeading>
        {snippetBlock(mountExample, jsSources, labels)}
      </section>

      <section id="read-control" className="scroll-mt-24 mb-10">
        <SectionHeading
          num={2}
          desc="`useThemeSchedule()` returns `null` when no schedule is configured, and a reactive controller when one is — `enabled`, `active`, `status`, `sunrise`, `sunset`, `nextTransition` and the `enable()` / `disable()` / `set()` methods."
        >
          Read &amp; control the schedule
        </SectionHeading>
        {snippetBlock(controllerExample, jsSources, labels)}
        <Callout className="mt-3">
          <strong>State shape</strong>
          <span className="mx-1 opacity-40">|</span>
          <code className="mono text-[0.9em]">enabled</code> — schedule is on.{" "}
          <code className="mono text-[0.9em]">active</code> — enabled{" "}
          <em>and</em> the applied theme is one of the scheduled light/dark
          themes. <code className="mono text-[0.9em]">status</code> —{" "}
          <code className="mono text-[0.9em]">"active"</code> or{" "}
          <code className="mono text-[0.9em]">"disabled"</code>.{" "}
          <code className="mono text-[0.9em]">timeZone</code> — the resolved
          timezone (or <code className="mono text-[0.9em]">null</code> when
          explicit coordinates are used).{" "}
          <code className="mono text-[0.9em]">latitude</code> /{" "}
          <code className="mono text-[0.9em]">longitude</code> — the resolved
          coordinates. <code className="mono text-[0.9em]">autoDetected</code> —
          coordinates came from a timezone rather than explicit values.{" "}
          <code className="mono text-[0.9em]">lightTheme</code> /{" "}
          <code className="mono text-[0.9em]">darkTheme</code> — the resolved
          scheduled pair (auto-derived from the current theme family when not
          configured). <code className="mono text-[0.9em]">nextTransition</code>{" "}
          — <code className="mono text-[0.9em]">{"{ at, theme, type }"}</code>{" "}
          where <code className="mono text-[0.9em]">type</code> is{" "}
          <code className="mono text-[0.9em]">"activation"</code> (sunrise) or{" "}
          <code className="mono text-[0.9em]">"deactivation"</code> (sunset).
        </Callout>
      </section>

      <section id="options" className="scroll-mt-24 mb-10">
        <SectionHeading
          num={3}
          desc="Every option `scheduled` accepts, plus the runtime `set()` for repositioning."
        >
          Options
        </SectionHeading>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-4 py-2 font-semibold">Option</th>
                <th className="px-4 py-2 font-semibold">Type</th>
                <th className="px-4 py-2 font-semibold">Description</th>
              </tr>
            </thead>
            <tbody>
              {optionRows.map((row) => (
                <tr
                  key={row.name}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-2 mono text-[0.9em] align-top">
                    {row.name}
                  </td>
                  <td className="px-4 py-2 text-xs opacity-60 align-top">
                    {row.type}
                  </td>
                  <td className="px-4 py-2 opacity-80 leading-relaxed align-top">
                    {row.desc}
                  </td>
                </tr>
              ))}
              <tr className="last:border-0">
                <td className="px-4 py-2 mono text-[0.9em] align-top">
                  set(&#123; … &#125;)
                </td>
                <td className="px-4 py-2 text-xs opacity-60 align-top">
                  method
                </td>
                <td className="px-4 py-2 opacity-80 leading-relaxed align-top">
                  Reposition or reconfigure at runtime —{" "}
                  <code className="mono text-[0.9em]">latitude</code>,{" "}
                  <code className="mono text-[0.9em]">longitude</code>,{" "}
                  <code className="mono text-[0.9em]">timeZone</code>,{" "}
                  <code className="mono text-[0.9em]">autoDetectLocation</code>,{" "}
                  <code className="mono text-[0.9em]">checkInterval</code>,{" "}
                  <code className="mono text-[0.9em]">skipApplyMs</code> or{" "}
                  <code className="mono text-[0.9em]">enabled</code>. Pass{" "}
                  <code className="mono text-[0.9em]">
                    {"{ autoDetectLocation: true }"}
                  </code>{" "}
                  to clear explicit settings and return to per-visitor
                  detection.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <Callout className="mt-3">
          <strong>Live configuration</strong>
          <span className="mx-1 opacity-40">|</span>
          The <code className="mono text-[0.9em]">scheduled</code> prop is
          reconciled in place — changing it after mount installs, repositions or
          replaces the schedule without recreating the runtime or resetting the
          active theme and history. Pass{" "}
          <code className="mono text-[0.9em]">scheduled={"{false}"}</code> to
          remove it: <code className="mono text-[0.9em]">runtime.schedule</code>{" "}
          becomes <code className="mono text-[0.9em]">null</code> and its timers
          and listeners are disposed. An unusable option (a non-positive{" "}
          <code className="mono text-[0.9em]">checkInterval</code>, an
          out-of-range coordinate) is reported as{" "}
          <code className="mono text-[0.9em]">TV_CONFIG_OPTION_INVALID</code>,
          and the previous schedule is kept.
        </Callout>
      </section>

      <section id="semantics" className="scroll-mt-24 mb-10">
        <SectionHeading
          num={4}
          desc="Exact semantics, so there are no surprises when a user picks a theme while the schedule is on."
        >
          Schedule vs. manual override
        </SectionHeading>
        <ul className="text-sm opacity-80 leading-relaxed list-disc pl-5 space-y-1.5">
          <li>
            <code className="mono text-[0.9em]">enable()</code> applies the
            correct light/dark theme immediately, then re-checks every{" "}
            <code className="mono text-[0.9em]">checkInterval</code>.
          </li>
          <li>
            A manual pick of any other theme is honored until the next check, at
            which point the schedule re-applies its light/dark selection. While
            overridden, <code className="mono text-[0.9em]">active</code> is{" "}
            <code className="mono text-[0.9em]">false</code>.
          </li>
          <li>
            <code className="mono text-[0.9em]">skipApplyMs</code> widens the
            window after a manual selection (or cross-tab sync) before the
            schedule re-asserts control.
          </li>
          <li>
            <code className="mono text-[0.9em]">disable()</code> leaves the
            current theme untouched — the schedule simply stops re-applying.
          </li>
          <li>
            If a configured{" "}
            <code className="mono text-[0.9em]">lightTheme</code> or{" "}
            <code className="mono text-[0.9em]">darkTheme</code> doesn&apos;t
            exist in the theme registry, the schedule stays off (status{" "}
            <code className="mono text-[0.9em]">"disabled"</code>).
          </li>
        </ul>
      </section>

      <section id="how-it-works" className="scroll-mt-24 mb-10">
        <SectionHeading
          num={5}
          desc="The schedule lives in the runtime. Frameworks only add their own way of reading it."
        >
          How it works
        </SectionHeading>
        <div className="flex flex-col gap-2 text-sm opacity-80 leading-relaxed">
          <p>
            <code className="mono text-[0.9em]">
              calculateSunTimes(date, lat, lon)
            </code>{" "}
            computes today&apos;s sunrise and sunset using the NOAA solar
            algorithm (zenith-based, corrected for the equation of time). At
            runtime the schedule checks the clock every{" "}
            <code className="mono text-[0.9em]">checkInterval</code> and applies{" "}
            <code className="mono text-[0.9em]">lightTheme</code> during the day
            or <code className="mono text-[0.9em]">darkTheme</code> at night.
          </p>
          <p>
            <strong className="opacity-100">No themes required either.</strong>{" "}
            <code className="mono text-[0.9em]">lightTheme</code> and{" "}
            <code className="mono text-[0.9em]">darkTheme</code> are optional.
            When omitted, the schedule derives them from the currently selected
            theme&apos;s family — pick{" "}
            <code className="mono text-[0.9em]">plum-dark</code> in your
            switcher and the schedule uses{" "}
            <code className="mono text-[0.9em]">plum-light</code> /{" "}
            <code className="mono text-[0.9em]">plum-dark</code> — and falls
            back to Themvora&apos;s neutral{" "}
            <code className="mono text-[0.9em]">light</code> /{" "}
            <code className="mono text-[0.9em]">dark</code> themes when the
            current theme has no family counterpart. The resolved pair
            re-derives automatically whenever the user switches family, and is
            reported in state as{" "}
            <code className="mono text-[0.9em]">lightTheme</code> /{" "}
            <code className="mono text-[0.9em]">darkTheme</code>.
          </p>
          <p>
            <strong className="opacity-100">No coordinates required.</strong>{" "}
            When you omit <code className="mono text-[0.9em]">latitude</code>{" "}
            and <code className="mono text-[0.9em]">longitude</code>, Themvora
            resolves the location from the visitor&apos;s IANA timezone (via{" "}
            <code className="mono text-[0.9em]">
              Intl.DateTimeFormat().resolvedOptions().timeZone
            </code>
            ) — each zone is anchored to the reference city the tz database
            uses, which is more than accurate enough for day/night switching.
            Pin a timezone explicitly with{" "}
            <code className="mono text-[0.9em]">timeZone</code> (it can be
            changed at runtime with{" "}
            <code className="mono text-[0.9em]">schedule.set()</code>), or set{" "}
            <code className="mono text-[0.9em]">autoDetectLocation: false</code>{" "}
            to force the default coordinates.
          </p>
          <p>
            <strong className="opacity-100">SSR boundary.</strong> The engine
            attaches its timer and DOM apply logic only on the client (
            <code className="mono text-[0.9em]">
              typeof window !== "undefined"
            </code>
            ), and auto-detection runs only on the client too — so server
            renders never leak timers and stay deterministic. Your SSR framework
            resolves the initial theme as usual (zero-flash of the wrong theme);
            the client-side schedule takes over activation from there. Configure
            the schedule on the server provider (Next.js / Nuxt) and the same
            settings apply to the hydrated client runtime.
          </p>
          <p>
            Because detection happens per visitor, the schedule is correct
            anywhere in the world: a user in Kathmandu gets Kathmandu&apos;s
            sunrise/sunset, a user in Helsinki gets Helsinki&apos;s — with the
            same <code className="mono text-[0.9em]">scheduled</code> block and
            no network call.
          </p>
        </div>
      </section>

      <section id="next" className="scroll-mt-24">
        <SectionHeading
          num={6}
          desc="Now that the app follows the sun, explore related capabilities."
        >
          What&apos;s next
        </SectionHeading>
        <div className="flex flex-col gap-2">
          <Link
            href="/playground#solar"
            className="glass-card card-lift p-4 no-underline flex items-center justify-between gap-3"
          >
            <div>
              <div className="font-semibold">Playground · Try it live</div>
              <div className="text-xs opacity-60">
                Enable the real schedule on this site, pick any timezone, and
                watch the site flip at sunrise/sunset.
              </div>
            </div>
            <span style={{ color: "var(--theme-color-primary)" }}>→</span>
          </Link>
          <Link
            href="/advanced-features"
            className="glass-card card-lift p-4 no-underline flex items-center justify-between gap-3"
          >
            <div>
              <div className="font-semibold">Advanced Features</div>
              <div className="text-xs opacity-60">
                Multi-window sync, history, time travel and the rest of the
                runtime.
              </div>
            </div>
            <span style={{ color: "var(--theme-color-primary)" }}>→</span>
          </Link>
          <Link
            href="/api-reference"
            className="glass-card card-lift p-4 no-underline flex items-center justify-between gap-3"
          >
            <div>
              <div className="font-semibold">API Reference</div>
              <div className="text-xs opacity-60">
                Full reference for ThemeSchedule, ThemeScheduleState and
                calculateSunTimes.
              </div>
            </div>
            <span style={{ color: "var(--theme-color-primary)" }}>→</span>
          </Link>
        </div>
      </section>
    </>
  );
}
