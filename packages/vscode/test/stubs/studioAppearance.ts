/**
 * An in-memory Studio appearance port for panel tests.
 *
 * The production port is backed by `context.globalState`; tests only need the
 * same contract, plus a way to read back what the panel wrote.
 */
import type { StudioAppearance } from "../../src/shared/studioProtocol";

/** A writable appearance port with its current value exposed. */
export interface MemoryAppearance {
  readonly read: () => StudioAppearance;
  readonly write: (appearance: StudioAppearance) => Thenable<void>;
  /** The last value written, or the initial one. */
  readonly current: () => StudioAppearance;
}

/**
 * Build an in-memory appearance port.
 *
 * @param initial - The stored value to start from.
 * @returns The port.
 */
export function memoryAppearance(initial: StudioAppearance = "auto"): MemoryAppearance {
  let value = initial;
  return {
    read: () => value,
    write: async (appearance) => {
      value = appearance;
    },
    current: () => value,
  };
}
