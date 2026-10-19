import {
  Component,
  Input,
  HostBinding,
  CUSTOM_ELEMENTS_SCHEMA,
  type OnInit,
} from "@angular/core";
import { ThemvoraInspector } from "@themvora/web";

/**
 * Angular wrapper component around the Themvora web inspector.
 *
 * Renders a `<themvora-inspector>` custom element and forwards the `bottom`,
 * `right`, `size`, `zIndex`, `class`, and `style` inputs to it. The inspector
 * element is defined on initialization.
 *
 * @see {@link injectTheme}
 * @see {@link ThemeScopeDirective}
 * @see {@link ThemeScrollbarDirective}
 */
@Component({
  selector: "themvora-inspector-component",
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<themvora-inspector
    [attr.bottom]="bottom"
    [attr.right]="right"
    [attr.size]="size"
    [attr.z-index]="zIndex"
    [class]="class"
    [style]="style"
  ></themvora-inspector>`,
})
export class ThemeInspectorComponent implements OnInit {
  /** Distance from the bottom of the viewport, in px. */
  @Input() bottom?: number;
  /** Distance from the right edge of the viewport, in px. */
  @Input() right?: number;
  /** Toggle button size (width and height), in px. */
  @Input() size?: number;
  /** Z-index for the floating toggle and panel. */
  @Input() zIndex?: number;
  /** CSS classes forwarded to the <themvora-inspector> element. */
  @HostBinding("class") @Input() class?: string;
  /** Inline styles forwarded to the <themvora-inspector> element. */
  @HostBinding("style") @Input() style?: string;

  ngOnInit() {
    ThemvoraInspector.define();
  }
}