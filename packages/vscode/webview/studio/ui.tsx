/**
 * Shared Studio view primitives: one icon set, the segmented control, the brand
 * mark, swatch dots and a focus trap. Presentation only; no host access.
 */
import { useEffect, useRef, type KeyboardEvent, type ReactNode, type RefObject } from "react";

/** Every icon in the one Studio icon set (24 grid, 1.8 stroke, round caps). */
const ICON_PATHS = {
  themes: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  sources: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4",
  consumers: "M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 7.5l6.8 9M15 6H9",
  plus: "M12 5v14M5 12h14",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01",
  alert: "M12 3 2.5 20h19zM12 10v4M12 17h.01",
  check: "M5 12.5l4.5 4.5L19 7.5",
  close: "M6 6l12 12M18 6 6 18",
  copy: "M9 9h11v11H9zM5 15H4V4h11v1",
  braces: "M8 4H7a2 2 0 0 0-2 2v3a2 2 0 0 1-2 2v0a2 2 0 0 1 2 2v3a2 2 0 0 0 2 2h1M16 4h1a2 2 0 0 1 2 2v3a2 2 0 0 0 2 2v0a2 2 0 0 0-2 2v3a2 2 0 0 1-2 2h-1",
  chevronDown: "M6 9l6 6 6-6",
  chevronRight: "M9 6l6 6-6 6",
  sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  moon: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z",
  monitor: "M4 4h16v12H4zM8 20h8M12 16v4",
  palette: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM8 10h.01M12 7h.01M15 10h.01",
  external: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  save: "M12 4v11M7 10l5 5 5-5M5 20h14",
  code: "M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14",
  reset: "M4 12a8 8 0 1 0 2.3-5.7L4 8.5M4 4v4.5h4.5",
  dots: "M5 12h.01M12 12h.01M19 12h.01",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z",
  layers: "M12 3 2 8l10 5 10-5zM2 13l10 5 10-5",
} as const;

/** The icon names. */
export type IconName = keyof typeof ICON_PATHS;

/** Valid icon names for external consumers that need a narrower set. */
export const ICON_NAMES = Object.keys(ICON_PATHS) as IconName[];

/**
 * One stroke icon. Always decorative: the owning control carries the label.
 *
 * @param props - The icon name and optional size.
 * @returns The icon.
 */
export function Icon({ name, size = 16 }: { readonly name: IconName; readonly size?: number }): React.JSX.Element {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

/**
 * The Themvora mark: the ring and three discs from `media/themvora.svg`.
 *
 * The geometry is the icon's, not an approximation of it — the same ring, the
 * same three discs at the same coordinates and the same three alphas — so the
 * header and the Activity Bar show one logo rather than two that resemble each
 * other. It is drawn in `currentColor` so it can follow the appearance instead
 * of being pinned to one indigo that disappears on a dark header.
 *
 * @param props - `size` in pixels; `title` when it stands alone as the logo.
 * @returns The mark.
 */
export function BrandMark({
  size = 26,
  title,
}: {
  readonly size?: number;
  readonly title?: string;
}): React.JSX.Element {
  return (
    <span
      className="brand-mark"
      style={{ width: size, height: size }}
      {...(title === undefined ? { "aria-hidden": "true" as const } : { role: "img", "aria-label": title })}
    >
      <svg viewBox="0 0 128 128" width={size} height={size} focusable="false">
        <rect x="6.5" y="6.5" width="115" height="115" rx="26" fill="none" stroke="currentColor" strokeWidth="7" />
        <circle cx="42.5" cy="81.5" r="18" fill="currentColor" />
        <circle cx="66.5" cy="48.5" r="15" fill="currentColor" fillOpacity="0.65" />
        <circle cx="88" cy="75.5" r="11.5" fill="currentColor" fillOpacity="0.4" />
      </svg>
    </span>
  );
}

/** One option of a segmented control. */
export interface SegmentOption<T extends string> {
  readonly value: T;
  readonly label: ReactNode;
  readonly title?: string;
  readonly ariaLabel?: string;
}

/**
 * A segmented control exposed as a radio group with roving focus and arrow keys.
 *
 * @param props - Options, value and change handler.
 * @returns The control.
 */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  size = "md",
  className,
}: {
  readonly label: string;
  readonly value: T | undefined;
  readonly options: readonly SegmentOption<T>[];
  readonly onChange: (value: T) => void;
  readonly size?: "sm" | "md";
  readonly className?: string;
}): React.JSX.Element {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    const last = options.length - 1;
    const next =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? index === last ? 0 : index + 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? index === 0 ? last : index - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : undefined;
    if (next === undefined) return;
    event.preventDefault();
    const option = options[next];
    if (option === undefined) return;
    onChange(option.value);
    refs.current[next]?.focus();
  };

  return (
    <div
      className={`segmented${size === "sm" ? " sm" : ""}${className === undefined ? "" : ` ${className}`}`}
      role="radiogroup"
      aria-label={label}
    >
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={index === current ? 0 : -1}
            title={option.title}
            aria-label={option.ariaLabel}
            data-value={option.value}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Up to three overlapping swatch dots.
 *
 * @param props - Colours and optional size class.
 * @returns The dots.
 */
export function SwatchDots({
  colors,
  max = 3,
}: {
  readonly colors: readonly string[];
  readonly max?: number;
}): React.JSX.Element {
  const shown = colors.slice(0, max);
  return (
    <span className="swatch-dots" aria-hidden="true">
      {shown.length === 0 ? (
        <span className="swatch-dot empty" />
      ) : (
        shown.map((color, index) => (
          <span key={`${color}:${index}`} className="swatch-dot" style={{ background: color }} />
        ))
      )}
    </span>
  );
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/**
 * Keep Tab focus inside a modal surface and restore focus when it closes.
 *
 * @param ref - The modal element.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const root = ref.current;
    if (root === null) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!root.contains(document.activeElement)) {
      const first = root.querySelector<HTMLElement>("[autofocus]") ?? root.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? root).focus();
    }

    const onKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key !== "Tab") return;
      const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (element) => element.offsetParent !== null || element === document.activeElement,
      );
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (event.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    root.addEventListener("keydown", onKeyDown);
    return () => {
      root.removeEventListener("keydown", onKeyDown);
      if (previous !== null && previous.isConnected) previous.focus();
    };
  }, [ref]);
}
