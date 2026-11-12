import type { ReactNode } from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from "react-router";
import { getBuiltInThemes } from "@themvora/core";
import "@themvora/core/scrollbar.css";
import { ThemeScrollbar } from "@themvora/remix";
import { createThemeDocument } from "@themvora/remix/react-router";
import type { Route } from "./+types/root";
import "./app.css";

const themes = getBuiltInThemes();

// One object. The loader, the pre-paint script, the <html> shell and the
// runtime provider are all derived from this configuration by the integration.
const theming = createThemeDocument({
  themes,
  defaultTheme: "light",
  mode: "system",
  scrollbar: true,
  className: "app",
});

export async function loader({ request }: Route.LoaderArgs) {
  return { theme: await theming.resolveInitial(request) };
}

export function Layout({ children }: { children: ReactNode }) {
  // React Router may render this layout while the root loader is unavailable
  // (an error response, a hydration fallback). `Document` then uses its static
  // fallback instead of throwing a second error inside the boundary.
  const data = useRouteLoaderData<typeof loader>("root");

  return (
    <theming.Document
      initial={data?.theme}
      htmlProps={{ lang: "en" }}
      head={[
        <meta key="charset" charSet="utf-8" />,
        <meta
          key="viewport"
          name="viewport"
          content="width=device-width, initial-scale=1"
        />,
        <Meta key="meta" />,
        <Links key="links" />,
      ]}
      afterContent={
        <>
          <ScrollRestoration />
          <Scripts />
        </>
      }
    >
      {children}
    </theming.Document>
  );
}

export default function App() {
  return (
    <>
      <ThemeScrollbar />
      <Outlet />
    </>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
  }

  return (
    <main className="page">
      <h1>{message}</h1>
      <p>{details}</p>
    </main>
  );
}
