package com.aduanas.sistema_aduanas.config;

import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.time.Instant;

// Escribe un error con la misma forma JSON que usa el GlobalExceptionHandler (ErrorRespuesta).
// Hace falta porque los errores de seguridad (401, 403) ocurren ANTES de llegar a los controladores.
final class ErrorJson {

    private ErrorJson() {
    }

    static void escribir(HttpServletResponse respuesta, int estado, String error, String mensaje) throws IOException {
        respuesta.setStatus(estado);
        respuesta.setContentType("application/json");
        respuesta.setCharacterEncoding("UTF-8");
        respuesta.getWriter().write("{\"estado\":" + estado + ",\"error\":\"" + error + "\",\"mensaje\":\"" + mensaje
                + "\",\"campos\":{},\"fecha\":\"" + Instant.now() + "\"}");
    }
}
