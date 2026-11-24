import { Routes } from '@angular/router';
import { soloConSesion, soloSinSesion } from './core/guards';
import { Login } from './login/login';
import { Declaraciones } from './paginas/declaraciones';
import { Incidencias } from './paginas/incidencias';
import { Mercancias } from './paginas/mercancias';
import { Panel } from './paginas/panel';
import { Shell } from './shell/shell';

// Rutas con # (#/panel, #/declaraciones...) para que Spring Boot no tenga que conocerlas
export const routes: Routes = [
  { path: 'login', component: Login, canActivate: [soloSinSesion] },
  {
    path: '',
    component: Shell,
    canActivate: [soloConSesion],
    children: [
      { path: 'panel', component: Panel },
      { path: 'declaraciones', component: Declaraciones },
      { path: 'mercancias', component: Mercancias },
      { path: 'incidencias', component: Incidencias },
      { path: '', pathMatch: 'full', redirectTo: 'panel' }
    ]
  },
  { path: '**', redirectTo: 'panel' }
];
