package com.aduanas.sistema_aduanas.controller;

import com.aduanas.sistema_aduanas.model.LoginRequest;
import com.aduanas.sistema_aduanas.model.LoginRespuesta;
import com.aduanas.sistema_aduanas.model.SesionRespuesta;
import com.aduanas.sistema_aduanas.service.AuthService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Inicio y cierre de sesión con JWT. El token se entrega de dos formas a la vez:
//   - en el cuerpo de la respuesta (para Swagger/Postman: cabecera Authorization: Bearer <token>)
//   - en una cookie HttpOnly (para la página web: el JavaScript no la puede leer)
@RestController
@RequestMapping("/api/auth")
@Tag(name = "Autenticación", description = "Inicio y cierre de sesión (JWT)")
public class AuthController {

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    // POST /api/auth/login -> 200 con los datos del usuario, el token y la cookie; 401 si falla
    @PostMapping("/login")
    public ResponseEntity<LoginRespuesta> iniciarSesion(@Valid @RequestBody LoginRequest datos) {
        AuthService.Autenticacion resultado = auth.iniciarSesion(datos.usuario(), datos.clave());
        SesionRespuesta s = resultado.sesion();
        return ResponseEntity.ok()
                .header("Set-Cookie", cookie(resultado.token(), resultado.expiraEnSegundos()))
                .body(new LoginRespuesta(s.usuario(), s.nombre(), s.rol(), resultado.token(), "Bearer",
                        resultado.expiraEnSegundos()));
    }

    // POST /api/auth/logout -> 204 y la cookie se borra.
    // (El JWT no se guarda en el servidor: simplemente se descarta y vence solo.)
    @PostMapping("/logout")
    public ResponseEntity<Void> cerrarSesion() {
        return ResponseEntity.noContent().header("Set-Cookie", cookie("", 0)).build();
    }

    // GET /api/auth/yo -> quién tiene la sesión abierta (la página lo usa al cargar)
    @GetMapping("/yo")
    public SesionRespuesta quienSoy() {
        Authentication autenticacion = SecurityContextHolder.getContext().getAuthentication();
        return (SesionRespuesta) autenticacion.getPrincipal();
    }

    // Cookie del token. Si algún día se publica con HTTPS, añade "; Secure".
    static String cookie(String valor, long segundos) {
        return AuthService.COOKIE + "=" + valor + "; Path=/; Max-Age=" + segundos + "; HttpOnly; SameSite=Lax";
    }
}
