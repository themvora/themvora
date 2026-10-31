import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ThemeScope, ThemeScrollbar, useTheme } from "@themvora/remix";
import {
  docsLinks,
  tailwindSnippet,
  cssSnippet,
  docsHome,
} from "@themvora/app-shared/content";
import {
  selection,
  modes,
  previewColors,
  scopedTheme,
} from "@themvora/app-shared/themes";
// The arrow glyphs are React elements, not the markup strings the string-based
// adapters use — see the module comment.
import { scrollbarIcons } from "../components/scrollbar-icons";
import { ui } from "@themvora/app-shared/ui";

export const meta = () => [{ title: "Themvora + Remix" }];

function Card({
  children,
  ...rest
}: {
  children: ReactNode;
  "aria-label"?: string;
}) {
  return (
    <section {...rest} className={`${ui.card} grid gap-5`}>
      {children}
    </section>
  );
}

function SectionHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className={ui.sectionHeading.wrap}>
      <h2 className={ui.sectionHeading.title}>{title}</h2>
      {hint ? <p className={ui.sectionHeading.hint}>{hint}</p> : null}
    </div>
  );
}

function ControlGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className={ui.controlGroup.wrap}>
      <h3 className={ui.controlGroup.label}>{label}</h3>
      <div className={ui.controlGroup.group} role="group" aria-label={label}>
        {children}
      </div>
    </div>
  );
}

