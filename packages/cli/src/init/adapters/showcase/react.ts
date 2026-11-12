/**
 * The React showcase: `ThemvoraDefault.tsx` and `ThemeSwitcher.tsx`.
 *
 * The reference blueprint's page, rendered from the shared class vocabulary so
 * the same design appears in every framework and both styling engines. Only the
 * syntax and the file the reader is told to edit differ per framework.
 *
 * @packageDocumentation
 */
import { generatedHeader } from "../../files.js";
import type { ShowcaseClasses } from "../showcase-classes.js";
import { CSS_SNIPPET, TAILWIND_SNIPPET, docsLinks } from "../showcase-content.js";
import type { ShowcasePort } from "./port.js";
import type { StylingEngine } from "../../types.js";

/** A backtick, so the generated snippets can be delimited without escaping. */
const BT = "`";

/**
 * `ThemvoraDefault.tsx`.
 *
 * @param c - The class vocabulary for the selected engine.
 * @param port - The framework-specific bits (package, edit path, guide slug).
 * @returns The component's source.
 */
export function reactThemvoraDefault(
  c: ShowcaseClasses,
  port: ShowcasePort,
  styling: StylingEngine,
): string {
  const links = docsLinks(port.guideSlug)
    .map((link) => `  { href: "${link.href}", label: "${link.label}" },`)
    .join("\n");
  // A plain-CSS project is not shown a Tailwind snippet: the card would be
  // documenting an engine the project does not have.
  const tailwind = styling === "tailwind";

  return `${generatedHeader("The Themvora showcase.")}import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ThemeScope, useTheme } from "${port.adapter}";

import { scopedFamily, selection } from "../themes/themes";
import ThemeSwitcher from "./ThemeSwitcher";

const modes = ["light", "dark", "system"] as const;
const previewColors = ["primary", "secondary", "accent", "muted"] as const;

const docsLinks = [
${links}
];

${tailwind ? `const tailwindSnippet = ${BT}${TAILWIND_SNIPPET}${BT};\n` : ""}
const cssSnippet = ${BT}${CSS_SNIPPET}${BT};

/* ---------- Small building blocks ---------- */

const Card = ({
  children,
  stack = false,
  ...rest
}: {
  children: ReactNode;
  stack?: boolean;
  "aria-label"?: string;
}) => (
  <section {...rest} className={stack ? "${c.card} ${c.cardStack}" : "${c.card}"}>
    {children}
  </section>
);

const SectionHeading = ({ title, hint }: { title: string; hint?: string }) => (
  <div className="${c.cardHeading}">
    <h2 className="${c.cardTitle}">{title}</h2>
    {hint ? <p className="${c.cardHint}">{hint}</p> : null}
  </div>
);

const ControlGroup = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="${c.controlGroup}">
    <h3 className="${c.controlLabel}">{label}</h3>
    <div className="${c.controlRow}" role="group" aria-label={label}>
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
  <div className="${c.snippet}">
    <div className="${c.snippetHead}">
      <span className="${c.snippetLabel}">{label}</span>
      <button type="button" onClick={onCopy} className="${c.snippetCopy}">
        <span aria-live="polite">{copied ? "Copied!" : "Copy"}</span>
      </button>
    </div>
    <pre className="${c.snippetCode}">
      <code>{code}</code>
    </pre>
  </div>
);

const ScopedTheme = () => (
  <Card>
    <SectionHeading
      title="Scoped theme"
      hint={"This region is scoped to the " + scopedFamily + " theme."}
    />

    {/* A family scope, so the region keeps its own palette while still
        following the page's light/dark mode. */}
    <div className="${c.scopedTile}">
      <ThemeScope family={scopedFamily}>
        <div className="${c.scopedTileBody}">
          <div>
            <h3 className="${c.scopedTitle}">Feature tile</h3>
            <p className="${c.scopedText}">
              Scoped via ThemeScope. It runs its own transition while the rest of
              the page is untouched.
            </p>
            <p className="${c.scopedMeta}">
              <span className="${c.scopedDot}" />
              Scoped to: {scopedFamily}
            </p>
          </div>
          <button type="button" className="${c.scopedBtn}">
            Scoped button
          </button>
        </div>
      </ThemeScope>
    </div>
  </Card>
);

/* ---------- Page ---------- */

const ThemvoraDefault = () => {
  const { theme, mode, setMode, setFamily } = useTheme();
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // The "Copied!" state is on a timer, so it has to be cleared on unmount.
  useEffect(() => () => clearTimeout(timer.current), []);

  const colors = theme.tokens?.colors;

  /**
   * Resolve a semantic colour from the active theme.
   *
   * Returns undefined when the token is absent, and the caller omits the value
   * rather than substituting a literal — a fallback colour here would be a second
   * palette, which is exactly what a themed component must not carry.
   */
  const getColor = useCallback(
    (name: string): string | undefined => {
      const value = colors?.[name as keyof typeof colors];
      return typeof value === "string" ? value : undefined;
    },
    [colors],
  );

  const background = getColor("background");
  const foreground = getColor("foreground");
  const border = getColor("border");
  const muted = getColor("muted");

  const colorEntries = Object.keys(colors ?? {})
    .map((name) => [name, getColor(name)] as const)
    .filter((entry): entry is readonly [string, string] => Boolean(entry[1]));

  const copy = async (id: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(id);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(null), 1400);
    } catch {
      // Clipboard access can be denied; say so rather than pretending it worked.
      setCopied(id + ":failed");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(null), 2000);
    }
  };

  return (
    <div className="${c.page}">
      {/* Hero */}
      <header className="${c.hero}">
        <span className="${c.status}">
          <span className="${c.statusDot}" />
          <span className="${c.statusText}">
            {theme.meta?.label ?? "Themvora"} · {mode}
          </span>
        </span>

        <h1 className="${c.title}">
          Welcome to <span className="${c.titleGradient}">Themvora</span>
        </h1>

        <p className="${c.lead}">
          Your app is themed. Edit <code className="${c.code}">${port.editPath}</code> and start
          building. Every color, radius and font below is a Themvora token.
        </p>

        <nav aria-label="Documentation" className="${c.docsNav}">
          {docsLinks.map((link, index) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer noopener"
              className={index === 0 ? "${c.btnPrimary}" : "${c.btnOutline}"}
            >
              {link.label}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="${c.icon}"
              >
                <path d="M7 17 17 7M8 7h9v9" />
              </svg>
            </a>
          ))}
        </nav>
      </header>

      {/* Controls */}
      <Card stack aria-label="Theme controls">
        <div className="${c.controlsRow}">
          <ControlGroup label="Mode + Toggle">
            <div className="${c.segments}">
              {modes.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  aria-pressed={mode === item}
                  className="${c.segment}"
                >
                  {item}
                </button>
              ))}
            </div>
          </ControlGroup>
          <ThemeSwitcher />
        </div>

        <hr className="${c.rule}" />

        <ControlGroup label="Presets">
          {selection.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFamily(item)}
              aria-pressed={theme.meta?.family === item}
              className="${c.chip}"
            >
              {item}
            </button>
          ))}
        </ControlGroup>
      </Card>

      {/* Live preview */}
      <section
        aria-label="Theme preview"
        className="${c.preview}"
        style={{
          ...(background ? { backgroundColor: background } : {}),
          ...(border ? { borderColor: border } : {}),
          ...(foreground ? { color: foreground } : {}),
        }}
      >
        <div
          className="${c.previewBar}"
          style={{
            ...(muted ? { backgroundColor: muted } : {}),
            ...(border ? { borderColor: border } : {}),
          }}
        >
          <span className={"${c.previewDot} ${c.previewDotDestructive}"} />
          <span className={"${c.previewDot} ${c.previewDotAccent}"} />
          <span className={"${c.previewDot} ${c.previewDotSuccess}"} />
          <span
            className="${c.previewAddress}"
            style={{
              ...(background ? { backgroundColor: background } : {}),
              ...(border ? { border: "1px solid " + border } : {}),
            }}
            aria-hidden
          />
        </div>

        <div className="${c.previewBody}">
          <div className="${c.previewInfo}">
            <h2 className="${c.previewTitle}">{theme.meta?.label ?? "Themvora"}</h2>
            <p className="${c.previewMeta}">
              {foreground ?? "foreground"} on {background ?? "background"}
            </p>

            <ul className="${c.previewSwatches}">
              {previewColors.map((name) => {
                const value = getColor(name);
                if (!value) return null;
                return (
                  <li key={name} className="${c.previewSwatch}">
                    <span className="${c.previewSwatchDot}" style={{ backgroundColor: value }} />
                    <span className="${c.previewSwatchName}">{name}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="${c.previewActions}">
            <span
              className="${c.previewPill}"
              style={{
                ...(getColor("primary") ? { backgroundColor: getColor("primary")! } : {}),
                ...(getColor("primaryForeground") ? { color: getColor("primaryForeground")! } : {}),
              }}
            >
              Primary
            </span>
            <span
              className="${c.previewPill}"
              style={{
                ...(getColor("secondary") ? { backgroundColor: getColor("secondary")! } : {}),
                ...(getColor("secondaryForeground") ? { color: getColor("secondaryForeground")! } : {}),
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
          hint={colorEntries.length + " tokens · tap to copy"}
        />

        <ul className="${c.tokenGrid}">
          {colorEntries.map(([name, value]) => (
            <li key={name}>
              <button
                type="button"
                onClick={() => copy(name, value)}
                title={"Copy " + value}
                aria-label={"Copy " + name + " " + value}
                className="${c.token}"
              >
                <span className="${c.tokenSwatch}" style={{ backgroundColor: value }} />
                <span className="${c.tokenBody}">
                  <span className="${c.tokenName}">{name}</span>
                  <span className="${c.tokenValue}" aria-live="polite">
                    {copied === name
                      ? "Copied!"
                      : copied === name + ":failed"
                        ? "Copy failed"
                        : value}
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
          hint="${tailwind ? "Same tokens, two ways. Neither needs per-theme code." : "Every colour on this page is one of these variables."}"
        />
        <div className="${tailwind ? c.snippetGrid : c.snippetGridSingle}">
${tailwind ? `          <Snippet
            label="Tailwind"
            code={tailwindSnippet}
            copied={copied === "snippet-tailwind"}
            onCopy={() => copy("snippet-tailwind", tailwindSnippet)}
          />
` : ""}          <Snippet
            label="CSS variables"
            code={cssSnippet}
            copied={copied === "snippet-css"}
            onCopy={() => copy("snippet-css", cssSnippet)}
          />
        </div>
      </Card>

      <ScopedTheme />

      <footer className="${c.footer}">
        <span>Generated by</span>
        <code className="${c.code}">themvora init</code>
        <span aria-hidden>·</span>
        <a
          href="${"https://themvora-dev.vercel.app/"}"
          target="_blank"
          rel="noreferrer noopener"
          className="${c.footerLink}"
        >
          Themvora docs
        </a>
      </footer>
    </div>
  );
};

export default ThemvoraDefault;
`;
}

/**
 * `ThemeSwitcher.tsx`.
 *
 * @param c - The class vocabulary for the selected engine.
 * @param port - The framework-specific bits.
 * @returns The component's source.
 */
export function reactThemeSwitcher(c: ShowcaseClasses, port: ShowcasePort): string {
  return `${generatedHeader("A light/dark control.")}import { useTheme } from "${port.adapter}";

const ThemeSwitcher = () => {
  const { toggleTheme } = useTheme();

  return (
    <div className="${c.switcherWrap}">
      <button type="button" onClick={toggleTheme} className="${c.switcherBtn}">
        Toggle light/dark
      </button>
    </div>
  );
};

export default ThemeSwitcher;
`;
}
