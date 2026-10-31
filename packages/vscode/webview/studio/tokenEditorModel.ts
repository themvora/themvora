/**
 * Pure helpers for the token editor: search, swatches, presence and the native
 * picker value. Kept out of React so they can be tested in Node.
 */
import type { StudioEditorGroup, StudioEditorToken } from "../../src/shared/studioProtocol";

/**
 * A stable key for a token path.
 *
 * @param path - The token path.
 * @returns The key.
 */
export function editorTokenKey(path: readonly string[]): string {
  return path.join("\u001f");
}

/**
 * Filter groups and tokens by a search query.
 *
 * A group match keeps all its tokens; otherwise only matching tokens are kept.
 * The query is compared with the token name, label, group id and path.
 *
 * @param groups - The editor groups.
 * @param query - The raw search text.
 * @returns Groups with at least one match.
 */
export function filterEditorGroups(
  groups: readonly StudioEditorGroup[],
  query: string,
): readonly StudioEditorGroup[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return groups;

  return groups.flatMap((group) => {
    const groupMatches =
      group.id.toLowerCase().includes(needle) ||
      group.label.toLowerCase().includes(needle) ||
      group.description.toLowerCase().includes(needle);
    const tokens = groupMatches
      ? group.tokens
      : group.tokens.filter((token) =>
          [token.name, token.label, token.path.join("."), group.label]
            .join(" ")
            .toLowerCase()
            .includes(needle),
        );
    return tokens.length === 0 ? [] : [{ ...group, tokens }];
  });
}

/**
 * The first few colour values in a group, for its header strip.
 *
 * @param group - The group.
 * @param limit - Maximum colours.
 * @returns Colour values in token order.
 */
export function groupSwatches(group: StudioEditorGroup, limit = 4): readonly string[] {
  return group.tokens
    .filter((token) => token.type === "color" && token.value !== undefined)
    .map((token) => token.value as string)
    .slice(0, limit);
}

/**
 * The modes a token exists in, as a readable phrase.
 *
 * @param token - The editor token.
 * @returns E.g. `Light + Dark`, `Light only`.
 */
export function presenceLabel(token: StudioEditorToken): string {
  if (token.presentIn.length === 0) return "not set";
  if (token.presentIn.length === 1) return `${token.presentIn[0]} only`;
  return token.presentIn.map((mode) => mode.charAt(0).toUpperCase() + mode.slice(1)).join(" + ");
}

/**
 * The value a native colour picker can represent.
 *
 * Only opaque hex is accepted. Nested alpha or functional CSS colours keep the
 * text input; the picker is not shown for them rather than coerce the value.
 *
 * @param value - The CSS colour string.
 * @returns `#rrggbb`, or undefined.
 */
export function opaqueHex(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const hex = value.trim();
  if (/^#[0-9a-f]{6}$/iu.test(hex)) return hex;
  if (/^#[0-9a-f]{3}$/iu.test(hex)) {
    return `#${hex[1]!}${hex[1]!}${hex[2]!}${hex[2]!}${hex[3]!}${hex[3]!}`;
  }
  if (/^#[0-9a-f]{8}$/iu.test(hex)) return hex.slice(0, 7);
  return undefined;
}
