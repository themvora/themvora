/**
 * `Themvora: Generate Theme…`
 *
 * The smallest complete path through the architecture: a prompt, the canonical
 * generator, a file the CLI can read back, and a report.
 *
 * Three contracts are worth stating explicitly.
 *
 * **Generation is the client's, and the client's is core's.** The command passes
 * a seed; it derives no palette, no contrast solution and no token name. If
 * `generateTheme()` changes, this command changes with it and nothing here needs
 * editing.
 *
 * **The file written is a file the CLI understands.** `{ light, dark }` is the
 * shape `themvora generate --mode both` emits, so the output can be piped
 * straight into `themvora validate`, `themvora inspect` and `themvora export`.
 * That interoperability is the reason the pair is written whole rather than one
 * mode at a time.
 *
 * **The write is coordinated per project root.** Two saves aimed at one project
 * queue behind each other rather than interleaving, while a save in another
 * project proceeds independently.
 *
 * @packageDocumentation
 */
import {
  measureThemeContrast,
  validateTheme,
  validateThemeLevels,
  type GenerationStyle,
  type ThemeDefinition,
} from "@themvora/core";
import { commands, window, type Disposable, type QuickPickItem } from "vscode";

import { asUri } from "./commandArgs.js";
import { saveThemes } from "../services/saveTheme.js";
import { describeContrast, summariseContrast } from "../domain/report.js";
import {
  normaliseSeed,
  SEED_PLACEHOLDER,
  SEED_PROMPT,
  SEED_VALIDATION_MESSAGE,
} from "../domain/seed.js";
import type { ThemvoraClient } from "../services/coreClient.js";
import type { RootSessions } from "../services/rootSessions.js";
import type { DraftRegistry, DraftValidation } from "../services/draftRegistry.js";

/**
 * The command identifier.
 *
 * Must match the `contributes.commands` entry in `package.json`; a unit test
 * asserts the two agree, because a mismatch is a command that exists in the
 * palette and does nothing when invoked.
 */
export const COMMAND_GENERATE_THEME = "themvora.generateTheme";

/** The default file name offered in the save dialog. */

/** What the command needs from the extension. */
export interface GenerateCommandDeps {
  /** The canonical client. */
  readonly client: ThemvoraClient;
  /** Per-root write coordination. */
  readonly sessions: RootSessions;
  /**
   * The preview surface, for showing a generated pair that was not saved.
   *
   * Generation does not have to end in a file: a developer comparing two seeds
   * wants to look, not to write. The Studio's preview already renders a theme
   * that has no document behind it, so the command hands it the pair.
   */
  readonly preview: {
    openThemes(
      themes: readonly ThemeDefinition[],
      label: string,
      mode?: "light" | "dark",
      draftId?: string,
    ): Promise<void>;
  };
  /**
   * The host draft registry.
   *
   * A generated pair is a draft before it is a file. Registering it gives the
   * other commands — compare, copy, validate — something to name, so the theme
   * the command just produced is not reachable only from the panel that is
   * showing it.
   */
  readonly drafts: DraftRegistry;
  /** Called after a successful write, so the project view can re-read. */
  readonly onWritten?: () => void;
}

/**
 * The canonical validation counts a draft records.
 *
 * `valid` is gated by `validateTheme()`, the only rule that decides it; the
 * multilevel findings are advisory and counted separately.
 *
 * @param themes - The generated pair.
 * @returns The counts.
 */
function validationOf(themes: readonly ThemeDefinition[]): DraftValidation {
  const reports = themes.map((theme) => validateTheme(theme));
  return {
    valid: reports.every((report) => report.valid),
    errors: reports.reduce((total, report) => total + report.issues.length, 0),
    warnings: themes.reduce((total, theme) => total + validateThemeLevels(theme).length, 0),
  };
}

/**
 * Register the command.
 *
 * @param deps - The client and coordination the command uses.
 * @returns The registration, for `context.subscriptions`.
 */
export function registerGenerateThemeCommand(deps: GenerateCommandDeps): Disposable {
  return commands.registerCommand(COMMAND_GENERATE_THEME, (seed?: unknown, target?: unknown) =>
    runGenerateTheme(seed, target, deps),
  );
}

/**
 * Prompt for a seed, generate the pair, and save it.
 *
 * Both inputs may be supplied by the caller, which is what makes the command
 * scriptable and testable in a real extension host: `executeCommand` with a seed
 * and a target URI skips both prompts. Called with no arguments — the palette
 * case — it prompts, and every exit is silent on cancellation and explicit on
 * failure.
 *
 * @param seedArgument - A seed to use instead of prompting. Anything that is not
 *   a string is ignored, because the argument comes from an untyped command bus.
 * @param targetArgument - A `Uri` to write to instead of opening the save dialog.
 * @param deps - The client and coordination the command uses.
 */