export default function Index() {
  const { theme, mode, setMode, setFamily, toggleTheme } = useTheme();
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const colors = theme.tokens?.colors as
    Record<string, string | undefined> | undefined;

  const getColor = useCallback(
    (name: string, fallback = ""): string => {
      const value = colors?.[name];
      return typeof value === "string" ? value : fallback;
    },
    [colors],
  );

  const background = getColor("background", "#fafbff");
  const foreground = getColor("foreground", "#17172b");
  const border = getColor("border", "#dfe3f5");
  const muted = getColor("muted", "#f1f2fa");

  const colorEntries = Object.keys(colors ?? {})
    .map((name) => [name, getColor(name)] as const)
    .filter(([, value]) => value);

  const copy = async (id: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(id);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(null), 1400);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <main className="page flex flex-col">
      <ThemeScrollbar behavior={{ autoHide: false }} icons={scrollbarIcons} />

      <div className={ui.page}>
        {/* Hero */}
        <header className={ui.hero.wrap}>
          <span className={ui.hero.pill}>
            <span className={ui.hero.pillDot} />
            <span className="truncate">
              {theme.meta?.label ?? "Themvora"} · {mode}
            </span>
          </span>

          <h1 className={`text-center ${ui.hero.title}`}>
            Welcome to{" "}
            <span className={`${ui.hero.gradient} hero-title-stroke`}>
              Themvora
            </span>
          </h1>

          <p className={ui.hero.lead}>
            Your app is themed. Edit{" "}
            <code className={ui.hero.inlineCode}>app/routes/_index.tsx</code>{" "}
            and start building. Every color, radius and font below is a Themvora
            token.
          </p>

          <nav aria-label="Documentation" className={ui.hero.nav}>
            {docsLinks.map((link, index) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer noopener"
                className={index === 0 ? ui.btnPrimary : ui.btnOutline}
              >
                {link.label}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="1em"
                  height="1em"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M7 17 17 7M8 7h9v9" />
                </svg>
              </a>
            ))}
          </nav>
        </header>

        {/* Controls */}
        <Card aria-label="Theme controls">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <ControlGroup label="Mode + Toggle">
              <div className={ui.controls.segmentWrap}>
                {modes.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setMode(item)}
                    aria-pressed={mode === item}
                    className={ui.segment}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => toggleTheme()}
                className={ui.btnPrimary}
              >
                Toggle light/dark
              </button>
            </ControlGroup>
          </div>

          <hr className={ui.controls.divider} />

          <ControlGroup label="Presets">
            {selection.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFamily(item)}
                aria-pressed={theme.meta?.family === item}
                className={ui.chip}
              >
                {item}
              </button>
            ))}
          </ControlGroup>
        </Card>

        {/* Live preview */}
        <section
          aria-label="Theme preview"
          className={ui.previewWindow.section}
          style={{
            backgroundColor: background,
            borderColor: border,
            color: foreground,
          }}
        >
          <div
            className={ui.previewWindow.bar}
            style={{ backgroundColor: muted, borderColor: border }}
          >
            <span className={`${ui.previewWindow.dot} bg-destructive`} />
            <span className={`${ui.previewWindow.dot} bg-accent`} />
            <span className={`${ui.previewWindow.dot} bg-success`} />
            <span
              className="ml-3 hidden h-5 flex-1 rounded-md sm:block"
              style={{
                backgroundColor: background,
                border: `1px solid ${border}`,
              }}
              aria-hidden
            />
          </div>

          <div className={ui.previewWindow.body}>
            <div className="min-w-0">
              <h2 className="text-base font-semibold">
                {theme.meta?.label ?? "Themvora"}
              </h2>
              <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                {foreground} on {background}
              </p>

              <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
                {previewColors.map((name) => {
                  const value = getColor(name);
                  if (!value) return null;
                  return (
                    <li key={name} className="flex items-center gap-1.5">
                      <span
                        className={ui.previewWindow.swatch}
                        style={{ backgroundColor: value }}
                      />
                      <span className="font-mono text-xs text-muted-foreground">
                        {name}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex md:justify-end">
              <span
                className="rounded-md px-3 py-2 text-center text-sm font-medium"
                style={{
                  backgroundColor: getColor("primary"),
                  color: getColor("primaryForeground"),
                }}
              >
                Primary
              </span>
              <span
                className="rounded-md px-3 py-2 text-center text-sm font-medium"
                style={{
                  backgroundColor: getColor("secondary"),
                  color: getColor("secondaryForeground"),
                }}
              >
                Secondary
              </span>
            </div>
          </div>
        </section>

        {/* All theme colors */}
        <section className={ui.card}>
          <SectionHeading
            title="Theme colors"
            hint={`${colorEntries.length} tokens · tap to copy`}
          />
          <ul className={ui.colorsGrid}>
            {colorEntries.map(([name, value]) => (
              <li key={name} className="min-w-0">
                <button
                  type="button"
                  onClick={() => copy(name, value)}
                  title={`Copy ${value}`}
                  aria-label={`Copy ${name} ${value}`}
                  className={ui.colorButton}
                >
                  <span
                    className="size-9 shrink-0 rounded-md border-2 border-border"
                    style={{ backgroundColor: value }}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {name}
                    </span>
                    <span className="block truncate font-mono text-xs text-muted-foreground">
                      {copied === name ? "Copied!" : value}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* Use the tokens */}
        <section className={ui.card}>
          <SectionHeading
            title="Use the tokens"
            hint="Same tokens, two ways. Neither needs per-theme code."
          />
          <div className="grid gap-3 md:grid-cols-2">
            {[
              {
                id: "snippet-tailwind",
                label: "Tailwind",
                code: tailwindSnippet,
              },
              { id: "snippet-css", label: "CSS variables", code: cssSnippet },
            ].map((snippet) => (
              <div key={snippet.id} className={ui.snippet.wrap}>
                <div className={ui.snippet.header}>
                  <span className={ui.snippet.label}>{snippet.label}</span>
                  <button
                    type="button"
                    onClick={() => copy(snippet.id, snippet.code)}
                    className={ui.snippet.copyBtn}
                  >
                    <span aria-live="polite">
                      {copied === snippet.id ? "Copied!" : "Copy"}
                    </span>
                  </button>
                </div>
                <pre className={ui.snippet.pre}>
                  <code>{snippet.code}</code>
                </pre>
              </div>
            ))}
          </div>
        </section>

        {/* Scoped theme */}
        <section className={ui.card}>
          <SectionHeading
            title="Scoped theme"
            hint={`This region is scoped to the ${scopedTheme} theme.`}
          />
          <ThemeScope theme={scopedTheme} className="rounded-lg shadow-md">
            <div className={ui.scoped.inner}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h3 className="font-semibold">Feature tile</h3>
                  <p className="mt-1 text-sm text-primary-foreground/70">
                    Scoped via ThemeScope. It runs its own transition while the
                    rest of the page is untouched.
                  </p>
                  <p className="mt-3 flex items-center gap-2 text-sm text-primary-foreground/70">
                    <span className="size-2.5 shrink-0 rounded-full bg-success" />
                    Scoped to: {scopedTheme}
                  </p>
                </div>
                <button type="button" className={ui.scoped.button}>
                  Scoped button
                </button>
              </div>
            </div>
          </ThemeScope>
        </section>

        <footer className={ui.footer}>
          <span>Generated by</span>
          <code className="rounded bg-secondary px-1.5 py-0.5">
            themvora init
          </code>
          <span aria-hidden>·</span>
          <a
            href={docsHome}
            target="_blank"
            rel="noreferrer noopener"
            className={`rounded text-primary underline-offset-4 hover:underline ${ui.focusRing}`}
          >
            Themvora docs
          </a>
        </footer>
      </div>

      <div className="max-h-40 max-w-lg overflow-auto my-8 border-2 border-border">
        {Array.from({ length: 100 }).map((_, index) => (
          <p key={index}>
            Hello for the scrollbar example very very very very very very very
            very very very long content
          </p>
        ))}
      </div>
    </main>
  );
}
