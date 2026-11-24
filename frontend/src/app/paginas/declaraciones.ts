import { Component, ElementRef, HostListener, computed, inject, signal, viewChild } from '@angular/core';
import { AccionesService } from '../core/acciones.service';
import { AvisosService } from '../core/avisos.service';
import { DatosService } from '../core/datos.service';
import { DeclaracionConTotales, Orden } from '../core/modelos';
import { SesionService } from '../core/sesion.service';
import { UiService } from '../core/ui.service';
import { ESTADOS, NOMBRE_ESTADO, NOMBRE_TIPO, TAM_PAGINA, descargarCsv, normalizar, ordenar, siguienteOrden } from '../core/util';
import { Ico } from '../compartido/ico';
import { ChipTipo } from '../compartido/etiquetas';
import { DineroPipe, FechaCortaPipe } from '../compartido/pipes';
import { PieTabla } from '../compartido/pie-tabla';
import { SelectorEstado } from '../compartido/selector-estado';
import { ThOrden } from '../compartido/th-orden';

@Component({
  selector: 'app-declaraciones',
  imports: [Ico, ChipTipo, SelectorEstado, ThOrden, PieTabla, DineroPipe, FechaCortaPipe],
  templateUrl: './declaraciones.html'
})
export class Declaraciones {
  protected datos = inject(DatosService);
  protected sesion = inject(SesionService);
  protected ui = inject(UiService);
  protected acciones = inject(AccionesService);
  private avisos = inject(AvisosService);
  private buscador = viewChild.required<ElementRef<HTMLInputElement>>('buscador');

  protected readonly estados = ESTADOS;
  protected readonly nombreEstado = NOMBRE_ESTADO;
  protected readonly filas = [1, 2, 3, 4, 5];

  // Filtros, orden y página (el panel puede dejar puesto el filtro de estado: ver ui.filtroDecEstado)
  protected q = signal('');
  protected tipo = signal('');
  protected estado = this.ui.filtroDecEstado;
  protected orden = signal<Orden>({ col: 'fecha', dir: 'desc' });
  protected pagina = signal(1);

  // Declaraciones con sus totales, filtradas y ordenadas
  protected lista = computed<DeclaracionConTotales[]>(() => {
    const res = this.datos.resumen();
    const q = normalizar(this.q()).trim();
    const tipo = this.tipo(), estado = this.estado();
    const filtradas = this.datos.declaraciones().map(d => {
      const r = res.get(d.id) ?? { n: 0, valor: 0, peso: 0 };
      return { ...d, nMercancias: r.n, valor: r.valor, peso: r.peso };
    }).filter(d => {
      if (tipo && d.tipoOperacion !== tipo) return false;
      if (estado && d.estado !== estado) return false;
      if (!q) return true;
      return normalizar([d.numeroDeclaracion, d.importadorExportador, d.aduana, NOMBRE_TIPO[d.tipoOperacion], NOMBRE_ESTADO[d.estado]].join(' ')).includes(q);
    });
    return ordenar(filtradas, this.orden());
  });

  // La página nunca se pasa del total (por ejemplo, tras eliminar el último de la página)
  protected paginaReal = computed(() => Math.min(this.pagina(), Math.max(1, Math.ceil(this.lista().length / TAM_PAGINA))));
  protected visibles = computed(() => this.lista().slice((this.paginaReal() - 1) * TAM_PAGINA, this.paginaReal() * TAM_PAGINA));

  protected cambiarOrden(col: string): void {
    this.orden.set(siguienteOrden(this.orden(), col));
    this.pagina.set(1);
  }

  protected buscar(valor: string): void { this.q.set(valor); this.pagina.set(1); }
  protected filtrarTipo(valor: string): void { this.tipo.set(valor); this.pagina.set(1); }
  protected filtrarEstado(valor: string): void { this.estado.set(valor); this.pagina.set(1); }

  protected limpiar(): void {
    this.q.set(''); this.tipo.set(''); this.estado.set(''); this.pagina.set(1);
  }

  protected exportar(): void {
    const lista = this.lista();
    if (!lista.length) { this.avisos.error('No hay declaraciones para exportar.'); return; }
    descargarCsv('declaraciones',
      ['Número', 'Tipo', 'Fecha', 'Importador/Exportador', 'Aduana', 'Estado', 'Mercancías', 'Valor USD'],
      lista.map(d => [d.numeroDeclaracion, NOMBRE_TIPO[d.tipoOperacion], d.fecha, d.importadorExportador, d.aduana, NOMBRE_ESTADO[d.estado], d.nMercancias, d.valor.toFixed(2)]));
    this.avisos.ok('Se exportaron ' + lista.length + (lista.length === 1 ? ' declaración.' : ' declaraciones.'));
  }

  // Atajo: "/" lleva al buscador
  @HostListener('document:keydown', ['$event'])
  protected tecla(e: KeyboardEvent): void {
    const tag = ((e.target as HTMLElement)?.tagName || '').toLowerCase();
    if (e.key === '/' && tag !== 'input' && tag !== 'select' && tag !== 'textarea' && !document.querySelector('dialog[open]')) {
      e.preventDefault();
      this.buscador().nativeElement.focus();
    }
  }
}
