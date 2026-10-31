/**
 * Shared copy and code snippets used across every example app so the reference
 * presentation stays identical. Mirrors `examples/apps/react`.
 */

export const docsLinks = [
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

export const tailwindSnippet = `<button class="rounded-md bg-primary px-4 py-2 text-primary-foreground">
  Themed button
</button>`;

export const cssSnippet = `.card {
  background: var(--theme-color-card);
  border: 1px solid var(--theme-color-border);
  border-radius: var(--theme-radius-lg);
}`;

/** Documentation root used by the footer link. */
export const docsHome = "https://themvora-dev.vercel.app/";
