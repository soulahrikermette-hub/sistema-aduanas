// Error ya "traducido": lo que mostramos al usuario y los errores por campo del servidor
export class ErrorApi extends Error {
  constructor(public status: number, mensaje: string, public campos: Record<string, string> = {}) {
    super(mensaje);
  }
}
