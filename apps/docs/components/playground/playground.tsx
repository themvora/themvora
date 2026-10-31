"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { PresetCards } from "./preset-cards";
import { TokenTree } from "./token-tree";
import { HistoryTimeline } from "./history-timeline";
import { SyncDemo } from "./sync-demo";
import { ScheduledDemo } from "./scheduled-demo";
import ThemeScope from "./theme-scope";
import { ScrollbarDemo } from "./scrollbar-demo";
import { AccessibilityLab } from "../accessibility/accessibility-lab";
import { AnimationLab } from "../animation/animation-lab";
import { ThemeStudio } from "../theme-studio/theme-studio";
import { SsrDemo } from "./ssr-demo";
import { PageHeader } from "../ui/page-header";
import { Select } from "../ui/select";
import { OverrideBanner } from "./override-banner";
import { WorkspaceBar } from "./workspace-bar";
import { usePlaygroundURL } from "./use-playground-url";
import { ShowCode } from "./show-code";

const NAV = [
  { href: "#presets", label: "Presets" },
  { href: "#scope", label: "Scope" },
  { href: "#preview", label: "Preview" },
  { href: "#history", label: "History" },
  { href: "#tokens", label: "Token tree" },
  { href: "#sync", label: "Sync" },
  { href: "#solar", label: "Solar time" },
  { href: "#animation", label: "Animation" },
  { href: "#scrollbar", label: "Scrollbar" },
  { href: "#a11y", label: "Accessibility" },
  { href: "#studio", label: "Studio" },
  { href: "#ssr", label: "SSR" },
];

function SectionNav() {
  const [active, setActive] = useState<string>("");
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const ids = NAV.map((item) => item.href.slice(1));
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];

    if (elements.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActive(visible[0]!.target.id);
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 },
    );

    for (const el of elements) {
      observerRef.current.observe(el);
    }

    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <nav
      aria-label="Playground sections"
      className="sticky top-16 z-30 mb-8 rounded-xl border border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
    >
      {/* Desktop: horizontal scroll-spy chips */}
      <div className="hidden sm:flex items-center gap-1.5 px-4 py-2.5 overflow-x-auto">
        {NAV.map((item) => {
          const id = item.href.slice(1);
          const isActive = active === id;
          return (
            <a
              key={item.href}
              href={item.href}
              aria-current={isActive ? "true" : undefined}
              onClick={() => setActive(id)}
              className={[
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors no-underline",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              ].join(" ")}
            >
              {item.label}
            </a>
          );
        })}
      </div>

      {/* Mobile: section dropdown */}
      <div className="sm:hidden px-3 py-2">
        <Select
          value={active || NAV[0]!.href.slice(1)}
          onChange={(id) => {
            setActive(id);
            const el = document.getElementById(id);
            el?.scrollIntoView({ behavior: "smooth" });
          }}
          label="Jump to section"
          options={NAV.map((item) => ({
            value: item.href.slice(1),
            label: item.label,
          }))}
        />
      </div>
    </nav>
  );
}

/**
 * Shared shell for every playground section: consistent heading scale,
 * description width, anchor offset and card treatment.
 */
function PlaygroundSection({
  id,
  title,
  description,
  children,
  codeSnippets,
  codeLabel,
}: {
  id: string;
  title: string;
  description: ReactNode;
  children: ReactNode;
  codeSnippets?: Record<string, { lang: string; code: string }>;
  codeLabel?: string;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-xl border border-border bg-card p-5 sm:p-6"
    >
      <h2 className="text-lg font-semibold tracking-tight mb-1">{title}</h2>
      <p className="text-sm opacity-60 mb-5 max-w-2xl leading-relaxed">
        {description}
      </p>
      <div className="min-w-0">{children}</div>
      {codeSnippets && (
        <ShowCode snippets={codeSnippets} stateLabel={codeLabel ?? undefined} />
      )}
    </section>
  );
}

