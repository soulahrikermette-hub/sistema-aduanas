import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { interceptorErrores } from './core/api';
import { SesionService } from './core/sesion.service';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([interceptorErrores])),
    provideRouter(routes, withHashLocation()),
    // Antes de mostrar nada se pregunta al servidor si ya hay una sesión abierta (por ejemplo, tras recargar)
    provideAppInitializer(() => inject(SesionService).restaurar())
  ]
};
