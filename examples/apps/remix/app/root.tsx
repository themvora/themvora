import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import { ThemeHead, ThemeProvider, getThemeShellProps } from "@themvora/remix";
import { getInitialThemeState } from "@themvora/remix/server";
import { themes, defaultTheme } from "@themvora/app-shared/themes";
import styles from "./styles.css?url";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: styles }];

// One source of truth for the starting mode: the pre-paint script and the
// runtime resolve it independently, so both have to be told the same thing.
const INITIAL_MODE = "light";

export async function loader({ request }: LoaderFunctionArgs) {
  return {
    initial: await getInitialThemeState(request, {
      themes,
      defaultTheme,
      mode: INITIAL_MODE,
    }),
  };
}

export default function App() {
  const { initial } = useLoaderData<typeof loader>();

  return (
    // Remix owns the document, so `<html>` is written here — and the blocking
    // script rewrites it before first paint. `getThemeShellProps` renders the
    // same attributes the script writes (plus the CSS variables and
    // `suppressHydrationWarning`), which is what keeps React's virtual DOM in
    // agreement with the DOM it hydrates. Rendering a bare `<html lang="en">`
    // makes React report an attribute mismatch on every load and leaves it
    // never patching the difference up.
    <html lang="en" {...getThemeShellProps(initial, { scrollbar: true })}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:," />
        <Meta />
        <Links />
        {/* Blocking bootstrap + dark-mode CSS, before first paint. `scrollbar`
            emits the native-bar hiding CSS; `tv-scrollbar` above scopes it. */}
        <ThemeHead
          themes={themes}
          defaultTheme={defaultTheme}
          mode={INITIAL_MODE}
          scrollbar
        />
      </head>
      <body>
        <ThemeProvider
          initial={initial}
          themes={themes}
          defaultTheme={defaultTheme}
        >
          <Outlet />
        </ThemeProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
