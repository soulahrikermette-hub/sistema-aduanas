import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { PedidoConfirmar, UiService } from '../core/ui.service';

// Ventana "¿Eliminar?": devuelve una promesa con true (aceptó) o false (canceló)
@Component({
  selector: 'app-confirmar',
  template: `
    <dialog #dlg id="dlg-confirmar" class="angosto" aria-labelledby="conf-titulo" (close)="alCerrar()" (click)="alClic($event)">
      <div class="dialogo-cab">
        <div><h2 id="conf-titulo">{{ titulo() }}</h2><p id="conf-texto">{{ texto() }}</p></div>
      </div>
      <div class="dialogo-pie">
        <button type="button" class="btn" (click)="dlg.close()">Cancelar</button>
        <button type="button" class="btn btn-peligro" (click)="aceptar()">{{ boton() }}</button>
      </div>
    </dialog>
  `
})
export class Confirmar {
  private dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');
  protected titulo = signal('');
  protected texto = signal('');
  protected boton = signal('Eliminar');
  private aceptado = false;
  private resolver: ((v: boolean) => void) | null = null;

  constructor() {
    inject(UiService).registrar({ confirmar: p => this.pedir(p) });
  }

  private pedir(p: PedidoConfirmar): Promise<boolean> {
    return new Promise(resolver => {
      this.titulo.set(p.titulo);
      this.texto.set(p.texto);
      this.boton.set(p.boton || 'Eliminar');
      this.aceptado = false;
      this.resolver = resolver;
      this.dlg().nativeElement.showModal();
    });
  }

  protected aceptar(): void {
    this.aceptado = true;
    this.dlg().nativeElement.close();
  }

  protected alCerrar(): void {
    this.resolver?.(this.aceptado);
    this.resolver = null;
  }

  // Clic en el fondo oscuro = cancelar
  protected alClic(ev: MouseEvent): void {
    if (ev.target === this.dlg().nativeElement) this.dlg().nativeElement.close();
  }
}
