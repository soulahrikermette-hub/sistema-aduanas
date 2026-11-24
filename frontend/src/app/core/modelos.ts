// Tipos de los datos que devuelve la API (coinciden con las entidades de Spring Boot)

export interface Declaracion {
  id: number;
  numeroDeclaracion: string;
  tipoOperacion: string;     // IMPORTACION | EXPORTACION
  fecha: string;             // AAAA-MM-DD
  aduana: string;
  importadorExportador: string;
  estado: string;            // PENDIENTE | EN_REVISION | APROBADA | RECHAZADA
}

export interface Mercancia {
  id: number;
  declaracionId: number;
  descripcion: string;
  partidaArancelaria: string;
  cantidad: number;
  unidadMedida: string;
  valor: number;
  peso: number | null;
}

export interface Incidencia {
  id: number;
  mercanciaId: number;
  declaracionId: number;
  tipo: string;              // PERDIDA | EXTRAVIO | ROBO | DANO
  fecha: string;
  descripcion: string;
  cantidadAfectada: number | null;
  estado: string;            // ABIERTA | EN_INVESTIGACION | RESUELTA
  registradaPor: string;
  fechaRegistro: string;
  modificadaPor: string | null;
  fechaModificacion: string | null;
}

export interface Estadisticas {
  totalDeclaraciones: number;
  porEstado: Record<string, number>;
  importaciones: number;
  exportaciones: number;
  valorTotal: number;
  valorImportacion: number;
  valorExportacion: number;
  totalMercancias: number;
  pesoTotal: number;
  incidenciasSinResolver: number;
}

export interface Sesion {
  usuario: string;
  nombre: string;
  rol: string;               // ADMIN | FUNCIONARIO
}

// Declaración con sus totales calculados (para tablas y reportes)
export interface DeclaracionConTotales extends Declaracion {
  nMercancias: number;
  valor: number;
  peso: number;
}

export interface Orden {
  col: string;
  dir: 'asc' | 'desc';
}
