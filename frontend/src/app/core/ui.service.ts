import { Injectable, signal } from '@angular/core';
import { Declaracion, Incidencia, Mercancia } from './modelos';

export interface PedidoConfirmar { titulo: string; texto: string; boton?: string; }

// Puente entre las páginas y las ventanas (diálogos): una página pide "abre el formulario X"
// y el componente del diálogo, que se registra aquí al crearse, lo abre.
@Injectable({ providedIn: 'root' })
export class UiService {
  private abrirDec: (d: Declaracion | null) => void = () => undefined;
  private abrirMer: (m: Mercancia | null, decId?: number | null) => void = () => undefined;
  private abrirInc: (i: Incidencia | null, merId?: number | null) => void = () => undefined;
  private abrirDet: (id: number) => void = () => undefined;
  private pedirConfirmacion: (p: PedidoConfirmar) => Promise<boolean> = () => Promise.resolve(false);

  // Menú lateral abierto (solo se usa en pantallas chicas)
  readonly menuAbierto = signal(false);

  // Estado elegido en el filtro de declaraciones (el panel lo deja puesto al pulsar un estado)
  readonly filtroDecEstado = signal('');

  // Declaración elegida en el filtro de mercancías (el formulario de mercancía la propone por defecto)
  readonly filtroMerDeclaracion = signal('');

  registrar(h: {
    declaracion?: UiService['abrirDec']; mercancia?: UiService['abrirMer']; incidencia?: UiService['abrirInc'];
    detalle?: UiService['abrirDet']; confirmar?: UiService['pedirConfirmacion'];
  }): void {
    if (h.declaracion) this.abrirDec = h.declaracion;
    if (h.mercancia) this.abrirMer = h.mercancia;
    if (h.incidencia) this.abrirInc = h.incidencia;
    if (h.detalle) this.abrirDet = h.detalle;
    if (h.confirmar) this.pedirConfirmacion = h.confirmar;
  }

  declaracion(d: Declaracion | null = null): void { this.abrirDec(d); }
  mercancia(m: Mercancia | null = null, decId: number | null = null): void { this.abrirMer(m, decId); }
  incidencia(i: Incidencia | null = null, merId: number | null = null): void { this.abrirInc(i, merId); }
  detalle(id: number): void { this.abrirDet(id); }
  confirmar(p: PedidoConfirmar): Promise<boolean> { return this.pedirConfirmacion(p); }
}
