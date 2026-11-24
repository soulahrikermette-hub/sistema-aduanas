import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AvisosService } from './avisos.service';
import { ErrorApi } from './error-api';
import { Declaracion, Estadisticas, Incidencia, Mercancia } from './modelos';
import { NOMBRE_ESTADO, NOMBRE_ESTADO_INC } from './util';

// Todo lo que la página sabe en un momento dado + las operaciones contra la API.
// Los componentes solo leen las señales (signals); cuando cambian, la pantalla se redibuja sola.
@Injectable({ providedIn: 'root' })
export class DatosService {
  private http = inject(HttpClient);
  private avisos = inject(AvisosService);

  readonly declaraciones = signal<Declaracion[]>([]);
  readonly mercancias = signal<Mercancia[]>([]);
  readonly incidencias = signal<Incidencia[]>([]);
  readonly estadisticas = signal<Estadisticas | null>(null);
  readonly cargado = signal(false);       // ya llegó la primera respuesta (buena o mala)
  readonly errorCarga = signal(false);

  readonly listo = computed(() => this.cargado() && !this.errorCarga());

  // Suma de mercancías, valor y peso de cada declaración
  readonly resumen = computed(() => {
    const mapa = new Map<number, { n: number; valor: number; peso: number }>();
    for (const m of this.mercancias()) {
      const r = mapa.get(m.declaracionId) ?? { n: 0, valor: 0, peso: 0 };
      r.n += 1;
      r.valor += m.valor || 0;
      r.peso += m.peso || 0;
      mapa.set(m.declaracionId, r);
    }
    return mapa;
  });

  buscarDeclaracion(id: number): Declaracion | undefined { return this.declaraciones().find(d => d.id === id); }
  buscarMercancia(id: number): Mercancia | undefined { return this.mercancias().find(m => m.id === id); }

  limpiar(): void {
    this.declaraciones.set([]);
    this.mercancias.set([]);
    this.incidencias.set([]);
    this.estadisticas.set(null);
    this.cargado.set(false);
    this.errorCarga.set(false);
  }

  // Trae todo a la vez. Devuelve true si salió bien.
  async cargarTodo(): Promise<boolean> {
    try {
      const [d, m, e, i] = await Promise.all([
        firstValueFrom(this.http.get<Declaracion[]>('/api/declaraciones')),
        firstValueFrom(this.http.get<Mercancia[]>('/api/mercancias')),
        firstValueFrom(this.http.get<Estadisticas>('/api/estadisticas')),
        firstValueFrom(this.http.get<Incidencia[]>('/api/incidencias'))
      ]);
      this.declaraciones.set(d || []);
      this.mercancias.set(m || []);
      this.estadisticas.set(e);
      this.incidencias.set(i || []);
      this.errorCarga.set(false);
      this.cargado.set(true);
      return true;
    } catch (err) {
      this.errorCarga.set(true);
      this.cargado.set(true);
      if (!(err instanceof ErrorApi) || err.status !== 401) {
        this.avisos.error(err instanceof ErrorApi ? err.message : 'No se pudo cargar la información.');
      }
      return false;
    }
  }

  // ----- Declaraciones -----
  guardarDeclaracion(id: number | null, cuerpo: unknown): Promise<Declaracion> {
    return firstValueFrom(id ? this.http.put<Declaracion>('/api/declaraciones/' + id, cuerpo)
                             : this.http.post<Declaracion>('/api/declaraciones', cuerpo));
  }

  async eliminarDeclaracion(id: number): Promise<void> {
    await firstValueFrom(this.http.delete('/api/declaraciones/' + id));
  }

  // Cambio rápido de estado: se pinta al instante; si el servidor falla, se vuelve a cargar y regresa el valor real
  async cambiarEstadoDeclaracion(id: number, nuevo: string): Promise<void> {
    const d = this.buscarDeclaracion(id);
    if (!d || d.estado === nuevo) return;
    this.declaraciones.update(l => l.map(x => x.id === id ? { ...x, estado: nuevo } : x));
    try {
      await firstValueFrom(this.http.patch('/api/declaraciones/' + id + '/estado', { estado: nuevo }));
      this.avisos.ok(d.numeroDeclaracion + ' ahora está «' + NOMBRE_ESTADO[nuevo] + '».');
    } catch (err) {
      this.avisos.error(err instanceof ErrorApi ? err.message : 'No se pudo cambiar el estado.');
    }
    await this.cargarTodo();
  }

  // ----- Mercancías -----
  guardarMercancia(id: number | null, cuerpo: unknown): Promise<Mercancia> {
    return firstValueFrom(id ? this.http.put<Mercancia>('/api/mercancias/' + id, cuerpo)
                             : this.http.post<Mercancia>('/api/mercancias', cuerpo));
  }

  async eliminarMercancia(id: number): Promise<void> {
    await firstValueFrom(this.http.delete('/api/mercancias/' + id));
  }

  // ----- Incidencias -----
  guardarIncidencia(id: number | null, cuerpo: unknown): Promise<Incidencia> {
    return firstValueFrom(id ? this.http.put<Incidencia>('/api/incidencias/' + id, cuerpo)
                             : this.http.post<Incidencia>('/api/incidencias', cuerpo));
  }

  async eliminarIncidencia(id: number): Promise<void> {
    await firstValueFrom(this.http.delete('/api/incidencias/' + id));
  }

  async cambiarEstadoIncidencia(id: number, nuevo: string): Promise<void> {
    const i = this.incidencias().find(x => x.id === id);
    if (!i || i.estado === nuevo) return;
    this.incidencias.update(l => l.map(x => x.id === id ? { ...x, estado: nuevo } : x));
    try {
      await firstValueFrom(this.http.patch('/api/incidencias/' + id + '/estado', { estado: nuevo }));
      this.avisos.ok('Incidencia ahora «' + NOMBRE_ESTADO_INC[nuevo] + '».');
    } catch (err) {
      this.avisos.error(err instanceof ErrorApi ? err.message : 'No se pudo cambiar el estado.');
    }
    await this.cargarTodo();
  }
}
