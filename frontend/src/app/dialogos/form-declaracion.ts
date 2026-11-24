import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AvisosService } from '../core/avisos.service';
import { DatosService } from '../core/datos.service';
import { Declaracion } from '../core/modelos';
import { UiService } from '../core/ui.service';
import { ESTADOS, NOMBRE_ESTADO, hoyISO } from '../core/util';
import { Ico } from '../compartido/ico';
import { FormularioBase, enfocarPrimerError } from '../compartido/formulario-base';

const CAMPOS = ['numeroDeclaracion', 'fecha', 'tipoOperacion', 'aduana', 'importadorExportador', 'estado'];

// Ventana para crear o editar una declaración
@Component({
  selector: 'app-form-declaracion',
  imports: [ReactiveFormsModule, Ico],
  templateUrl: './form-declaracion.html'
})
export class FormDeclaracion extends FormularioBase {
  private datos = inject(DatosService);
  private avisos = inject(AvisosService);
  private dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  protected readonly estados = ESTADOS;
  protected readonly nombreEstado = NOMBRE_ESTADO;
  protected editando = signal<Declaracion | null>(null);

  protected form = new FormGroup({
    numeroDeclaracion: new FormControl('', { nonNullable: true }),
    fecha: new FormControl('', { nonNullable: true }),
    tipoOperacion: new FormControl('IMPORTACION', { nonNullable: true }),
    aduana: new FormControl('', { nonNullable: true }),
    importadorExportador: new FormControl('', { nonNullable: true }),
    estado: new FormControl('PENDIENTE', { nonNullable: true })
  });

  // Sugerencias al escribir aduana o empresa: las que ya existen
  protected aduanas = computed(() => this.unicos('aduana'));
  protected empresas = computed(() => this.unicos('importadorExportador'));

  constructor() {
    super();
    this.vigilar(this.form);
    inject(UiService).registrar({ declaracion: d => this.abrir(d) });
  }

  private unicos(campo: 'aduana' | 'importadorExportador'): string[] {
    return Array.from(new Set(this.datos.declaraciones().map(d => d[campo]).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es'));
  }

  // Siguiente número libre con el formato DUA-AAAA-00000
  private sugerirNumero(anio: string): string {
    const prefijo = 'DUA-' + anio + '-';
    let maximo = 0;
    for (const d of this.datos.declaraciones()) {
      if (d.numeroDeclaracion?.startsWith(prefijo)) {
        const n = parseInt(d.numeroDeclaracion.slice(prefijo.length), 10);
        if (!isNaN(n) && n > maximo) maximo = n;
      }
    }
    return prefijo + String(maximo + 1).padStart(5, '0');
  }

  protected sugerir(): void {
    const f = this.form.controls.fecha.value;
    const anio = /^\d{4}/.test(f) ? f.slice(0, 4) : String(new Date().getFullYear());
    this.form.controls.numeroDeclaracion.setValue(this.sugerirNumero(anio));
  }

  private abrir(d: Declaracion | null): void {
    this.limpiarErrores();
    this.editando.set(d);
    this.form.reset({ tipoOperacion: 'IMPORTACION', estado: 'PENDIENTE', fecha: hoyISO() });
    if (d) {
      this.form.setValue({
        numeroDeclaracion: d.numeroDeclaracion, fecha: d.fecha, tipoOperacion: d.tipoOperacion,
        aduana: d.aduana, importadorExportador: d.importadorExportador, estado: d.estado
      });
    } else {
      this.form.controls.numeroDeclaracion.setValue(this.sugerirNumero(String(new Date().getFullYear())));
    }
    this.dlg().nativeElement.showModal();
    const campo = document.getElementById('f-dec-numero') as HTMLInputElement | null;
    campo?.focus();
    campo?.select();
  }

  protected cerrar(): void { this.dlg().nativeElement.close(); }

  private validar(): boolean {
    const v = this.form.getRawValue();
    let ok = true;
    const mal = (c: string, m: string) => { this.mal(c, m); ok = false; };
    const numero = v.numeroDeclaracion.trim();
    if (!numero) mal('numeroDeclaracion', 'El número de declaración es obligatorio.');
    else if (numero.length > 30) mal('numeroDeclaracion', 'Máximo 30 caracteres.');
    if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v.fecha)) mal('fecha', 'Elige una fecha válida.');
    if (!v.aduana.trim()) mal('aduana', 'La aduana es obligatoria.');
    else if (v.aduana.trim().length > 80) mal('aduana', 'Máximo 80 caracteres.');
    if (!v.importadorExportador.trim()) mal('importadorExportador', 'Indica el importador o exportador.');
    else if (v.importadorExportador.trim().length > 120) mal('importadorExportador', 'Máximo 120 caracteres.');
    return ok;
  }

  protected async guardar(): Promise<void> {
    const raiz = this.dlg().nativeElement;
    this.limpiarErrores();
    if (!this.validar()) { enfocarPrimerError(raiz); return; }
    const v = this.form.getRawValue();
    const cuerpo: Record<string, string> = {
      numeroDeclaracion: v.numeroDeclaracion.trim(),
      tipoOperacion: v.tipoOperacion,
      fecha: v.fecha,
      aduana: v.aduana.trim(),
      importadorExportador: v.importadorExportador.trim()
    };
    const editando = this.editando();
    if (editando) cuerpo['estado'] = v.estado; // al crear no se envía: el servidor pone PENDIENTE
    this.guardando.set(true);
    try {
      const g = await this.datos.guardarDeclaracion(editando ? editando.id : null, cuerpo);
      raiz.close();
      this.avisos.ok('Declaración ' + g.numeroDeclaracion + (editando ? ' actualizada.' : ' registrada.'));
      await this.datos.cargarTodo();
    } catch (e) {
      this.errorDelServidor(e, CAMPOS);
      enfocarPrimerError(raiz);
    } finally {
      this.guardando.set(false);
    }
  }
}
