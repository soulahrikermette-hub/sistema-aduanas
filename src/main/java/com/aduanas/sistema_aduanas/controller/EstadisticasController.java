package com.aduanas.sistema_aduanas.controller;

import com.aduanas.sistema_aduanas.model.Estadisticas;
import com.aduanas.sistema_aduanas.service.EstadisticasService;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Endpoint que alimenta el panel principal de la página.
@RestController
@RequestMapping("/api/estadisticas")
@Tag(name = "Estadísticas", description = "Resumen para el panel")
public class EstadisticasController {

    private final EstadisticasService service;

    public EstadisticasController(EstadisticasService service) {
        this.service = service;
    }

    // GET /api/estadisticas -> totales, conteo por estado y valores declarados
    @GetMapping
    public Estadisticas resumen() {
        return service.calcular();
    }
}
