import type { ReactNode } from "react";

/**
 * A product screenshot that follows the documentation site's light/dark mode.
 *
 * Two genuine captures of the same screen are stacked in one box and the
 * provider's resolved `.dark` class on `<html>` decides which is visible (see
 * `.shot-pair` in `globals.css`). That keeps the swap in CSS: it happens with the
 * theme transition, needs no hydration, cannot flash the wrong variant on first
 * paint, and cannot shift the layout because the box is sized by `aspect-ratio`.
 *
 * The hidden variant is `visibility: hidden`, which also removes it from the
 * accessibility tree, so only one description is ever announced.
 */
export function ThemeShot({
  light,
  dark,
  alt,
  caption,
  width = 1920,
  height = 1020,
  priority = false,
}: {
  /** Light-mode capture. */
  readonly light: string;
  /** Dark-mode capture of the same screen. */
  readonly dark: string;
  /** What the screenshot shows, for assistive technology. */
  readonly alt: string;
  /** A sentence on what the reader can do in the image. */
  readonly caption?: ReactNode;
  readonly width?: number;
  readonly height?: number;
  /** Load eagerly — only for the first image on the page. */
  readonly priority?: boolean;
}) {
  const loading = priority ? "eager" : "lazy";

  return (
    <figure className="my-6">
      <div
        className="shot-pair rounded-xl border border-border bg-muted/30"
        style={{ aspectRatio: `${width} / ${height}` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="shot-light"
          src={light}
          alt={alt}
          width={width}
          height={height}
          loading={loading}
          decoding="async"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="shot-dark"
          src={dark}
          alt={alt}
          width={width}
          height={height}
          loading={loading}
          decoding="async"
        />
      </div>
      {caption === undefined ? null : (
        <figcaption className="mt-2 text-xs opacity-60 leading-relaxed">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
