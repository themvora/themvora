import { createRoot } from "react-dom/client";
// Required: brings in the pre-paint native-bar hiding plus the overlay strip
// base styles. Without it the strips have no styling of their own and the
// browser paints its native scrollbar until the engine injects its stylesheet.
import "@themvora/core/scrollbar.css";
import { ThemeProvider } from "@themvora/react";
import App from "./App";

// No theme props: `theme.config.ts` is the single declaration. The Vite plugin
// derives the pre-paint script from it and transports the same configuration
// to this provider, so the two cannot resolve differently — which is what used
// to flash when only one side was given the mode.
createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>,
);
