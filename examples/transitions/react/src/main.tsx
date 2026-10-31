import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@themvora/react";
import App from "./App";
import { themes } from "./themes";

/*
  `transition` accepts `false` (off), `true` (defaults) or a
  `ThemeTransitionOptions` object. Here the fade is slowed down and given a
  different easing; the CSS custom properties interpolate between themes.
*/
createRoot(document.getElementById("root")!).render(
  <ThemeProvider
    themes={themes}
    transition={{ duration: 600, easing: "ease-in-out" }}
  >
    <App />
  </ThemeProvider>,
);
