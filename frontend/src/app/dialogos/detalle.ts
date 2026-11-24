import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { AccionesService } from '../core/acciones.service';
import { DatosService } from '../core/datos.service';
import { SesionService } from '../core/sesion.service';
import { UiService } from '../core/ui.service';
import { ESTADOS, NOMBRE_ESTADO, ordenar } from '../core/util';
import { Ico } from '../compartido/ico';
import { ChipTipo } from '../compartido/etiquetas';
import { DineroPipe, FechaCortaPipe, NumeroPipe } from '../compartido/pipes';
import { SelectorEstado } from '../compartido/selector-estado';

// Ventana con el detalle de una declaración y sus mercancías
@Component({
  selector: 'app-detalle',
  imports: [Ico, ChipTipo, SelectorEstado, DineroPipe, NumeroPipe, FechaCortaPipe],
  templateUrl: './detalle.html'
})
export class Detalle {
  protected datos = inject(DatosService);
  protected sesion = inject(SesionService);
  protected ui = inject(UiService);
  protected acciones = inject(AccionesService);
  private dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  protected readonly estados = ESTADOS;
  protected readonly nombreEstado = NOMBRE_ESTADO;
  private id = signal<number | null>(null);

  protected dec = computed(() => {
    const id = this.id();
    return id == null ? undefined : this.datos.buscarDeclaracion(id);
  });

  protected mercancias = computed(() => {
    const d = this.dec();
    return d ? ordenar(this.datos.mercancias().filter(m => m.declaracionId === d.id), { col: 'valor', dir: 'desc' }) : [];
  });

  protected totales = computed(() => {
    let valor = 0, peso = 0;
    for (const m of this.mercancias()) { valor += m.valor || 0; peso += m.peso || 0; }
    return { valor, peso };
  });

  constructor() {
    this.ui.registrar({ detalle: id => this.abrir(id) });
    // Si la declaración se elimina (o se cierra sesión) con la ventana abierta, se cierra sola
    effect(() => {
      if (this.id() != null && !this.dec() && this.dlg().nativeElement.open) this.dlg().nativeElement.close();
    });
  }

  private abrir(id: number): void {
    this.id.set(id);
    const d = this.dlg().nativeElement;
    if (!d.open) d.showModal();
  }

  protected cerrar(): void { this.dlg().nativeElement.close(); }
  protected alCerrar(): void { this.id.set(null); }
  protected alClic(ev: MouseEvent): void { if (ev.target === this.dlg().nativeElement) this.cerrar(); }

  protected editar(): void {
    const d = this.dec();
    if (d) this.ui.declaracion(d);
  }

  protected imprimir(): void { window.print(); }
}