export function Playground() {
  usePlaygroundURL();

  const solarSnippets = {
    react: {
      lang: "tsx",
      code: `import { ThemeProvider, useThemeSchedule } from "@themvora/react";

function App() {
  return (
    <ThemeProvider scheduled={{ autoDetectLocation: true }}>
      <MyPage />
    </ThemeProvider>
  );
}

function MyPage() {
  const schedule = useThemeSchedule();
  return (
    <button onClick={() => schedule?.enable()}>
      Enable schedule
    </button>
  );
}`,
    },
    next: {
      lang: "tsx",
      code: `// app/layout.tsx
"use client";
import { ThemeProvider } from "@themvora/next";
import { useThemeSchedule } from "@themvora/next/client";

export default function RootLayout({ children }) {
  return (
    <ThemeProvider scheduled={{ autoDetectLocation: true }}>
      {children}
    </ThemeProvider>
  );
}

// components/schedule-toggle.tsx
export function ScheduleToggle() {
  const schedule = useThemeSchedule();
  return (
    <button onClick={() => schedule?.enable()}>
      Enable schedule
    </button>
  );
}`,
    },
    vue: {
      lang: "vue",
      code: `<script setup lang="ts">
import { ThemeProvider, useThemeSchedule } from "@themvora/vue";

const schedule = useThemeSchedule();
</script>

<template>
  <ThemeProvider :scheduled="{ autoDetectLocation: true }">
    <button @click="schedule?.enable()">Enable schedule</button>
  </ThemeProvider>
</template>`,
    },
    nuxt: {
      lang: "ts",
      code: `// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@themvora/nuxt"],
  themvora: {
    scheduled: { autoDetectLocation: true },
  },
});

// app.vue
<script setup lang="ts">
const schedule = useThemeSchedule();
</script>

<template>
  <button @click="schedule?.enable()">Enable schedule</button>
</template>`,
    },
    svelte: {
      lang: "svelte",
      code: `<script lang="ts">
  import { ThemeProvider, useThemeSchedule, getThemeSchedule } from "@themvora/svelte";

  const scheduleState = useThemeSchedule();
  const controller = getThemeSchedule();
</script>

<ThemeProvider scheduled={{ autoDetectLocation: true }}>
  <button on:click={() => controller?.enable()}>
    Enable schedule
  </button>
</ThemeProvider>`,
    },
    solid: {
      lang: "tsx",
      code: `import { ThemeProvider, useThemeSchedule } from "@themvora/solid";

function App() {
  const schedule = useThemeSchedule();

  return (
    <ThemeProvider scheduled={{ autoDetectLocation: true }}>
      <button onClick={() => schedule?.enable()}>
        Enable schedule
      </button>
    </ThemeProvider>
  );
}`,
    },
    angular: {
      lang: "ts",
      code: `import { Component } from "@angular/core";
import { provideTheme, injectThemeSchedule } from "@themvora/angular";

// app.config.ts
export const appConfig = {
  providers: [
    provideTheme({
      scheduled: { autoDetectLocation: true },
    }),
  ],
};

// schedule-toggle.component.ts
@Component({
  selector: "app-schedule-toggle",
  template: \`
    <button (click)="toggle()">Enable schedule</button>
  \`,
})
export class ScheduleToggleComponent {
  private schedule = injectThemeSchedule();

  toggle() {
    this.schedule?.enable();
  }
}`,
    },
    web: {
      lang: "html",
      code: `<script type="module">
  import "@themvora/web";
</script>

<themvora-provider
  scheduled='{"autoDetectLocation": true}'
>
  <button id="enable-schedule">Enable schedule</button>
</themvora-provider>

<script>
  import { getThemeSchedule } from "@themvora/web";

  document.getElementById("enable-schedule").addEventListener("click", () => {
    const schedule = getThemeSchedule();
    schedule?.enable();
  });
</script>`,
    },
  };

  const scrollbarSnippets = {
    react: {
      lang: "tsx",
      code: `import { ThemeProvider, ThemeScrollbar } from "@themvora/react";

export default function Layout({ children }) {
  return (
    <ThemeProvider themes={themes} defaultTheme="light">
      <ThemeScrollbar
        behavior={{ autoHide: true }}
        appearance={{ thickness: 8, radius: 999 }}
      />
      {children}
    </ThemeProvider>
  );
}`,
    },
    next: {
      lang: "tsx",
      code: `// app/layout.tsx
import { ThemeProvider, ThemeScrollbar } from "@themvora/next";

export default function RootLayout({ children }) {
  return (
    <ThemeProvider
      themes={themes}
      defaultTheme="light"
      scrollbar
    >
      <ThemeScrollbar
        behavior={{ autoHide: true }}
        appearance={{ thickness: 8 }}
      />
      {children}
    </ThemeProvider>
  );
}`,
    },
    vue: {
      lang: "vue",
      code: `<script setup lang="ts">
import { ThemeProvider, ThemeScrollbar } from "@themvora/vue";
</script>

<template>
  <ThemeProvider :themes="themes" defaultTheme="light">
    <ThemeScrollbar :behavior="{ autoHide: true }" />
    <slot />
  </ThemeProvider>
</template>`,
    },
    nuxt: {
      lang: "vue",
      code: `// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@themvora/nuxt"],
  themvora: {
    themes,
    defaultTheme: "light",
    scrollbar: true,
  },
});

// app.vue
<template>
  <ThemeScrollbar :behavior="{ autoHide: true }" />
  <NuxtPage />
</template>`,
    },
    svelte: {
      lang: "svelte",
      code: `<script lang="ts">
  import { ThemeProvider, ThemeScrollbar } from "@themvora/svelte";
</script>

<ThemeProvider {themes} defaultTheme="light">
  <ThemeScrollbar behavior={{ autoHide: true }} />
  {@render children()}
</ThemeProvider>`,
    },
    solid: {
      lang: "tsx",
      code: `import { ThemeProvider, ThemeScrollbar } from "@themvora/solid";

export default function App() {
  return (
    <ThemeProvider themes={themes} defaultTheme="light">
      <ThemeScrollbar behavior={{ autoHide: true }} />
      <div>{/* your app */}</div>
    </ThemeProvider>
  );
}`,
    },
    angular: {
      lang: "ts",
      code: `import { Component } from "@angular/core";
import {
  provideTheme,
  ThemeScrollbarDirective,
} from "@themvora/angular";

@Component({
  selector: "app-root",
  template: \`
    <div
      themvoraScrollbar
      [themvoraScrollbarOptions]="{
        behavior: { autoHide: true },
        appearance: { thickness: 8 }
      }"
    ></div>
    <router-outlet />
  \`,
  standalone: true,
  imports: [ThemeScrollbarDirective],
  providers: [provideTheme()],
})
export class AppComponent {}`,
    },
    web: {
      lang: "html",
      code: `<themvora-scrollbar auto-hide thickness="8" radius="999"></themvora-scrollbar>

<script type="module">
  import "@themvora/web";
</script>`,
    },
  };

  const animationSnippets = {
    react: {
      lang: "tsx",
      code: `import { useThemeRuntime } from "@themvora/react";

function TransitionDemo() {
  const runtime = useThemeRuntime();

  const switchTheme = () => {
    // The runtime automatically creates a diff, plans the transition,
    // and runs the animation using View Transitions when available.
    runtime.setFamily("plum");
  };

  return <button onClick={switchTheme}>Switch theme</button>;
}`,
    },
    next: {
      lang: "tsx",
      code: `"use client";
import { useThemeRuntime } from "@themvora/next/client";

export function TransitionDemo() {
  const runtime = useThemeRuntime();
  return (
    <button onClick={() => runtime.setFamily("plum")}>
      Switch theme
    </button>
  );
}`,
    },
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <PageHeader
        eyebrow="Interactive playground"
        title="Themvora Playground"
        description="Everything below runs on Themvora's real runtime — the same store, history, and resolver that ships in the library. Switch a family or mode, explore the token tree, audit contrast, run a transition, and watch CSS variables update live."
      />

      <WorkspaceBar />
      <OverrideBanner />
      <SectionNav />

      <div className="flex flex-col gap-6 min-w-0">
        <PresetCards />
        <ThemeScope />

        {/* 50/50 pair with a FIXED row height: both sections get a definite
            sm:h-80 (Tailwind's sm: variant overrides h-full at sm+), so the
            grid row can no longer size to the history list's content — every
            new snapshot scrolls inside the card instead of growing it. */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div id="preview" className="scroll-mt-24 min-w-0">
            <section
              aria-label="Live previews"
              className="flex h-full sm:h-80 flex-col rounded-xl border border-border bg-card p-5 sm:p-6"
            >
              <h2 className="font-semibold mb-1">Live previews</h2>
              <p className="text-xs opacity-60 mb-4 leading-relaxed">
                Six pre-made interfaces — a dashboard, analytics, settings, a
                storefront, a docs layout and a component gallery — rendered
                with the theme you pick here. Switch a family or mode in the
                workspace bar and every preview restyles live.
              </p>
              <Link href="/showcase" className="btn btn-primary self-start text-sm">
                Open the showcase <span aria-hidden>→</span>
              </Link>
            </section>
          </div>
          <div id="history" className="scroll-mt-24 min-w-0">
            <HistoryTimeline />
          </div>
        </div>

        <div id="tokens" className="scroll-mt-24 min-w-0">
          <TokenTree />
        </div>

        <PlaygroundSection
          id="sync"
          title="Multi-window sync"
          description={
            <>
              Theme selections sync across tabs and windows in real time via{" "}
              <code className="mono text-[0.9em]">BroadcastChannel</code> (with
              SharedWorker and StorageEvent fallbacks).
            </>
          }
        >
          <SyncDemo />
        </PlaygroundSection>

        <PlaygroundSection
          id="solar"
          title="Scheduled themes · solar time"
          description={
            <>
              Run the real{" "}
              <code className="mono text-[0.9em]">useThemeSchedule()</code>{" "}
              controller: enable the schedule to flip the whole site between
              light and dark at sunrise/sunset. Leave it on{" "}
              <strong>Auto</strong> to use your own detected timezone — no
              coordinates needed — or pick any timezone in the world and watch
              the sun path follow it. See the{" "}
              <a
                href="/sunrise-sunset"
                className="underline decoration-primary/50 underline-offset-2"
              >
                Sunrise &amp; Sunset
              </a>{" "}
              page for per-framework setup.
            </>
          }
          codeSnippets={solarSnippets}
          codeLabel="useThemeSchedule()"
        >
          <ScheduledDemo />
        </PlaygroundSection>

        <PlaygroundSection
          id="animation"
          title="Animation & transition lab"
          description={
            <>
              Run the real transition pipeline —{" "}
              <code className="mono text-[0.9em]">createThemeDiff</code>,{" "}
              <code className="mono text-[0.9em]">createTransitionPlan</code>{" "}
              and <code className="mono text-[0.9em]">runThemeAnimation</code>{" "}
              — and tune duration, easing and presets live.
            </>
          }
          codeSnippets={animationSnippets}
          codeLabel="runtime.setFamily()"
        >
          <AnimationLab />
        </PlaygroundSection>

        <PlaygroundSection
          id="scrollbar"
          title="Custom scrollbar"
          description={
            <>
              The real overlay engine, integrated on this site — scroll the
              panel to see the theme-colored strip replace the native bar. For
              per-framework setup, see{" "}
              <a
                href="/custom-scrollbar"
                className="underline decoration-primary/50 underline-offset-2"
              >
                Custom Scrollbar
              </a>
              .
            </>
          }
          codeSnippets={scrollbarSnippets}
          codeLabel="ThemeScrollbar"
        >
          <ScrollbarDemo />
        </PlaygroundSection>

        <PlaygroundSection
          id="a11y"
          title="Accessibility lab"
          description="Check WCAG contrast on any pair, simulate color-vision deficiency, and audit the active theme's semantic pairs."
        >
          <AccessibilityLab compact />
        </PlaygroundSection>

        <PlaygroundSection
          id="studio"
          title="Theme studio"
          description={
            <>
              Generate a full light/dark pair from a seed with{" "}
              <code className="mono text-[0.9em]">generateTheme()</code>,
              choose a visual style, preview it, and apply it to this site live.
            </>
          }
        >
          <ThemeStudio compact />
        </PlaygroundSection>

        <PlaygroundSection
          id="ssr"
          title="SSR & zero-flash"
          description={
            <>
              The zero-flash pipeline, live: inspect what this page&apos;s own
              bootstrap published on{" "}
              <code className="mono text-[0.9em]">&lt;html&gt;</code>, and
              generate the real blocking script an app would inline in{" "}
              <code className="mono text-[0.9em]">&lt;head&gt;</code>.
            </>
          }
        >
          <SsrDemo />
          {/* No "Show code" here on purpose: there is no wiring to copy —
              the framework providers emit this script themselves. */}
          <p className="mt-5 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm leading-relaxed">
            <strong>No wiring to copy</strong> — every supported framework
            provider already emits this exact bootstrap script for you:{" "}
            <code className="mono text-[0.9em]">ThemeProvider</code> on
            Next.js and the SPA providers inject it during render, before
            first paint. The script above is what they generate under the
            hood. See the{" "}
            <Link
              href="/framework-guides"
              className="text-primary underline underline-offset-2"
            >
              framework guides
            </Link>{" "}
            for the one-line setup per stack.
          </p>
        </PlaygroundSection>
      </div>
    </div>
  );
}
