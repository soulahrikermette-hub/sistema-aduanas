import { Pipe, PipeTransform } from '@angular/core';
import { dinero, fechaCorta, fechaHora, numero } from '../core/util';

@Pipe({ name: 'dinero' })
export class DineroPipe implements PipeTransform {
  transform(v: number | null | undefined): string { return dinero(v); }
}

@Pipe({ name: 'numero' })
export class NumeroPipe implements PipeTransform {
  transform(v: number | null | undefined): string { return numero(v); }
}

@Pipe({ name: 'fechaCorta' })
export class FechaCortaPipe implements PipeTransform {
  transform(v: string | null | undefined): string { return fechaCorta(v); }
}

@Pipe({ name: 'fechaHora' })
export class FechaHoraPipe implements PipeTransform {
  transform(v: string | null | undefined): string { return fechaHora(v); }
}
