import { EXAMPLE_CSS } from "../../lib/example-ui";

/**
 * The example UI, rendered live.
 *
 * It is not a mock-up: the markup below carries the same classes the guide's
 * snippet shows, styled by `EXAMPLE_CSS`, and every colour resolves through the
 * CSS variables the active theme has already applied to the document. Toggle the
 * site theme and this card follows it, because nothing here knows what a colour
 * is — it only knows which semantic role it plays.
 *
 * The `<style>` element carries `href` + `precedence` so React hoists it into the
 * document head once and dedupes it across the dozen pages that render this
 * component, instead of emitting a copy per page.
 */
export function ThemedExample() {
  return (
    <>
      <style href="themvora-example-ui" precedence="default">
        {EXAMPLE_CSS}
      </style>
      <div className="themvora-example-card">
        <div className="themvora-example-header">
          <h3 className="themvora-example-title">Design system</h3>
          <span className="themvora-example-status">Active</span>
        </div>
        <p className="themvora-example-description">
          Tokens resolve at runtime, so this card follows whichever theme is
          active.
        </p>
        <p className="themvora-example-meta">Updated 2 minutes ago</p>
        <button className="themvora-example-button" type="button">
          View themes
        </button>
      </div>
    </>
  );
}
