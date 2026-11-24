import { Component, ElementRef, HostListener, computed, inject, signal, viewChild } from '@angular/core';
import { AccionesService } from '../core/acciones.service';
import { AvisosService } from '../core/avisos.service';
import { DatosService } from '../core/datos.service';
import { Incidencia, Orden } from '../core/modelos';
import { SesionService } from '../core/sesion.service';
import { UiService } from '../core/ui.service';
import {
  ESTADOS_INC, NOMBRE_ESTADO_INC, NOMBRE_TIPO_INC, TAM_PAGINA, TIPOS_INC, descargarCsv, fechaHora, normalizar, ordenar, siguienteOrden
} from '../core/util';
import { Ico } from '../compartido/ico';
import { FechaCortaPipe, FechaHoraPipe, NumeroPipe } from '../compartido/pipes';
import { PieTabla } from '../compartido/pie-tabla';
import { SelectorEstado } from '../compartido/selector-estado';
import { ThOrden } from '../compartido/th-orden';

type IncidenciaFila = Incidencia & { mercancia: string; numeroDeclaracion: string };

@Component({
  selector: 'app-incidencias',
  imports: [Ico, SelectorEstado, ThOrden, PieTabla, NumeroPipe, FechaCortaPipe, FechaHoraPipe],
  templateUrl: './incidencias.html'
})
export class Incidencias {
  protected datos = inject(DatosService);
  protected sesion = inject(SesionService);
  protected ui = inject(UiService);
  protected acciones = inject(AccionesService);
  private avisos = inject(AvisosService);
  private buscador = viewChild.required<ElementRef<HTMLInputElement>>('buscador');

  protected readonly estados = ESTADOS_INC;
  protected readonly nombreEstado = NOMBRE_ESTADO_INC;
  protected readonly tipos = TIPOS_INC;
  protected readonly nombreTipo = NOMBRE_TIPO_INC;
  protected readonly filas = [1, 2, 3, 4, 5];

  protected q = signal('');
  protected tipo = signal('');
  protected estado = signal('');
  protected orden = signal<Orden>({ col: 'fecha', dir: 'desc' });
  protected pagina = signal(1);

  protected lista = computed<IncidenciaFila[]>(() => {
    const q = normalizar(this.q()).trim();
    const tipo = this.tipo(), estado = this.estado();
    const filtradas = this.datos.incidencias().map(i => ({
      ...i,
      mercancia: this.datos.buscarMercancia(i.mercanciaId)?.descripcion ?? '(eliminada)',
      numeroDeclaracion: this.datos.buscarDeclaracion(i.declaracionId)?.numeroDeclaracion ?? '(eliminada)'
    })).filter(i => {
      if (tipo && i.tipo !== tipo) return false;
      if (estado && i.estado !== estado) return false;
      if (!q) return true;
      return normalizar([i.mercancia, i.numeroDeclaracion, i.descripcion, NOMBRE_TIPO_INC[i.tipo], NOMBRE_ESTADO_INC[i.estado], i.registradaPor].join(' ')).includes(q);
    });
    return ordenar(filtradas, this.orden());
  });

  protected paginaReal = computed(() => Math.min(this.pagina(), Math.max(1, Math.ceil(this.lista().length / TAM_PAGINA))));
  protected visibles = computed(() => this.lista().slice((this.paginaReal() - 1) * TAM_PAGINA, this.paginaReal() * TAM_PAGINA));

  protected unidad(i: Incidencia): string { return this.datos.buscarMercancia(i.mercanciaId)?.unidadMedida ?? ''; }

  // Una incidencia resuelta queda cerrada: solo un administrador puede reabrirla (el servidor también lo exige)
  protected cerradaParaMi(i: Incidencia): boolean { return i.estado === 'RESUELTA' && !this.sesion.esAdmin(); }

  protected cambiarOrden(col: string): void {
    this.orden.set(siguienteOrden(this.orden(), col));
    this.pagina.set(1);
  }

  protected buscar(valor: string): void { this.q.set(valor); this.pagina.set(1); }
  protected filtrarTipo(valor: string): void { this.tipo.set(valor); this.pagina.set(1); }
  protected filtrarEstado(valor: string): void { this.estado.set(valor); this.pagina.set(1); }
  protected limpiar(): void { this.q.set(''); this.tipo.set(''); this.estado.set(''); this.pagina.set(1); }

  protected exportar(): void {
    const lista = this.lista();
    if (!lista.length) { this.avisos.error('No hay incidencias para exportar.'); return; }
    descargarCsv('incidencias',
      ['Fecha', 'Tipo', 'Mercancía', 'Declaración', 'Cantidad afectada', 'Estado', 'Descripción', 'Registrada por', 'Fecha de registro', 'Modificada por', 'Fecha de modificación'],
      lista.map(i => [i.fecha, NOMBRE_TIPO_INC[i.tipo], i.mercancia, i.numeroDeclaracion, i.cantidadAfectada == null ? '' : i.cantidadAfectada,
        NOMBRE_ESTADO_INC[i.estado], i.descripcion, i.registradaPor, (i.fechaRegistro || '').replace('T', ' '), i.modificadaPor ?? '', fechaHora(i.fechaModificacion)]));
    this.avisos.ok('Se exportaron ' + lista.length + (lista.length === 1 ? ' incidencia.' : ' incidencias.'));
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
