"use client";

import { useRef, type KeyboardEvent } from "react";

import type { CodeLanguageId, CodeVariant } from "../../lib/code-variants";

/**
 * `TypeScript | JavaScript` for one code block.
 *
 * A radio group rather than a tablist: there is exactly one code pane, and the
 * control chooses which source fills it. Tabs would promise two panels and
 * `aria-controls` would point at something that does not exist — and a second
 * panel is precisely what must not happen, because the unselected snippet would
 * then sit in the accessibility tree as hidden-but-present text that a screen
 * reader user could still reach.
 *
 * Selection follows focus (the standard radio-group behaviour), so arrow keys
 * both move and apply. That is the right trade here: the choice is cheap,
 * instantly reversible, and shows its result in the same block.
 */
export function CodeLanguageSwitch({
  variants,
  value,
  onChange,
  label,
}: {
  variants: readonly CodeVariant[];
  value: CodeLanguageId;
  onChange: (language: CodeLanguageId) => void;
  /** Accessible name — names the file when there is one. */
  label: string;
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (from: number, delta: number) => {
    const next = (from + delta + variants.length) % variants.length;
    const variant = variants[next];
    if (!variant) return;
    onChange(variant.id);
    buttons.current[next]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>, index: number) => {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        move(index, 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        move(index, -1);
        break;
      case "Home":
        event.preventDefault();
        move(0, 0);
        break;
      case "End":
        event.preventDefault();
        move(variants.length - 1, 0);
        break;
      default:
        break;
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="code-lang-switch"
      onClick={(event) => event.stopPropagation()}
    >
      {variants.map((variant, index) => {
        const selected = variant.id === value;
        return (
          <button
            key={variant.id}
            ref={(element) => {
              buttons.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            className="code-lang-option"
            data-code-language={variant.id}
            onKeyDown={(event) => onKeyDown(event, index)}
            onClick={() => onChange(variant.id)}
          >
            {variant.label}
          </button>
        );
      })}
    </div>
  );
}
