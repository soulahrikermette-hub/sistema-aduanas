import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AvisosService } from '../core/avisos.service';
import { ErrorApi } from '../core/error-api';
import { SesionService } from '../core/sesion.service';

// Pantalla de inicio de sesión
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html'
})
export class Login {
  protected sesion = inject(SesionService);
  private router = inject(Router);
  private avisos = inject(AvisosService);
  private clave = viewChild.required<ElementRef<HTMLInputElement>>('clave');

  protected form = new FormGroup({
    usuario: new FormControl('', { nonNullable: true }),
    clave: new FormControl('', { nonNullable: true })
  });
  protected errorUsuario = signal('');
  protected errorClave = signal('');
  protected alerta = signal('');
  protected verClave = signal(false);
  protected enviando = signal(false);

  protected async entrar(): Promise<void> {
    const { usuario, clave } = this.form.getRawValue();
    this.errorUsuario.set(usuario.trim() ? '' : 'Escribe tu usuario.');
    this.errorClave.set(clave ? '' : 'Escribe tu contraseña.');
    this.alerta.set('');
    this.sesion.mensajeLogin.set('');
    if (!usuario.trim() || !clave) return;

    this.enviando.set(true);
    try {
      const s = await this.sesion.iniciar(usuario.trim(), clave);
      this.form.controls.clave.setValue('');
      await this.router.navigateByUrl('/panel');
      this.avisos.ok('Bienvenido, ' + s.nombre + '.');
    } catch (e) {
      this.alerta.set(e instanceof ErrorApi ? e.message : 'No se pudo iniciar sesión.');
      this.form.controls.clave.setValue('');
      this.clave().nativeElement.focus();
    } finally {
      this.enviando.set(false);
    }
  }
}
