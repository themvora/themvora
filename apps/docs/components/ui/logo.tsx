import React from "react";

interface ThemvoraLogoProps {
  size?: number; // controls icon height + scales wordmark font-size proportionally
}

const ThemvoraLogo = ({ size = 42 }: ThemvoraLogoProps) => {
  return (
    <div
      className="flex items-center gap-2.5 no-underline shrink-0"
      style={{ height: size }}
    >
      {/* Icon SVG.
          `--docs-accent`, not `--theme-color-primary`: the mark is the one place
          the brand colour is allowed to be decoration, so it is the one place
          that has to *survive* a brand anchor that cannot stand off the canvas.
          In `slack-dark` the raw aubergine is 1.42:1, which left the mark
          invisible beside a wordmark painted in `foreground`. The accent
          resolves to `primary` for every theme where that value already reads,
          so nothing moves except the themes that needed it — see
          `lib/chrome-accent.ts`. */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 42 42"
        className="shrink-0"
      >
        <rect
          x="2"
          y="2"
          width="38"
          height="38"
          rx="10"
          fill="none"
          stroke="var(--docs-accent)"
          strokeWidth="2"
        />
        <circle
          cx="14"
          cy="27"
          r="6"
          fill="var(--docs-accent)"
          opacity="1"
        />
        <circle
          cx="22"
          cy="16"
          r="5"
          fill="var(--docs-accent)"
          opacity="0.65"
        />
        <circle
          cx="29"
          cy="25"
          r="4"
          fill="var(--docs-accent)"
          opacity="0.35"
        />
      </svg>

      {/* Wordmark — text clipped to theme gradient, container stays transparent.
          Font family cascades from the <html> CSS variable (`--font-outfit`,
          declared in the server layout) so the class hash is never duplicated
          across the server and client bundles. */}
      {/* The wordmark is `foreground`, not the brand colour.
          A wordmark is text: people read it. Painting it in `primary` asks the
          brand colour to be a reading colour, which it is not — in Slack dark
          `primary` on the canvas is 1.42:1, so the product's own name is the
          least legible thing in its header. The brand survives in the mark
          beside it, which is where it belongs: a logo is decoration, a name is
          reading. */}
      <span
        className="block leading-none select-none"
        style={{
          fontSize: size * 0.62,
          fontWeight: 700,
          fontFamily: "var(--font-outfit), ui-sans-serif, system-ui, sans-serif",
          letterSpacing: "0.02em",
          color: "var(--theme-color-foreground)",
        }}
      >
        themvora
      </span>
    </div>
  );
};

export default ThemvoraLogo;
