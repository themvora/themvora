// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as core from "@themvora/core";
import type { ThemeDefinition } from "@themvora/core";
import { ThemeProvider, ThemeScrollbar } from "../src";

/**
 * The overlay engine resolves its options once, at construction, so "an option
 * changed" can only mean "the overlay was rebuilt". Counting engine calls is
 * therefore the honest way to prove the React `ThemeScrollbar` reacts to prop
 * changes after mount — no reload, no provider remount.
 */
vi.mock("@themvora/core", async (importOriginal) => {
  const actual = await importOriginal<typeof core>();
  return {
    ...actual,
    createOverlayScrollbar: vi.fn(actual.createOverlayScrollbar),
  };
});

const themes: ThemeDefinition[] = [
  {
    name: "plain-light",
    meta: { family: "plain", mode: "light" },
    tokens: { colors: { background: "#ffffff", primary: "#2563eb" } },
  },
];

const engine = () =>
  core.createOverlayScrollbar as unknown as ReturnType<typeof vi.fn>;

function createHarness() {
  const runtime = core.createThemeRuntime({
    themes,
    dom: false,
    cssVariables: false,
    persistence: null,
    broadcast: null,
  } as never);

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  const render = (props: Record<string, unknown>) => {
    act(() => {
      root.render(
        <ThemeProvider runtime={runtime as never} dom={false} cssVariables={false}>
          <ThemeScrollbar {...(props as never)} />
        </ThemeProvider>,
      );
    });
  };

  return {
    runtime,
    render,
    cleanup: () => {
      act(() => root.unmount());
      document.body.removeChild(container);
      runtime.destroy();
    },
  };
}

beforeEach(() => {
  engine().mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("React ThemeScrollbar — reactive behavior props", () => {
  it("creates the overlay with the options it is given", () => {
    const harness = createHarness();
    harness.render({ appearance: { thickness: 6 }, behavior: { autoHide: true } });

    expect(engine()).toHaveBeenCalledTimes(1);
    expect(engine().mock.calls[0]![1]).toMatchObject({
      thickness: 6,
      autoHide: true,
    });

    harness.cleanup();
  });

  it("rebuilds the overlay when a behavior prop changes", () => {
    const harness = createHarness();
    harness.render({ appearance: { thickness: 6 } });
    expect(engine()).toHaveBeenCalledTimes(1);

    harness.render({ appearance: { thickness: 14 } });

    expect(engine()).toHaveBeenCalledTimes(2);
    expect(engine().mock.calls[1]![1]).toMatchObject({ thickness: 14 });

    harness.cleanup();
  });

  it("destroys the previous overlay before creating the replacement", () => {
    const harness = createHarness();
    harness.render({ appearance: { thickness: 6 } });

    const first = engine().mock.results[0]!.value as { destroy(): void };
    const destroy = vi.spyOn(first, "destroy");

    harness.render({ appearance: { thickness: 10 } });

    // Exactly one overlay is alive: the old one was torn down, the new one
    // built — never two overlays on the same document.
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(engine()).toHaveBeenCalledTimes(2);

    harness.cleanup();
  });

  it("does not rebuild for an unrelated re-render or a repeated value", () => {
    const harness = createHarness();
    harness.render({ appearance: { thickness: 6 }, behavior: { autoHide: false } });
    expect(engine()).toHaveBeenCalledTimes(1);

    // Same props again: the derived options key is unchanged, so the effect
    // does not re-run and no second overlay is built.
    harness.render({ appearance: { thickness: 6 }, behavior: { autoHide: false } });
    expect(engine()).toHaveBeenCalledTimes(1);

    // `children` never reaches the engine, so changing it must not rebuild.
    harness.render({ appearance: { thickness: 6 }, behavior: { autoHide: false }, children: <span /> });
    expect(engine()).toHaveBeenCalledTimes(1);

    harness.cleanup();
  });

  it("hands the engine the live runtime store so theme changes follow", () => {
    const harness = createHarness();
    harness.render({ appearance: { thickness: 8 } });

    // The engine is given the runtime's *store*, not a snapshot of resolved
    // colours, so a later theme change re-resolves the thumb colour from the
    // new theme's tokens instead of freezing the first one.
    const [store] = engine().mock.calls[0]!;
    expect(store).toBe(harness.runtime.store);
    expect((store as typeof harness.runtime.store).get().name).toBe("plain-light");

    harness.cleanup();
  });
});

describe("React ThemeScrollbar — grouped API", () => {
  it("resolves behavior, appearance, scope and icons into engine options", () => {
    const harness = createHarness();
    harness.render({
      behavior: { autoHide: false, smooth: true },
      appearance: { thickness: 12, radius: 4 },
      scope: { include: [".panel"], exclude: [".raw"] },
      icons: { size: 14 },
    });

    const opts = engine().mock.calls[0]![1] as Record<string, unknown>;
    expect(opts).toMatchObject({
      autoHide: false,
      smooth: true,
      thickness: 12,
      radius: 4,
      include: [".panel"],
      exclude: [".raw"],
      iconSize: 14,
    });
    // The groups are structural — they never reach the engine.
    expect(opts.behavior).toBeUndefined();
    expect(opts.appearance).toBeUndefined();
    expect(opts.scope).toBeUndefined();
    expect(opts.icons).toBeUndefined();

    harness.cleanup();
  });


  it("applies a new icons.size without reloading", () => {
    const harness = createHarness();
    harness.render({ icons: { size: 8 } });
    expect(engine().mock.calls[0]![1]).toMatchObject({ iconSize: 8 });

    harness.render({ icons: { size: 16 } });
    expect(engine()).toHaveBeenCalledTimes(2);
    expect(engine().mock.calls[1]![1]).toMatchObject({ iconSize: 16 });

    harness.cleanup();
  });

  it("detects a changed prop on an existing icon component", () => {
    const harness = createHarness();
    const Chevron = ({ dir }: { dir: string }) => <svg data-dir={dir} />;

    harness.render({ icons: { up: <Chevron dir="up" /> } });
    expect(engine()).toHaveBeenCalledTimes(1);

    // Same component type, different props: the old key serializer collapsed
    // both to "el:Chevron" and missed this, leaving the stale icon mounted.
    harness.render({ icons: { up: <Chevron dir="down" /> } });
    expect(engine()).toHaveBeenCalledTimes(2);

    harness.cleanup();
  });
});
