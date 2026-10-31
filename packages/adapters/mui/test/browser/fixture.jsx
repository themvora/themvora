import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { useTheme as useMuiThemeContext } from "@mui/material/styles";
import { Button, Paper, Typography } from "@mui/material";
import { ThemeProvider, useThemeRuntime } from "@themvora/react";
import { MuiThemeProvider } from "@themvora/mui";

/**
 * React + MUI fixture for the browser check.
 *
 * It exists to answer one question in a real browser rather than in jsdom: when
 * a theme switch runs, do MUI's own surfaces move with the document's CSS
 * variables, or do they jump while the page interpolates?
 *
 * The page also carries the font scenario: `body` is styled with a Google-style
 * font stack in the document's stylesheet, the theme declares **no**
 * `typography.fontFamilies`, and the check asserts MUI's typography inherits the
 * document font rather than being forced onto `system-ui`.
 */

const DURATION = 600;
const EASING = "ease-in-out";

const theme = (name, mode, background, foreground, primary, card) => ({
  name,
  meta: { family: "probe", mode, label: `Probe ${mode}` },
  tokens: {
    colors: {
      background,
      foreground,
      primary,
      primaryForeground: "#ffffff",
      secondary: mode === "dark" ? "#1e293b" : "#e2e8f0",
      secondaryForeground: foreground,
      card,
      cardForeground: foreground,
      muted: mode === "dark" ? "#1e293b" : "#f1f5f9",
      mutedForeground: mode === "dark" ? "#94a3b8" : "#475569",
      accent: primary,
      accentForeground: "#ffffff",
      border: mode === "dark" ? "#1e293b" : "#e2e8f0",
      ring: primary,
      destructive: "#ef4444",
      destructiveForeground: "#ffffff",
    },
    radius: { lg: "10px" },
  },
});

const themes = [
  theme("probe-light", "light", "#ffffff", "#111111", "#2563eb", "#f4f4f5"),
  theme("probe-dark", "dark", "#0b1120", "#f8fafc", "#60a5fa", "#111c33"),
];

const TRANSITION = { enabled: true, duration: DURATION, easing: EASING };

/**
 * Reads the MUI theme the provider built and publishes the probe surface on
 * `window`, so the CDP driver can read values without reaching into React.
 */
function Probe() {
  const runtime = useThemeRuntime();
  const mui = useMuiThemeContext();

  useEffect(() => {
    window.__tv = {
      ready: true,
      setMode: (mode) => runtime.selection.setMode(mode),
      getMode: () => runtime.selection.getMode(),
      muiFontFamily: mui.typography.fontFamily,
      muiDurations: { ...mui.transitions.duration },
      muiEasing: { ...mui.transitions.easing },
      transition: { ...TRANSITION },
    };
  }, [runtime, mui]);

  return null;
}

function Surfaces() {
  const runtime = useThemeRuntime();

  return (
    <MuiThemeProvider
      runtime={runtime}
      transitionDuration={DURATION}
      transitionEasing={EASING}
    >
      <Probe />
      <div
        id="plain"
        style={{
          padding: 24,
          background: "var(--theme-color-background)",
          color: "var(--theme-color-foreground)",
        }}
      >
        <Typography id="mui-text" variant="h6">
          MUI typography
        </Typography>
        <Button id="mui-button" variant="contained">
          Continue
        </Button>
        <Paper id="mui-paper" elevation={2} style={{ padding: 16, marginTop: 12 }}>
          MUI paper surface
        </Paper>
      </div>
    </MuiThemeProvider>
  );
}

function App() {
  return (
    <ThemeProvider
      themes={themes}
      defaultTheme="probe-light"
      persistence={null}
      broadcast={null}
      transition={TRANSITION}
    >
      <Surfaces />
    </ThemeProvider>
  );
}

createRoot(document.getElementById("root")).render(<App />);
