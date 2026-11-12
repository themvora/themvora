export function WorkspaceCard() {
  return (
    <div className="themvora-example-card">
      <div className="themvora-example-header">
        <h3 className="themvora-example-title">Design system</h3>
        <span className="themvora-example-status">Active</span>
      </div>
      <p className="themvora-example-description">
        Tokens resolve at runtime, so this card follows whichever theme is active.
      </p>
      <p className="themvora-example-meta">Updated 2 minutes ago</p>
      <button className="themvora-example-button" type="button">
        View themes
      </button>
    </div>
  );
}
