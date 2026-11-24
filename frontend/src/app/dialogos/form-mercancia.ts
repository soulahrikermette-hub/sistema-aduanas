import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AvisosService } from '../core/avisos.service';
import { DatosService } from '../core/datos.service';
import { Mercancia } from '../core/modelos';
import { UiService } from '../core/ui.service';
import { ordenar } from '../core/util';
import { Ico } from '../compartido/ico';
import { FormularioBase, enfocarPrimerError } from '../compartido/formulario-base';

const CAMPOS = ['declaracionId', 'descripcion', 'partidaArancelaria', 'unidadMedida', 'cantidad', 'valor', 'peso'];

// Ventana para crear o editar una mercancía (siempre pertenece a una declaración)
@Component({
  selector: 'app-form-mercancia',
  imports: [ReactiveFormsModule, Ico],
  templateUrl: './form-mercancia.html'
})
export class FormMercancia extends FormularioBase {
  private datos = inject(DatosService);
  private avisos = inject(AvisosService);
  private ui = inject(UiService);
  private dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  protected editando = signal<Mercancia | null>(null);
  protected form = new FormGroup({
    declaracionId: new FormControl('', { nonNullable: true }),
    descripcion: new FormControl('', { nonNullable: true }),
    partidaArancelaria: new FormControl('', { nonNullable: true }),
    unidadMedida: new FormControl('', { nonNullable: true }),
    cantidad: new FormControl<number | null>(null),
    valor: new FormControl<number | null>(null),
    peso: new FormControl<number | null>(null)
  });

  protected opcionesDeclaracion = computed(() =>
    ordenar(this.datos.declaraciones(), { col: 'numeroDeclaracion', dir: 'asc' }));

  constructor() {
    super();
    this.vigilar(this.form);
    this.ui.registrar({ mercancia: (m, decId) => this.abrir(m, decId) });
  }

  private abrir(m: Mercancia | null, decId?: number | null): void {
    if (this.datos.declaraciones().length === 0) {
      this.avisos.error('Primero registra una declaración: toda mercancía pertenece a una.');
      this.ui.declaracion(null);
      return;
    }
    this.limpiarErrores();
    this.editando.set(m);
    this.form.reset({ declaracionId: '', descripcion: '', partidaArancelaria: '', unidadMedida: '' });
    if (m) {
      this.form.setValue({
        declaracionId: String(m.declaracionId), descripcion: m.descripcion, partidaArancelaria: m.partidaArancelaria,
        unidadMedida: m.unidadMedida, cantidad: m.cantidad, valor: m.valor, peso: m.peso
      });
    } else if (decId) {
      this.form.controls.declaracionId.setValue(String(decId));
    } else if (this.ui.filtroMerDeclaracion()) {
      this.form.controls.declaracionId.setValue(this.ui.filtroMerDeclaracion());
    }
    this.dlg().nativeElement.showModal();
    document.getElementById(this.form.controls.declaracionId.value ? 'f-mer-descripcion' : 'f-mer-declaracion')?.focus();
  }

  protected cerrar(): void { this.dlg().nativeElement.close(); }

  private validar(): boolean {
    const v = this.form.getRawValue();
    let ok = true;
    const mal = (c: string, m: string) => { this.mal(c, m); ok = false; };
    if (!v.declaracionId) mal('declaracionId', 'Elige la declaración a la que pertenece.');
    if (!v.descripcion.trim()) mal('descripcion', 'La descripción es obligatoria.');
    else if (v.descripcion.trim().length > 150) mal('descripcion', 'Máximo 150 caracteres.');
    if (!/^\d{4}\.\d{2}\.\d{2}(\.\d{2})?$/.test(v.partidaArancelaria.trim())) mal('partidaArancelaria', 'Usa el formato 0000.00.00 (por ejemplo 0804.40.00).');
    if (!v.unidadMedida.trim()) mal('unidadMedida', 'Indica la unidad de medida.');
    if (v.cantidad == null || isNaN(v.cantidad) || v.cantidad <= 0) mal('cantidad', 'La cantidad debe ser mayor que 0.');
    if (v.valor == null || isNaN(v.valor) || v.valor <= 0) mal('valor', 'El valor debe ser mayor que 0.');
    if (v.peso != null && (isNaN(v.peso) || v.peso < 0)) mal('peso', 'El peso no puede ser negativo.');
    return ok;
  }

  protected async guardar(): Promise<void> {
    const raiz = this.dlg().nativeElement;
    this.limpiarErrores();
    if (!this.validar()) { enfocarPrimerError(raiz); return; }
    const v = this.form.getRawValue();
    const cuerpo = {
      declaracionId: Number(v.declaracionId),
      descripcion: v.descripcion.trim(),
      partidaArancelaria: v.partidaArancelaria.trim(),
      cantidad: v.cantidad,
      unidadMedida: v.unidadMedida.trim(),
      valor: v.valor,
      peso: v.peso   // null si se deja vacío
    };
    const editando = this.editando();
    this.guardando.set(true);
    try {
      await this.datos.guardarMercancia(editando ? editando.id : null, cuerpo);
      raiz.close();
      this.avisos.ok(editando ? 'Mercancía actualizada.' : 'Mercancía registrada.');
      await this.datos.cargarTodo();
    } catch (e) {
      this.errorDelServidor(e, CAMPOS);
      enfocarPrimerError(raiz);
    } finally {
      this.guardando.set(false);
    }
  }
}
