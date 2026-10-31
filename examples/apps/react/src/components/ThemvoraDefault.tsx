import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ThemeScope, useTheme } from "@themvora/react";
import { selection } from "../themes/themes";
import ThemeSwitcher from "./ThemeSwitcher";

const modes = ["light", "dark", "system"] as const;
const previewColors = ["primary", "secondary", "accent", "muted"] as const;
const scopedTheme = "cocoa";

const docsLinks = [
  {
    href: "https://themvora-dev.vercel.app/get-started",
    label: "Read the docs",
  },
  {
    href: "https://themvora-dev.vercel.app/framework-guides/react",
    label: "React guide",
  },
  {
    href: "https://themvora-dev.vercel.app/custom-themes",
    label: "Custom themes",
  },
  {
    href: "https://themvora-dev.vercel.app/playground",
    label: "Playground",
  },
];

const tailwindSnippet = `<button className="rounded-md bg-primary px-4 py-2 text-primary-foreground">
  Themed button
</button>`;

const cssSnippet = `.card {
  background: var(--theme-color-card);
  border: 1px solid var(--theme-color-border);
  border-radius: var(--theme-radius-lg);
}`;

/* ---------- Shared class strings ---------- */

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-(--theme-color-ring)";

const btnBase =
  "inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2 " +
  "text-sm font-medium transition-colors cursor-pointer " +
  focusRing;

const btnPrimary =
  btnBase +
  " border border-primary bg-primary text-primary-foreground hover:bg-primary/90";

const btnOutline = btnBase + " border border-border bg-card hover:bg-muted";

// Active state comes from aria-pressed, so styling and accessibility stay in sync.
const chip =
  "rounded-full border border-border px-3 py-1.5 text-sm capitalize " +
  "transition-colors cursor-pointer not-aria-pressed:hover:bg-muted " +
  "aria-pressed:border-primary aria-pressed:bg-primary " +
  "aria-pressed:text-primary-foreground " +
  focusRing;

const segment =
  "flex-1 rounded-md px-3 py-1.5 text-sm capitalize transition-colors " +
  "cursor-pointer sm:flex-none not-aria-pressed:hover:bg-card " +
  "aria-pressed:bg-primary aria-pressed:text-primary-foreground " +
  focusRing;

/* ---------- Small building blocks ---------- */

const Card = ({
  children,
  className = "",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}) => (
  <section
    {...rest}
    className={`rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6 ${className}`}
  >
    {children}
  </section>
);

const SectionHeading = ({ title, hint }: { title: string; hint?: string }) => (
  <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
    <h2 className="text-lg font-semibold">{title}</h2>
    {hint ? (
      <p className="text-xs text-muted-foreground sm:text-sm">{hint}</p>
    ) : null}
  </div>
);

const ControlGroup = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <div className="grid gap-2 sm:grid-cols-[6rem_1fr] sm:items-start sm:gap-4">
    <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground sm:pt-2">
      {label}
    </h3>
    <div
      className="flex min-w-0 flex-wrap gap-2"
      role="group"
      aria-label={label}
    >
      {children}
    </div>
  </div>
);

const Snippet = ({
  label,
  code,
  copied,
  onCopy,
}: {
  label: string;
  code: string;
  copied: boolean;
  onCopy: () => void;
}) => (
  <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-muted/40">
    <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <button
        type="button"
        onClick={onCopy}
        className={`rounded px-2 py-0.5 text-xs text-primary hover:bg-muted cursor-pointer ${focusRing}`}
      >
        <span aria-live="polite">{copied ? "Copied!" : "Copy"}</span>
      </button>
    </div>
    <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed">
      <code>{code}</code>
    </pre>
  </div>
);

const ScopedTheme = () => (
  <Card>
    <SectionHeading
      title="Scoped theme"
      hint={`This region is scoped to the ${scopedTheme} theme.`}
    />

    <ThemeScope theme={scopedTheme} className="rounded-lg shadow-md">
      <div className="rounded-lg border border-border bg-primary p-4 text-primary-foreground sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="font-semibold">Feature tile</h3>
            <p className="mt-1 text-sm text-primary-foreground/70">
              Scoped via ThemeScope. It runs its own transition while the rest
              of the page is untouched.
            </p>
            <p className="mt-3 flex items-center gap-2 text-sm text-primary-foreground/70">
              <span className="size-2.5 shrink-0 rounded-full bg-success" />
              Scoped to: {scopedTheme}
            </p>
          </div>
          <button
            type="button"
            className={`${btnBase} shrink-0 bg-primary-foreground text-primary hover:opacity-90`}
          >
            Scoped button
          </button>
        </div>
      </div>
    </ThemeScope>
  </Card>
);

/* ---------- Page ---------- */

