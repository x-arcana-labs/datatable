import { Directive, ElementRef, OnDestroy, OnInit, inject } from "@angular/core";

/**
 * Moves the host element to `<body>`, mirroring the React
 * `createPortal(..., document.body)` used by the other adapters so the filter
 * panels escape any `overflow: hidden` ancestor. The element is removed when
 * the embedded view is destroyed (`@if` block closes).
 */
@Directive({ selector: "[arcanaBodyPortal]", standalone: true })
export class ArcanaBodyPortalDirective implements OnInit, OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  ngOnInit(): void {
    document.body.appendChild(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    this.host.nativeElement.remove();
  }
}
