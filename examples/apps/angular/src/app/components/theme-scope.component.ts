import { Component } from "@angular/core";
import { ThemeScopeDirective } from "@themvora/angular";

@Component({
  selector: "app-scope",
  template: `
    <div
      [themvoraScope]="'berry-light'"
      class="bg-card p-4 rounded-md border border-border my-8"
    >
      <p>This subtree uses the plum-dark palette with transition.</p>
      <button
        class="bg-primary px-4 py-1.5 rounded-md text-primary-foreground mt-2"
      >
        Click me
      </button>
    </div>
  `,
  standalone: true,
  imports: [ThemeScopeDirective],
})
export class ScopeComponent {}
