import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ErrorApi } from './error-api';
import { SesionService } from './sesion.service';

// Interceptor: convierte cualquier fallo HTTP en un ErrorApi con mensaje en español.
// Si el servidor dice 401 (sesión vencida), manda al login automáticamente.
export const interceptorErrores: HttpInterceptorFn = (req, next) => {
  const injector = inject(Injector);
  return next(req).pipe(
    catchError((e: unknown) => {
      if (!(e instanceof HttpErrorResponse)) return throwError(() => e);
      if (e.status === 0) return throwError(() => new ErrorApi(0, 'No se pudo conectar con el servidor.'));
      if (e.status === 401 && !req.url.startsWith('/api/auth')) {
        injector.get(SesionService).expirar('Tu sesión terminó. Inicia sesión otra vez.');
        return throwError(() => new ErrorApi(401, 'Tu sesión terminó. Inicia sesión otra vez.'));
      }
      const cuerpo = e.error as { mensaje?: string; campos?: Record<string, string> } | null;
      return throwError(() => new ErrorApi(e.status, cuerpo?.mensaje || 'Error ' + e.status, cuerpo?.campos));
    })
  );
};