export async function runGenerateTheme(
  seedArgument: unknown,
  targetArgument: unknown,
  deps: GenerateCommandDeps,
): Promise<void> {
  const input =
    typeof seedArgument === "string"
      ? seedArgument
      : await window.showInputBox({
          prompt: SEED_PROMPT,
          placeHolder: SEED_PLACEHOLDER,
          ignoreFocusOut: true,
          validateInput: (value) =>
            normaliseSeed(value) === null ? SEED_VALIDATION_MESSAGE : undefined,
        });

  // `undefined` is the documented cancellation signal for both prompts.
  if (input === undefined) return;

  const seed = normaliseSeed(input);
  if (seed === null) {
    // The input box validator rejects this, but the command is callable from the
    // command bus with an arbitrary argument, so it is guarded rather than assumed.
    void window.showErrorMessage(SEED_VALIDATION_MESSAGE);
    return;
  }

  // A caller that named a destination is scripting, and a prompt in the middle
  // of a script is a hang. Those calls keep core's defaults and write the file;
  // the interactive path asks, then previews.
  const explicitTarget = asUri(targetArgument);

  let family = "";
  let style: GenerationStyle | null = null;

  if (explicitTarget === undefined) {
    // The family names the themes (`<family>-light`), so it is a slug and not a
    // display label. An empty answer keeps core's default rather than inventing
    // one from a sentence the user typed.
    const answer = await askFamily();
    if (answer === undefined) return;
    family = answer;

    // Only the styles core actually ships are offered: the list comes from the
    // same catalog the generator reads, so an option can never be unsupported.
    const chosen = await askStyle(deps.client);
    if (chosen === undefined) return;
    style = chosen;
  }

  const generated = await deps.client.generate({
    seed,
    ...(family === "" ? {} : { family }),
    ...(style === null ? {} : { style }),
  });
  if (!generated.ok || generated.value === null) {
    // The client preserves core's diagnostic; the command only decides how to
    // show it. A usage error and an engine failure read differently to the user.
    const detail = generated.errors[0]?.message ?? generated.reason ?? "unknown error";
    void window.showErrorMessage(`Themvora could not generate a theme: ${detail}`);
    return;
  }

  const pair = generated.value;
  const light = describeContrast(summariseContrast(measureThemeContrast(pair.light)));
  const dark = describeContrast(summariseContrast(measureThemeContrast(pair.dark)));

  // A caller that named a destination asked for a file. Everyone else asked to
  // see a theme, so the pair opens in the preview and nothing is written.
  if (explicitTarget === undefined) {
    // The pair becomes a draft with a stable id before it is shown, so the
    // Preview, Compare, Copy and Validate all address the same theme rather
    // than each holding a copy of the array.
    const draft = deps.drafts.create({
      // A seed has no folder: nothing here ties the draft to a workspace.
      scope: { kind: "standalone" },
      // The family is what a person calls the pair; the variant name already
      // ends in its mode.
      name: pair.light.meta?.family ?? pair.light.name,
      ...(pair.light.meta?.family === undefined ? {} : { family: pair.light.meta.family }),
      origin: "generated",
      themes: [pair.light, pair.dark],
      ...(pair.light.meta?.mode === undefined ? {} : { mode: pair.light.meta.mode }),
      ...(family === "" ? {} : { inputs: { seed, family } }),
      baseline: [pair.light, pair.dark],
      validation: validationOf([pair.light, pair.dark]),
    });

    await deps.preview.openThemes(
      [pair.light, pair.dark],
      "generated draft",
      "light",
      draft.ok ? draft.draft.id : undefined,
    );
    void window.showInformationMessage(
      `Themvora: generated ${pair.light.name} and ${pair.dark.name} as an unsaved draft — ` +
        `light ${light}; dark ${dark}. Save from the Studio when you want a file.`,
    );
    return;
  }

  const outcome = await saveThemes({
    themes: [pair.light, pair.dark],
    sessions: deps.sessions,
    target: explicitTarget,
    onWritten: () => deps.onWritten?.(),
  });

  if (!outcome.ok) {
    // Cancellation is silent: the user closed the dialog, nothing was lost.
    if (outcome.reason === "failed") {
      void window.showErrorMessage(`Themvora could not write the theme: ${outcome.message}`);
    }
    return;
  }

  void window.showInformationMessage(
    `Saved ${pair.light.name} and ${pair.dark.name} to ${outcome.path} — light ${light}; dark ${dark}`,
  );
}

/** What a family may look like, since it becomes part of the theme name. */
const FAMILY_PATTERN = /^[a-z0-9][a-z0-9-]*$/u;

/**
 * Ask for the family, if the user wants to name one.
 *
 * @returns The family (possibly empty, meaning core's default), or `undefined`
 *   when the prompt was dismissed.
 */
async function askFamily(): Promise<string | undefined> {
  const answer = await window.showInputBox({
    prompt: "Theme family (optional) — the name the themes are generated under",
    placeHolder: "generated",
    ignoreFocusOut: true,
    validateInput: (value) => {
      const trimmed = value.trim();
      if (trimmed === "") return undefined;
      return FAMILY_PATTERN.test(trimmed)
        ? undefined
        : "Use lowercase letters, digits and dashes, starting with a letter or digit.";
    },
  });

  return answer === undefined ? undefined : answer.trim();
}

/** One style option, carrying the value core accepts. */
interface StyleItem extends QuickPickItem {
  readonly style?: GenerationStyle;
}

/**
 * Ask for the generation style, from the styles core actually ships.
 *
 * @param client - The canonical client.
 * @returns The style, `null` for the generator's default, or `undefined` when
 *   the prompt was dismissed.
 */
async function askStyle(client: ThemvoraClient): Promise<GenerationStyle | null | undefined> {
  const catalog = await client.catalog();
  // Without a catalog there is no verified list, and offering a guessed one is
  // how a command ends up passing a style core rejects. The default it is.
  if (!catalog.ok || catalog.value === null || catalog.value.styles.length === 0) return null;

  const items: StyleItem[] = [
    { label: "Default", description: "core's default style" },
    ...catalog.value.styles.map((style) => ({ label: style, style })),
  ];

  const picked = await window.showQuickPick(items, {
    title: "Generation style",
    placeHolder: "How the palette is balanced",
  });

  if (picked === undefined) return undefined;
  return picked.style ?? null;
}
