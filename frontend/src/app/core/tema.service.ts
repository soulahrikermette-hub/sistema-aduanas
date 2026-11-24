import { Injectable, signal } from '@angular/core';

// Tema oscuro ("noche", por defecto) o claro ("bruma"). El script de index.html ya lo aplica antes de pintar.
@Injectable({ providedIn: 'root' })
export class TemaService {
  readonly oscuro = signal(document.documentElement.getAttribute('data-tema') === 'oscuro');

  alternar(): void {
    const oscuro = !this.oscuro();
    this.oscuro.set(oscuro);
    if (oscuro) document.documentElement.setAttribute('data-tema', 'oscuro');
    else document.documentElement.removeAttribute('data-tema');
    try { localStorage.setItem('aduanas-tema', oscuro ? 'oscuro' : 'claro'); } catch { /* sin almacenamiento: solo dura esta visita */ }
  }
}
