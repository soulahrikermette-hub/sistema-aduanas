package com.aduanas.sistema_aduanas.model;

import java.util.Map;

// Resumen que consume el panel principal de la página (GET /api/estadisticas).
// Los montos están en dólares y el peso en kilogramos.
public record Estadisticas(
        int totalDeclaraciones,
        int importaciones,
        int exportaciones,
        Map<String, Integer> porEstado,   // ej: { "PENDIENTE": 3, "APROBADA": 5, ... }
        int totalMercancias,
        double valorTotal,
        double valorImportacion,          // valor de las mercancías de declaraciones de importación
        double valorExportacion,          // valor de las mercancías de declaraciones de exportación
        double pesoTotal,
        long incidenciasSinResolver) {   // incidencias abiertas o en investigación
}
