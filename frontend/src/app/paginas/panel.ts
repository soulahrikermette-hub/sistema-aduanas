import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatosService } from '../core/datos.service';
import { UiService } from '../core/ui.service';
import { ESTADOS, NOMBRE_ESTADO, ordenar } from '../core/util';
import { Ico } from '../compartido/ico';
import { ChipTipo, Pastilla } from '../compartido/etiquetas';
import { DineroPipe, FechaCortaPipe, NumeroPipe } from '../compartido/pipes';

@Component({
  selector: 'app-panel',
  imports: [RouterLink, Ico, ChipTipo, Pastilla, DineroPipe, NumeroPipe, FechaCortaPipe],
  templateUrl: './panel.html'
})
export class Panel {
  protected datos = inject(DatosService);
  private ui = inject(UiService);
  private router = inject(Router);

  protected readonly estados = ESTADOS;
  protected readonly nombreEstado = NOMBRE_ESTADO;
  protected readonly filas = [1, 2, 3, 4, 5];

  // Estados que tienen al menos una declaración (para la barra de colores)
  protected conDatos = computed(() => {
    const s = this.datos.estadisticas();
    return s ? ESTADOS.filter(e => (s.porEstado[e] || 0) > 0) : [];
  });

  protected porcentajes = computed(() => {
    const s = this.datos.estadisticas();
    const vt = s?.valorTotal || 0;
    return {
      imp: vt && s ? (s.valorImportacion / vt) * 100 : 0,
      exp: vt && s ? (s.valorExportacion / vt) * 100 : 0
    };
  });

  // Últimas 5 declaraciones por fecha, con su valor
  protected recientes = computed(() => {
    const res = this.datos.resumen();
    return ordenar(this.datos.declaraciones().map(d => ({ ...d, valor: res.get(d.id)?.valor ?? 0 })), { col: 'fecha', dir: 'desc' }).slice(0, 5);
  });

  // Las 5 mercancías de mayor valor
  protected top = computed(() => {
    const lista = this.datos.mercancias().slice().sort((a, b) => b.valor - a.valor).slice(0, 5);
    const maximo = lista[0]?.valor || 1;
    return lista.map(m => ({
      ...m,
      numeroDeclaracion: this.datos.buscarDeclaracion(m.declaracionId)?.numeroDeclaracion ?? '',
      proporcion: (m.valor / maximo) * 100
    }));
  });

  protected plural(n: number, uno: string, varios: string): string { return n === 1 ? uno : varios; }

  protected verDetalle(id: number): void { this.ui.detalle(id); }

  // Pulsar un estado lleva a Declaraciones ya filtradas por ese estado
  protected filtrarEstado(e: string): void {
    this.ui.filtroDecEstado.set(e);
    this.router.navigateByUrl('/declaraciones');
  }
}
