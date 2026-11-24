package com.aduanas.sistema_aduanas.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

// Cuerpo de la petición PATCH /api/incidencias/{id}/estado
// Ejemplo de JSON: { "estado": "RESUELTA" }
public record EstadoIncidenciaRequest(
        @NotBlank(message = "El estado es obligatorio")
        @Pattern(regexp = Incidencia.REGEX_ESTADO,
                message = "El estado debe ser ABIERTA, EN_INVESTIGACION o RESUELTA")
        String estado) {
}
