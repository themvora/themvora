/**
 * Scrollbar arrow icons as SVG markup strings, for the string-based adapters
 * (Vue, Svelte, Angular, Nuxt, Astro, Solid, Web Components).
 *
 * React is **not** one of them: `ThemeScrollbar`'s `icons` prop is a
 * `ReactNode`, so a string here becomes a text node and the arrow buttons
 * render the literal `<svg …>` markup — a stray character at an 8 px glyph
 * size. React apps define the same glyphs as JSX instead; see
 * `examples/apps/remix/app/components/scrollbar-icons.tsx` (and the matching
 * module in `examples/apps/nextjs`).
 */

export const arrowUp =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><g fill="currentColor"><path fill-rule="evenodd" d="M12 20.75C12.4142 20.75 12.75 20.4142 12.75 20L12.75 10.75L11.25 10.75L11.25 20C11.25 20.4142 11.5858 20.75 12 20.75Z" clip-rule="evenodd" opacity=".5"/><path d="M6.00002 10.75C5.69667 10.75 5.4232 10.5673 5.30711 10.287C5.19103 10.0068 5.25519 9.68417 5.46969 9.46967L11.4697 3.46967C11.6103 3.32902 11.8011 3.25 12 3.25C12.1989 3.25 12.3897 3.32902 12.5304 3.46967L18.5304 9.46967C18.7449 9.68417 18.809 10.0068 18.6929 10.287C18.5768 10.5673 18.3034 10.75 18 10.75L6.00002 10.75Z"/></g></svg>';

export const arrowDown =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><g fill="currentColor"><path fill-rule="evenodd" d="M12 3.25C12.4142 3.25 12.75 3.58579 12.75 4L12.75 13.25H11.25L11.25 4C11.25 3.58579 11.5858 3.25 12 3.25Z" clip-rule="evenodd" opacity=".5"/><path d="M6.00002 13.25C5.69667 13.25 5.4232 13.4327 5.30711 13.713C5.19103 13.9932 5.25519 14.3158 5.46969 14.5303L11.4697 20.5303C11.6103 20.671 11.8011 20.75 12 20.75C12.1989 20.75 12.3897 20.671 12.5304 20.5303L18.5304 14.5303C18.7449 14.3158 18.809 13.9932 18.6929 13.713C18.5768 13.4327 18.3034 13.25 18 13.25L6.00002 13.25Z"/></g></svg>';

/** The `icons` group for `ThemeScrollbar`, matching the reference (up/down, size 8). */
export const scrollbarIcons = {
  up: arrowUp,
  down: arrowDown,
  size: 8,
};
