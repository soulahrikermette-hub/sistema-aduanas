import { Component, computed, input, output } from '@angular/core';
import { Orden } from '../core/modelos';

// Encabezado de columna que se puede ordenar: <th ordenable col="fecha" titulo="Fecha" ...>
@Component({
  selector: 'th[ordenable]',
  template: `<button type="button" class="th-orden" [attr.title]="ayuda() || null" (click)="ordenar.emit(col())">{{ titulo() }}</button>`,
  host: { '[attr.aria-sort]': 'sentido()' }
})
export class ThOrden {
  readonly col = input.required<string>();
  readonly titulo = input.required<string>();
  readonly orden = input.required<Orden>();
  readonly ayuda = input<string>('');
  readonly ordenar = output<string>();

  protected readonly sentido = computed(() =>
    this.orden().col === this.col() ? (this.orden().dir === 'asc' ? 'ascending' : 'descending') : 'none');
}
