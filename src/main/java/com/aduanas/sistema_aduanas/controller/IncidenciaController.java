package com.aduanas.sistema_aduanas.controller;

import com.aduanas.sistema_aduanas.exception.RecursoNoEncontradoException;
import com.aduanas.sistema_aduanas.exception.SolicitudInvalidaException;
import com.aduanas.sistema_aduanas.model.EstadoIncidenciaRequest;
import com.aduanas.sistema_aduanas.model.Incidencia;
import com.aduanas.sistema_aduanas.model.Mercancia;
import com.aduanas.sistema_aduanas.model.SesionRespuesta;
import com.aduanas.sistema_aduanas.service.IncidenciaService;
import com.aduanas.sistema_aduanas.service.MercanciaService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

// Endpoints REST de las incidencias (pérdida, extravío, robo o daño de una mercancía).
// Ver o registrar requiere sesión; ELIMINAR solo puede el ADMIN (regla general de SecurityConfig).
@RestController
@RequestMapping("/api/incidencias")
@Tag(name = "Incidencias", description = "Pérdidas, extravíos, robos y daños de las mercancías")
public class IncidenciaController {

    private final IncidenciaService service;
    private final MercanciaService mercanciaService;

    public IncidenciaController(IncidenciaService service, MercanciaService mercanciaService) {
        this.service = service;
        this.mercanciaService = mercanciaService;
    }

    // GET /api/incidencias                       -> todas
    // GET /api/incidencias?tipo=ROBO&estado=ABIERTA&mercanciaId=3&declaracionId=2 -> con filtros (todos opcionales)
    @GetMapping
    public List<Incidencia> listar(@RequestParam(required = false) Long mercanciaId,
                                   @RequestParam(required = false) Long declaracionId,
                                   @RequestParam(required = false) String tipo,
                                   @RequestParam(required = false) String estado) {
        return service.listar(mercanciaId, declaracionId, tipo, estado);
    }

    // GET /api/incidencias/{id} -> una en particular (404 si no existe)
    @GetMapping("/{id}")
    public Incidencia obtenerPorId(@PathVariable Long id) {
        return service.buscarPorId(id).orElseThrow(() -> noEncontrada(id));
    }

    // POST /api/incidencias -> registra una nueva y responde 201 Created.
    // La declaración y el usuario que la registra los pone el servidor.
    @PostMapping
    public ResponseEntity<Incidencia> registrar(@Valid @RequestBody Incidencia nueva) {
        nueva.setDeclaracionId(declaracionDeLaMercancia(nueva.getMercanciaId()));
        Incidencia creada = service.registrar(nueva, sesionActual().usuario());
        return ResponseEntity.created(URI.create("/api/incidencias/" + creada.getId())).body(creada);
    }

    // PUT /api/incidencias/{id} -> actualiza los datos de una existente (409 si ya está RESUELTA)
    @PutMapping("/{id}")
    public Incidencia actualizar(@PathVariable Long id, @Valid @RequestBody Incidencia datos) {
        datos.setDeclaracionId(declaracionDeLaMercancia(datos.getMercanciaId()));
        return service.actualizar(id, datos, sesionActual().usuario()).orElseThrow(() -> noEncontrada(id));
    }

    // PATCH /api/incidencias/{id}/estado -> cambia solo el estado. Cuerpo: { "estado": "RESUELTA" }
    // Reabrir una resuelta solo puede el ADMIN (409 si lo intenta un funcionario).
    @PatchMapping("/{id}/estado")
    public Incidencia cambiarEstado(@PathVariable Long id, @Valid @RequestBody EstadoIncidenciaRequest cuerpo) {
        SesionRespuesta sesion = sesionActual();
        return service.cambiarEstado(id, cuerpo.estado(), sesion.usuario(), "ADMIN".equals(sesion.rol()))
                .orElseThrow(() -> noEncontrada(id));
    }

    // DELETE /api/incidencias/{id} -> elimina (solo ADMIN). Responde 204 No Content.
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        if (!service.eliminar(id)) {
            throw noEncontrada(id);
        }
        return ResponseEntity.noContent().build();
    }

    // Comprueba que la mercancía exista y devuelve el ID de su declaración
    private Long declaracionDeLaMercancia(Long mercanciaId) {
        Mercancia mercancia = mercanciaService.buscarPorId(mercanciaId).orElseThrow(() ->
                new SolicitudInvalidaException("mercanciaId", "La mercancía con ID " + mercanciaId + " no existe."));
        return mercancia.getDeclaracionId();
    }

    // Quién tiene la sesión abierta (lo puso JwtAuthFilter a partir del token)
    private SesionRespuesta sesionActual() {
        Authentication autenticacion = SecurityContextHolder.getContext().getAuthentication();
        return (SesionRespuesta) autenticacion.getPrincipal();
    }

    private RecursoNoEncontradoException noEncontrada(Long id) {
        return new RecursoNoEncontradoException("No existe la incidencia con ID " + id + ".");
    }
}
