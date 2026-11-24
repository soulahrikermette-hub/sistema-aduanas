package com.aduanas.sistema_aduanas.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

// Cuerpo de la petición PATCH /api/declaraciones/{id}/estado
// Ejemplo de JSON: { "estado": "APROBADA" }
// Es un "record": una clase inmutable pensada solo para transportar datos.
public record EstadoRequest(
        @NotBlank(message = "El estado es obligatorio")
        @Pattern(regexp = Declaracion.REGEX_ESTADO,
                message = "El estado debe ser PENDIENTE, EN_REVISION, APROBADA o RECHAZADA")
        String estado) {
}
