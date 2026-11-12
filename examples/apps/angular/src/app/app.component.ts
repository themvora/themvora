import { Component } from "@angular/core";
import { ThemeScrollbarDirective } from "@themvora/angular";
import { scrollbarIcons } from "@themvora/app-shared/icons";
import { ThemvoraDefaultComponent } from "./components/themvora-default.component";
import { ScopeComponent } from "./components/theme-scope.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [ThemeScrollbarDirective, ThemvoraDefaultComponent, ScopeComponent],
  template: `
    <main
      class="page flex flex-col"
      themvoraScrollbar
      [themvoraScrollbarOptions]="scrollbarOptions"
    >
      <app-themvora-default />

      <div class="max-h-40 max-w-lg overflow-auto my-8 border-2 border-border">
        @for (item of items; track item) {
          <p>
            Hello for the scrollbar example very very very very very very very
            very very very long content
          </p>
        }
      </div>

      <app-scope />
    </main>
  `,
})
export class AppComponent {
  readonly scrollbarOptions = {
    behavior: { autoHide: false },
    icons: scrollbarIcons,
  };
  readonly items = Array.from({ length: 100 }, (_, index) => index);
}
