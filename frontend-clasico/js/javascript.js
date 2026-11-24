/* =========================================================
   Sistema de Gestión Aduanera — lógica de la página (incluye incidencias)
   Secciones:
   1. Datos y utilidades        5. Panel, tablas y detalle
   2. Comunicación con la API   6. Formularios (crear / editar)
   3. Avisos y confirmación     7. Eventos y arranque
   4. Navegación y tema
   ========================================================= */
(function () {
  "use strict";

  /* ---------- 1. Datos y utilidades ---------- */

  // Rutas relativas: la página la sirve el mismo Spring Boot, así que no hay problema de CORS
  var API_DEC = "/api/declaraciones";
  var API_MER = "/api/mercancias";
  var API_INC = "/api/incidencias";
  var API_EST = "/api/estadisticas";
  var API_AUTH = "/api/auth";

  var ESTADOS = ["PENDIENTE", "EN_REVISION", "APROBADA", "RECHAZADA"];
  var NOMBRE_ESTADO = { PENDIENTE: "Pendiente", EN_REVISION: "En revisión", APROBADA: "Aprobada", RECHAZADA: "Rechazada" };
  var NOMBRE_TIPO = { IMPORTACION: "Importación", EXPORTACION: "Exportación" };
  var ESTADOS_INC = ["ABIERTA", "EN_INVESTIGACION", "RESUELTA"];
  var NOMBRE_ESTADO_INC = { ABIERTA: "Abierta", EN_INVESTIGACION: "En investigación", RESUELTA: "Resuelta" };
  var NOMBRE_TIPO_INC = { PERDIDA: "Pérdida", EXTRAVIO: "Extravío", ROBO: "Robo", DANO: "Daño" };
  var VISTAS = {
    panel: { titulo: "Panel", boton: "Nueva declaración" },
    declaraciones: { titulo: "Declaraciones", boton: "Nueva declaración" },
    mercancias: { titulo: "Mercancías", boton: "Nueva mercancía" },
    incidencias: { titulo: "Incidencias", boton: "Nueva incidencia" }
  };
  var TAM_PAGINA = 8;

  // Todo lo que la página sabe en un momento dado
  var estado = {
    declaraciones: [],
    mercancias: [],
    incidencias: [],
    estadisticas: null,
    sesion: null,        // quién tiene la sesión abierta: { usuario, nombre, rol }
    cargado: false,      // ya llegó la primera respuesta (sea buena o mala)
    errorCarga: false,
    vista: "panel",
    detalleId: null,     // id de la declaración abierta en la ventana de detalle
    editDec: null,       // declaración que se está editando (null = nueva)
    editMer: null,       // mercancía que se está editando (null = nueva)
    editInc: null,       // incidencia que se está editando (null = nueva)
    dec: { q: "", tipo: "", estado: "", orden: { col: "fecha", dir: "desc" }, pagina: 1 },
    mer: { q: "", declaracion: "", orden: { col: "valor", dir: "desc" }, pagina: 1 },
    inc: { q: "", tipo: "", estado: "", orden: { col: "fecha", dir: "desc" }, pagina: 1 }
  };

  var formatoDinero = new Intl.NumberFormat("es-PE", { style: "currency", currency: "USD" });
  var formatoNumero = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 });

  function $(id) { return document.getElementById(id); }

  // Evita que un texto escrito por el usuario se interprete como HTML
  function esc(texto) {
    return String(texto == null ? "" : texto)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // Minúsculas y sin tildes, para que "revision" encuentre "revisión"
  function normalizar(texto) {
    return String(texto == null ? "" : texto).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  function dinero(n) { return formatoDinero.format(n || 0); }
  function numero(n) { return formatoNumero.format(n || 0); }

  // "2026-09-06" -> "06 sept 2026" (se arma a mano para evitar desfases de zona horaria)
  function fechaCorta(iso) {
    var p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    if (!p) return iso || "";
    return new Date(+p[1], +p[2] - 1, +p[3]).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
  }

  function hoyISO() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function icono(nombre) { return '<svg class="ico" aria-hidden="true"><use href="#i-' + nombre + '"/></svg>'; }

  function chipTipo(tipo) {
    var clase = tipo === "IMPORTACION" ? "chip-importacion" : "chip-exportacion";
    var ico = tipo === "IMPORTACION" ? "entrada" : "salida";
    return '<span class="chip ' + clase + '">' + icono(ico) + esc(NOMBRE_TIPO[tipo] || tipo) + "</span>";
  }

  function pastilla(est) {
    return '<span class="estado-pill" data-estado="' + esc(est) + '">' + esc(NOMBRE_ESTADO[est] || est) + "</span>";
  }

  // Selector que permite cambiar el estado sin abrir ningún formulario
  function selectorEstado(d) {
    var opciones = ESTADOS.map(function (e) {
      return '<option value="' + e + '"' + (e === d.estado ? " selected" : "") + ">" + NOMBRE_ESTADO[e] + "</option>";
    }).join("");
    return '<span class="estado-wrap" data-estado="' + esc(d.estado) + '">' +
      '<select class="estado-select" data-id="' + d.id + '" aria-label="Estado de ' + esc(d.numeroDeclaracion) + '">' + opciones + "</select></span>";
  }

  // Selector de estado de una incidencia (cambia el seguimiento sin abrir el formulario)
  function selectorEstadoInc(i) {
    var opciones = ESTADOS_INC.map(function (e) {
      return '<option value="' + e + '"' + (e === i.estado ? " selected" : "") + ">" + NOMBRE_ESTADO_INC[e] + "</option>";
    }).join("");
    // Una incidencia resuelta queda cerrada: solo un administrador puede reabrirla (el servidor también lo exige)
    var cerrada = i.estado === "RESUELTA" && !puedeEliminar();
    return '<span class="estado-wrap" data-estado="' + esc(i.estado) + '">' +
      '<select class="estado-select" data-inc="1" data-id="' + i.id + '"' +
      (cerrada ? ' disabled title="Resuelta: solo un administrador puede reabrirla"' : "") +
      ' aria-label="Estado de la incidencia ' + i.id + '">' + opciones + "</select></span>";
  }

  function textoTipoInc(tipo) {
    return '<span class="tipo-inc" data-tipo="' + esc(tipo) + '">' + esc(NOMBRE_TIPO_INC[tipo] || tipo) + "</span>";
  }

  function buscarMercancia(id) {
    return estado.mercancias.find(function (m) { return m.id === id; }) || null;
  }

  // Solo el administrador ve los botones de eliminar (el servidor también lo exige)
  function puedeEliminar() {
    return !!estado.sesion && estado.sesion.rol === "ADMIN";
  }

  function buscarDeclaracion(id) {
    return estado.declaraciones.find(function (d) { return d.id === id; }) || null;
  }

  // Suma de mercancías, valor y peso de cada declaración (para tablas y detalle)
  function resumenPorDeclaracion() {
    var mapa = {};
    estado.mercancias.forEach(function (m) {
      var r = mapa[m.declaracionId] || (mapa[m.declaracionId] = { n: 0, valor: 0, peso: 0 });
      r.n += 1;
      r.valor += m.valor || 0;
      r.peso += m.peso || 0;
    });
    return mapa;
  }

  function comparar(a, b) {
    if (typeof a === "number" && typeof b === "number") return a - b;
    return String(a == null ? "" : a).localeCompare(String(b == null ? "" : b), "es", { numeric: true, sensitivity: "base" });
  }

  function ordenar(lista, orden) {
    var signo = orden.dir === "asc" ? 1 : -1;
    return lista.slice().sort(function (x, y) {
      var r = comparar(x[orden.col], y[orden.col]);
      return r !== 0 ? r * signo : y.id - x.id; // si empatan, lo más nuevo primero
    });
  }

  /* ---------- 2. Comunicación con la API ---------- */

  function ErrorApi(status, mensaje, campos) {
    this.status = status;
    this.message = mensaje;
    this.campos = campos || {};
  }

  // Llama a la API y devuelve el JSON (o null si no hay cuerpo). Lanza ErrorApi si algo falla.
  function api(metodo, url, cuerpo) {
    var opciones = { method: metodo, headers: {} };
    if (cuerpo !== undefined) {
      opciones.headers["Content-Type"] = "application/json";
      opciones.body = JSON.stringify(cuerpo);
    }
    return fetch(url, opciones).then(
      function (resp) {
        if (resp.status === 204) return null;
        return resp.json().catch(function () { return null; }).then(function (datos) {
          // Sesión vencida o cerrada en otro lado: se vuelve a la pantalla de login
          if (resp.status === 401 && url.indexOf(API_AUTH) !== 0) {
            mostrarLogin("Tu sesión terminó. Inicia sesión otra vez.");
            throw new ErrorApi(401, "Tu sesión terminó. Inicia sesión otra vez.", {});
          }
          if (!resp.ok) {
            throw new ErrorApi(resp.status, (datos && datos.mensaje) || ("Error " + resp.status), datos && datos.campos);
          }
          return datos;
        });
      },
      function () { throw new ErrorApi(0, "No se pudo conectar con el servidor.", {}); }
    );
  }

  // Trae declaraciones, mercancías, incidencias y estadísticas a la vez y vuelve a dibujar todo
  function cargarTodo() {
    return Promise.all([api("GET", API_DEC), api("GET", API_MER), api("GET", API_EST), api("GET", API_INC)]).then(
      function (r) {
        estado.declaraciones = r[0] || [];
        estado.mercancias = r[1] || [];
        estado.estadisticas = r[2];
        estado.incidencias = r[3] || [];
        estado.errorCarga = false;
        estado.cargado = true;
        marcarConexion(true);
        dibujarTodo();
      },
      function (err) {
        estado.errorCarga = true;
        estado.cargado = true;
        marcarConexion(false);
        dibujarTodo();
        if (err.status !== 401) aviso(err.message, "error");
      }
    );
  }

  function marcarConexion(ok) {
    $("conexion").setAttribute("data-estado", ok ? "ok" : "error");
    $("conexion-texto").textContent = ok ? "Conectado al servidor" : "Sin conexión con el servidor";
  }

  /* ---------- 3. Avisos y confirmación ---------- */

  function aviso(texto, tipo) {
    var el = document.createElement("div");
    el.className = "aviso " + (tipo === "error" ? "aviso-error" : "aviso-ok");
    el.setAttribute("role", tipo === "error" ? "alert" : "status");
    el.innerHTML = icono(tipo === "error" ? "alerta" : "ok") + "<span>" + esc(texto) + "</span>";
    var quitar = function () { if (el.parentNode) el.parentNode.removeChild(el); };
    el.addEventListener("click", quitar);
    var caja = $("avisos");
    while (caja.children.length >= 3) caja.removeChild(caja.firstChild); // máximo 3 avisos a la vez
    caja.appendChild(el);
    setTimeout(quitar, tipo === "error" ? 6500 : 3800);
  }

  // Ventana de confirmación; devuelve una promesa con true (aceptó) o false (canceló)
  function confirmar(titulo, texto, textoBoton) {
    return new Promise(function (resolver) {
      var dlg = $("dlg-confirmar");
      var aceptado = false;
      $("conf-titulo").textContent = titulo;
      $("conf-texto").textContent = texto;
      $("conf-aceptar").textContent = textoBoton || "Eliminar";
      var alAceptar = function () { aceptado = true; dlg.close(); };
      var alCerrar = function () {
        $("conf-aceptar").removeEventListener("click", alAceptar);
        dlg.removeEventListener("close", alCerrar);
        resolver(aceptado);
      };
      $("conf-aceptar").addEventListener("click", alAceptar);
      dlg.addEventListener("close", alCerrar);
      dlg.showModal();
    });
  }

  /* ---------- 4. Navegación y tema ---------- */

  function vistaDesdeHash() {
    var v = (location.hash || "").replace(/^#\/?/, "");
    return VISTAS[v] ? v : "panel";
  }

  function mostrarVista() {
    estado.vista = vistaDesdeHash();
    Object.keys(VISTAS).forEach(function (v) {
      $("vista-" + v).hidden = v !== estado.vista;
    });
    document.querySelectorAll(".nav a").forEach(function (a) {
      if (a.getAttribute("data-vista") === estado.vista) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    $("titulo").textContent = VISTAS[estado.vista].titulo;
    $("btn-nuevo-texto").textContent = VISTAS[estado.vista].boton;
    cerrarMenu();
    dibujarSubtitulo();
    document.title = VISTAS[estado.vista].titulo + " · Gestión Aduanera";
  }

  function dibujarSubtitulo() {
    var nd = estado.declaraciones.length, nm = estado.mercancias.length;
    var t = "";
    if (estado.cargado && !estado.errorCarga) {
      if (estado.vista === "panel") t = "Resumen del movimiento aduanero";
      else if (estado.vista === "declaraciones") t = nd + (nd === 1 ? " declaración registrada" : " declaraciones registradas");
      else if (estado.vista === "incidencias") { var ni = estado.incidencias.length; t = ni + (ni === 1 ? " incidencia registrada" : " incidencias registradas"); }
      else t = nm + (nm === 1 ? " mercancía registrada" : " mercancías registradas") + " en " + nd + (nd === 1 ? " declaración" : " declaraciones");
    }
    $("subtitulo").textContent = t;
  }

  function abrirMenu() { $("lateral").classList.add("abierto"); $("cortina").classList.add("visible"); }
  function cerrarMenu() { $("lateral").classList.remove("abierto"); $("cortina").classList.remove("visible"); }

  function aplicarTema(oscuro) {
    if (oscuro) document.documentElement.setAttribute("data-tema", "oscuro");
    else document.documentElement.removeAttribute("data-tema");
    $("btn-tema-texto").textContent = oscuro ? "Tema claro" : "Tema oscuro";
    $("btn-tema").querySelector("use").setAttribute("href", oscuro ? "#i-sol" : "#i-luna");
  }

  function alternarTema() {
    var oscuro = document.documentElement.getAttribute("data-tema") !== "oscuro";
    aplicarTema(oscuro);
    try { localStorage.setItem("aduanas-tema", oscuro ? "oscuro" : "claro"); } catch (e) { /* sin almacenamiento: solo dura esta visita */ }
  }

  /* ---------- 5. Panel, tablas y detalle ---------- */

  function htmlCargando() {
    var filas = "";
    for (var i = 0; i < 5; i++) filas += '<span class="sk"></span>';
    return '<div style="display:grid;gap:16px;padding:20px" aria-busy="true">' + filas + "</div>";
  }

  function htmlError() {
    return '<div class="vacio error-carga">' + icono("alerta") + "<h3>No se pudo cargar la información</h3>" +
      "<p>Revisa que la aplicación Spring Boot siga en ejecución e inténtalo otra vez.</p>" +
      '<button type="button" class="btn" data-accion="reintentar">' + icono("refrescar") + "Reintentar</button></div>";
  }

  function htmlVacio(titulo, texto, boton) {
    return '<div class="vacio">' + icono("vacio") + "<h3>" + esc(titulo) + "</h3><p>" + esc(texto) + "</p>" + (boton || "") + "</div>";
  }

  // Devuelve el HTML de la tabla y deja en el contenedor lo que corresponda (carga, error o vacío)
  function construirTabla(clave, columnas, filas, orden) {
    var cab = columnas.map(function (c) {
      var cls = (c.num ? "num " : "") + (c.fija ? "acciones-col " : "");
      if (!c.clave) return '<th class="' + cls + 'sin-orden"><span class="solo-lectores">' + esc(c.titulo) + "</span></th>";
      var sentido = orden.col === c.clave ? (orden.dir === "asc" ? "ascending" : "descending") : "none";
      return '<th class="' + cls + '" aria-sort="' + sentido + '"><button type="button" class="th-orden" data-accion="ordenar" data-tabla="' +
        clave + '" data-col="' + c.clave + '"' + (c.ayuda ? ' title="' + esc(c.ayuda) + '"' : "") + ">" + esc(c.titulo) + "</button></th>";
    }).join("");
    var cuerpo = filas.map(function (f) {
      return "<tr>" + columnas.map(function (c) {
        return '<td class="' + (c.num ? "num " : "") + (c.corto ? "corto " : "") + (c.nowrap ? "nowrap " : "") + (c.fija ? "acciones-col" : "") + '"' + (c.corto ? ' title="' + esc(c.texto ? c.texto(f) : "") + '"' : "") + ">" + c.celda(f) + "</td>";
      }).join("") + "</tr>";
    }).join("");
    return '<table class="tabla"><thead><tr>' + cab + "</tr></thead><tbody>" + cuerpo + "</tbody></table>";
  }

  // Lista de páginas a mostrar: 1 … 4 5 6 … 12
  function paginasVisibles(actual, total) {
    if (total <= 7) return Array.from({ length: total }, function (_, i) { return i + 1; });
    var set = {};
    [1, total, actual - 1, actual, actual + 1].forEach(function (p) { if (p >= 1 && p <= total) set[p] = true; });
    var lista = Object.keys(set).map(Number).sort(function (a, b) { return a - b; });
    var res = [];
    lista.forEach(function (p, i) {
      if (i > 0 && p - lista[i - 1] > 1) res.push(0); // 0 = puntos suspensivos
      res.push(p);
    });
    return res;
  }

  function pieTabla(clave, total, pagina, totalPaginas) {
    if (total === 0) return "";
    var desde = (pagina - 1) * TAM_PAGINA + 1;
    var hasta = Math.min(pagina * TAM_PAGINA, total);
    var html = "<span>Mostrando " + desde + "–" + hasta + " de " + total + "</span>";
    if (totalPaginas > 1) {
      html += '<nav class="paginas" aria-label="Páginas">';
      html += '<button type="button" data-accion="pagina" data-tabla="' + clave + '" data-p="' + (pagina - 1) + '" aria-label="Página anterior"' + (pagina === 1 ? " disabled" : "") + ">‹</button>";
      paginasVisibles(pagina, totalPaginas).forEach(function (p) {
        if (p === 0) html += '<button type="button" disabled>…</button>';
        else html += '<button type="button" data-accion="pagina" data-tabla="' + clave + '" data-p="' + p + '"' + (p === pagina ? ' aria-current="page"' : "") + ">" + p + "</button>";
      });
      html += '<button type="button" data-accion="pagina" data-tabla="' + clave + '" data-p="' + (pagina + 1) + '" aria-label="Página siguiente"' + (pagina === totalPaginas ? " disabled" : "") + ">›</button></nav>";
    }
    return html;
  }

  // ----- Declaraciones filtradas, ordenadas y con sus totales -----
  function declaracionesVisibles() {
    var res = resumenPorDeclaracion();
    var f = estado.dec;
    var q = normalizar(f.q).trim();
    var lista = estado.declaraciones.map(function (d) {
      var r = res[d.id] || { n: 0, valor: 0, peso: 0 };
      return Object.assign({}, d, { nMercancias: r.n, valor: r.valor, peso: r.peso });
    }).filter(function (d) {
      if (f.tipo && d.tipoOperacion !== f.tipo) return false;
      if (f.estado && d.estado !== f.estado) return false;
      if (!q) return true;
      var texto = normalizar([d.numeroDeclaracion, d.importadorExportador, d.aduana, NOMBRE_TIPO[d.tipoOperacion], NOMBRE_ESTADO[d.estado]].join(" "));
      return texto.indexOf(q) !== -1;
    });
    return ordenar(lista, f.orden);
  }

  function dibujarDeclaraciones() {
    var cont = $("dec-tabla"), pie = $("dec-pie");
    if (!estado.cargado) { cont.innerHTML = htmlCargando(); pie.innerHTML = ""; return; }
    if (estado.errorCarga) { cont.innerHTML = htmlError(); pie.innerHTML = ""; return; }
    if (estado.declaraciones.length === 0) {
      cont.innerHTML = htmlVacio("Aún no hay declaraciones", "Registra la primera para empezar a llevar el control de tus operaciones.",
        '<button type="button" class="btn btn-primario" data-accion="nueva-dec">' + icono("plus") + "Nueva declaración</button>");
      pie.innerHTML = "";
      return;
    }
    var lista = declaracionesVisibles();
    if (lista.length === 0) {
      cont.innerHTML = htmlVacio("Sin resultados", "Ninguna declaración coincide con la búsqueda o los filtros.",
        '<button type="button" class="btn" data-accion="limpiar-dec">Limpiar filtros</button>');
      pie.innerHTML = "";
      return;
    }
    var totalPaginas = Math.ceil(lista.length / TAM_PAGINA);
    if (estado.dec.pagina > totalPaginas) estado.dec.pagina = totalPaginas;
    var pagina = estado.dec.pagina;
    var visibles = lista.slice((pagina - 1) * TAM_PAGINA, pagina * TAM_PAGINA);
    var columnas = [
      { clave: "numeroDeclaracion", titulo: "Número", celda: function (d) { return '<button type="button" class="enlace-numero" data-accion="ver-dec" data-id="' + d.id + '">' + esc(d.numeroDeclaracion) + "</button>"; } },
      { clave: "tipoOperacion", titulo: "Tipo", celda: function (d) { return chipTipo(d.tipoOperacion); } },
      { clave: "fecha", titulo: "Fecha", nowrap: true, celda: function (d) { return esc(fechaCorta(d.fecha)); } },
      { clave: "importadorExportador", titulo: "Importador / Exportador", corto: true, texto: function (d) { return d.importadorExportador + " · " + d.aduana; },
        celda: function (d) { return esc(d.importadorExportador) + '<span class="segunda-linea">' + esc(d.aduana) + "</span>"; } },
      { clave: "estado", titulo: "Estado", celda: selectorEstado },
      { clave: "nMercancias", titulo: "Merc.", ayuda: "Cantidad de mercancías", num: true, celda: function (d) { return d.nMercancias; } },
      { clave: "valor", titulo: "Valor", num: true, celda: function (d) { return d.nMercancias ? dinero(d.valor) : '<span class="apagado">—</span>'; } },
      { titulo: "Acciones", fija: true, celda: function (d) {
        return '<div class="acciones">' +
          '<button type="button" class="btn btn-icono" data-accion="ver-dec" data-id="' + d.id + '" title="Ver detalle" aria-label="Ver detalle de ' + esc(d.numeroDeclaracion) + '">' + icono("ojo") + "</button>" +
          '<button type="button" class="btn btn-icono" data-accion="editar-dec" data-id="' + d.id + '" title="Editar" aria-label="Editar ' + esc(d.numeroDeclaracion) + '">' + icono("editar") + "</button>" +
          (puedeEliminar() ? '<button type="button" class="btn btn-icono peligro" data-accion="eliminar-dec" data-id="' + d.id + '" title="Eliminar" aria-label="Eliminar ' + esc(d.numeroDeclaracion) + '">' + icono("borrar") + "</button>" : "") + "</div>";
      } }
    ];
    cont.innerHTML = construirTabla("dec", columnas, visibles, estado.dec.orden);
    pie.innerHTML = pieTabla("dec", lista.length, pagina, totalPaginas);
  }

  // ----- Mercancías filtradas y ordenadas -----
  function mercanciasVisibles() {
    var f = estado.mer;
    var q = normalizar(f.q).trim();
    var lista = estado.mercancias.map(function (m) {
      var d = buscarDeclaracion(m.declaracionId);
      return Object.assign({}, m, { numeroDeclaracion: d ? d.numeroDeclaracion : "(eliminada)" });
    }).filter(function (m) {
      if (f.declaracion && String(m.declaracionId) !== f.declaracion) return false;
      if (!q) return true;
      return normalizar([m.descripcion, m.partidaArancelaria, m.numeroDeclaracion].join(" ")).indexOf(q) !== -1;
    });
    return ordenar(lista, f.orden);
  }

  // Columnas de mercancías; la tabla del detalle reutiliza una versión reducida
  function columnasMercancias(completa) {
    var accion = { titulo: "Acciones", fija: true, celda: function (m) {
      return '<div class="acciones">' +
        '<button type="button" class="btn btn-icono" data-accion="nueva-inc" data-mer="' + m.id + '" title="Reportar incidencia" aria-label="Reportar incidencia de ' + esc(m.descripcion) + '">' + icono("alerta") + "</button>" +
        '<button type="button" class="btn btn-icono" data-accion="editar-mer" data-id="' + m.id + '" title="Editar" aria-label="Editar ' + esc(m.descripcion) + '">' + icono("editar") + "</button>" +
        (puedeEliminar() ? '<button type="button" class="btn btn-icono peligro" data-accion="eliminar-mer" data-id="' + m.id + '" title="Eliminar" aria-label="Eliminar ' + esc(m.descripcion) + '">' + icono("borrar") + "</button>" : "") + "</div>";
    } };
    var cols = [
      { clave: "descripcion", titulo: "Descripción", corto: true, texto: function (m) { return m.descripcion; }, celda: function (m) { return esc(m.descripcion); } },
      { clave: "partidaArancelaria", titulo: "Partida", celda: function (m) { return '<span class="mono">' + esc(m.partidaArancelaria) + "</span>"; } }
    ];
    if (completa) {
      cols.push({ clave: "numeroDeclaracion", titulo: "Declaración", celda: function (m) {
        return '<button type="button" class="enlace-numero" data-accion="ver-dec" data-id="' + m.declaracionId + '">' + esc(m.numeroDeclaracion) + "</button>";
      } });
    }
    cols.push({ clave: "cantidad", titulo: "Cantidad", num: true, celda: function (m) { return numero(m.cantidad) + ' <span class="apagado">' + esc(m.unidadMedida) + "</span>"; } });
    cols.push({ clave: "valor", titulo: "Valor", num: true, celda: function (m) { return dinero(m.valor); } });
    if (completa) {
      cols.push({ clave: "peso", titulo: "Peso", num: true, celda: function (m) { return m.peso ? numero(m.peso) + ' <span class="apagado">kg</span>' : '<span class="apagado">—</span>'; } });
    }
    cols.push(accion);
    return cols;
  }

  function dibujarMercancias() {
    var cont = $("mer-tabla"), pie = $("mer-pie");
    if (!estado.cargado) { cont.innerHTML = htmlCargando(); pie.innerHTML = ""; return; }
    if (estado.errorCarga) { cont.innerHTML = htmlError(); pie.innerHTML = ""; return; }
    if (estado.mercancias.length === 0) {
      cont.innerHTML = htmlVacio("Aún no hay mercancías", "Las mercancías se registran dentro de una declaración.",
        '<button type="button" class="btn btn-primario" data-accion="nueva-mer">' + icono("plus") + "Nueva mercancía</button>");
      pie.innerHTML = "";
      return;
    }
    var lista = mercanciasVisibles();
    if (lista.length === 0) {
      cont.innerHTML = htmlVacio("Sin resultados", "Ninguna mercancía coincide con la búsqueda o el filtro.",
        '<button type="button" class="btn" data-accion="limpiar-mer">Limpiar filtros</button>');
      pie.innerHTML = "";
      return;
    }
    var totalPaginas = Math.ceil(lista.length / TAM_PAGINA);
    if (estado.mer.pagina > totalPaginas) estado.mer.pagina = totalPaginas;
    var pagina = estado.mer.pagina;
    cont.innerHTML = construirTabla("mer", columnasMercancias(true), lista.slice((pagina - 1) * TAM_PAGINA, pagina * TAM_PAGINA), estado.mer.orden);
    pie.innerHTML = pieTabla("mer", lista.length, pagina, totalPaginas);
  }

  // ----- Incidencias filtradas y ordenadas -----
  function incidenciasVisibles() {
    var f = estado.inc;
    var q = normalizar(f.q).trim();
    var lista = estado.incidencias.map(function (i) {
      var m = buscarMercancia(i.mercanciaId);
      var d = buscarDeclaracion(i.declaracionId);
      return Object.assign({}, i, {
        mercancia: m ? m.descripcion : "(eliminada)",
        numeroDeclaracion: d ? d.numeroDeclaracion : "(eliminada)"
      });
    }).filter(function (i) {
      if (f.tipo && i.tipo !== f.tipo) return false;
      if (f.estado && i.estado !== f.estado) return false;
      if (!q) return true;
      return normalizar([i.mercancia, i.numeroDeclaracion, i.descripcion, NOMBRE_TIPO_INC[i.tipo], NOMBRE_ESTADO_INC[i.estado], i.registradaPor].join(" ")).indexOf(q) !== -1;
    });
    return ordenar(lista, f.orden);
  }

  function dibujarIncidencias() {
    var cont = $("inc-tabla"), pie = $("inc-pie");
    if (!estado.cargado) { cont.innerHTML = htmlCargando(); pie.innerHTML = ""; return; }
    if (estado.errorCarga) { cont.innerHTML = htmlError(); pie.innerHTML = ""; return; }
    if (estado.incidencias.length === 0) {
      cont.innerHTML = htmlVacio("Sin incidencias", "Aquí se registran las pérdidas, extravíos, robos y daños de las mercancías.",
        '<button type="button" class="btn btn-primario" data-accion="nueva-inc">' + icono("plus") + "Nueva incidencia</button>");
      pie.innerHTML = "";
      return;
    }
    var lista = incidenciasVisibles();
    if (lista.length === 0) {
      cont.innerHTML = htmlVacio("Sin resultados", "Ninguna incidencia coincide con la búsqueda o los filtros.",
        '<button type="button" class="btn" data-accion="limpiar-inc">Limpiar filtros</button>');
      pie.innerHTML = "";
      return;
    }
    var totalPaginas = Math.ceil(lista.length / TAM_PAGINA);
    if (estado.inc.pagina > totalPaginas) estado.inc.pagina = totalPaginas;
    var pagina = estado.inc.pagina;
    var columnas = [
      { clave: "fecha", titulo: "Fecha", nowrap: true, celda: function (i) { return esc(fechaCorta(i.fecha)); } },
      { clave: "tipo", titulo: "Tipo", celda: function (i) { return textoTipoInc(i.tipo); } },
      { clave: "mercancia", titulo: "Mercancía", corto: true, texto: function (i) { return i.mercancia + " · " + i.descripcion; },
        celda: function (i) { return esc(i.mercancia) + '<span class="segunda-linea">' + esc(i.descripcion) + "</span>"; } },
      { clave: "numeroDeclaracion", titulo: "Declaración", celda: function (i) {
        return '<button type="button" class="enlace-numero" data-accion="ver-dec" data-id="' + i.declaracionId + '">' + esc(i.numeroDeclaracion) + "</button>";
      } },
      { clave: "cantidadAfectada", titulo: "Afectado", num: true, celda: function (i) {
        var m = buscarMercancia(i.mercanciaId);
        return i.cantidadAfectada ? numero(i.cantidadAfectada) + (m ? ' <span class="apagado">' + esc(m.unidadMedida) + "</span>" : "") : '<span class="apagado">—</span>';
      } },
      { clave: "estado", titulo: "Estado", celda: selectorEstadoInc },
      { clave: "registradaPor", titulo: "Registró", ayuda: "Usuario que la registró (lo pone el servidor)", celda: function (i) {
        return esc(i.registradaPor) + '<span class="segunda-linea">' + esc((i.fechaRegistro || "").replace("T", " ").slice(0, 16)) + "</span>" +
          (i.modificadaPor ? '<span class="segunda-linea">Modificada por ' + esc(i.modificadaPor) + " · " + esc((i.fechaModificacion || "").replace("T", " ").slice(0, 16)) + "</span>" : "");
      } },
      { titulo: "Acciones", fija: true, celda: function (i) {
        var bloqueada = i.estado === "RESUELTA";
        return '<div class="acciones">' +
          '<button type="button" class="btn btn-icono" data-accion="editar-inc" data-id="' + i.id + '"' +
          (bloqueada ? ' disabled title="Resuelta: reábrela (solo administrador) para editarla"' : ' title="Editar"') +
          ' aria-label="Editar la incidencia ' + i.id + '">' + icono("editar") + "</button>" +
          (puedeEliminar() ? '<button type="button" class="btn btn-icono peligro" data-accion="eliminar-inc" data-id="' + i.id + '" title="Eliminar" aria-label="Eliminar la incidencia ' + i.id + '">' + icono("borrar") + "</button>" : "") + "</div>";
      } }
    ];
    cont.innerHTML = construirTabla("inc", columnas, lista.slice((pagina - 1) * TAM_PAGINA, pagina * TAM_PAGINA), estado.inc.orden);
    pie.innerHTML = pieTabla("inc", lista.length, pagina, totalPaginas);
  }

  // ----- Panel principal -----
  function dibujarPanel() {
    var pe = $("panel-estados"), pv = $("panel-valores"), pr = $("panel-recientes"), pt = $("panel-top");
    if (!estado.cargado) { [pe, pv, pr, pt].forEach(function (c) { c.innerHTML = htmlCargando(); }); return; }
    if (estado.errorCarga) { pe.innerHTML = htmlError(); [pv, pr, pt].forEach(function (c) { c.innerHTML = ""; }); return; }
    var s = estado.estadisticas;

    // Declaraciones por estado
    var total = s.totalDeclaraciones;
    if (total === 0) {
      pe.innerHTML = htmlVacio("Sin declaraciones todavía", "Cuando registres declaraciones verás aquí cómo avanzan.");
    } else {
      var barra = ESTADOS.filter(function (e) { return (s.porEstado[e] || 0) > 0; }).map(function (e) {
        return '<span style="flex:' + s.porEstado[e] + ";--c:var(--est-" + e.toLowerCase() + ')" title="' + NOMBRE_ESTADO[e] + ": " + s.porEstado[e] + '"></span>';
      }).join("");
      var leyenda = ESTADOS.map(function (e) {
        return '<li><button type="button" data-accion="filtrar-estado" data-estado="' + e + '" style="--c:var(--est-' + e.toLowerCase() + ');--n:' + (s.porEstado[e] || 0) + '">' +
          '<span class="punto"></span><span class="nombre">' + NOMBRE_ESTADO[e] + "</span><strong>" + (s.porEstado[e] || 0) + "</strong></button></li>";
      }).join("");
      pe.innerHTML = '<div class="cifra-grande"><strong>' + total + "</strong><span>" + (total === 1 ? "declaración" : "declaraciones") + "</span></div>" +
        '<p class="sub">' + s.importaciones + (s.importaciones === 1 ? " importación" : " importaciones") + " · " + s.exportaciones + (s.exportaciones === 1 ? " exportación" : " exportaciones") + "</p>" +
        '<div class="barra-estados" role="img" aria-label="Reparto de declaraciones por estado">' + barra + "</div>" +
        '<ul class="leyenda">' + leyenda + "</ul>";
    }

    // Valor declarado
    var vt = s.valorTotal || 0;
    var pImp = vt ? (s.valorImportacion / vt) * 100 : 0;
    var pExp = vt ? (s.valorExportacion / vt) * 100 : 0;
    pv.innerHTML = '<div class="valor-grande">' + dinero(vt) + "</div>" +
      '<p class="sub">Suma de todas las mercancías registradas</p>' +
      '<div class="reparto">' +
      '<div class="reparto-fila"><div class="etiqueta"><span>Importación</span><strong>' + dinero(s.valorImportacion) + '</strong></div><div class="reparto-barra"><span style="width:' + pImp.toFixed(1) + '%;--c:var(--import-fg)"></span></div></div>' +
      '<div class="reparto-fila"><div class="etiqueta"><span>Exportación</span><strong>' + dinero(s.valorExportacion) + '</strong></div><div class="reparto-barra"><span style="width:' + pExp.toFixed(1) + '%;--c:var(--export-fg)"></span></div></div>' +
      "</div>" +
      '<div class="mini-cifras"><div><strong>' + s.totalMercancias + "</strong><span>mercancías</span></div><div><strong>" + numero(s.pesoTotal) + " kg</strong><span>peso total</span></div>" +
      '<div><a class="cifra-enlace" href="#/incidencias"><strong>' + (s.incidenciasSinResolver || 0) + "</strong><span>incidencias sin resolver</span></a></div></div>";

    // Últimas declaraciones (por fecha)
    var res = resumenPorDeclaracion();
    var recientes = ordenar(estado.declaraciones.map(function (d) {
      return Object.assign({}, d, { valor: (res[d.id] || { valor: 0 }).valor });
    }), { col: "fecha", dir: "desc" }).slice(0, 5);
    if (recientes.length === 0) {
      pr.innerHTML = htmlVacio("Nada por mostrar", "Aquí aparecerán las últimas declaraciones registradas.");
    } else {
      pr.innerHTML = '<table class="tabla" style="min-width:0"><thead><tr><th class="sin-orden">Número</th><th class="sin-orden">Tipo</th><th class="sin-orden">Estado</th><th class="sin-orden num">Valor</th></tr></thead><tbody>' +
        recientes.map(function (d) {
          return '<tr><td><button type="button" class="enlace-numero" data-accion="ver-dec" data-id="' + d.id + '">' + esc(d.numeroDeclaracion) + "</button>" +
            '<div class="apagado" style="font-size:12.5px">' + esc(fechaCorta(d.fecha)) + "</div></td><td>" + chipTipo(d.tipoOperacion) + "</td><td>" + pastilla(d.estado) +
            '</td><td class="num">' + (d.valor ? dinero(d.valor) : '<span class="apagado">—</span>') + "</td></tr>";
        }).join("") + "</tbody></table>";
    }

    // Mercancías de mayor valor
    var top = estado.mercancias.slice().sort(function (a, b) { return b.valor - a.valor; }).slice(0, 5);
    if (top.length === 0) {
      pt.innerHTML = htmlVacio("Nada por mostrar", "Aquí aparecerán las mercancías de mayor valor.");
    } else {
      var maximo = top[0].valor || 1;
      pt.innerHTML = '<ul class="lista-top">' + top.map(function (m) {
        var d = buscarDeclaracion(m.declaracionId);
        return '<li><div class="fila"><span class="nombre">' + esc(m.descripcion) + '</span><span class="valor">' + dinero(m.valor) + "</span></div>" +
          '<div class="de">' + esc(d ? d.numeroDeclaracion : "") + " · " + numero(m.cantidad) + " " + esc(m.unidadMedida) + "</div>" +
          '<div class="proporcion"><span style="width:' + ((m.valor / maximo) * 100).toFixed(1) + '%"></span></div></li>';
      }).join("") + "</ul>";
    }
  }

  // ----- Ventana de detalle de una declaración -----
  function dibujarDetalle() {
    var dlg = $("dlg-detalle");
    if (!dlg.open || estado.detalleId == null) return;
    var d = buscarDeclaracion(estado.detalleId);
    if (!d) { dlg.close(); return; }
    var mercs = estado.mercancias.filter(function (m) { return m.declaracionId === d.id; });
    var valor = 0, peso = 0;
    mercs.forEach(function (m) { valor += m.valor || 0; peso += m.peso || 0; });
    $("det-titulo").textContent = d.numeroDeclaracion;
    $("det-sub").textContent = d.importadorExportador;

    var tabla = mercs.length === 0
      ? htmlVacio("Sin mercancías", "Esta declaración todavía no tiene mercancías registradas.")
      : '<div class="detalle-tabla">' + construirTabla("det", columnasMercancias(false), ordenar(mercs, { col: "valor", dir: "desc" }), { col: "", dir: "" }).replace(/data-accion="ordenar"/g, 'data-accion="nada"') + "</div>";

    $("det-cuerpo").innerHTML =
      '<dl class="detalle-datos">' +
      "<div><dt>Tipo de operación</dt><dd>" + chipTipo(d.tipoOperacion) + "</dd></div>" +
      "<div><dt>Estado del trámite</dt><dd>" + selectorEstado(d) + "</dd></div>" +
      "<div><dt>Fecha</dt><dd>" + esc(fechaCorta(d.fecha)) + "</dd></div>" +
      "<div><dt>Aduana</dt><dd>" + esc(d.aduana) + "</dd></div></dl>" +
      '<div class="detalle-resumen"><div><strong>' + mercs.length + "</strong><span>" + (mercs.length === 1 ? "mercancía" : "mercancías") + "</span></div>" +
      "<div><strong>" + dinero(valor) + "</strong><span>valor total</span></div>" +
      "<div><strong>" + numero(peso) + " kg</strong><span>peso total</span></div></div>" +
      '<div class="detalle-lista-cab"><h3>Mercancías de la declaración</h3>' +
      '<button type="button" class="btn btn-chico" data-accion="nueva-mer" data-dec="' + d.id + '">' + icono("plus") + "Agregar mercancía</button></div>" + tabla;
  }

  function abrirDetalle(id) {
    estado.detalleId = id;
    var dlg = $("dlg-detalle");
    if (!dlg.open) dlg.showModal();
    dibujarDetalle();
  }

  // ----- Contadores del menú, listas auxiliares y redibujado general -----
  function dibujarAuxiliares() {
    $("cont-declaraciones").textContent = estado.cargado && !estado.errorCarga ? estado.declaraciones.length : "–";
    $("cont-mercancias").textContent = estado.cargado && !estado.errorCarga ? estado.mercancias.length : "–";
    $("cont-incidencias").textContent = estado.cargado && !estado.errorCarga ? estado.incidencias.length : "–";

    // Filtro de mercancías por declaración (se conserva la selección si aún existe)
    var sel = $("mer-declaracion");
    var actual = estado.mer.declaracion;
    if (actual && !buscarDeclaracion(Number(actual))) { actual = estado.mer.declaracion = ""; }
    sel.innerHTML = '<option value="">Todas las declaraciones</option>' + ordenar(estado.declaraciones, { col: "numeroDeclaracion", dir: "asc" }).map(function (d) {
      return '<option value="' + d.id + '"' + (String(d.id) === actual ? " selected" : "") + ">" + esc(d.numeroDeclaracion) + "</option>";
    }).join("");

    // Sugerencias al escribir aduana o empresa: las que ya existen
    function unicos(campo) {
      var vistos = {};
      estado.declaraciones.forEach(function (d) { if (d[campo]) vistos[d[campo]] = true; });
      return Object.keys(vistos).sort(function (a, b) { return a.localeCompare(b, "es"); });
    }
    $("lista-aduanas").innerHTML = unicos("aduana").map(function (v) { return '<option value="' + esc(v) + '">'; }).join("");
    $("lista-empresas").innerHTML = unicos("importadorExportador").map(function (v) { return '<option value="' + esc(v) + '">'; }).join("");
  }

  function dibujarTodo() {
    dibujarAuxiliares();
    dibujarSubtitulo();
    dibujarPanel();
    dibujarDeclaraciones();
    dibujarMercancias();
    dibujarIncidencias();
    dibujarDetalle();
  }

  // ----- Exportar a CSV -----
  function celdaCsv(v) {
    var t = String(v == null ? "" : v);
    if (/^[=+\-@]/.test(t) && isNaN(Number(t))) t = "'" + t; // evita que Excel lo trate como fórmula
    return '"' + t.replace(/"/g, '""') + '"';
  }

  function descargarCsv(nombre, cabeceras, filas) {
    var texto = [cabeceras].concat(filas).map(function (f) { return f.map(celdaCsv).join(";"); }).join("\r\n");
    var blob = new Blob(["﻿" + texto], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nombre + "-" + hoyISO() + ".csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function exportarDeclaraciones() {
    var lista = declaracionesVisibles();
    if (!lista.length) { aviso("No hay declaraciones para exportar.", "error"); return; }
    descargarCsv("declaraciones",
      ["Número", "Tipo", "Fecha", "Importador/Exportador", "Aduana", "Estado", "Mercancías", "Valor USD"],
      lista.map(function (d) { return [d.numeroDeclaracion, NOMBRE_TIPO[d.tipoOperacion], d.fecha, d.importadorExportador, d.aduana, NOMBRE_ESTADO[d.estado], d.nMercancias, d.valor.toFixed(2)]; }));
    aviso("Se exportaron " + lista.length + " declaraciones.");
  }

  function exportarMercancias() {
    var lista = mercanciasVisibles();
    if (!lista.length) { aviso("No hay mercancías para exportar.", "error"); return; }
    descargarCsv("mercancias",
      ["Descripción", "Partida arancelaria", "Declaración", "Cantidad", "Unidad", "Valor USD", "Peso kg"],
      lista.map(function (m) { return [m.descripcion, m.partidaArancelaria, m.numeroDeclaracion, m.cantidad, m.unidadMedida, Number(m.valor).toFixed(2), m.peso == null ? "" : m.peso]; }));
    aviso("Se exportaron " + lista.length + " mercancías.");
  }

  function exportarIncidencias() {
    var lista = incidenciasVisibles();
    if (!lista.length) { aviso("No hay incidencias para exportar.", "error"); return; }
    descargarCsv("incidencias",
      ["Fecha", "Tipo", "Mercancía", "Declaración", "Cantidad afectada", "Estado", "Descripción", "Registrada por", "Fecha de registro"],
      lista.map(function (i) { return [i.fecha, NOMBRE_TIPO_INC[i.tipo], i.mercancia, i.numeroDeclaracion, i.cantidadAfectada == null ? "" : i.cantidadAfectada, NOMBRE_ESTADO_INC[i.estado], i.descripcion, i.registradaPor, (i.fechaRegistro || "").replace("T", " ")]; }));
    aviso("Se exportaron " + lista.length + " incidencias.");
  }

  /* ---------- 6. Formularios (crear / editar) ---------- */

  function limpiarErrores(form) {
    form.querySelectorAll(".error").forEach(function (e) { e.textContent = ""; });
    form.querySelectorAll("[aria-invalid]").forEach(function (e) { e.removeAttribute("aria-invalid"); });
    form.querySelectorAll("[hidden].form-alerta, .form-alerta").forEach(function (a) { a.hidden = true; a.textContent = ""; });
  }

  // Muestra un error debajo de su campo. Devuelve true si el campo existía en el formulario.
  function errorEnCampo(form, campo, mensaje) {
    var caja = form.querySelector("#e-" + campo);
    var entrada = form.querySelector('[name="' + campo + '"]');
    if (!caja) return false;
    caja.textContent = mensaje;
    if (entrada) entrada.setAttribute("aria-invalid", "true");
    return true;
  }

  // Aplica los errores que devolvió el servidor; lo que no tenga campo va en la alerta de arriba
  function mostrarErroresServidor(form, alerta, err) {
    var sinCampo = [];
    var claves = Object.keys(err.campos || {});
    claves.forEach(function (c) { if (!errorEnCampo(form, c, err.campos[c])) sinCampo.push(err.campos[c]); });
    if (claves.length === 0 || sinCampo.length) {
      alerta.textContent = claves.length === 0 ? err.message : sinCampo.join(" ");
      alerta.hidden = false;
    }
    var primero = form.querySelector('[aria-invalid="true"]');
    if (primero) primero.focus();
  }

  function enfocarPrimerError(form) {
    var primero = form.querySelector('[aria-invalid="true"]');
    if (primero) primero.focus();
  }

  function ponerGuardando(boton, guardando) {
    boton.disabled = guardando;
    if (guardando) { boton.setAttribute("data-texto", boton.textContent); boton.textContent = "Guardando…"; }
    else if (boton.hasAttribute("data-texto")) boton.textContent = boton.getAttribute("data-texto");
  }

  // Siguiente número libre con el formato DUA-AAAA-00000
  function sugerirNumero(anio) {
    var prefijo = "DUA-" + anio + "-";
    var maximo = 0;
    estado.declaraciones.forEach(function (d) {
      if (d.numeroDeclaracion && d.numeroDeclaracion.indexOf(prefijo) === 0) {
        var n = parseInt(d.numeroDeclaracion.slice(prefijo.length), 10);
        if (!isNaN(n) && n > maximo) maximo = n;
      }
    });
    return prefijo + String(maximo + 1).padStart(5, "0");
  }

  // ----- Declaración -----
  function abrirFormDeclaracion(d) {
    var form = $("form-declaracion");
    limpiarErrores(form);
    form.reset();
    estado.editDec = d || null;
    $("dlg-dec-titulo").textContent = d ? "Editar declaración" : "Nueva declaración";
    $("campo-estado").hidden = !d;
    $("btn-sugerir").hidden = !!d;
    if (d) {
      form.numeroDeclaracion.value = d.numeroDeclaracion;
      form.fecha.value = d.fecha;
      form.aduana.value = d.aduana;
      form.importadorExportador.value = d.importadorExportador;
      form.estado.value = d.estado;
      form.tipoOperacion.value = d.tipoOperacion;
    } else {
      form.fecha.value = hoyISO();
      form.numeroDeclaracion.value = sugerirNumero(new Date().getFullYear());
    }
    $("dlg-declaracion").showModal();
    form.numeroDeclaracion.focus();
    form.numeroDeclaracion.select();
  }

  function validarDeclaracion(form) {
    var ok = true;
    function mal(campo, msg) { errorEnCampo(form, campo, msg); ok = false; }
    var numero_ = form.numeroDeclaracion.value.trim();
    if (!numero_) mal("numeroDeclaracion", "El número de declaración es obligatorio.");
    else if (numero_.length > 30) mal("numeroDeclaracion", "Máximo 30 caracteres.");
    if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(form.fecha.value)) mal("fecha", "Elige una fecha válida.");
    if (!form.aduana.value.trim()) mal("aduana", "La aduana es obligatoria.");
    else if (form.aduana.value.trim().length > 80) mal("aduana", "Máximo 80 caracteres.");
    if (!form.importadorExportador.value.trim()) mal("importadorExportador", "Indica el importador o exportador.");
    else if (form.importadorExportador.value.trim().length > 120) mal("importadorExportador", "Máximo 120 caracteres.");
    return ok;
  }

  function guardarDeclaracion(ev) {
    ev.preventDefault();
    var form = ev.target;
    limpiarErrores(form);
    if (!validarDeclaracion(form)) { enfocarPrimerError(form); return; }
    var cuerpo = {
      numeroDeclaracion: form.numeroDeclaracion.value.trim(),
      tipoOperacion: form.tipoOperacion.value,
      fecha: form.fecha.value,
      aduana: form.aduana.value.trim(),
      importadorExportador: form.importadorExportador.value.trim()
    };
    var editando = estado.editDec;
    if (editando) cuerpo.estado = form.estado.value; // al crear no se envía: el servidor pone PENDIENTE
    var boton = $("dec-guardar");
    ponerGuardando(boton, true);
    var peticion = editando ? api("PUT", API_DEC + "/" + editando.id, cuerpo) : api("POST", API_DEC, cuerpo);
    peticion.then(function (guardada) {
      $("dlg-declaracion").close();
      aviso(editando ? "Declaración " + guardada.numeroDeclaracion + " actualizada." : "Declaración " + guardada.numeroDeclaracion + " registrada.");
      return cargarTodo();
    }).catch(function (err) {
      mostrarErroresServidor(form, $("dec-alerta"), err);
    }).then(function () { ponerGuardando(boton, false); });
  }

  // ----- Mercancía -----
  // decId: declaración que se deja elegida de antemano (al agregar desde el detalle)
  function abrirFormMercancia(m, decId) {
    if (estado.declaraciones.length === 0) {
      aviso("Primero registra una declaración: toda mercancía pertenece a una.", "error");
      abrirFormDeclaracion(null);
      return;
    }
    var form = $("form-mercancia");
    limpiarErrores(form);
    form.reset();
    estado.editMer = m || null;
    $("dlg-mer-titulo").textContent = m ? "Editar mercancía" : "Nueva mercancía";
    form.declaracionId.innerHTML = '<option value="">Elige una declaración…</option>' +
      ordenar(estado.declaraciones, { col: "numeroDeclaracion", dir: "asc" }).map(function (d) {
        return '<option value="' + d.id + '">' + esc(d.numeroDeclaracion + " — " + d.importadorExportador) + "</option>";
      }).join("");
    if (m) {
      form.declaracionId.value = String(m.declaracionId);
      form.descripcion.value = m.descripcion;
      form.partidaArancelaria.value = m.partidaArancelaria;
      form.unidadMedida.value = m.unidadMedida;
      form.cantidad.value = m.cantidad;
      form.valor.value = m.valor;
      form.peso.value = m.peso == null ? "" : m.peso;
    } else if (decId) {
      form.declaracionId.value = String(decId);
    } else if (estado.mer.declaracion) {
      form.declaracionId.value = estado.mer.declaracion; // si se está filtrando por una declaración, se asume esa
    }
    $("dlg-mercancia").showModal();
    (form.declaracionId.value ? form.descripcion : form.declaracionId).focus();
  }

  function validarMercancia(form) {
    var ok = true;
    function mal(campo, msg) { errorEnCampo(form, campo, msg); ok = false; }
    if (!form.declaracionId.value) mal("declaracionId", "Elige la declaración a la que pertenece.");
    if (!form.descripcion.value.trim()) mal("descripcion", "La descripción es obligatoria.");
    else if (form.descripcion.value.trim().length > 150) mal("descripcion", "Máximo 150 caracteres.");
    if (!/^\d{4}\.\d{2}\.\d{2}(\.\d{2})?$/.test(form.partidaArancelaria.value.trim())) mal("partidaArancelaria", "Usa el formato 0000.00.00 (por ejemplo 0804.40.00).");
    if (!form.unidadMedida.value.trim()) mal("unidadMedida", "Indica la unidad de medida.");
    var cantidad = parseFloat(form.cantidad.value);
    if (isNaN(cantidad) || cantidad <= 0) mal("cantidad", "La cantidad debe ser mayor que 0.");
    var valor = parseFloat(form.valor.value);
    if (isNaN(valor) || valor <= 0) mal("valor", "El valor debe ser mayor que 0.");
    if (form.peso.value !== "" && (isNaN(parseFloat(form.peso.value)) || parseFloat(form.peso.value) < 0)) mal("peso", "El peso no puede ser negativo.");
    return ok;
  }

  function guardarMercancia(ev) {
    ev.preventDefault();
    var form = ev.target;
    limpiarErrores(form);
    if (!validarMercancia(form)) { enfocarPrimerError(form); return; }
    var cuerpo = {
      declaracionId: Number(form.declaracionId.value),
      descripcion: form.descripcion.value.trim(),
      partidaArancelaria: form.partidaArancelaria.value.trim(),
      cantidad: parseFloat(form.cantidad.value),
      unidadMedida: form.unidadMedida.value.trim(),
      valor: parseFloat(form.valor.value),
      peso: form.peso.value === "" ? null : parseFloat(form.peso.value)
    };
    var editando = estado.editMer;
    var boton = $("mer-guardar");
    ponerGuardando(boton, true);
    var peticion = editando ? api("PUT", API_MER + "/" + editando.id, cuerpo) : api("POST", API_MER, cuerpo);
    peticion.then(function () {
      $("dlg-mercancia").close();
      aviso(editando ? "Mercancía actualizada." : "Mercancía registrada.");
      return cargarTodo();
    }).catch(function (err) {
      mostrarErroresServidor(form, $("mer-alerta"), err);
    }).then(function () { ponerGuardando(boton, false); });
  }

  // ----- Incidencia -----
  // merId: mercancía que se deja elegida de antemano (al reportar desde la tabla de mercancías)
  function abrirFormIncidencia(i, merId) {
    if (estado.mercancias.length === 0) {
      aviso("Primero registra una mercancía: toda incidencia es sobre una.", "error");
      return;
    }
    var form = $("form-incidencia");
    limpiarErrores(form);
    form.reset();
    estado.editInc = i || null;
    $("dlg-inc-titulo").textContent = i ? "Editar incidencia" : "Nueva incidencia";
    $("campo-estado-inc").hidden = !i;
    form.mercanciaId.innerHTML = '<option value="">Elige una mercancía…</option>' +
      ordenar(estado.mercancias.map(function (m) {
        var d = buscarDeclaracion(m.declaracionId);
        return Object.assign({}, m, { etiqueta: (d ? d.numeroDeclaracion : "?") + " — " + m.descripcion });
      }), { col: "etiqueta", dir: "asc" }).map(function (m) {
        return '<option value="' + m.id + '">' + esc(m.etiqueta) + "</option>";
      }).join("");
    if (i) {
      form.mercanciaId.value = String(i.mercanciaId);
      form.tipo.value = i.tipo;
      form.fecha.value = i.fecha;
      form.cantidadAfectada.value = i.cantidadAfectada == null ? "" : i.cantidadAfectada;
      form.descripcion.value = i.descripcion;
      form.estado.value = i.estado;
    } else {
      form.fecha.value = hoyISO();
      if (merId) form.mercanciaId.value = String(merId);
    }
    $("dlg-incidencia").showModal();
    (form.mercanciaId.value ? form.descripcion : form.mercanciaId).focus();
  }

  function validarIncidencia(form) {
    var ok = true;
    function mal(campo, msg) { errorEnCampo(form, campo, msg); ok = false; }
    if (!form.mercanciaId.value) mal("mercanciaId", "Elige la mercancía afectada.");
    if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(form.fecha.value)) mal("fecha", "Elige una fecha válida.");
    else if (form.fecha.value > hoyISO()) mal("fecha", "La fecha no puede ser futura.");
    var cant = form.cantidadAfectada.value;
    if (cant !== "" && (isNaN(parseFloat(cant)) || parseFloat(cant) <= 0)) mal("cantidadAfectada", "Si la indicas, debe ser mayor que 0.");
    var desc = form.descripcion.value.trim();
    if (!desc) mal("descripcion", "Cuenta qué pasó.");
    else if (desc.length > 300) mal("descripcion", "Máximo 300 caracteres.");
    return ok;
  }

  function guardarIncidencia(ev) {
    ev.preventDefault();
    var form = ev.target;
    limpiarErrores(form);
    if (!validarIncidencia(form)) { enfocarPrimerError(form); return; }
    var cuerpo = {
      mercanciaId: Number(form.mercanciaId.value),
      tipo: form.tipo.value,
      fecha: form.fecha.value,
      descripcion: form.descripcion.value.trim(),
      cantidadAfectada: form.cantidadAfectada.value === "" ? null : parseFloat(form.cantidadAfectada.value)
    };
    var editando = estado.editInc;
    if (editando) cuerpo.estado = form.estado.value; // al crear no se envía: el servidor pone ABIERTA
    var boton = $("inc-guardar");
    ponerGuardando(boton, true);
    var peticion = editando ? api("PUT", API_INC + "/" + editando.id, cuerpo) : api("POST", API_INC, cuerpo);
    peticion.then(function () {
      $("dlg-incidencia").close();
      aviso(editando ? "Incidencia actualizada." : "Incidencia registrada.");
      return cargarTodo();
    }).catch(function (err) {
      mostrarErroresServidor(form, $("inc-alerta"), err);
    }).then(function () { ponerGuardando(boton, false); });
  }

  // ----- Eliminar -----
  function eliminarDeclaracion(id) {
    var d = buscarDeclaracion(id);
    if (!d) return;
    var n = estado.mercancias.filter(function (m) { return m.declaracionId === id; }).length;
    var ni = estado.incidencias.filter(function (x) { return x.declaracionId === id; }).length;
    var extra = n ? " También se eliminarán sus " + n + (n === 1 ? " mercancía" : " mercancías") + (ni ? " y " + ni + (ni === 1 ? " incidencia." : " incidencias.") : ".") : "";
    confirmar("¿Eliminar la declaración?", d.numeroDeclaracion + " se eliminará de forma definitiva." + extra).then(function (si) {
      if (!si) return;
      return api("DELETE", API_DEC + "/" + id).then(function () {
        if (estado.detalleId === id) $("dlg-detalle").close();
        aviso("Declaración " + d.numeroDeclaracion + " eliminada.");
        return cargarTodo();
      }).catch(function (err) { aviso(err.message, "error"); });
    });
  }

  function eliminarMercancia(id) {
    var m = estado.mercancias.find(function (x) { return x.id === id; });
    if (!m) return;
    var ni = estado.incidencias.filter(function (x) { return x.mercanciaId === id; }).length;
    var extraMer = ni ? " También se eliminarán sus " + ni + (ni === 1 ? " incidencia." : " incidencias.") : "";
    confirmar("¿Eliminar la mercancía?", "«" + m.descripcion + "» se eliminará de forma definitiva." + extraMer).then(function (si) {
      if (!si) return;
      return api("DELETE", API_MER + "/" + id).then(function () {
        aviso("Mercancía eliminada.");
        return cargarTodo();
      }).catch(function (err) { aviso(err.message, "error"); });
    });
  }

  function eliminarIncidencia(id) {
    var i = estado.incidencias.find(function (x) { return x.id === id; });
    if (!i) return;
    confirmar("¿Eliminar la incidencia?", "Se eliminará de forma definitiva el registro de " + (NOMBRE_TIPO_INC[i.tipo] || "la incidencia").toLowerCase() + " del " + fechaCorta(i.fecha) + ".").then(function (si) {
      if (!si) return;
      return api("DELETE", API_INC + "/" + id).then(function () {
        aviso("Incidencia eliminada.");
        return cargarTodo();
      }).catch(function (err) { aviso(err.message, "error"); });
    });
  }

  // Cambio rápido del seguimiento de una incidencia
  function cambiarEstadoInc(id, nuevo, select) {
    var i = estado.incidencias.find(function (x) { return x.id === id; });
    if (!i || i.estado === nuevo) return;
    if (select && select.parentNode) select.parentNode.setAttribute("data-estado", nuevo);
    api("PATCH", API_INC + "/" + id + "/estado", { estado: nuevo }).then(function () {
      aviso("Incidencia ahora «" + NOMBRE_ESTADO_INC[nuevo] + "».");
      return cargarTodo();
    }).catch(function (err) {
      aviso(err.message, "error");
      return cargarTodo();
    });
  }

  // ----- Cambio rápido de estado -----
  function cambiarEstado(id, nuevo, select) {
    var d = buscarDeclaracion(id);
    if (!d || d.estado === nuevo) return;
    // Se pinta el color al instante; si el servidor falla, cargarTodo() lo devuelve a su sitio
    if (select && select.parentNode) select.parentNode.setAttribute("data-estado", nuevo);
    api("PATCH", API_DEC + "/" + id + "/estado", { estado: nuevo }).then(function () {
      aviso(d.numeroDeclaracion + " ahora está «" + NOMBRE_ESTADO[nuevo] + "».");
      return cargarTodo();
    }).catch(function (err) {
      aviso(err.message, "error");
      return cargarTodo();
    });
  }

  /* ---------- Sesión: login y cierre ---------- */

  function dibujarUsuario() {
    var u = estado.sesion;
    if (!u) return;
    $("usuario-inicial").textContent = u.nombre.charAt(0);
    $("usuario-nombre").textContent = u.nombre;
    $("usuario-rol").textContent = u.rol === "ADMIN" ? "Administrador" : "Funcionario";
  }

  // Muestra la pantalla de login y esconde la aplicación (y cualquier ventana abierta)
  function mostrarLogin(mensaje) {
    estado.sesion = null;
    estado.declaraciones = [];
    estado.mercancias = [];
    estado.incidencias = [];
    estado.estadisticas = null;
    estado.cargado = false;
    document.querySelectorAll("dialog[open]").forEach(function (d) { d.close(); });
    $("app").hidden = true;
    $("login").hidden = false;
    var alerta = $("login-alerta");
    alerta.textContent = mensaje || "";
    alerta.hidden = !mensaje;
    $("e-usuario").textContent = "";
    $("e-clave").textContent = "";
    $("f-login-clave").value = "";
    $("f-login-clave").type = "password";
    $("btn-ver-clave").textContent = "Mostrar";
    $("btn-ver-clave").setAttribute("aria-pressed", "false");
    $("login-enviar").disabled = false;
    $("login-enviar").textContent = "Ingresar";
    ($("f-login-usuario").value ? $("f-login-clave") : $("f-login-usuario")).focus();
  }

  // Entra a la aplicación con la sesión que confirmó el servidor
  function entrar(sesion) {
    estado.sesion = sesion;
    $("login").hidden = true;
    $("app").hidden = false;
    dibujarUsuario();
    mostrarVista();
    dibujarTodo();   // esqueletos de carga
    cargarTodo();
  }

  function iniciarSesion(ev) {
    ev.preventDefault();
    var form = ev.target;
    var usuario = form.usuario.value.trim(), clave = form.clave.value;
    $("e-usuario").textContent = usuario ? "" : "Escribe tu usuario.";
    $("e-clave").textContent = clave ? "" : "Escribe tu contraseña.";
    $("login-alerta").hidden = true;
    if (!usuario || !clave) { (usuario ? form.clave : form.usuario).focus(); return; }

    var boton = $("login-enviar");
    boton.disabled = true;
    boton.textContent = "Ingresando…";
    api("POST", API_AUTH + "/login", { usuario: usuario, clave: clave }).then(function (sesion) {
      form.clave.value = "";
      entrar(sesion);
      aviso("Bienvenido, " + sesion.nombre + ".");
    }).catch(function (err) {
      var alerta = $("login-alerta");
      alerta.textContent = err.message;
      alerta.hidden = false;
      form.clave.value = "";
      form.clave.focus();
      boton.disabled = false;
      boton.textContent = "Ingresar";
    });
  }

  function cerrarSesion() {
    api("POST", API_AUTH + "/logout").catch(function () { /* si ya había vencido, da igual */ }).then(function () {
      $("f-login-usuario").value = "";   // el siguiente en usar el equipo no ve el usuario anterior
      mostrarLogin("");
    });
  }

  /* ---------- 7. Eventos y arranque ---------- */

  function cambiarOrden(tabla, col) {
    var f = tabla === "dec" ? estado.dec : tabla === "inc" ? estado.inc : estado.mer;
    if (f.orden.col === col) f.orden.dir = f.orden.dir === "asc" ? "desc" : "asc";
    else { f.orden.col = col; f.orden.dir = (col === "valor" || col === "cantidad" || col === "peso" || col === "fecha" || col === "nMercancias" || col === "cantidadAfectada") ? "desc" : "asc"; }
    f.pagina = 1;
    if (tabla === "dec") dibujarDeclaraciones(); else if (tabla === "inc") dibujarIncidencias(); else dibujarMercancias();
  }

  // Un solo escuchador de clics para todos los botones con data-accion
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-accion]");
    if (!b) return;
    var id = Number(b.getAttribute("data-id"));
    switch (b.getAttribute("data-accion")) {
      case "ver-dec": abrirDetalle(id); break;
      case "editar-dec": abrirFormDeclaracion(buscarDeclaracion(id)); break;
      case "eliminar-dec": eliminarDeclaracion(id); break;
      case "nueva-dec": abrirFormDeclaracion(null); break;
      case "editar-mer": abrirFormMercancia(estado.mercancias.find(function (m) { return m.id === id; })); break;
      case "eliminar-mer": eliminarMercancia(id); break;
      case "nueva-mer": abrirFormMercancia(null, Number(b.getAttribute("data-dec")) || null); break;
      case "nueva-inc": abrirFormIncidencia(null, Number(b.getAttribute("data-mer")) || null); break;
      case "editar-inc": abrirFormIncidencia(estado.incidencias.find(function (x) { return x.id === id; })); break;
      case "eliminar-inc": eliminarIncidencia(id); break;
      case "limpiar-inc":
        estado.inc.q = ""; estado.inc.tipo = ""; estado.inc.estado = ""; estado.inc.pagina = 1;
        $("inc-buscar").value = ""; $("inc-tipo").value = ""; $("inc-estado").value = "";
        dibujarIncidencias();
        break;
      case "ordenar": cambiarOrden(b.getAttribute("data-tabla"), b.getAttribute("data-col")); break;
      case "pagina":
        var t = b.getAttribute("data-tabla"), p = Number(b.getAttribute("data-p"));
        if (t === "dec") { estado.dec.pagina = p; dibujarDeclaraciones(); }
        else if (t === "inc") { estado.inc.pagina = p; dibujarIncidencias(); }
        else { estado.mer.pagina = p; dibujarMercancias(); }
        break;
      case "filtrar-estado":
        estado.dec.estado = b.getAttribute("data-estado");
        estado.dec.pagina = 1;
        $("dec-estado").value = estado.dec.estado;
        location.hash = "#/declaraciones";
        dibujarDeclaraciones();
        break;
      case "limpiar-dec":
        estado.dec.q = ""; estado.dec.tipo = ""; estado.dec.estado = ""; estado.dec.pagina = 1;
        $("dec-buscar").value = ""; $("dec-tipo").value = ""; $("dec-estado").value = "";
        dibujarDeclaraciones();
        break;
      case "limpiar-mer":
        estado.mer.q = ""; estado.mer.declaracion = ""; estado.mer.pagina = 1;
        $("mer-buscar").value = ""; $("mer-declaracion").value = "";
        dibujarMercancias();
        break;
      case "reintentar": cargarTodo(); break;
      default: break;
    }
  });

  // Cambio de estado desde el selector de la tabla o del detalle
  document.addEventListener("change", function (ev) {
    var s = ev.target.closest && ev.target.closest(".estado-select");
    if (!s) return;
    if (s.hasAttribute("data-inc")) cambiarEstadoInc(Number(s.getAttribute("data-id")), s.value, s);
    else cambiarEstado(Number(s.getAttribute("data-id")), s.value, s);
  });

  // Cerrar ventanas con los botones [data-cerrar] y con clic en el fondo (solo las de lectura)
  document.addEventListener("click", function (ev) {
    var c = ev.target.closest("[data-cerrar]");
    if (c) { c.closest("dialog").close(); return; }
    if (ev.target.tagName === "DIALOG" && (ev.target.id === "dlg-detalle" || ev.target.id === "dlg-confirmar")) ev.target.close();
  });

  function iniciarEventos() {
    // Buscadores y filtros
    $("dec-buscar").addEventListener("input", function (e) { estado.dec.q = e.target.value; estado.dec.pagina = 1; dibujarDeclaraciones(); });
    $("dec-tipo").addEventListener("change", function (e) { estado.dec.tipo = e.target.value; estado.dec.pagina = 1; dibujarDeclaraciones(); });
    $("dec-estado").addEventListener("change", function (e) { estado.dec.estado = e.target.value; estado.dec.pagina = 1; dibujarDeclaraciones(); });
    $("mer-buscar").addEventListener("input", function (e) { estado.mer.q = e.target.value; estado.mer.pagina = 1; dibujarMercancias(); });
    $("mer-declaracion").addEventListener("change", function (e) { estado.mer.declaracion = e.target.value; estado.mer.pagina = 1; dibujarMercancias(); });
    $("inc-buscar").addEventListener("input", function (e) { estado.inc.q = e.target.value; estado.inc.pagina = 1; dibujarIncidencias(); });
    $("inc-tipo").addEventListener("change", function (e) { estado.inc.tipo = e.target.value; estado.inc.pagina = 1; dibujarIncidencias(); });
    $("inc-estado").addEventListener("change", function (e) { estado.inc.estado = e.target.value; estado.inc.pagina = 1; dibujarIncidencias(); });
    $("inc-csv").addEventListener("click", exportarIncidencias);
    $("dec-csv").addEventListener("click", exportarDeclaraciones);
    $("mer-csv").addEventListener("click", exportarMercancias);

    // Barra superior y menú
    $("btn-nuevo").addEventListener("click", function () {
      if (estado.vista === "mercancias") abrirFormMercancia(null);
      else if (estado.vista === "incidencias") abrirFormIncidencia(null);
      else abrirFormDeclaracion(null);
    });
    $("btn-actualizar").addEventListener("click", function () { cargarTodo().then(function () { if (!estado.errorCarga) aviso("Datos actualizados."); }); });
    $("btn-menu").addEventListener("click", abrirMenu);
    $("cortina").addEventListener("click", cerrarMenu);
    $("btn-tema").addEventListener("click", alternarTema);

    // Formularios
    $("form-declaracion").addEventListener("submit", guardarDeclaracion);
    $("form-mercancia").addEventListener("submit", guardarMercancia);
    $("form-incidencia").addEventListener("submit", guardarIncidencia);
    $("btn-sugerir").addEventListener("click", function () {
      var f = $("form-declaracion");
      var anio = /^\d{4}/.test(f.fecha.value) ? f.fecha.value.slice(0, 4) : String(new Date().getFullYear());
      f.numeroDeclaracion.value = sugerirNumero(anio);
    });
    // Al corregir un campo, se quita su mensaje de error
    ["form-declaracion", "form-mercancia", "form-incidencia"].forEach(function (id) {
      $(id).addEventListener("input", function (e) {
        var caja = $(id).querySelector("#e-" + e.target.name);
        if (caja) caja.textContent = "";
        e.target.removeAttribute("aria-invalid");
      });
    });

    // Detalle
    $("det-editar").addEventListener("click", function () { abrirFormDeclaracion(buscarDeclaracion(estado.detalleId)); });
    $("det-imprimir").addEventListener("click", function () { window.print(); });
    $("dlg-detalle").addEventListener("close", function () { estado.detalleId = null; });

    // Teclado: "/" lleva al buscador de la pantalla actual
    document.addEventListener("keydown", function (e) {
      var tag = (e.target.tagName || "").toLowerCase();
      if (e.key === "/" && tag !== "input" && tag !== "select" && tag !== "textarea" && !document.querySelector("dialog[open]")) {
        var caja = estado.vista === "declaraciones" ? $("dec-buscar") : estado.vista === "mercancias" ? $("mer-buscar") : estado.vista === "incidencias" ? $("inc-buscar") : null;
        if (caja) { e.preventDefault(); caja.focus(); }
      }
    });

    // Sesión
    $("form-login").addEventListener("submit", iniciarSesion);
    $("btn-salir").addEventListener("click", cerrarSesion);
    $("btn-ver-clave").addEventListener("click", function () {
      var campo = $("f-login-clave");
      var ver = campo.type === "password";
      campo.type = ver ? "text" : "password";
      this.textContent = ver ? "Ocultar" : "Mostrar";
      this.setAttribute("aria-pressed", ver ? "true" : "false");
    });

    window.addEventListener("hashchange", mostrarVista);
  }

  // Arranque
  aplicarTema(document.documentElement.getAttribute("data-tema") === "oscuro");
  iniciarEventos();
  // Primero se pregunta al servidor si ya hay una sesión abierta (por ejemplo, tras recargar la página)
  api("GET", API_AUTH + "/yo").then(entrar, function () { mostrarLogin(""); });
})();
