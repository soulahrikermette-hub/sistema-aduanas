import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

// Componente raíz: solo muestra la pantalla que corresponda a la ruta (login o aplicación)
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet />'
})
export class App {}
