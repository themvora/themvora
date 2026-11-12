# Themvora + React Router Framework Mode

Runnable parity app for the React Router Framework Mode integration, created from
the official `create-react-router` template at **8.5.1** and wired with
`@themvora/remix/react-router`.

- **Stack:** React Router 8.5.1 Framework Mode, React 19, Vite 8, SSR enabled.
- **Integration:** `createThemeDocument()` from `@themvora/remix/react-router`,
  plus the re-exported React hooks and `ThemeScrollbar`.
- **Why the `@themvora/remix` package:** React Router's root route owns the
  document and exposes a request object to its loader — the same contract the
  adapter already implements for Remix v2. The `/react-router` entry point names
  the target explicitly and the adapter never imports `@remix-run/*`.

## Layout

```
app/routes.ts                  # Framework Mode route config
app/root.tsx                   # root loader -> theming.resolveInitial(request)
                               # <theming.Document> -> head script, <html>, provider
app/routes/home.tsx            # mode/family controls, token-driven card
app/routes/about.tsx           # client-side navigation target
app/app.css                    # reads only --theme-* variables
```

## Reproduce the scaffold

```bash
npx create-react-router@8.5.1 my-app --yes --no-install --no-git-init
```

The app keeps the template's `vite.config.ts`, `react-router.config.ts` and
`tsconfig.json` conventions. Add the workspace packages:

```bash
pnpm add @themvora/core @themvora/remix
```

`react-router`, `@react-router/dev`, `@react-router/node` and
`@react-router/serve` come from the official template.

## Run

```bash
pnpm --filter @themvora/app-react-router dev        # http://localhost:5203
pnpm --filter @themvora/app-react-router build      # react-router build
pnpm --filter @themvora/app-react-router typecheck  # react-router typegen && tsc
pnpm --filter @themvora/app-react-router preview    # PORT=5203
```

## Root integration

```tsx
const theming = createThemeDocument({
  themes,
  defaultTheme: "light",
  mode: "system",
  scrollbar: true,
});

export async function loader({ request }: Route.LoaderArgs) {
  return { theme: await theming.resolveInitial(request) };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useRouteLoaderData<typeof loader>("root");
  return (
    <theming.Document
      initial={data?.theme}
      head={[<Meta key="meta" />, <Links key="links" />]}
      afterContent={<><ScrollRestoration /><Scripts /></>}
    >
      {children}
    </theming.Document>
  );
}
```

The configuration is static and frozen; the request-specific state comes only
from `resolveInitial(request)`. When the root loader is unavailable, `Document`
uses the configuration's static fallback so an error boundary still renders.
