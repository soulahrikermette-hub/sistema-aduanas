import { signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormGroup } from '@angular/forms';
import { ErrorApi } from '../core/error-api';

// Lo común de los tres formularios: errores por campo, alerta general y botón "Guardando…".
export abstract class FormularioBase {
  readonly errores = signal<Record<string, string>>({});
  readonly alerta = signal('');
  readonly guardando = signal(false);

  err(campo: string): string { return this.errores()[campo] ?? ''; }

  limpiarErrores(): void {
    this.errores.set({});
    this.alerta.set('');
  }

  protected mal(campo: string, mensaje: string): void {
    this.errores.update(e => ({ ...e, [campo]: mensaje }));
  }

  // Al corregir un campo, se quita su mensaje de error. Llamar desde el constructor del formulario.
  protected vigilar(form: FormGroup): void {
    for (const [campo, control] of Object.entries(form.controls) as [string, AbstractControl][]) {
      control.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
        if (this.errores()[campo]) this.errores.update(e => { const { [campo]: _quitado, ...resto } = e; return resto; });
      });
    }
  }

  // Aplica los errores que devolvió el servidor; lo que no tenga campo en el formulario va a la alerta de arriba
  protected errorDelServidor(e: unknown, conocidos: string[]): void {
    if (!(e instanceof ErrorApi)) { this.alerta.set('Ocurrió un error inesperado.'); return; }
    const campos = e.campos || {};
    const claves = Object.keys(campos);
    const sinCampo: string[] = [];
    for (const c of claves) {
      if (conocidos.includes(c)) this.mal(c, campos[c]);
      else sinCampo.push(campos[c]);
    }
    if (claves.length === 0) this.alerta.set(e.message);
    else if (sinCampo.length) this.alerta.set(sinCampo.join(' '));
  }
}

// Lleva el cursor al primer campo con error (se espera un instante a que Angular pinte el aria-invalid)
export function enfocarPrimerError(raiz: HTMLElement): void {
  setTimeout(() => raiz.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0);
}
