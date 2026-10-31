/**
 * Semantic-role documentation on hover.
 *
 * All the content comes from core: `SEMANTIC_ROLE_GROUPS` for what a role is
 * part of, `describeRoleUsage()` for what it may and may not be used for, and
 * `measureThemeContrast()` for its contrast pairs. Nothing here decides what a
 * role means.
 *
 * Two guards keep it honest:
 *
 * - **The document must be a theme.** A JSON file with a `primary` key that is
 *   not a Themvora theme gets no hover at all.
 * - **The half must be the one under the cursor.** A pair declares `primary`
 *   twice; showing the light value while the cursor sits in the dark theme would
 *   be a confident wrong answer.
 *
 * @packageDocumentation
 */
import {
  CORE_COLORS,
  SEMANTIC_ROLE_GROUPS,
  describeRoleUsage,
  measureThemeContrast,
  validateTheme,
  type CoreColor,
  type ThemeDefinition,
} from "@themvora/core";
import {
  Disposable,
  Hover,
  MarkdownString,
  languages,
  type HoverProvider,
  type Position,
  type TextDocument,
} from "vscode";

import { indexThemeDocument, type ThemeHalf } from "../domain/diagnosticLocator.js";
import { parseThemeDocument } from "../domain/themeDocument.js";

/** The languages the extension understands. */
const LANGUAGES = ["json", "jsonc"];

/** A role name: a camelCase word. */
const WORD = /[A-Za-z][A-Za-z0-9]*/;

/**
 * A cheap pre-check, matching the diagnostic collection's.
 *
 * @param text - The document text.
 * @returns `true` when a full parse is worth attempting.
 */
function mayBeThemeDocument(text: string): boolean {
  if (/"tokens"\s*:/.test(text)) return true;
  return /"light"\s*:/.test(text) && /"dark"\s*:/.test(text);
}

/**
 * The role a word names, if any.
 *
 * @param word - The word under the cursor.
 * @returns The role, or `undefined`.
 */
function roleOf(word: string): CoreColor | undefined {
  return (CORE_ROLES as readonly string[]).includes(word) ? (word as CoreColor) : undefined;
}

/** Every core role, for membership tests. */
const CORE_ROLES = CORE_COLORS;

/**
 * The theme half the cursor is inside.
 *
 * @param index - The document index.
 * @param offset - The cursor's character offset.
 * @param halves - The halves the document could have.
 * @returns The matching half, or `undefined` when the cursor is outside them.
 */
function halfAt(
  index: ReturnType<typeof indexThemeDocument>,
  offset: number,
  halves: readonly ThemeHalf[],
): ThemeHalf | undefined {
  if (index === null) return undefined;

  for (const half of halves) {
    const range = index.halfRange(half);
    if (range !== null && offset >= range.start && offset <= range.end) return half;
  }

  return undefined;
}

/**
 * Build the hover body.
 *
 * @param role - The role.
 * @param theme - The theme it belongs to.
 * @param half - Which theme of the document.
 * @returns Markdown.
 */
function buildHover(role: CoreColor, theme: ThemeDefinition, half: ThemeHalf): MarkdownString {
  const group = SEMANTIC_ROLE_GROUPS.find((candidate) =>
    (candidate.roles as readonly string[]).includes(role),
  );

  const value = (theme.tokens?.colors as Record<string, string | undefined> | undefined)?.[role];

  const markdown = new MarkdownString();
  markdown.appendMarkdown(`**\`${role}\`**`);
  if (half !== "single") markdown.appendMarkdown(` — ${half}`);
  markdown.appendMarkdown("\n\n");

  if (group !== undefined) {
    markdown.appendMarkdown(`${group.label}. ${group.description}\n\n`);
  }

  markdown.appendMarkdown(
    value === undefined ? "Not defined by this theme.\n\n" : `Current value: \`${value}\`\n\n`,
  );

  const usage = describeRoleUsage(role);
  if (usage.supported.length > 0) {
    markdown.appendMarkdown("**Intended for**\n");
    for (const line of usage.supported) markdown.appendMarkdown(`- ${line}\n`);
    markdown.appendMarkdown("\n");
  }
  if (usage.restricted.length > 0) {
    markdown.appendMarkdown("**Not intended for**\n");
    for (const line of usage.restricted) markdown.appendMarkdown(`- ${line}\n`);
    markdown.appendMarkdown("\n");
  }

  // Contrast only when core considers the theme valid: showing pair ratios from a
  // theme core has rejected would imply a confidence the data does not support.
  if (validateTheme(theme).valid) {
    const pairs = measureThemeContrast(theme).filter(
      (pair) => pair.foreground === role || pair.background === role,
    );

    if (pairs.length > 0) {
      markdown.appendMarkdown("**Contrast**\n");
      for (const pair of pairs) {
        const verdict = pair.passes ? "passes" : "fails";
        markdown.appendMarkdown(
          `- on \`${pair.foreground === role ? pair.background : pair.foreground}\`: ` +
            `${pair.ratio.toFixed(2)}:1 — ${verdict} ${pair.requirement}\n`,
        );
      }
    }
  }

  return markdown;
}

/**
 * Create the hover provider.
 *
 * Exported so the tests can call it directly, without a registration stub.
 *
 * @returns The provider.
 */
export function createRoleHoverProvider(): HoverProvider {
  return {
    provideHover(document: TextDocument, position: Position): Hover | undefined {
      if (!LANGUAGES.includes(document.languageId)) return undefined;

      const text = document.getText();
      if (!mayBeThemeDocument(text)) return undefined;

      const parsed = parseThemeDocument(text);
      if (parsed.shape !== "themes") return undefined;

      const wordRange = document.getWordRangeAtPosition(position, WORD);
      if (wordRange === undefined) return undefined;

      const role = roleOf(document.getText(wordRange));
      if (role === undefined) return undefined;

      const index = indexThemeDocument(parsed.source);
      const offset = document.offsetAt(position);

      const halves: ThemeHalf[] =
        parsed.themes.length === 1 ? ["single"] : ["light", "dark"];
      const half = halfAt(index, offset, halves) ?? halves[0];
      if (half === undefined) return undefined;

      const theme =
        half === "light" ? parsed.themes[0] : half === "dark" ? parsed.themes[1] : parsed.themes[0];
      if (theme === undefined) return undefined;

      return new Hover(buildHover(role, theme, half), wordRange);
    },
  };
}

/**
 * Register the hover provider.
 *
 * @returns The registration, to be disposed with the extension.
 */
export function registerRoleHover(): Disposable {
  const provider = createRoleHoverProvider();
  const registrations = LANGUAGES.map((language) =>
    languages.registerHoverProvider(language, provider),
  );

  return new Disposable(() => {
    for (const registration of registrations) registration.dispose();
  });
}
