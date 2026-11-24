package com.aduanas.sistema_aduanas.model;

import jakarta.validation.constraints.NotBlank;

// Cuerpo de POST /api/auth/login.
public record LoginRequest(
        @NotBlank(message = "Escribe tu usuario") String usuario,
        @NotBlank(message = "Escribe tu contraseña") String clave) {
}
