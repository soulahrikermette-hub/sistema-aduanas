package com.aduanas.sistema_aduanas.model;

// Lo que la página necesita saber de quien inició sesión (nunca incluye contraseñas ni el token).
public record SesionRespuesta(
        String usuario,   // nombre de usuario, ej: "admin"
        String nombre,    // nombre para mostrar, ej: "Administrador"
        String rol) {     // ADMIN o FUNCIONARIO
}
