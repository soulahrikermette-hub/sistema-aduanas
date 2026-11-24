import { Injectable, inject } from '@angular/core';
import { AvisosService } from './avisos.service';
import { ErrorApi } from './error-api';
import { DatosService } from './datos.service';
import { Declaracion, Incidencia, Mercancia } from './modelos';
import { UiService } from './ui.service';
import { NOMBRE_TIPO_INC, fechaCorta } from './util';

// Eliminaciones con confirmación (las usan varias pantallas)
@Injectable({ providedIn: 'root' })
export class AccionesService {
  private datos = inject(DatosService);
  private ui = inject(UiService);
  private avisos = inject(AvisosService);

  async eliminarDeclaracion(d: Declaracion): Promise<void> {
    const n = this.datos.mercancias().filter(m => m.declaracionId === d.id).length;
    const ni = this.datos.incidencias().filter(x => x.declaracionId === d.id).length;
    const extra = n ? ' También se eliminarán sus ' + n + (n === 1 ? ' mercancía' : ' mercancías') +
      (ni ? ' y ' + ni + (ni === 1 ? ' incidencia.' : ' incidencias.') : '.') : '';
    const si = await this.ui.confirmar({ titulo: '¿Eliminar la declaración?', texto: d.numeroDeclaracion + ' se eliminará de forma definitiva.' + extra });
    if (!si) return;
    await this.ejecutar(() => this.datos.eliminarDeclaracion(d.id), 'Declaración ' + d.numeroDeclaracion + ' eliminada.');
  }

  async eliminarMercancia(m: Mercancia): Promise<void> {
    const ni = this.datos.incidencias().filter(x => x.mercanciaId === m.id).length;
    const extra = ni ? ' También se eliminarán sus ' + ni + (ni === 1 ? ' incidencia.' : ' incidencias.') : '';
    const si = await this.ui.confirmar({ titulo: '¿Eliminar la mercancía?', texto: '«' + m.descripcion + '» se eliminará de forma definitiva.' + extra });
    if (!si) return;
    await this.ejecutar(() => this.datos.eliminarMercancia(m.id), 'Mercancía eliminada.');
  }

  async eliminarIncidencia(i: Incidencia): Promise<void> {
    const si = await this.ui.confirmar({
      titulo: '¿Eliminar la incidencia?',
      texto: 'Se eliminará de forma definitiva el registro de ' + (NOMBRE_TIPO_INC[i.tipo] || 'la incidencia').toLowerCase() + ' del ' + fechaCorta(i.fecha) + '.'
    });
    if (!si) return;
    await this.ejecutar(() => this.datos.eliminarIncidencia(i.id), 'Incidencia eliminada.');
  }

  private async ejecutar(operacion: () => Promise<void>, exito: string): Promise<void> {
    try {
      await operacion();
      this.avisos.ok(exito);
      await this.datos.cargarTodo();
    } catch (e) {
      this.avisos.error(e instanceof ErrorApi ? e.message : 'No se pudo completar la operación.');
    }
  }
}
