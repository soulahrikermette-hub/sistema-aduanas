package com.aduanas.sistema_aduanas.model;

// Respuesta de POST /api/auth/login. Además de los datos del usuario trae el token JWT,
// para poder usarlo desde Swagger o Postman con la cabecera  Authorization: Bearer <token>.
// (La página web no lo necesita: el mismo token también viaja en una cookie HttpOnly.)
public record LoginRespuesta(
        String usuario,          // nombre de usuario, ej: "admin"
        String nombre,           // nombre para mostrar, ej: "Administrador"
        String rol,              // ADMIN o FUNCIONARIO
        String token,            // el JWT firmado
        String tipo,             // siempre "Bearer"
        long expiraEnSegundos) { // cuánto dura el token
}