const ThemvoraDefault = () => {
  const { theme, mode, setMode, setFamily } = useTheme();
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const colors = theme.tokens?.colors;

  // Safely resolve a theme color to a CSS string.
  const getColor = useCallback(
    (name: string, fallback = ""): string => {
      const value = colors?.[name as keyof typeof colors];
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
    } catch {}
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-8 sm:gap-6 sm:px-6 sm:py-12 lg:py-16">
      {/* Hero */}
      <header className="flex flex-col items-center gap-5 pb-2 text-center sm:gap-6 sm:pb-4">
        <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground shadow-sm">
          <span className="size-2 shrink-0 rounded-full bg-success" />
          <span className="truncate">
            {theme.meta?.label ?? "Themvora"} · {mode}
          </span>
        </span>

        <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-5xl">
          Welcome to{" "}
          <span
            className="bg-linear-to-r from-primary to-accent bg-clip-text text-transparent text-shadow-sm"
            style={{
              WebkitTextStroke:
                "0.5px color-mix(in srgb, var(--theme-color-primary) 75%, #000)",
              paintOrder: "stroke fill",
            }}
          >
            Themvora
          </span>
        </h1>

        <p className="max-w-lg text-balance text-sm text-muted-foreground sm:text-base">
          Your app is themed. Edit{" "}
          <code className="rounded bg-secondary px-1.5 py-0.5 text-[0.85em]">
            src/App.tsx
          </code>{" "}
          and start building. Every color, radius and font below is a Themvora
          token.
        </p>

        <nav
          aria-label="Documentation"
          className="grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-center sm:gap-3"
        >
          {docsLinks.map((link, index) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer noopener"
              className={index === 0 ? btnPrimary : btnOutline}
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
      <Card aria-label="Theme controls" className="grid gap-5">
        <div className="flex items-center justify-between flex-wrap">
          <ControlGroup label="Mode + Toggle">
            <div className="flex w-full gap-1 rounded-lg border border-border bg-muted p-1 sm:w-auto">
              {modes.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  aria-pressed={mode === item}
                  className={segment}
                >
                  {item}
                </button>
              ))}
            </div>
          </ControlGroup>
          <ThemeSwitcher />
        </div>

        <hr className="border-border" />

        <ControlGroup label="Presets">
          {selection.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFamily(item)}
              aria-pressed={theme.meta?.family === item}
              className={chip}
            >
              {item}
            </button>
          ))}
        </ControlGroup>
      </Card>

      {/* Live preview */}
      <section
        aria-label="Theme preview"
        className="overflow-hidden rounded-xl border shadow-md"
        style={{
          backgroundColor: background,
          borderColor: border,
          color: foreground,
        }}
      >
        <div
          className="flex items-center gap-2 border-b px-4 py-3"
          style={{ backgroundColor: muted, borderColor: border }}
        >
          <span className="size-2.5 rounded-full bg-destructive" />
          <span className="size-2.5 rounded-full bg-accent" />
          <span className="size-2.5 rounded-full bg-success" />
          <span
            className="ml-3 hidden h-5 flex-1 rounded-md sm:block"
            style={{
              backgroundColor: background,
              border: `1px solid ${border}`,
            }}
            aria-hidden
          />
        </div>

        <div className="grid gap-5 bg-card p-4 sm:p-6 md:grid-cols-[1fr_auto] md:items-center">
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
                      className="size-4 shrink-0 rounded-full border-2 border-border"
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
      <Card>
        <SectionHeading
          title="Theme colors"
          hint={`${colorEntries.length} tokens · tap to copy`}
        />

        <ul className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {colorEntries.map(([name, value]) => (
            <li key={name} className="min-w-0">
              <button
                type="button"
                onClick={() => copy(name, value)}
                title={`Copy ${value}`}
                aria-label={`Copy ${name} ${value}`}
                className={`flex w-full min-w-0 items-center gap-3 rounded-lg border border-border p-2 text-left transition-colors hover:bg-muted cursor-pointer ${focusRing}`}
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
      </Card>

      {/* Use the tokens */}
      <Card>
        <SectionHeading
          title="Use the tokens"
          hint="Same tokens, two ways. Neither needs per-theme code."
        />
        <div className="grid gap-3 md:grid-cols-2">
          <Snippet
            label="Tailwind"
            code={tailwindSnippet}
            copied={copied === "snippet-tailwind"}
            onCopy={() => copy("snippet-tailwind", tailwindSnippet)}
          />
          <Snippet
            label="CSS variables"
            code={cssSnippet}
            copied={copied === "snippet-css"}
            onCopy={() => copy("snippet-css", cssSnippet)}
          />
        </div>
      </Card>

      <ScopedTheme />

      <footer className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t border-border pt-6 text-sm text-muted-foreground">
        <span>Generated by</span>
        <code className="rounded bg-secondary px-1.5 py-0.5">
          themvora init
        </code>
        <span aria-hidden>·</span>
        <a
          href="https://themvora-dev.vercel.app/"
          target="_blank"
          rel="noreferrer noopener"
          className={`rounded text-primary underline-offset-4 hover:underline ${focusRing}`}
        >
          Themvora docs
        </a>
      </footer>
    </div>
  );
};

export default ThemvoraDefault;
