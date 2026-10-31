import type { FrameworkExamples } from "./types";

/**
 * Angular examples and use cases.
 *
 * Angular's surface is DI-first: providers instead of a wrapper component,
 * `inject*` functions instead of hooks, and a directive instead of a scope
 * component. Verified against `packages/angular/src/public-api.ts` and
 * `lib/hooks.ts` — including two contracts that are easy to misread:
 * `injectTheme()` returns a `Signal<ThemeState>` with `resolvedMode` (not
 * `effectiveMode`), and `injectThemeHistory().history` is a
 * `{ canUndo, canRedo }` state signal rather than the timeline.
 */
export const angularExamples: FrameworkExamples = {
  slug: "angular",
  sections: {
    startHere: "Bootstrap providers",
    useCases: "DI, signals, and standalone components",
    api: "Injectables, directives, and SSR helpers",
    combining: "A settings panel in a standalone app",
  },
  intro: [
    "The Angular integration is built on dependency injection rather than a provider component. `provideTheme()` creates the runtime at the application root, `inject*` functions read it inside an injection context, and `ThemeScopeDirective` handles scoped subtrees.",
    "Two naming details are easy to misread: the applied mode is `resolvedMode` (from `injectTheme()`) or the `injectEffectiveThemeMode()` signal, and the history injectable splits into `injectThemeHistory()` for undo/redo state and `injectThemeTimeTravel()` for the timeline.",
  ],
  startHere: {
    body: "Register `provideTheme()` in the bootstrap providers. It creates the runtime, wires Angular persistence, and registers environment initializers that bind the runtime to the DOM — and, during SSR, emit the blocking bootstrap.",
    note: "The built-in themes need no configuration, so `provideTheme()` with no options is a complete setup.",
    code: [
      {
        title: "src/main.ts",
        lang: "ts",
        code: `import { bootstrapApplication } from "@angular/platform-browser";
import { provideTheme } from "@themvora/angular";
import { AppComponent } from "./app/app.component";

bootstrapApplication(AppComponent, {
  providers: [provideTheme({ initialMode: "system" })],
});`,
      },
      {
        title: "src/app/app.component.ts",
        lang: "ts",
        code: `import { ChangeDetectionStrategy, Component } from "@angular/core";
import { ThemeSummaryComponent } from "./theme-summary.component";

@Component({
  selector: "app-root",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThemeSummaryComponent],
  template: "<app-theme-summary />",
})
export class AppComponent {}`,
      },
      {
        title: "src/app/theme-summary.component.ts",
        lang: "ts",
        code: `import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { injectTheme } from "@themvora/angular";

@Component({
  selector: "app-theme-summary",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <h2>{{ state().theme.name }}</h2>
    <p>Currently rendering in {{ state().resolvedMode }} mode.</p>
    <button type="button" (click)="state().toggleTheme()">Switch mode</button>
  \`,
})
export class ThemeSummaryComponent {
  // A signal: read it by calling it.
  readonly state = injectTheme();
}`,
      },
    ],
  },
  categories: [
    {
      id: "setup",
      label: "Setup",
      intro:
        "Angular has no provider component. The runtime is an injector provider, which is why these two functions are the entry point rather than a template wrapper.",
      entries: [
        {
          id: "ng-provide-theme",
          name: "provideTheme(options)",
          covers: ["provideTheme(options)"],
          what: "Creates the runtime from a `ThemeRuntimeOptions` config, wires Angular persistence, and registers environment initializers that bind the runtime to the DOM and CSS variables. Returns `EnvironmentProviders` for a standalone `providers` array.",
          when: "Once at the application root — `bootstrapApplication`, a route's `providers`, or a feature environment that should get its own runtime.",
          effect: "Every `inject*` call below the provider resolves the same runtime, and the active theme's variables land on the document.",
          related: ["ng-provide-runtime", "ng-inject-theme"],
          code: [
            {
              title: "src/main.ts",
              lang: "ts",
              code: `import { bootstrapApplication } from "@angular/platform-browser";
import { provideTheme } from "@themvora/angular";
import { getBuiltInThemes } from "@themvora/core";
import { AppComponent } from "./app/app.component";

const themes = getBuiltInThemes();

bootstrapApplication(AppComponent, {
  providers: [
    provideTheme({
      themes,
      defaultTheme: "mint-light",
      initialMode: "system",
      transition: { enabled: true, duration: 250 },
    }),
  ],
});`,
            },
          ],
        },
        {
          id: "ng-provide-runtime",
          name: "provideThemeRuntime(runtime)",
          covers: ["provideThemeRuntime(runtime)"],
          what: "Provides an existing runtime under the `THEME_RUNTIME` token. Unlike `provideTheme()` it creates nothing and wires no persistence — the caller owns the runtime's lifecycle.",
          when: "The runtime already exists: built in a module, shared with a non-Angular widget, or configured from data the DI config cannot express.",
          effect: "The `inject*` functions resolve the provided runtime. Persistence and bindings are whatever the caller set up.",
          related: ["ng-provide-theme", "ng-inject-runtime"],
          code: [
            {
              title: "src/app/theme.ts",
              lang: "ts",
              code: `import { createThemeRuntime, getBuiltInThemes } from "@themvora/core";

export const runtime = createThemeRuntime({
  themes: getBuiltInThemes(),
  defaultTheme: "mint-light",
});`,
            },
            {
              title: "src/main.ts",
              lang: "ts",
              code: `import { provideThemeRuntime } from "@themvora/angular";
import { runtime } from "./app/theme";

bootstrapApplication(AppComponent, {
  providers: [provideThemeRuntime(runtime)],
});`,
            },
          ],
        },
      ],
    },
    {
      id: "injectables",
      label: "Injectables",
      intro:
        "All of these must be called in an injection context — a field initialiser, a constructor, or a factory. Signals are read by calling them in the template.",
      entries: [
        {
          id: "ng-inject-runtime",
          name: "injectThemeRuntime()",
          covers: ["injectThemeRuntime()"],
          what: "Injects the full runtime: registry, store, selection, history, lifecycle, plugins and any configured schedule.",
          when: "You are wiring something Themvora does not ship an injectable for — a custom adapter, a plugin installed after bootstrap, or a direct subscription.",
          effect: "Returns the runtime object. Reading from it does not subscribe you to changes; use its own `subscribe` methods for that.",
          related: ["ng-provide-runtime", "ng-lifecycle"],
          code: [
            {
              title: "src/app/runtime-badge.component.ts",
              lang: "ts",
              code: `import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { injectThemeRuntime } from "@themvora/angular";

@Component({
  selector: "app-runtime-badge",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`<span>{{ count() }} themes registered</span>\`,
})
export class RuntimeBadgeComponent {
  private readonly runtime = injectThemeRuntime();

  readonly count = signal(this.runtime.themes.length);

  constructor() {
    // A registry change (a pack install) is not a store change — watch the
    // registry, not the store.
    this.runtime.registry.subscribe(() => this.count.set(this.runtime.themes.length));
  }
}`,
            },
          ],
        },
        {
          id: "ng-inject-theme",
          name: "injectTheme()",
          covers: ["injectTheme()"],
          what: "A read-only `Signal<ThemeState>`: `theme`, `mode`, `family`, `resolvedMode`, plus `setMode`, `setFamily` and `toggleTheme`.",
          when: "A component needs more than one slice — a settings panel, or a header with the theme name and a toggle.",
          effect: "The signal updates whenever the theme, mode, family or resolved mode changes. `resolvedMode` is the applied appearance (`light` | `dark`); `mode` is what the visitor asked for.",
          related: ["ng-effective-mode", "ng-inject-runtime"],
          code: [
            {
              title: "src/app/appearance-settings.component.ts",
              lang: "ts",
              code: `import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { injectTheme } from "@themvora/angular";

@Component({
  selector: "app-appearance-settings",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <h2>{{ state().theme.name }}</h2>
    <p>Family {{ state().family }} · requested {{ state().mode }} · showing {{ state().resolvedMode }}</p>
    <button type="button" (click)="state().toggleTheme()">Toggle</button>
    <button type="button" (click)="state().setMode('system')">Follow system</button>
  \`,
})
export class AppearanceSettingsComponent {
  readonly state = injectTheme();
}`,
            },
          ],
        },
        {
          id: "ng-effective-mode",
          name: "injectEffectiveThemeMode()",
          covers: ["injectEffectiveThemeMode()"],
          what: "A `Signal<'light' | 'dark'>` of the mode actually applied — never `system`.",
          when: "Any label, icon or `aria-pressed` that states the current appearance. `state().mode` does not move at a sunrise/sunset transition; this does.",
          effect: "Updates on a click, an OS appearance change, and a schedule transition.",
          related: ["ng-inject-theme", "ng-schedule"],
          code: [
            {
              title: "src/app/appearance-icon.component.ts",
              lang: "ts",
              code: `import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { injectEffectiveThemeMode } from "@themvora/angular";

@Component({
  selector: "app-appearance-icon",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`<span [attr.aria-label]="mode() + ' mode'">{{ mode() === "dark" ? "🌙" : "☀️" }}</span>\`,
})
export class AppearanceIconComponent {
  readonly mode = injectEffectiveThemeMode();
}`,
            },
          ],
        },
        {
          id: "ng-history",
          name: "injectThemeHistory()",
          covers: ["injectThemeHistory()"],
          what: "Returns `undo`, `redo`, `clear` and a `history` signal whose value is `{ canUndo, canRedo }`. Note the shape: this injectable reports *whether* you can step, not the timeline.",
          when: "Undo/redo buttons. If you need the list of entries to render, use `injectThemeTimeTravel()` instead.",
          effect: "The signal updates as the runtime's history changes, so buttons can disable themselves. The subscription is released on destroy.",
          related: ["ng-time-travel", "ng-batch"],
          code: [
            {
              title: "src/app/history-controls.component.ts",
              lang: "ts",
              code: `import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { injectThemeHistory } from "@themvora/angular";

@Component({
  selector: "app-history-controls",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <button type="button" [disabled]="!history().canUndo" (click)="undo()">Undo</button>
    <button type="button" [disabled]="!history().canRedo" (click)="redo()">Redo</button>
  \`,
})
export class HistoryControlsComponent {
  private readonly controls = injectThemeHistory();

  // \`history\` is a signal of { canUndo, canRedo } — not the timeline.
  readonly history = this.controls.history;
  readonly undo = this.controls.undo;
  readonly redo = this.controls.redo;
}`,
            },
          ],
        },
        {
          id: "ng-batch",
          name: "injectThemeBatch()",
          covers: ["injectThemeBatch()"],
          what: "Returns a function that groups multiple selection changes into a single history entry and a single notification.",
          when: "Several changes belong together: family plus mode, or a token patch plus a selection.",
          effect: "One consolidated change reaches subscribers; no intermediate state is applied.",
          related: ["ng-history", "ng-inject-runtime"],
          code: [
            {
              title: "src/app/apply-preset.component.ts",
              lang: "ts",
              code: `import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { injectThemeBatch, injectThemeRuntime } from "@themvora/angular";

@Component({
  selector: "app-apply-preset",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`<button type="button" (click)="applyPreset()">Plum, dark</button>\`,
})
export class ApplyPresetComponent {
  private readonly batch = injectThemeBatch();
  private readonly runtime = injectThemeRuntime();

  applyPreset(): void {
    this.batch(() => {
      this.runtime.selection.setFamily("plum");
      this.runtime.selection.setMode("dark");
    });
  }
}`,
            },
          ],
        },
        {
          id: "ng-snapshot",
          name: "injectThemeSnapshot() / injectThemeRestore()",
          covers: ["injectThemeSnapshot() / injectThemeRestore()"],
          what: "`injectThemeSnapshot()` returns a function that captures the full runtime state; `injectThemeRestore()` returns a function that re-applies one.",
          when: "Named presets the visitor saves, or a checkpoint around a destructive edit.",
          effect: "Restoring replaces the active theme and selection and notifies subscribers once.",
          related: ["ng-history", "ng-time-travel"],
          code: [
            {
              title: "src/app/saved-looks.component.ts",
              lang: "ts",
              code: `import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { injectThemeRestore, injectThemeSnapshot } from "@themvora/angular";

@Component({
  selector: "app-saved-looks",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <button type="button" (click)="save()">Save this look</button>
    <button type="button" [disabled]="!saved()" (click)="restoreSaved()">Restore</button>
  \`,
})
export class SavedLooksComponent {
  private readonly snapshot = injectThemeSnapshot();
  private readonly restore = injectThemeRestore();

  readonly saved = signal<ReturnType<typeof this.snapshot> | null>(null);

  save(): void {
    this.saved.set(this.snapshot());
  }

  restoreSaved(): void {
    const value = this.saved();
    if (value) this.restore(value);
  }
}`,
            },
          ],
        },
        {
          id: "ng-time-travel",
          name: "injectThemeTimeTravel()",
          covers: ["injectThemeTimeTravel()"],
          what: "Returns `{ history, jump }`, where `history` is a signal of the full timeline and `jump(index)` navigates straight to an entry.",
          when: "A scrubber or a timeline list. When you only need forward/back, `injectThemeHistory()` is the smaller injectable.",
          effect: "The signal updates as entries are recorded; `jump` moves the selection and notifies subscribers.",
          related: ["ng-history"],
          code: [
            {
              title: "src/app/timeline.component.ts",
              lang: "ts",
              code: `import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { injectThemeTimeTravel } from "@themvora/angular";

@Component({
  selector: "app-timeline",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <ol>
      @for (entry of travel.history(); track $index) {
        <li><button type="button" (click)="travel.jump($index)">{{ entry.theme.name }}</button></li>
      }
    </ol>
  \`,
})
export class TimelineComponent {
  readonly travel = injectThemeTimeTravel();
}`,
            },
          ],
        },
        {
          id: "ng-lifecycle",
          name: "injectThemeLifecycle()",
          covers: ["injectThemeLifecycle()"],
          what: "A typed subscription to runtime lifecycle events such as `beforeThemeChange` and `afterPersist`.",
          when: "You need to react to a change rather than to state — analytics, syncing an external store.",
          effect: "The handler runs when the event fires; the returned unsubscribe stops it. Subscribing does not trigger change detection.",
          related: ["ng-inject-runtime"],
          code: [
            {
              title: "src/app/theme-analytics.component.ts",
              lang: "ts",
              code: `import { ChangeDetectionStrategy, Component, DestroyRef, inject } from "@angular/core";
import { injectThemeLifecycle } from "@themvora/angular";

@Component({
  selector: "app-theme-analytics",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: "",
})
export class ThemeAnalyticsComponent {
  private readonly lifecycle = injectThemeLifecycle();
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    // This subscription is ours, not the injectable's — release it on destroy.
    const off = this.lifecycle.on("afterThemeChange", ({ theme }) => {
      window.dispatchEvent(new CustomEvent("app:theme-changed", { detail: theme.name }));
    });
    this.destroyRef.onDestroy(off);
  }
}`,
            },
          ],
        },
        {
          id: "ng-packs",
          name: "injectThemePacks()",
          covers: ["injectThemePacks()"],
          what: "Returns a function that installs a theme pack into the runtime's registry at runtime.",
          when: "Themes arrive after bootstrap: fetched from an API, generated from a brand colour, or loaded lazily.",
          effect: "The registry grows; consumers of `injectProvidedThemes()` see the new families. The active selection is untouched unless the pack changes it.",
          related: ["ng-inject-runtime", "ng-inject-theme"],
          code: [
            {
              title: "src/app/brand-pack.component.ts",
              lang: "ts",
              code: `import { ChangeDetectionStrategy, Component, effect, input } from "@angular/core";
import { injectThemePacks } from "@themvora/angular";
import { generateTheme } from "@themvora/core";

@Component({
  selector: "app-brand-pack",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: "",
})
export class BrandPackComponent {
  readonly seed = input.required<string>();
  private readonly usePack = injectThemePacks();

  constructor() {
    effect(() => {
      const generated = generateTheme({ seed: this.seed(), family: "brand" });
      this.usePack({ themes: [generated.light, generated.dark] });
    });
  }
}`,
            },
          ],
        },
        {
          id: "ng-schedule",
          name: "injectThemeSchedule()",
          covers: ["injectThemeSchedule()"],
          what: "Returns a controller with a `state` signal (`enabled`, `status`, `sunrise`, `sunset`, `nextTransition`) plus `enable()`, `disable()` and `set()`. Returns `null` when `provideTheme()` had no `scheduled` option.",
          when: "A settings row that turns daylight following on or off, or a readout of the next automatic switch.",
          effect: "The signal updates as the sun moves; the methods write through to the runtime.",
          related: ["ng-effective-mode", "ng-provide-theme"],
          code: [
            {
              title: "src/app/daylight-switch.component.ts",
              lang: "ts",
              code: `import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { injectThemeSchedule } from "@themvora/angular";

@Component({
  selector: "app-daylight-switch",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    @if (schedule; as controller) {
      <label>
        <input
          type="checkbox"
          [checked]="controller.state().enabled"
          (change)="controller.state().enabled ? controller.disable() : controller.enable()"
        />
        Follow daylight
      </label>
    }
  \`,
})
export class DaylightSwitchComponent {
  // null when provideTheme() was given no \`scheduled\` option.
  readonly schedule = injectThemeSchedule();
}`,
            },
          ],
        },
      ],
    },
    {
      id: "transition",
      label: "Transition",
      intro:
        "There is no provider component to hold this, so `transition` goes into `provideTheme()`. To change it later, call `runtime.update({ transition })` on the injected runtime.",
      entries: [
        {
          id: "ng-transition",
          name: "transition",
          covers: ["transition in provideTheme()"],
          what: "Enables and configures the cross-fade applied when the theme changes — duration, easing, preset, animated properties.",
          when: "Leave the default on; tune it when the default feels slow, or disable it for an app that must repaint instantly.",
          effect: "Theme changes animate; the DOM writes still happen in one flush.",
          related: ["ng-suppress-transition", "ng-provide-theme"],
          code: [
            {
              title: "src/main.ts",
              lang: "ts",
              code: `provideTheme({
  defaultTheme: "mint-light",
  transition: { enabled: true, duration: 250, easing: "ease-in-out" },
})`,
            },
          ],
        },
        {
          id: "ng-suppress-transition",
          name: "runtime.store.set(theme, { suppressTransition: true })",
          covers: ["runtime.store.set(theme, { suppressTransition: true })"],
          what: "Applies one theme change immediately, skipping the configured animation for that update only.",
          when: "A print path, a screenshot, or a programmatic reset where animating would look like a glitch.",
          effect: "That change is instant; later changes animate again.",
          related: ["ng-transition", "ng-inject-runtime"],
          code: [
            {
              title: "src/app/print-theme.service.ts",
              lang: "ts",
              code: `import { Injectable, inject } from "@angular/core";
import { injectThemeRuntime } from "@themvora/angular";

@Injectable({ providedIn: "root" })
export class PrintThemeService {
  private readonly runtime = injectThemeRuntime();

  applyForPrint(): void {
    const light = this.runtime.themes.find((theme) => theme.name === "mint-light");
    if (!light) return;
    this.runtime.store.set(light, { suppressTransition: true });
  }
}`,
            },
          ],
        },
      ],
    },
    {
      id: "directives",
      label: "Directives",
      intro:
        "Scoped theming is an attribute directive: it binds to the host element rather than wrapping the subtree in a component.",
      entries: [
        {
          id: "ng-scope-directive",
          name: "ThemeScopeDirective",
          covers: ["ThemeScopeDirective"],
          what: "Binds a theme to the host element via `[themvoraScope]`, writing the scoped CSS variables onto it. `[themvoraScopeTransition]` overrides the transition for that scope. An empty string disables the scope.",
          when: "A preview panel, a marketing section in a fixed palette, or a code sample that must render in the theme it documents.",
          effect: "Only the host subtree repaints; the global selection is untouched. The binding re-resolves when the registry changes, so a theme registered later still applies.",
          related: ["ng-inject-theme"],
          code: [
            {
              title: "src/app/preview.component.ts",
              lang: "ts",
              code: `import { ChangeDetectionStrategy, Component } from "@angular/core";
import { ThemeScopeDirective } from "@themvora/angular";

@Component({
  selector: "app-preview",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThemeScopeDirective],
  template: \`
    <section [themvoraScope]="'cocoa-dark'" class="rounded-lg p-6">
      <h3>Always cocoa</h3>
      <p>This panel keeps its own theme while the page changes.</p>
    </section>
  \`,
})
export class PreviewComponent {}`,
            },
            {
              title: "Toggling the scope at runtime",
              lang: "ts",
              code: `// An empty string destroys the binding, so the subtree inherits the page theme.
<section [themvoraScope]="pinnedTheme()" class="p-6">
  <ng-content />
</section>`,
            },
          ],
        },
      ],
    },
    {
      id: "ssr-bootstrap",
      label: "SSR & Bootstrap",
      intro:
        "Angular renders on the server, so the persisted theme has to be known before the response is sent — otherwise the page paints one theme and corrects it after hydration.",
      entries: [
        {
          id: "ng-persistence",
          name: "createAngularPersistence()",
          covers: ["createAngularPersistence()"],
          what: "The Angular-flavoured persistence adapter: `localStorage` in the browser plus the cookies the server reads on the next request. `provideTheme()` wires it for you.",
          when: "You are constructing the runtime yourself with `provideThemeRuntime()` and still want the same persistence contract.",
          effect: "Selection changes survive reloads and are visible to the server on the next request. The fingerprint rejects a cookie whose theme no longer exists.",
          related: ["ng-provide-runtime", "ng-blocking-script"],
          code: [
            {
              title: "src/app/theme.ts",
              lang: "ts",
              code: `import { createThemeRuntime, getBuiltInThemes } from "@themvora/core";
import { createAngularPersistence } from "@themvora/angular";

const themes = getBuiltInThemes();

export const runtime = createThemeRuntime({
  themes,
  defaultTheme: "mint-light",
  persistence: createAngularPersistence({ themes }),
});`,
            },
          ],
        },
        {
          id: "ng-blocking-script",
          name: "createBlockingScriptContent / buildThemeCSSMap",
          covers: ["createBlockingScriptContent / buildThemeCSSMap"],
          what: "`createBlockingScriptContent()` produces the blocking `<script>` body that applies the persisted selection before first paint; `buildThemeCSSMap()` produces the critical `<style>` carrying the resolved theme's CSS variables. For `system` mode the map emits both schemes as media blocks.",
          when: "A custom server entry (Express, a non-standard Angular SSR setup) where `provideTheme()`'s initializer is not the thing writing the document.",
          effect: "The server-rendered page paints themed, with no correction frame on reload.",
          related: ["ng-persistence", "ng-provide-theme"],
          code: [
            {
              title: "server/render.ts",
              lang: "ts",
              code: `import { buildThemeCSSMap, createBlockingScriptContent } from "@themvora/angular";
import { getBuiltInThemes } from "@themvora/core";

const themes = getBuiltInThemes();

export function themeHeadTags() {
  const script = createBlockingScriptContent({ themes, defaultTheme: "mint-light" });
  const css = buildThemeCSSMap(themes);

  return \`<script>\${script}</script><style>\${Object.values(css).join("\\n")}</style>\`;
}`,
            },
          ],
        },
      ],
    },
  ],
  recipes: [
    {
      id: "family-picker",
      title: "A family picker driven by the registry",
      problem:
        "A constant array of families in the settings component diverges from the registry: removed families keep showing up, added ones never do.",
      apis: ["injectProvidedThemes()", "injectTheme()"],
      why: "`injectProvidedThemes()` returns a read-only signal. Reading it in the template registers the dependency, so a pack installed later appears without a manual refresh.",
      expect:
        "The options come from the signal and the selected one follows the active family. Choosing another repaints immediately.",
      code: [
        {
          title: "src/app/family-picker.component.ts",
          lang: "ts",
          code: `import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { injectProvidedThemes, injectTheme } from "@themvora/angular";

@Component({
  selector: "app-family-picker",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <label>
      Theme family
      <select [value]="state().family" (change)="state().setFamily($any($event.target).value)">
        @for (entry of families(); track entry.name) {
          <option [value]="entry.name">{{ entry.name }}</option>
        }
      </select>
    </label>
  \`,
})
export class FamilyPickerComponent {
  readonly families = injectProvidedThemes();
  readonly state = injectTheme();
}`,
        },
      ],
    },
    {
      id: "mode-toggle",
      title: "A mode toggle that reports the truth",
      problem:
        "The toggle's icon says light while the page is dark, because the selection is `system`.",
      apis: ["injectEffectiveThemeMode()", "injectTheme()"],
      why: "The effective-mode signal is the applied appearance; `state().mode` is the standing request. The label needs the first, the click needs the second.",
      expect:
        "Icon and label always match the page; a click pins an explicit mode so a `system` visitor stops following the OS.",
      code: [
        {
          title: "src/app/mode-toggle.component.ts",
          lang: "ts",
          code: `import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { injectEffectiveThemeMode, injectTheme } from "@themvora/angular";

@Component({
  selector: "app-mode-toggle",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <button
      type="button"
      [attr.aria-pressed]="mode() === 'dark'"
      [attr.aria-label]="'Switch to ' + next() + ' mode'"
      (click)="state().setMode(next())"
    >
      {{ mode() === "dark" ? "🌙 Dark" : "☀️ Light" }}
      @if (state().mode === "system") { (auto) }
    </button>
  \`,
})
export class ModeToggleComponent {
  readonly mode = injectEffectiveThemeMode();
  readonly state = injectTheme();

  next(): "light" | "dark" {
    return this.mode() === "dark" ? "light" : "dark";
  }
}`,
        },
      ],
    },
    {
      id: "scoped-preview",
      title: "Preview families without switching to them",
      problem:
        "A gallery should show each family before the visitor commits, without repainting the whole page per preview.",
      apis: ["ThemeScopeDirective", "injectProvidedThemes()"],
      why: "The directive writes variables onto its host, so any number of previews coexist and the global selection is untouched.",
      expect:
        "Each card renders in its own family; clicking one commits the choice through the setter.",
      code: [
        {
          title: "src/app/theme-gallery.component.ts",
          lang: "ts",
          code: `import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { ThemeScopeDirective, injectProvidedThemes, injectTheme } from "@themvora/angular";

@Component({
  selector: "app-theme-gallery",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThemeScopeDirective],
  template: \`
    <div class="grid grid-cols-2 gap-4">
      @for (entry of families(); track entry.name) {
        <button type="button" (click)="state().setFamily(entry.name)">
          <div [themvoraScope]="entry.name" class="p-4 rounded-lg">
            <strong>{{ entry.name }}</strong>
            <p class="muted">The quick brown fox</p>
          </div>
        </button>
      }
    </div>
  \`,
})
export class ThemeGalleryComponent {
  readonly families = injectProvidedThemes();
  readonly state = injectTheme();
}`,
        },
      ],
    },
  ],
  combining: [
    {
      id: "settings-page",
      title: "A complete appearance settings panel",
      body: "Family, mode and history in one standalone component. Each control reads only the signal it displays, and the history injectable supplies the disabled state.",
      code: [
        {
          title: "src/app/appearance-settings.component.ts",
          lang: "ts",
          code: `import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import {
  injectEffectiveThemeMode,
  injectProvidedThemes,
  injectTheme,
  injectThemeHistory,
} from "@themvora/angular";

const MODES = ["light", "dark", "system"] as const;

@Component({
  selector: "app-appearance-settings",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <form>
      <label>
        Family
        <select [value]="state().family" (change)="state().setFamily($any($event.target).value)">
          @for (entry of families(); track entry.name) {
            <option [value]="entry.name">{{ entry.name }}</option>
          }
        </select>
      </label>

      <fieldset>
        <legend>Mode</legend>
        @for (option of modes; track option) {
          <label>
            <input
              type="radio"
              name="mode"
              [checked]="state().mode === option"
              (change)="state().setMode(option)"
            />
            {{ option }}
            @if (option === state().mode && state().mode === "system") { (now {{ effectiveMode() }}) }
          </label>
        }
      </fieldset>

      <button type="button" [disabled]="!history().canUndo" (click)="undo()">
        Undo last change
      </button>
    </form>
  \`,
})
export class AppearanceSettingsComponent {
  readonly modes = MODES;
  readonly families = injectProvidedThemes();
  readonly state = injectTheme();
  readonly effectiveMode = injectEffectiveThemeMode();

  private readonly controls = injectThemeHistory();
  readonly history = this.controls.history;
  readonly undo = this.controls.undo;
}`,
        },
      ],
    },
    {
      id: "brand-pack",
      title: "Install a generated brand theme at runtime",
      body: "A seed colour becomes a light/dark pair, the pair is registered, and the family is selected — batched so subscribers observe one change.",
      code: [
        {
          title: "src/app/brand-setup.component.ts",
          lang: "ts",
          code: `import { ChangeDetectionStrategy, Component, inject, input } from "@angular/core";
import { injectThemeBatch, injectThemePacks, injectThemeRuntime } from "@themvora/angular";
import { generateTheme } from "@themvora/core";

@Component({
  selector: "app-brand-setup",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`<button type="button" (click)="applyBrand()">Use {{ seed() }}</button>\`,
})
export class BrandSetupComponent {
  readonly seed = input.required<string>();

  private readonly usePack = injectThemePacks();
  private readonly batch = injectThemeBatch();
  private readonly runtime = injectThemeRuntime();

  applyBrand(): void {
    const generated = generateTheme({ seed: this.seed(), family: "brand" });
    this.batch(() => {
      this.usePack({ themes: [generated.light, generated.dark] });
      this.runtime.selection.setFamily("brand");
    });
  }
}`,
        },
      ],
    },
  ],
  notAvailable: [
    {
      name: "ThemeModeButton / ThemeInspector",
      reason:
        "This package ships `ThemeInspectorComponent` and `ThemeScrollbarDirective` but no mode button — build one from `injectTheme()`.",
    },
    {
      name: "useTheme* hooks",
      reason:
        "Angular has no hooks. The equivalents are the `inject*` functions above, and they must be called in an injection context.",
    },
  ],
};
