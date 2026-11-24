import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AvisosService } from '../core/avisos.service';
import { DatosService } from '../core/datos.service';
import { Incidencia } from '../core/modelos';
import { UiService } from '../core/ui.service';
import { ESTADOS_INC, NOMBRE_ESTADO_INC, hoyISO, ordenar } from '../core/util';
import { Ico } from '../compartido/ico';
import { FormularioBase, enfocarPrimerError } from '../compartido/formulario-base';

const CAMPOS = ['mercanciaId', 'tipo', 'fecha', 'cantidadAfectada', 'descripcion', 'estado'];

// Ventana para reportar o editar una incidencia (pérdida, extravío, robo o daño)
@Component({
  selector: 'app-form-incidencia',
  imports: [ReactiveFormsModule, Ico],
  templateUrl: './form-incidencia.html'
})
export class FormIncidencia extends FormularioBase {
  private datos = inject(DatosService);
  private avisos = inject(AvisosService);
  private ui = inject(UiService);
  private dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  protected readonly estados = ESTADOS_INC;
  protected readonly nombreEstado = NOMBRE_ESTADO_INC;
  protected editando = signal<Incidencia | null>(null);

  protected form = new FormGroup({
    mercanciaId: new FormControl('', { nonNullable: true }),
    tipo: new FormControl('PERDIDA', { nonNullable: true }),
    fecha: new FormControl('', { nonNullable: true }),
    cantidadAfectada: new FormControl<number | null>(null),
    descripcion: new FormControl('', { nonNullable: true }),
    estado: new FormControl('ABIERTA', { nonNullable: true })
  });

  protected opcionesMercancia = computed(() => {
    const conEtiqueta = this.datos.mercancias().map(m => ({
      id: m.id,
      etiqueta: (this.datos.buscarDeclaracion(m.declaracionId)?.numeroDeclaracion ?? '?') + ' — ' + m.descripcion
    }));
    return ordenar(conEtiqueta, { col: 'etiqueta', dir: 'asc' });
  });

  constructor() {
    super();
    this.vigilar(this.form);
    this.ui.registrar({ incidencia: (i, merId) => this.abrir(i, merId) });
  }

  private abrir(i: Incidencia | null, merId?: number | null): void {
    if (this.datos.mercancias().length === 0) {
      this.avisos.error('Primero registra una mercancía: toda incidencia es sobre una.');
      return;
    }
    this.limpiarErrores();
    this.editando.set(i);
    this.form.reset({ mercanciaId: '', tipo: 'PERDIDA', estado: 'ABIERTA', fecha: hoyISO(), descripcion: '' });
    if (i) {
      this.form.setValue({
        mercanciaId: String(i.mercanciaId), tipo: i.tipo, fecha: i.fecha,
        cantidadAfectada: i.cantidadAfectada, descripcion: i.descripcion, estado: i.estado
      });
    } else if (merId) {
      this.form.controls.mercanciaId.setValue(String(merId));
    }
    this.dlg().nativeElement.showModal();
    document.getElementById(this.form.controls.mercanciaId.value ? 'f-inc-descripcion' : 'f-inc-mercancia')?.focus();
  }

  protected cerrar(): void { this.dlg().nativeElement.close(); }

  private validar(): boolean {
    const v = this.form.getRawValue();
    let ok = true;
    const mal = (c: string, m: string) => { this.mal(c, m); ok = false; };
    if (!v.mercanciaId) mal('mercanciaId', 'Elige la mercancía afectada.');
    if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v.fecha)) mal('fecha', 'Elige una fecha válida.');
    else if (v.fecha > hoyISO()) mal('fecha', 'La fecha no puede ser futura.');
    if (v.cantidadAfectada != null && (isNaN(v.cantidadAfectada) || v.cantidadAfectada <= 0)) mal('cantidadAfectada', 'Si la indicas, debe ser mayor que 0.');
    const desc = v.descripcion.trim();
    if (!desc) mal('descripcion', 'Cuenta qué pasó.');
    else if (desc.length > 300) mal('descripcion', 'Máximo 300 caracteres.');
    return ok;
  }

  protected async guardar(): Promise<void> {
    const raiz = this.dlg().nativeElement;
    this.limpiarErrores();
    if (!this.validar()) { enfocarPrimerError(raiz); return; }
    const v = this.form.getRawValue();
    const cuerpo: Record<string, unknown> = {
      mercanciaId: Number(v.mercanciaId),
      tipo: v.tipo,
      fecha: v.fecha,
      descripcion: v.descripcion.trim(),
      cantidadAfectada: v.cantidadAfectada   // null si se deja vacío
    };
    const editando = this.editando();
    if (editando) cuerpo['estado'] = v.estado; // al crear no se envía: el servidor pone ABIERTA
    this.guardando.set(true);
    try {
      await this.datos.guardarIncidencia(editando ? editando.id : null, cuerpo);
      raiz.close();
      this.avisos.ok(editando ? 'Incidencia actualizada.' : 'Incidencia registrada.');
      await this.datos.cargarTodo();
    } catch (e) {
      this.errorDelServidor(e, CAMPOS);
      enfocarPrimerError(raiz);
    } finally {
      this.guardando.set(false);
    }
  }
}
