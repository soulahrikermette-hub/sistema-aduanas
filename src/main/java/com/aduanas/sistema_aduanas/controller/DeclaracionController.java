package com.aduanas.sistema_aduanas.controller;

import com.aduanas.sistema_aduanas.exception.RecursoNoEncontradoException;
import com.aduanas.sistema_aduanas.model.Declaracion;
import com.aduanas.sistema_aduanas.model.EstadoRequest;
import com.aduanas.sistema_aduanas.model.Mercancia;
import com.aduanas.sistema_aduanas.service.DeclaracionService;
import com.aduanas.sistema_aduanas.service.IncidenciaService;
import com.aduanas.sistema_aduanas.service.MercanciaService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

// Endpoints REST de las declaraciones.
// Los errores (404, 409, 400) no se manejan aquí: se lanzan como excepciones y las
// convierte GlobalExceptionHandler en una respuesta JSON uniforme.
@RestController
@RequestMapping("/api/declaraciones")
@Tag(name = "Declaraciones", description = "Registro y seguimiento de declaraciones aduaneras")
public class DeclaracionController {

    private final DeclaracionService service;
    private final MercanciaService mercanciaService;
    private final IncidenciaService incidenciaService;

    // Spring inyecta los servicios automáticamente (inyección de dependencias)
    public DeclaracionController(DeclaracionService service, MercanciaService mercanciaService, IncidenciaService incidenciaService) {
        this.service = service;
        this.mercanciaService = mercanciaService;
        this.incidenciaService = incidenciaService;
    }

    // GET /api/declaraciones -> lista todas
    @GetMapping
    public List<Declaracion> listar() {
        return service.listarTodas();
    }

    // GET /api/declaraciones/{id} -> obtiene una en particular (404 si no existe)
    @GetMapping("/{id}")
    public Declaracion obtenerPorId(@PathVariable Long id) {
        return service.buscarPorId(id).orElseThrow(() -> noEncontrada(id));
    }

    // GET /api/declaraciones/{id}/mercancias -> mercancías que pertenecen a esa declaración
    @GetMapping("/{id}/mercancias")
    public List<Mercancia> listarMercancias(@PathVariable Long id) {
        service.buscarPorId(id).orElseThrow(() -> noEncontrada(id));
        return mercanciaService.listarPorDeclaracion(id);
    }

    // POST /api/declaraciones -> registra una nueva y responde 201 Created
    // @Valid activa las validaciones que pusimos en Declaracion.java (@NotBlank, etc.)
    @PostMapping
    public ResponseEntity<Declaracion> registrar(@Valid @RequestBody Declaracion nuevaDeclaracion) {
        Declaracion creada = service.registrar(nuevaDeclaracion);
        // El encabezado Location indica dónde consultar el recurso recién creado
        return ResponseEntity.created(URI.create("/api/declaraciones/" + creada.getId())).body(creada);
    }

    // PUT /api/declaraciones/{id} -> actualiza una existente (404 si no existe)
    @PutMapping("/{id}")
    public Declaracion actualizar(@PathVariable Long id, @Valid @RequestBody Declaracion datos) {
        return service.actualizar(id, datos).orElseThrow(() -> noEncontrada(id));
    }

    // PATCH /api/declaraciones/{id}/estado -> cambia solo el estado del trámite
    // Cuerpo: { "estado": "APROBADA" }
    @PatchMapping("/{id}/estado")
    public Declaracion cambiarEstado(@PathVariable Long id, @Valid @RequestBody EstadoRequest cuerpo) {
        return service.cambiarEstado(id, cuerpo.estado()).orElseThrow(() -> noEncontrada(id));
    }

    // DELETE /api/declaraciones/{id} -> elimina la declaración y TAMBIÉN sus mercancías e incidencias
    // (igual que hará la base de datos con ON DELETE CASCADE). Responde 204 No Content.
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        if (!service.eliminar(id)) {
            throw noEncontrada(id);
        }
        mercanciaService.eliminarPorDeclaracion(id);
        incidenciaService.eliminarPorDeclaracion(id);
        return ResponseEntity.noContent().build();
    }

    private RecursoNoEncontradoException noEncontrada(Long id) {
        return new RecursoNoEncontradoException("No existe la declaración con ID " + id + ".");
    }
}
