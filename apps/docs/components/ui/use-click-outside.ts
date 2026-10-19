import {
  useEffect,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";

type UseClickOutsideProps = {
  rootRef: RefObject<HTMLElement | null>;
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
};

/**
 * True when the press landed on the site's overlay scrollbar.
 *
 * ## The actual cause of the reported bug
 *
 * The overlay engine does not use native scrollbars — it appends its own strip and
 * thumb as **real DOM nodes on `<body>`**, marked `data-themvora-host`. So pressing
 * the thumb is genuinely outside any popover's root, `root.contains(target)` is
 * false, and the list closes.
 *
 * That is why the gutter arithmetic below was not enough: on this site
 * `offsetWidth === clientWidth` (no classic gutter exists), so the thumb was never
 * going to be recognised by geometry. It has to be recognised by identity.
 *
 * Pressing a scrollbar is using the control, not dismissing it — so both the overlay
 * host and a classic gutter count as inside.
 */
function isOverlayScrollbar(target: Node): boolean {
  if (!(target instanceof Element)) return false;
  // The strip root itself, or anything inside it (the thumb is a child).
  return target.closest("[data-themvora-host]") !== null;
}

/**
 * True when a pointer event landed on an element's own classic scrollbar gutter.
 *
 * `offsetWidth` includes the scrollbar and `clientWidth` excludes it, so the gutter
 * is the band of `offsetWidth - clientWidth` on whichever edge the browser puts it.
 * Overlay scrollbars report a zero gutter, so this is a no-op for them — the overlay
 * case is handled by {@link isOverlayScrollbar}.
 */
function isScrollbarPress(event: PointerEvent, el: HTMLElement): boolean {
  const gutterX = el.offsetWidth - el.clientWidth;
  const gutterY = el.offsetHeight - el.clientHeight;

  if (gutterX <= 0 && gutterY <= 0) return false;

  const rect = el.getBoundingClientRect();

  // Vertical scrollbar: a band on the right edge. Both edges are checked so RTL
  // (scrollbar on the left) is covered without a separate branch.
  if (gutterX > 0) {
    if (rect.right - event.clientX <= gutterX) return true;
    if (event.clientX - rect.left <= gutterX) return true;
  }

  // Horizontal scrollbar: a band along the bottom edge.
  if (gutterY > 0) {
    if (rect.bottom - event.clientY <= gutterY) return true;
  }

  return false;
}

/**
 * Closes `open` when the user clicks outside `rootRef` or presses Escape.
 * Used by popovers and dropdowns.
 *
 * A press on a scrollbar — the site's overlay thumb, or a classic gutter — is **not**
 * treated as outside. Dragging a list's scrollbar is using the control, not
 * dismissing it.
 */
export function useClickOutside({
  rootRef,
  open,
  setOpen,
}: UseClickOutsideProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      const root = rootRef.current;
      const target = event.target;
      if (!root || !(target instanceof Node)) return;

      // 1. The overlay scrollbar is a body-level node, so it is outside the root by
      //    construction. Recognised by identity, not geometry.
      if (isOverlayScrollbar(target)) return;

      // 2. A classic gutter, for browsers that have one. The press may land on the
      //    scrollport or a child of it, so every scrollable ancestor is checked.
      let node: Node | null = target;
      while (node && node !== root.parentNode) {
        if (node instanceof HTMLElement && isScrollbarPress(event, node)) return;
        node = node.parentNode;
      }

      if (root.contains(target)) return;

      // 3. A press on a native scrollbar can be reported with the target being the
      //    document rather than the scrollport — so `contains` says "outside" even
      //    though the pointer is visually on the list. Fall back to geometry: if the
      //    press landed inside the root's rect, it was on the control.
      const rect = root.getBoundingClientRect();
      const insideByPosition =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      if (insideByPosition) return;

      setOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open, setOpen, rootRef]);
}
