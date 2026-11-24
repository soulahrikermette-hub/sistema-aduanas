import { Component, computed, input } from '@angular/core';
import { Ico } from './ico';
import { NOMBRE_ESTADO, NOMBRE_TIPO } from '../core/util';

// Etiqueta "Importación" / "Exportación" con su flecha
@Component({
  selector: 'span[chip-tipo]',
  imports: [Ico],
  template: `<svg [ico]="icono()"></svg>{{ nombre() }}`,
  host: {
    class: 'chip',
    '[class.chip-importacion]': 'tipo() === "IMPORTACION"',
    '[class.chip-exportacion]': 'tipo() !== "IMPORTACION"'
  }
})
export class ChipTipo {
  readonly tipo = input.required<string>({ alias: 'chip-tipo' });
  protected readonly icono = computed(() => this.tipo() === 'IMPORTACION' ? 'entrada' : 'salida');
  protected readonly nombre = computed(() => NOMBRE_TIPO[this.tipo()] || this.tipo());
}

// Sello de estado (solo lectura)
@Component({
  selector: 'span[pastilla]',
  template: `{{ nombre() }}`,
  host: { class: 'estado-pill', '[attr.data-estado]': 'estado()' }
})
export class Pastilla {
  readonly estado = input.required<string>({ alias: 'pastilla' });
  protected readonly nombre = computed(() => NOMBRE_ESTADO[this.estado()] || this.estado());
}
