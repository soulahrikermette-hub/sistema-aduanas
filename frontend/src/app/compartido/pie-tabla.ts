import { Component, computed, input, output } from '@angular/core';
import { TAM_PAGINA, paginasVisibles } from '../core/util';

// Pie de las tablas: "Mostrando 1–8 de 12" y los botones de página
@Component({
  selector: 'div[pie]',
  template: `
    @if (total() > 0) {
      <span>Mostrando {{ desde() }}–{{ hasta() }} de {{ total() }}</span>
      @if (totalPaginas() > 1) {
        <nav class="paginas" aria-label="Páginas">
          <button type="button" aria-label="Página anterior" [disabled]="pagina() === 1" (click)="cambiar.emit(pagina() - 1)">‹</button>
          @for (p of visibles(); track $index) {
            @if (p === 0) {
              <button type="button" disabled>…</button>
            } @else {
              <button type="button" [attr.aria-current]="p === pagina() ? 'page' : null" (click)="cambiar.emit(p)">{{ p }}</button>
            }
          }
          <button type="button" aria-label="Página siguiente" [disabled]="pagina() === totalPaginas()" (click)="cambiar.emit(pagina() + 1)">›</button>
        </nav>
      }
    }
  `,
  host: { class: 'pie-tabla' }
})
export class PieTabla {
  readonly total = input.required<number>();
  readonly pagina = input.required<number>();
  readonly cambiar = output<number>();

  protected readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.total() / TAM_PAGINA)));
  protected readonly desde = computed(() => (this.pagina() - 1) * TAM_PAGINA + 1);
  protected readonly hasta = computed(() => Math.min(this.pagina() * TAM_PAGINA, this.total()));
  protected readonly visibles = computed(() => paginasVisibles(this.pagina(), this.totalPaginas()));
}
