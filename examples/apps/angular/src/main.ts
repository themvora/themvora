// src/main.ts
import { bootstrapApplication } from "@angular/platform-browser";
import { provideTheme } from "@themvora/angular";
import { AppComponent } from "./app/app.component";

import {
  themes,
  defaultTheme,
  initialMode,
  transition,
} from "@themvora/app-shared/themes";

bootstrapApplication(AppComponent, {
  providers: [
    provideTheme({
      themes,
      defaultTheme,
      initialMode,
      transition: { enabled: true, duration: 400, preset: "subtle" },
    }),
  ],
});
