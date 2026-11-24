package com.aduanas.sistema_aduanas.controller;

import com.aduanas.sistema_aduanas.exception.RecursoNoEncontradoException;
import com.aduanas.sistema_aduanas.exception.SolicitudInvalidaException;
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

// Endpoints REST de las mercancías (mismo patrón que DeclaracionController).
@RestController
@RequestMapping("/api/mercancias")
@Tag(name = "Mercancías", description = "Mercancías de cada declaración")
public class MercanciaController {

    private final MercanciaService service;
    private final DeclaracionService declaracionService;
    private final IncidenciaService incidenciaService;

    public MercanciaController(MercanciaService service, DeclaracionService declaracionService, IncidenciaService incidenciaService) {
        this.service = service;
        this.declaracionService = declaracionService;
        this.incidenciaService = incidenciaService;
    }

    // GET /api/mercancias -> lista todas
    // GET /api/mercancias?declaracionId=3 -> lista solo las de la declaración 3
    @GetMapping
    public List<Mercancia> listar(@RequestParam(required = false) Long declaracionId) {
        if (declaracionId != null) {
            return service.listarPorDeclaracion(declaracionId);
        }
        return service.listarTodas();
    }

    // GET /api/mercancias/{id} -> obtiene una en particular (404 si no existe)
    @GetMapping("/{id}")
    public Mercancia obtenerPorId(@PathVariable Long id) {
        return service.buscarPorId(id).orElseThrow(() -> noEncontrada(id));
    }

    // POST /api/mercancias -> registra una nueva y responde 201 Created
    @PostMapping
    public ResponseEntity<Mercancia> registrar(@Valid @RequestBody Mercancia nuevaMercancia) {
        verificarDeclaracion(nuevaMercancia.getDeclaracionId());
        Mercancia creada = service.registrar(nuevaMercancia);
        return ResponseEntity.created(URI.create("/api/mercancias/" + creada.getId())).body(creada);
    }

    // PUT /api/mercancias/{id} -> actualiza una existente
    @PutMapping("/{id}")
    public Mercancia actualizar(@PathVariable Long id, @Valid @RequestBody Mercancia datos) {
        verificarDeclaracion(datos.getDeclaracionId());
        return service.actualizar(id, datos).orElseThrow(() -> noEncontrada(id));
    }

    // DELETE /api/mercancias/{id} -> elimina una mercancía y TAMBIÉN sus incidencias
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        if (!service.eliminar(id)) {
            throw noEncontrada(id);
        }
        incidenciaService.eliminarPorMercancia(id);
        return ResponseEntity.noContent().build();
    }

    // Comprueba que la declaración a la que se asocia la mercancía exista
    private void verificarDeclaracion(Long declaracionId) {
        if (declaracionService.buscarPorId(declaracionId).isEmpty()) {
            throw new SolicitudInvalidaException("declaracionId",
                    "La declaración con ID " + declaracionId + " no existe.");
        }
    }

    private RecursoNoEncontradoException noEncontrada(Long id) {
        return new RecursoNoEncontradoException("No existe la mercancía con ID " + id + ".");
    }
}
