import { Link } from "react-router";
import type { Route } from "./+types/about";

export function meta({}: Route.MetaArgs) {
  return [{ title: "About · Themvora + React Router" }];
}

export default function About() {
  return (
    <main className="page">
      <header className="header">
        <div>
          <p className="eyebrow">React Router Framework Mode</p>
          <h1>How this app is wired</h1>
        </div>
        <nav>
          <Link to="/">Back to the demo</Link>
        </nav>
      </header>

      <section className="card">
        <h2>One configuration, three layers</h2>
        <p>
          <code>createThemeDocument()</code> receives the registry, the fallback
          theme, the mode and the scrollbar option once. It returns the loader
          helper and the document component that render the blocking head
          script, the <code>&lt;html&gt;</code> shell and the runtime provider.
        </p>
        <p className="muted">
          The root loader resolves the request's cookies against that same
          configuration. If the loader is unavailable, the document falls back to
          the configuration's static resolution instead of failing again.
        </p>
      </section>
    </main>
  );
}
