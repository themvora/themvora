import Link from "next/link";
import { libraries } from "../../lib/libraries";

/**
 * "Bring your existing UI system".
 *
 * The distinction the section has to land is not cosmetic: a **CSS-variable**
 * library consumes custom properties, so the adapter only has to publish the
 * active theme as a stylesheet — nothing re-renders. A **generated-theme**
 * library takes a theme object as a value, so the adapter has to rebuild that
 * object and hand it to the library's own provider on every change.
 *
 * Names and packages are read from `lib/libraries` — the same source the
 * adapter pages render — so a card cannot drift from the page it links to.
 */

const CSS_VARIABLE_SLUGS = ["shadcn", "bootstrap", "daisyui", "open-props"];
const GENERATED_SLUGS = ["mui", "chakra", "antd", "mantine"];

function resolve(slugs: string[]) {
  return slugs
    .map((slug) => libraries.find((l) => l.slug === slug))
    .filter((l) => l !== undefined);
}

function AdapterPanel({
  title,
  pipeline,
  body,
  items,
}: {
  title: string;
  pipeline: string;
  body: string;
  items: ReturnType<typeof resolve>;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold">{title}</h3>
      <code className="mono mt-1.5 self-start rounded-md border border-border bg-muted/40 px-2 py-1 text-[10px] leading-relaxed opacity-70">
        {pipeline}
      </code>
      <p className="mt-3 text-[13px] leading-relaxed opacity-65">{body}</p>

      <ul className="mt-4 flex flex-col divide-y divide-border border-t border-border">
        {items.map((lib) => (
          <li key={lib.slug}>
            <Link
              href={`/libraries/${lib.slug}`}
              className="flex items-center gap-2.5 py-2 no-underline transition-opacity hover:opacity-100 opacity-85"
            >
              <span className="grid size-6 shrink-0 place-items-center text-sm">
                {lib.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">
                  {lib.name}
                </span>
                <span className="mono block truncate text-[10px] opacity-45">
                  {lib.pkg}
                </span>
              </span>
              <span
                className="shrink-0 text-sm font-semibold"
                style={{ color: "var(--docs-accent)" }}
              >
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AdapterStory() {
  const cssItems = resolve(CSS_VARIABLE_SLUGS);
  const generatedItems = resolve(GENERATED_SLUGS);

  return (
    <section className="max-w-6xl mx-auto px-6 py-16 border-t border-border">
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
          Bring your existing UI system
        </h2>
        <p className="opacity-70 max-w-2xl">
          Keep the component library you already use — and give it a theme system
          it never had. An adapter maps Themvora&apos;s tokens onto the way that
          library already expects to be styled, so the components stay exactly as
          they are.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <AdapterPanel
          title="CSS-variable adapters"
          pipeline="tokens → :root stylesheet → the library's own variables"
          body="The library already reads custom properties, so the adapter publishes the active theme as a live stylesheet. Switching themes rewrites variables; no component re-renders and no provider is involved."
          items={cssItems}
        />
        <AdapterPanel
          title="Generated-theme adapters"
          pipeline="tokens → library theme object → the library's provider"
          body="These libraries take a theme as a value, not as variables. The adapter rebuilds that object from the active tokens and passes it to the library's own provider, so its internals keep working as designed."
          items={generatedItems}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href="/libraries/unocss"
          className="chip no-underline hover:border-ring transition-colors"
        >
          UnoCSS preset
          <span className="mono text-[10px] opacity-50">@themvora/unocss</span>
        </Link>
        <Link
          href="/adapters"
          className="chip no-underline hover:border-ring transition-colors"
        >
          Full adapters guide →
        </Link>
      </div>
    </section>
  );
}
