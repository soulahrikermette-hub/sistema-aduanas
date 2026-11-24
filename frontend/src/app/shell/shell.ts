import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AvisosService } from '../core/avisos.service';
import { DatosService } from '../core/datos.service';
import { SesionService } from '../core/sesion.service';
import { TemaService } from '../core/tema.service';
import { UiService } from '../core/ui.service';
import { Ico } from '../compartido/ico';
import { Confirmar } from '../dialogos/confirmar';
import { Detalle } from '../dialogos/detalle';
import { FormDeclaracion } from '../dialogos/form-declaracion';
import { FormIncidencia } from '../dialogos/form-incidencia';
import { FormMercancia } from '../dialogos/form-mercancia';

const VISTAS: Record<string, { titulo: string; boton: string }> = {
  panel: { titulo: 'Panel', boton: 'Nueva declaración' },
  declaraciones: { titulo: 'Declaraciones', boton: 'Nueva declaración' },
  mercancias: { titulo: 'Mercancías', boton: 'Nueva mercancía' },
  incidencias: { titulo: 'Incidencias', boton: 'Nueva incidencia' }
};

// Estructura de la aplicación una vez iniciada la sesión: menú, barra superior, contenido y ventanas
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Ico, FormDeclaracion, FormMercancia, FormIncidencia, Detalle, Confirmar],
  templateUrl: './shell.html'
})
export class Shell {
  protected datos = inject(DatosService);
  protected sesion = inject(SesionService);
  protected tema = inject(TemaService);
  protected ui = inject(UiService);
  protected avisos = inject(AvisosService);
  private router = inject(Router);
  private titulo = inject(Title);

  // Pantalla actual, según la URL (#/panel, #/declaraciones...)
  private url = toSignal(
    this.router.events.pipe(filter(e => e instanceof NavigationEnd), map(() => this.router.url)),
    { initialValue: this.router.url });
  protected vista = computed(() => {
    const v = this.url().split(/[?#]/)[0].replace(/^\/+/, '').split('/')[0];
    return VISTAS[v] ? v : 'panel';
  });
  protected info = computed(() => VISTAS[this.vista()]);

  protected subtitulo = computed(() => {
    if (!this.datos.listo()) return '';
    const nd = this.datos.declaraciones().length, nm = this.datos.mercancias().length, ni = this.datos.incidencias().length;
    switch (this.vista()) {
      case 'panel': return 'Resumen del movimiento aduanero';
      case 'declaraciones': return nd + (nd === 1 ? ' declaración registrada' : ' declaraciones registradas');
      case 'incidencias': return ni + (ni === 1 ? ' incidencia registrada' : ' incidencias registradas');
      default: return nm + (nm === 1 ? ' mercancía registrada' : ' mercancías registradas') + ' en ' + nd + (nd === 1 ? ' declaración' : ' declaraciones');
    }
  });

  protected contador(n: number): string { return this.datos.listo() ? String(n) : '–'; }
  protected inicial = computed(() => (this.sesion.sesion()?.nombre ?? '?').charAt(0));

  constructor() {
    this.datos.cargarTodo();
    // Título de la pestaña y menú cerrado al cambiar de pantalla
    effect(() => {
      this.titulo.setTitle(this.info().titulo + ' · Gestión Aduanera');
      this.url();
      this.ui.menuAbierto.set(false);
    });
  }

  protected nuevo(): void {
    switch (this.vista()) {
      case 'mercancias': this.ui.mercancia(); break;
      case 'incidencias': this.ui.incidencia(); break;
      default: this.ui.declaracion();
    }
  }

  protected async actualizar(): Promise<void> {
    if (await this.datos.cargarTodo()) this.avisos.ok('Datos actualizados.');
  }
}
