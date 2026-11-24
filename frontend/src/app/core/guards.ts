import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SesionService } from './sesion.service';

// Solo deja entrar a la aplicación si hay sesión; si no, va al login
export const soloConSesion: CanActivateFn = () => {
  const s = inject(SesionService);
  return s.sesion() ? true : inject(Router).createUrlTree(['/login']);
};

// El login no tiene sentido si ya hay sesión
export const soloSinSesion: CanActivateFn = () => {
  const s = inject(SesionService);
  return s.sesion() ? inject(Router).createUrlTree(['/panel']) : true;
};
