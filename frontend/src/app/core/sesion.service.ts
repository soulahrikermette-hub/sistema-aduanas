import { HttpClient } from '@angular/common/http';
import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Sesion } from './modelos';
import { DatosService } from './datos.service';

// Quién tiene la sesión abierta. El servidor guarda el JWT en una cookie HttpOnly;
// aquí solo guardamos los datos visibles (usuario, nombre, rol).
@Injectable({ providedIn: 'root' })
export class SesionService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private injector = inject(Injector);

  readonly sesion = signal<Sesion | null>(null);
  readonly esAdmin = computed(() => this.sesion()?.rol === 'ADMIN');
  // Mensaje que se muestra en el login (por ejemplo "Tu sesión terminó")
  readonly mensajeLogin = signal('');

  // Al arrancar: ¿ya hay una sesión abierta? (por ejemplo, tras recargar la página)
  async restaurar(): Promise<void> {
    try {
      this.sesion.set(await firstValueFrom(this.http.get<Sesion>('/api/auth/yo')));
    } catch {
      this.sesion.set(null);
    }
  }

  async iniciar(usuario: string, clave: string): Promise<Sesion> {
    const s = await firstValueFrom(this.http.post<Sesion>('/api/auth/login', { usuario, clave }));
    this.mensajeLogin.set('');
    this.sesion.set(s);
    return s;
  }

  async cerrar(): Promise<void> {
    try { await firstValueFrom(this.http.post('/api/auth/logout', {})); } catch { /* si ya había vencido, da igual */ }
    this.salir('');
  }

  // El servidor dijo 401: se limpia todo y se vuelve al login
  expirar(mensaje: string): void {
    if (this.sesion()) this.salir(mensaje);
  }

  private salir(mensaje: string): void {
    this.sesion.set(null);
    this.mensajeLogin.set(mensaje);
    this.injector.get(DatosService).limpiar();
    this.router.navigateByUrl('/login');
  }
}
