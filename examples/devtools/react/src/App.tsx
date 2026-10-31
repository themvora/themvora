import { ThemeInspector } from "@themvora/react";

export default function App() {
  return (
    <main className="page">
      <h1>DevTools inspector example</h1>
      <p>Use the floating button in the bottom-right corner.</p>

      {/*
        The inspector reads the runtime from context. It is a normal component,
        so it can be mounted conditionally, position it, and it can be hidden at
        build time with a flag.
      */}
      <ThemeInspector bottom={104} right={32} />
    </main>
  );
}
