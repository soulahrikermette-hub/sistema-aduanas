package com.aduanas.sistema_aduanas.model;

import java.util.Map;

// Forma única de todos los errores que devuelve la API, para que la página
// siempre sepa qué mostrar. Ejemplo:
// {
//   "estado": 400,
//   "error": "Solicitud inválida",
//   "mensaje": "Hay datos que corregir.",
//   "campos": { "fecha": "La fecha es obligatoria" },
//   "fecha": "2026-10-06T16:30:00Z"
// }
public record ErrorRespuesta(
        int estado,                  // código HTTP (400, 404, 409...)
        String error,                // título corto del error
        String mensaje,              // explicación para mostrar al usuario
        Map<String, String> campos,  // errores por campo (vacío si no aplica)
        String fecha) {              // momento en que ocurrió
}
