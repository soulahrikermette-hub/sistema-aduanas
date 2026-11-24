import { Component, input, output } from '@angular/core';

// Selector de estado que cambia el trámite sin abrir ningún formulario.
// Se pinta con el color del estado actual (el CSS lee data-estado).
@Component({
  selector: 'span[selector-estado]',
  template: `
    <select class="estado-select" [attr.aria-label]="etiqueta()" [disabled]="bloqueado()" [attr.title]="titulo() || null"
            (change)="cambio.emit($any($event.target).value)">
      @for (o of opciones(); track o) {
        <option [value]="o" [selected]="o === valor()">{{ nombres()[o] }}</option>
      }
    </select>
  `,
  host: { class: 'estado-wrap', '[attr.data-estado]': 'valor()' }
})
export class SelectorEstado {
  readonly valor = input.required<string>();
  readonly opciones = input.required<string[]>();
  readonly nombres = input.required<Record<string, string>>();
  readonly etiqueta = input<string>('Estado');
  readonly bloqueado = input<boolean>(false);
  readonly titulo = input<string>('');
  readonly cambio = output<string>();
}
