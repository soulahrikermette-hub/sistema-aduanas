# Front end en Angular

El front de la aplicación está hecho en Angular (componentes standalone + signals). Ya viene **compilado
dentro de `src/main/resources/static/`**, así que para usar la app solo necesitas Spring Boot:

    mvn spring-boot:run                                    (con Supabase)
    mvn spring-boot:run -Dspring-boot.run.profiles=local   (sin Supabase: base H2 en memoria)

y abrir http://localhost:8080  (admin / Admin2026*  y  funcionario / Func2026*).

## Solo si quieres modificar el front (necesita Node 20+)

    cd frontend
    npm install
    npm run build      -> recompila y deja el resultado en ../src/main/resources/static
    npm start          -> servidor de desarrollo en http://localhost:4200 (usa el backend en :8080)

## Estructura (src/app)

- core/        servicios: DatosService (datos y llamadas a la API), SesionService (login), AvisosService,
               TemaService, UiService (abre las ventanas), interceptor de errores y guard de rutas.
- compartido/  piezas reutilizables: ícono, encabezado ordenable, paginador, selector de estado, etiquetas, pipes.
- login/       pantalla de inicio de sesión.
- shell/       menú, barra superior y marco de la aplicación.
- paginas/     panel, declaraciones, mercancías, incidencias.
- dialogos/    formularios (declaración, mercancía, incidencia), detalle y confirmación.

El front anterior (HTML/CSS/JS sin framework) quedó respaldado en `../frontend-clasico/`.
