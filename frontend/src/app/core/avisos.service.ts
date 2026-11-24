import { Injectable, signal } from '@angular/core';

export interface Aviso { id: number; texto: string; tipo: 'ok' | 'error'; }

// Mensajitos que aparecen un momento (máximo 3 a la vez)
@Injectable({ providedIn: 'root' })
export class AvisosService {
  readonly lista = signal<Aviso[]>([]);
  private siguiente = 1;

  ok(texto: string): void { this.agregar(texto, 'ok'); }
  error(texto: string): void { this.agregar(texto, 'error'); }

  quitar(id: number): void { this.lista.update(l => l.filter(a => a.id !== id)); }

  private agregar(texto: string, tipo: 'ok' | 'error'): void {
    const id = this.siguiente++;
    this.lista.update(l => [...l.slice(-2), { id, texto, tipo }]);
    setTimeout(() => this.quitar(id), tipo === 'error' ? 6500 : 3800);
  }
}
