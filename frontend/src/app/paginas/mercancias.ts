import { Component, ElementRef, HostListener, computed, effect, inject, signal, viewChild } from '@angular/core';
import { AccionesService } from '../core/acciones.service';
import { AvisosService } from '../core/avisos.service';
import { DatosService } from '../core/datos.service';
import { Mercancia, Orden } from '../core/modelos';
import { SesionService } from '../core/sesion.service';
import { UiService } from '../core/ui.service';
import { TAM_PAGINA, descargarCsv, normalizar, ordenar, siguienteOrden } from '../core/util';
import { Ico } from '../compartido/ico';
import { DineroPipe, NumeroPipe } from '../compartido/pipes';
import { PieTabla } from '../compartido/pie-tabla';
import { ThOrden } from '../compartido/th-orden';

type MercanciaFila = Mercancia & { numeroDeclaracion: string };

@Component({
  selector: 'app-mercancias',
  imports: [Ico, ThOrden, PieTabla, DineroPipe, NumeroPipe],
  templateUrl: './mercancias.html'
})
export class Mercancias {
  protected datos = inject(DatosService);
  protected sesion = inject(SesionService);
  protected ui = inject(UiService);
  protected acciones = inject(AccionesService);
  private avisos = inject(AvisosService);
  private buscador = viewChild.required<ElementRef<HTMLInputElement>>('buscador');

  protected readonly filas = [1, 2, 3, 4, 5];
  protected q = signal('');
  protected declaracion = this.ui.filtroMerDeclaracion;
  protected orden = signal<Orden>({ col: 'valor', dir: 'desc' });
  protected pagina = signal(1);

  protected declaracionesOrdenadas = computed(() =>
    ordenar(this.datos.declaraciones(), { col: 'numeroDeclaracion', dir: 'asc' }));

  protected lista = computed<MercanciaFila[]>(() => {
    const q = normalizar(this.q()).trim();
    const dec = this.declaracion();
    const filtradas = this.datos.mercancias().map(m => ({
      ...m, numeroDeclaracion: this.datos.buscarDeclaracion(m.declaracionId)?.numeroDeclaracion ?? '(eliminada)'
    })).filter(m => {
      if (dec && String(m.declaracionId) !== dec) return false;
      if (!q) return true;
      return normalizar([m.descripcion, m.partidaArancelaria, m.numeroDeclaracion].join(' ')).includes(q);
    });
    return ordenar(filtradas, this.orden());
  });

  protected paginaReal = computed(() => Math.min(this.pagina(), Math.max(1, Math.ceil(this.lista().length / TAM_PAGINA))));
  protected visibles = computed(() => this.lista().slice((this.paginaReal() - 1) * TAM_PAGINA, this.paginaReal() * TAM_PAGINA));

  constructor() {
    // Si la declaración filtrada ya no existe (se eliminó), se quita el filtro
    effect(() => {
      const dec = this.declaracion();
      if (dec && this.datos.listo() && !this.datos.buscarDeclaracion(Number(dec))) this.declaracion.set('');
    });
  }

  protected cambiarOrden(col: string): void {
    this.orden.set(siguienteOrden(this.orden(), col));
    this.pagina.set(1);
  }

  protected buscar(valor: string): void { this.q.set(valor); this.pagina.set(1); }
  protected filtrarDeclaracion(valor: string): void { this.declaracion.set(valor); this.pagina.set(1); }
  protected limpiar(): void { this.q.set(''); this.declaracion.set(''); this.pagina.set(1); }

  protected exportar(): void {
    const lista = this.lista();
    if (!lista.length) { this.avisos.error('No hay mercancías para exportar.'); return; }
    descargarCsv('mercancias',
      ['Descripción', 'Partida arancelaria', 'Declaración', 'Cantidad', 'Unidad', 'Valor USD', 'Peso kg'],
      lista.map(m => [m.descripcion, m.partidaArancelaria, m.numeroDeclaracion, m.cantidad, m.unidadMedida, Number(m.valor).toFixed(2), m.peso == null ? '' : m.peso]));
    this.avisos.ok('Se exportaron ' + lista.length + (lista.length === 1 ? ' mercancía.' : ' mercancías.'));
  }

  @HostListener('document:keydown', ['$event'])
  protected tecla(e: KeyboardEvent): void {
    const tag = ((e.target as HTMLElement)?.tagName || '').toLowerCase();
    if (e.key === '/' && tag !== 'input' && tag !== 'select' && tag !== 'textarea' && !document.querySelector('dialog[open]')) {
      e.preventDefault();
      this.buscador().nativeElement.focus();
    }
  }
}
