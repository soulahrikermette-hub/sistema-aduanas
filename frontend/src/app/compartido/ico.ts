import { Component, computed, input } from '@angular/core';

// Ícono SVG: <svg ico="plus"></svg>. Usa los símbolos definidos una sola vez en index.html.
@Component({
  selector: 'svg[ico]',
  template: '<svg:use [attr.href]="href()"/>',
  host: { class: 'ico', 'aria-hidden': 'true' }
})
export class Ico {
  readonly ico = input.required<string>();
  protected readonly href = computed(() => '#i-' + this.ico());
}
