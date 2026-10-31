/**
 * Colour swatches for theme tokens.
 *
 * VS Code calls a `DocumentColorProvider` for **every** JSON document, so the
 * first thing this does is reject: the text must look like a theme, and only
 * values reached through a real `tokens.colors.<role>` path become swatches. A
 * hex string in a `description` is not a colour token and gets no swatch.
 *
 * Write-back is deliberately narrow. `provideColorPresentations` returns a
 * `TextEdit` covering exactly the characters of the existing literal, so the key,
 * the quotes, the whitespace, the comments and the other half of a pair are all
 * outside the edit.
 *
 * Accepted forms are `#rgb`, `#rrggbb` and `#rrggbbaa` — what the schema stores.
 * Anything else (named colours, `rgb()`, a malformed value) gets no swatch rather
 * than a guess.
 *
 * @packageDocumentation
 */
import { CORE_COLORS, type ThemeDefinition } from "@themvora/core";
import {
  Color,
  Disposable,
  Range,
  TextEdit,
  languages,
  type ColorPresentation,
  type DocumentColorProvider,
  type TextDocument,
} from "vscode";

import { indexThemeDocument, type ThemeHalf } from "../domain/diagnosticLocator.js";
import { formatHex, parseHex } from "../domain/hexColor.js";
import { parseThemeDocument } from "../domain/themeDocument.js";

/** The languages the extension understands. */
const LANGUAGES = ["json", "jsonc"];

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

/** One theme of a document, paired with the half it came from. */
interface Half {
  readonly half: ThemeHalf;
  readonly theme: ThemeDefinition;
}

/**
 * The themes of a parsed document, with their halves.
 *
 * @param themes - The document's themes.
 * @returns The halves.
 */
function halvesOf(themes: readonly ThemeDefinition[]): Half[] {
  if (themes.length === 1) {
    const only = themes[0];
    return only === undefined ? [] : [{ half: "single", theme: only }];
  }

  const halves: Half[] = [];
  const light = themes[0];
  const dark = themes[1];
  if (light !== undefined) halves.push({ half: "light", theme: light });
  if (dark !== undefined) halves.push({ half: "dark", theme: dark });
  return halves;
}

/**
 * Create the colour provider.
 *
 * Exported so the tests can call it directly, without a registration stub.
 *
 * @returns The provider.
 */
export function createColorProvider(): DocumentColorProvider {
  return {
    provideDocumentColors(document: TextDocument): {
      range: Range;
      color: Color;
    }[] {
      if (!LANGUAGES.includes(document.languageId)) return [];

      const text = document.getText();
      if (!mayBeThemeDocument(text)) return [];

      const parsed = parseThemeDocument(text);
      if (parsed.shape !== "themes") return [];

      const index = indexThemeDocument(parsed.source);
      if (index === null) return [];

      const colors: { range: Range; color: Color }[] = [];

      for (const { half } of halvesOf(parsed.themes)) {
        for (const role of CORE_COLORS) {
          const location = index.locate(["tokens", "colors", role], half);
          if (location.status !== "value") continue;

          const raw = text.slice(location.range.start, location.range.end);
          const rgba = parseHex(raw);
          // A value the schema cannot mean gets no swatch.
          if (rgba === null) continue;

          colors.push({
            range: new Range(
              document.positionAt(location.range.start),
              document.positionAt(location.range.end),
            ),
            color: new Color(rgba.red / 255, rgba.green / 255, rgba.blue / 255, rgba.alpha / 255),
          });
        }
      }

      return colors;
    },

    provideColorPresentations(
      color: Color,
      context: { readonly document: TextDocument; readonly range: Range },
    ): ColorPresentation[] {
      // The picker's colour comes back as 0–1 floats; the schema stores 0–255.
      const hex = formatHex({
        red: color.red * 255,
        green: color.green * 255,
        blue: color.blue * 255,
        alpha: color.alpha * 255,
      });

      return [
        {
          label: hex,
          // Only the literal's own characters — never the key, the quotes or the
          // other half of a pair.
          textEdit: TextEdit.replace(context.range, hex),
        },
      ];
    },
  };
}

/**
 * Register the colour provider.
 *
 * @returns The registration, to be disposed with the extension.
 */
export function registerColorSwatches(): Disposable {
  const provider = createColorProvider();
  const registrations = LANGUAGES.map((language) =>
    languages.registerColorProvider(language, provider),
  );

  return new Disposable(() => {
    for (const registration of registrations) registration.dispose();
  });
}
